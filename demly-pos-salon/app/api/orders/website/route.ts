// app/api/orders/website/route.ts
// Receive orders from any website and create in POS

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for server-side
);

export async function POST(request: NextRequest) {
  try {
    // Get API key from header
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key required' },
        { status: 401 }
      );
    }

    // Verify API key and get user
    const { data: integration, error: authError } = await supabase
      .from('integrations')
      .select('user_id, settings')
      .eq('app_slug', 'website')
      .eq('settings->>api_key', apiKey)
      .eq('status', 'connected')
      .single();

    if (authError || !integration) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    const userId = integration.user_id;

    // Parse order data
    const orderData = await request.json();

    // Validate required fields
    if (!orderData.items || orderData.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    // Generate external order ID
    const externalOrderId = orderData.orderId || `WEB-${Date.now()}`;

    // Check if order already exists (prevent duplicates)
    const { data: existing } = await supabase
      .from('external_orders')
      .select('id')
      .eq('user_id', userId)
      .eq('source', 'website')
      .eq('external_order_id', externalOrderId)
      .single();

    if (existing) {
      return NextResponse.json(
        { 
          success: true, 
          message: 'Order already exists',
          orderId: existing.id 
        },
        { status: 200 }
      );
    }

    // Format items
    const items = orderData.items.map((item: any) => ({
      external_id: item.id || item.productId || `item-${Date.now()}-${Math.random()}`,
      name: item.name || item.title || 'Product',
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
      total: (parseFloat(item.price) || 0) * (item.quantity || 1),
      sku: item.sku || null,
      image_url: item.image || item.imageUrl || null,
      notes: item.notes || item.specialInstructions || null
    }));

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const vat = parseFloat(orderData.vat) || (subtotal * 0.2); // Default 20% VAT
    const deliveryFee = parseFloat(orderData.deliveryFee) || 0;
    const serviceFee = parseFloat(orderData.serviceFee) || 0;
    const tip = parseFloat(orderData.tip) || 0;
    const total = parseFloat(orderData.total) || (subtotal + vat + deliveryFee + serviceFee + tip);

    // Create order in external_orders table
    const newOrder = {
      user_id: userId,
      external_order_id: externalOrderId,
      source: 'website',
      status: orderData.status || 'pending',
      customer_name: orderData.customer?.name || orderData.customerName || 'Website Customer',
      customer_email: orderData.customer?.email || orderData.customerEmail || null,
      customer_phone: orderData.customer?.phone || orderData.customerPhone || null,
      customer_address: orderData.customer?.address || orderData.deliveryAddress || null,
      items: items,
      subtotal: subtotal,
      vat: vat,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      tip: tip,
      total: total,
      notes: orderData.notes || orderData.specialInstructions || null,
      scheduled_for: orderData.scheduledFor || null,
      metadata: {
        website_url: orderData.websiteUrl || null,
        order_number: orderData.orderNumber || null,
        payment_method: orderData.paymentMethod || 'online',
        payment_status: orderData.paymentStatus || 'paid',
        external_created_at: orderData.createdAt || new Date().toISOString(),
        ...orderData.metadata
      }
    };

    const { data: order, error: insertError } = await supabase
      .from('external_orders')
      .insert(newOrder)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to create order: ${insertError.message}`);
    }

    // Log the order creation
    await supabase
      .from('integration_sync_logs')
      .insert({
        user_id: userId,
        integration_id: null, // Website orders don't have integration_id
        action: 'website_order_received',
        status: 'success',
        orders_synced: 1,
        details: {
          external_order_id: externalOrderId,
          order_id: order.id,
          source: 'website'
        }
      });

    return NextResponse.json(
      {
        success: true,
        message: 'Order received successfully',
        orderId: order.id,
        externalOrderId: externalOrderId
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Website order error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process order'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to verify API key is working
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key required' },
        { status: 401 }
      );
    }

    // Verify API key
    const { data: integration, error } = await supabase
      .from('integrations')
      .select('user_id, app_name')
      .eq('app_slug', 'website')
      .eq('settings->>api_key', apiKey)
      .eq('status', 'connected')
      .single();

    if (error || !integration) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'API key is valid',
        integration: integration.app_name || 'Website Integration'
      },
      { status: 200 }
    );

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
