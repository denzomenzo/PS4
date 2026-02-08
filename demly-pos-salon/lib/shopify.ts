// lib/integrations/shopify.ts
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
}

export async function syncShopifyOrders(userId: string, settings: any) {
  try {
    const { apiKey, storeUrl } = settings;
    if (!apiKey || !storeUrl) {
      throw new Error('Shopify API credentials not configured');
    }

    // Fetch orders from Shopify API
    const response = await fetch(
      `${storeUrl}/admin/api/2023-10/orders.json?status=any`,
      {
        headers: {
          'X-Shopify-Access-Token': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    const orders: ShopifyOrder[] = data.orders || [];

    // Process and save orders
    const savedOrders = [];
    
    for (const order of orders) {
      // Check if order already exists
      const { data: existing } = await supabase
        .from('external_orders')
        .select('id')
        .eq('user_id', userId)
        .eq('source', 'shopify')
        .eq('external_order_id', order.id.toString())
        .single();

      if (!existing) {
        // Map Shopify order to our format
        const items = order.line_items.map(item => ({
          external_id: item.id.toString(),
          name: item.title,
          quantity: item.quantity,
          price: parseFloat(item.price),
          sku: item.sku,
          product_id: item.product_id,
          variant_id: item.variant_id,
          total: parseFloat(item.price) * item.quantity,
        }));

        const newOrder = {
          user_id: userId,
          external_order_id: order.id.toString(),
          source: 'shopify',
          status: 'pending', // Shopify orders start as pending
          customer_name: order.name,
          customer_email: order.email,
          customer_phone: order.phone,
          customer_address: order.shipping_address 
            ? `${order.shipping_address.address1}, ${order.shipping_address.city}, ${order.shipping_address.country} ${order.shipping_address.zip}`
            : null,
          items,
          subtotal: parseFloat(order.subtotal_price),
          vat: parseFloat(order.total_tax),
          total: parseFloat(order.total_price),
          notes: order.note,
          external_created_at: order.created_at,
          external_updated_at: order.updated_at,
          metadata: order,
        };

        // Save to database
        const { data: saved, error } = await supabase
          .from('external_orders')
          .insert(newOrder)
          .select()
          .single();

        if (!error && saved) {
          savedOrders.push(saved);
          
          // Deduct inventory if enabled
          if (settings.syncInventory) {
            await deductInventoryForOrder(userId, items);
          }
        }
      }
    }

    // Update last sync time
    await supabase
      .from('integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('app_slug', 'shopify');

    // Log sync
    await supabase
      .from('integration_sync_logs')
      .insert({
        user_id: userId,
        integration_id: settings.id,
        action: 'sync_orders',
        status: 'success',
        orders_synced: savedOrders.length,
        details: { synced_order_ids: savedOrders.map(o => o.id) }
      });

    return {
      success: true,
      synced: savedOrders.length,
      orders: savedOrders
    };

  } catch (error: any) {
    // Log error
    await supabase
      .from('integration_sync_logs')
      .insert({
        user_id: userId,
        integration_id: settings.id,
        action: 'sync_orders',
        status: 'error',
        error_message: error.message,
        details: { error: error.toString() }
      });

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
    const { apiKey, storeUrl } = settings;
    
    // Map internal status to Shopify fulfillment status
    const shopifyStatus = mapToShopifyFulfillment(status);
    
    if (shopifyStatus) {
      const response = await fetch(
        `${storeUrl}/admin/api/2023-10/orders/${orderId}/fulfillments.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fulfillment: {
              location_id: settings.location_id || 1,
              notify_customer: true,
              tracking_info: null,
              line_items: [] // You'd include specific line items here
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update Shopify order: ${response.statusText}`);
      }

      return { success: true };
    }

    return { success: true, note: 'Status update not required for Shopify' };
    
  } catch (error: any) {
    throw error;
  }
}

function mapToShopifyFulfillment(status: string): string | null {
  const mapping: Record<string, string> = {
    'ready': 'fulfilled',
    'delivered': 'delivered',
    'completed': 'fulfilled'
  };
  return mapping[status] || null;
}