// app/api/integrations/shopify/callback/route.ts
import { exchangeCodeForToken, saveIntegration } from "@/lib/integrations/oauth";
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const state = searchParams.get('state'); // userId
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/apps?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !shop || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/apps?error=${encodeURIComponent('Missing required parameters')}`
    );
  }

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken('shopify', code, { shop });
    
    // Save integration
    const integration = await saveIntegration(state, 'shopify', tokenData, {
      shopify_domain: shop,
      location_id: 1, // Default location
      sync_inventory: true
    });

    // Get store information
    const storeResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': tokenData.access_token,
        'Content-Type': 'application/json',
      },
    });

    if (storeResponse.ok) {
      const storeData = await storeResponse.json();
      
      // Update integration with store info
      await supabase
        .from('integrations')
        .update({
          settings: {
            ...integration.settings,
            store_name: storeData.shop.name,
            store_email: storeData.shop.email,
            store_currency: storeData.shop.currency
          }
        })
        .eq('id', integration.id);
    }

    // Register webhooks for this store
    await registerShopifyWebhooks(state, tokenData.access_token, shop);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/apps?success=shopify_connected`
    );
  } catch (error: any) {
    console.error('Shopify callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/apps?error=${encodeURIComponent(error.message || 'Failed to connect Shopify')}`
    );
  }
}

async function registerShopifyWebhooks(userId: string, accessToken: string, shopDomain: string) {
  const webhooks = [
    { topic: 'orders/create', address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify/orders/create` },
    { topic: 'orders/updated', address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify/orders/updated` },
    { topic: 'orders/fulfilled', address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify/orders/fulfilled` },
    { topic: 'orders/cancelled', address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/shopify/orders/cancelled` }
  ];

  for (const webhook of webhooks) {
    try {
      const response = await fetch(`https://${shopDomain}/admin/api/2023-10/webhooks.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ webhook })
      });

      if (response.ok) {
        const webhookData = await response.json();
        
        // Save webhook registration
        await supabase
          .from('webhook_registrations')
          .upsert({
            user_id: userId,
            platform: 'shopify',
            topic: webhook.topic,
            webhook_id: webhookData.webhook.id,
            address: webhook.address,
            is_active: true
          }, {
            onConflict: 'user_id,platform,topic'
          });
      }
    } catch (error) {
      console.error(`Failed to register ${webhook.topic} webhook:`, error);
    }
  }
}