// lib/integrations/webhooks.ts - COMPLETE FIXED VERSION
import { supabase } from "@/lib/supabaseClient";
import { verifyShopifyWebhook } from "./shopify";

export interface WebhookEvent {
  platform: string;
  event: string;
  payload: any;
  userId: string;
  shopDomain?: string;
}

export async function processWebhook(event: WebhookEvent) {
  try {
    switch (event.platform) {
      case 'shopify':
        await processShopifyWebhook(event);
        break;
      case 'deliveroo':
        // Will implement later
        console.log('Deliveroo webhook received (not implemented yet)');
        break;
      case 'justeat':
        // Will implement later
        console.log('Just Eat webhook received (not implemented yet)');
        break;
      default:
        throw new Error(`Unsupported platform: ${event.platform}`);
    }

    // Log successful webhook processing
    await supabase
      .from('integration_sync_logs')
      .insert({
        user_id: event.userId,
        action: 'webhook_received',
        status: 'success',
        details: {
          platform: event.platform,
          event: event.event,
          payload: event.payload
        }
      });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    await supabase
      .from('integration_sync_logs')
      .insert({
        user_id: event.userId,
        action: 'webhook_received',
        status: 'error',
        error_message: error.message,
        details: {
          platform: event.platform,
          event: event.event,
          payload: event.payload
        }
      });

    throw error;
  }
}

async function processShopifyWebhook(event: WebhookEvent) {
  const { payload, event: webhookEvent } = event;
  
  switch (webhookEvent) {
    case 'orders/create':
      await processNewShopifyOrder(event.userId, payload);
      break;
    case 'orders/updated':
      await processUpdatedShopifyOrder(event.userId, payload);
      break;
    case 'orders/fulfilled':
      await processFulfilledShopifyOrder(event.userId, payload);
      break;
    case 'orders/cancelled':
      await processCancelledShopifyOrder(event.userId, payload);
      break;
    case 'orders/paid':
      await processPaidShopifyOrder(event.userId, payload);
      break;
    default:
      console.log(`Unhandled Shopify webhook: ${webhookEvent}`);
  }
}

async function processNewShopifyOrder(userId: string, order: any) {
  console.log('Processing new Shopify order:', order.id);
  
  const items = order.line_items.map((item: any) => ({
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

  const newOrder = {
    user_id: userId,
    external_order_id: order.id.toString(),
    source: 'shopify',
    status: 'pending',
    customer_name: order.name || order.customer?.name || '',
    customer_email: order.email || order.customer?.email || '',
    customer_phone: order.phone || order.customer?.phone || '',
    customer_address: order.shipping_address 
      ? `${order.shipping_address.address1 || ''}, ${order.shipping_address.city || ''}, ${order.shipping_address.country || ''} ${order.shipping_address.zip || ''}`
      : null,
    items,
    subtotal: parseFloat(order.subtotal_price || '0'),
    vat: parseFloat(order.total_tax || '0'),
    total: parseFloat(order.total_price || '0'),
    notes: order.note || '',
    external_created_at: order.created_at,
    external_updated_at: order.updated_at,
    metadata: order,
  };

  const { data: saved, error } = await supabase
    .from('external_orders')
    .upsert(newOrder, {
      onConflict: 'user_id,source,external_order_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving Shopify order:', error);
    throw error;
  }

  // Send real-time notification
  await supabase.channel(`orders-${userId}`).send({
    type: 'broadcast',
    event: 'new_order',
    payload: { 
      type: 'shopify',
      order: saved 
    }
  });

  console.log('Shopify order saved:', saved.id);
}

async function processUpdatedShopifyOrder(userId: string, order: any) {
  console.log('Updating Shopify order:', order.id);
  
  // Update existing order
  const { error } = await supabase
    .from('external_orders')
    .update({
      status: mapShopifyStatus(order.fulfillment_status, order.financial_status),
      customer_name: order.name || order.customer?.name || '',
      customer_email: order.email || order.customer?.email || '',
      items: order.line_items.map((item: any) => ({
        external_id: item.id.toString(),
        name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
        sku: item.sku || '',
        product_id: item.product_id,
        variant_id: item.variant_id,
        total: parseFloat(item.price) * item.quantity,
      })),
      subtotal: parseFloat(order.subtotal_price || '0'),
      vat: parseFloat(order.total_tax || '0'),
      total: parseFloat(order.total_price || '0'),
      notes: order.note || '',
      external_updated_at: order.updated_at,
      metadata: order,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('source', 'shopify')
    .eq('external_order_id', order.id.toString());

  if (error) {
    console.error('Error updating Shopify order:', error);
    throw error;
  }

  console.log('Shopify order updated:', order.id);
}

async function processFulfilledShopifyOrder(userId: string, order: any) {
  console.log('Processing fulfilled Shopify order:', order.id);
  
  const { error } = await supabase
    .from('external_orders')
    .update({
      status: 'completed',
      external_updated_at: order.updated_at,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('source', 'shopify')
    .eq('external_order_id', order.id.toString());

  if (error) {
    console.error('Error updating fulfilled order:', error);
    throw error;
  }

  console.log('Shopify order marked as completed:', order.id);
}

async function processCancelledShopifyOrder(userId: string, order: any) {
  console.log('Processing cancelled Shopify order:', order.id);
  
  const { error } = await supabase
    .from('external_orders')
    .update({
      status: 'cancelled',
      external_updated_at: order.updated_at,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('source', 'shopify')
    .eq('external_order_id', order.id.toString());

  if (error) {
    console.error('Error updating cancelled order:', error);
    throw error;
  }

  console.log('Shopify order marked as cancelled:', order.id);
}

async function processPaidShopifyOrder(userId: string, order: any) {
  console.log('Processing paid Shopify order:', order.id);
  
  const { error } = await supabase
    .from('external_orders')
    .update({
      status: 'confirmed', // Move from pending to confirmed when paid
      external_updated_at: order.updated_at,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('source', 'shopify')
    .eq('external_order_id', order.id.toString());

  if (error) {
    console.error('Error updating paid order:', error);
    throw error;
  }

  console.log('Shopify order marked as confirmed (paid):', order.id);
}

function mapShopifyStatus(fulfillmentStatus: string, financialStatus: string): string {
  if (fulfillmentStatus === 'fulfilled') return 'completed';
  if (fulfillmentStatus === 'partial') return 'preparing';
  if (financialStatus === 'paid') return 'confirmed';
  if (financialStatus === 'refunded') return 'cancelled';
  if (financialStatus === 'voided') return 'cancelled';
  return 'pending';
}

// Simple webhook verification for now
export function verifyWebhookSignature(platform: string, body: string, signature: string): boolean {
  if (platform === 'shopify') {
    return verifyShopifyWebhook(body, signature);
  }
  
  // For other platforms, implement their verification
  return true; // Temporary for development
}

// Export all the functions
export {
  processNewShopifyOrder,
  processUpdatedShopifyOrder,
  processFulfilledShopifyOrder,
  processCancelledShopifyOrder,
  processPaidShopifyOrder
};
