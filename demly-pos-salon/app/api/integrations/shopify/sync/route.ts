// app/api/integrations/shopify/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { syncShopifyOrders } from "@/lib/integrations/shopify";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Get Shopify integration settings
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('app_slug', 'shopify')
      .eq('status', 'connected')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Shopify integration not found or not connected' },
        { status: 404 }
      );
    }

    // Sync orders
    const result = await syncShopifyOrders(userId, integration.settings);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      message: `Synced ${result.synced} orders from Shopify`
    });

  } catch (error: any) {
    console.error('Shopify sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}