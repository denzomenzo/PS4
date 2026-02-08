// lib/integrations/webhooks.ts
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
        await processDeliverooWebhook(event);
        break;
      case 'justeat':
        await processJustEatWebhook(event);
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
    default:
      console.log(`Unhandled Shopify webhook: ${webhookEvent}`);
  }
}

async function processNewShopifyOrder(userId: string, order: any) {
  const items = order.line_items.map((item: any) => ({
    external_id: item.id.toString(),
    name: item.title,
    quantity: item.quantity,
    price: parseFloat(item.price),
    sku: item.sku || '',
    product_id: item.product_id,
    variant_id: item.variant_id,
    total: parseFloat(item.price) * item.quantity,
  }));

  const newOrder = {
    user_id: userId,
    external_order_id: order.id.toString(),
    source: 'shopify',
    status: 'pending',
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

  await supabase
    .from('external_orders')
    .upsert(newOrder, {
      onConflict: 'user_id,source,external_order_id'
    });

  // Send real-time notification
  await supabase.channel(`orders-${userId}`).send({
    type: 'broadcast',
    event: 'new_order',
    payload: { order: newOrder }
  });
}

async function processUpdatedShopifyOrder(userId: string, order: any) {
  // Update existing order
  await supabase
    .from('external_orders')
    .update({
      status: mapShopifyStatus(order.fulfillment_status, order.financial_status),
      customer_name: order.name,
      customer_email: order.email,
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
      subtotal: parseFloat(order.subtotal_price),
      vat: parseFloat(order.total_tax),
      total: parseFloat(order.total_price),
      notes: order.note,
      external_updated_at: order.updated_at,
      metadata: order,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('source', 'shopify')
    .eq('external_order_id', order.id.toString());
}

function mapShopifyStatus(fulfillmentStatus: string, financialStatus: string): string {
  if (fulfillmentStatus === 'fulfilled') return 'completed';
  if (fulfillmentStatus === 'partial') return 'preparing';
  if (financialStatus === 'paid') return 'confirmed';
  return 'pending';
}

async function processDeliverooWebhook(event: WebhookEvent) {
  // Deliveroo webhook processing
  console.log('Deliveroo webhook received:', event);
  // Implement based on Deliveroo API documentation
}

async function processJustEatWebhook(event: WebhookEvent) {
  // Just Eat webhook processing
  console.log('Just Eat webhook received:', event);
  // Implement based on Just Eat API documentation
}