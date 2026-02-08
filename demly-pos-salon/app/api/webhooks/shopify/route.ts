// app/api/webhooks/shopify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, processWebhook } from "@/lib/integrations/webhooks";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');
    const shopDomain = request.headers.get('x-shopify-shop-domain');
    const topic = request.headers.get('x-shopify-topic');

    if (!hmac || !shopDomain || !topic) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    if (!verifyWebhookSignature('shopify', body, hmac)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    
    // Find which user this webhook belongs to
    const { data: integration } = await supabase
      .from('integrations')
      .select('user_id, id')
      .eq('app_slug', 'shopify')
      .eq("settings->>'shopify_domain'", shopDomain)
      .eq('status', 'connected')
      .single();
      
    if (!integration) {
      console.warn(`No integration found for shop: ${shopDomain}`);
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    const userId = integration.user_id;
    
    // Process the webhook
    const event = {
      platform: 'shopify',
      event: topic.replace('orders/', ''), // Convert 'orders/create' to 'create'
      payload,
      userId,
      shopDomain
    };

    await processWebhook(event);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Shopify requires GET for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Shopify webhook endpoint is active',
    status: 'ok'
  });
}