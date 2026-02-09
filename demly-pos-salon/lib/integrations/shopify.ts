// lib/integrations/shopify.ts - FULLY FIXED VERSION
import { supabase } from "@/lib/supabaseClient";

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  phone: string;
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
    product_id: number;
    variant_id: number;
    properties?: Array<{ name: string; value: string }>;
  }>;
  subtotal_price: string;
  total_tax: string;
  total_price: string;
  shipping_address?: {
    address1: string;
    address2: string;
    city: string;
    country: string;
    zip: string;
  };
  note?: string;
  created_at: string;
  updated_at: string;
  financial_status?: string;
  fulfillment_status?: string;
}

export async function syncShopifyOrders(userId: string, settings: any) {
  try {
    const access_token = settings.access_token;
    const shopify_domain = settings.shopify_domain;
    
    if (!access_token || !shopify_domain) {
      throw new Error('Shopify not configured properly');
    }

    // Get integration ID
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('app_slug', 'shopify')
      .single();

    const integrationId = integration?.id;

    // Get orders from last sync or last 24 hours
    const lastSync = settings.last_sync_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const response = await fetch(
      `https://${shopify_domain}/admin/api/2024-01/orders.json?status=any&created_at_min=${lastSync}&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': access_token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, mark as disconnected
        await supabase
          .from('integrations')
          .update({ status: 'error' })
          .eq('user_id', userId)
          .eq('app_slug', 'shopify');
        throw new Error('Shopify token expired, please reconnect');
      }
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    const orders: ShopifyOrder[] = data.orders || [];

    // Process and save orders
    const savedOrders = [];
    
    for (const order of orders) {
      // Map Shopify order to our format
      const items = order.line_items.map(item => ({
        external_id: item.id.toString(),
        name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
        sku: item.sku || '',
        product_id: item.product_id,
        variant_id: item.variant_id,
        total: parseFloat(item.price) * item.quantity,
        properties: item.properties || []
      }));

      // Determine status based on Shopify's status
      let status: string = 'pending';
      if (order.fulfillment_status === 'fulfilled') status = 'completed';
      else if (order.fulfillment_status === 'partial') status = 'preparing';
      else if (order.financial_status === 'paid') status = 'confirmed';

      // Build shipping address
      let customerAddress = null;
      if (order.shipping_address) {
        const addr = order.shipping_address;
        customerAddress = [addr.address1, addr.city, addr.country, addr.zip]
          .filter(Boolean)
          .join(', ');
      }

      const newOrder = {
        user_id: userId,
        external_order_id: order.id.toString(),
        source: 'shopify',
        status,
        customer_name: order.name || order.email?.split('@')[0] || 'Customer',
        customer_email: order.email,
        customer_phone: order.phone,
        customer_address: customerAddress,
        items,
        subtotal: parseFloat(order.subtotal_price),
        vat: parseFloat(order.total_tax),
        delivery_fee: 0,
        service_fee: 0,
        tip: 0,
        total: parseFloat(order.total_price),
        notes: order.note || null,
        external_created_at: order.created_at,
        metadata: {
          shopify_order_id: order.id,
          financial_status: order.financial_status,
          fulfillment_status: order.fulfillment_status,
          order_url: `https://${shopify_domain}/admin/orders/${order.id}`
        },
      };

      // Upsert order (update if exists, insert if new)
      const { data: saved, error } = await supabase
        .from('external_orders')
        .upsert(newOrder, {
          onConflict: 'user_id,source,external_order_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (!error && saved) {
        savedOrders.push(saved);
        
        // Deduct inventory if enabled
        if (settings.sync_inventory) {
          await deductInventoryForOrder(userId, items);
        }
      }
    }

    // Update last sync time
    await supabase
      .from('integrations')
      .update({ 
        last_sync: new Date().toISOString(),
        settings: { 
          ...settings, 
          last_sync_at: new Date().toISOString() 
        }
      })
      .eq('user_id', userId)
      .eq('app_slug', 'shopify');

    // Log sync
    if (integrationId) {
      await supabase
        .from('integration_sync_logs')
        .insert({
          user_id: userId,
          integration_id: integrationId,
          action: 'sync_orders',
          status: 'success',
          orders_synced: savedOrders.length,
          details: { 
            synced_order_ids: savedOrders.map(o => o.id),
            shopify_domain
          }
        });
    }

    return {
      success: true,
      synced: savedOrders.length,
      orders: savedOrders
    };

  } catch (error: any) {
    // Get integration ID for error logging
    const { data: integration } = await supabase
      .from('integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('app_slug', 'shopify')
      .single();

    // Log error
    if (integration?.id) {
      await supabase
        .from('integration_sync_logs')
        .insert({
          user_id: userId,
          integration_id: integration.id,
          action: 'sync_orders',
          status: 'error',
          error_message: error.message,
          details: { error: error.toString() }
        });
    }

    throw error;
  }
}

async function deductInventoryForOrder(userId: string, items: any[]) {
  for (const item of items) {
    if (item.sku) {
      // Find product by SKU
      const { data: product } = await supabase
        .from('products')
        .select('id, stock_quantity, track_inventory')
        .eq('user_id', userId)
        .eq('sku', item.sku)
        .eq('track_inventory', true)
        .single();

      if (product && product.track_inventory) {
        const newStock = product.stock_quantity - item.quantity;
        
        if (newStock >= 0) {
          await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', product.id);
        } else {
          console.warn(`Insufficient stock for SKU: ${item.sku}`);
        }
      }
    }
  }
}

export async function updateShopifyOrderStatus(
  userId: string, 
  settings: any, 
  orderId: string, 
  status: string
) {
  try {
    const access_token = settings.access_token;
    const shopify_domain = settings.shopify_domain;
    
    // Map our status to Shopify fulfillment status
    const shopifyStatus = mapToShopifyFulfillment(status);
    
    if (shopifyStatus === 'fulfilled') {
      // Create fulfillment in Shopify
      const response = await fetch(
        `https://${shopify_domain}/admin/api/2024-01/orders/${orderId}/fulfillments.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fulfillment: {
              location_id: settings.location_id || null,
              notify_customer: true,
              tracking_info: null
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Shopify fulfillment error:', errorText);
        throw new Error(`Failed to update Shopify order: ${errorText}`);
      }

      return { success: true };
    }

    return { success: true, note: 'Status update not required for Shopify' };
    
  } catch (error: any) {
    console.error('Shopify status update error:', error);
    throw error;
  }
}

function mapToShopifyFulfillment(status: string): string | null {
  const mapping: Record<string, string> = {
    'ready': 'fulfilled',
    'delivered': 'fulfilled',
    'completed': 'fulfilled'
  };
  return mapping[status] || null;
}

// Webhook verification
export function verifyShopifyWebhook(body: string, hmac: string): boolean {
  const crypto = require('crypto');
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET || '';
  
  if (!secret) {
    console.warn('SHOPIFY_WEBHOOK_SECRET not set');
    return false;
  }

  const calculatedHmac = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  
  return calculatedHmac === hmac;
}
