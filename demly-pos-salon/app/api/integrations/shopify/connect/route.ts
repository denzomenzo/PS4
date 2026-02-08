// app/api/integrations/shopify/connect/route.ts
import { generateOAuthUrl } from "@/lib/integrations/oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const shop = searchParams.get('shop');

  if (!userId || !shop) {
    return NextResponse.json(
      { error: 'Missing required parameters: userId and shop' },
      { status: 400 }
    );
  }

  try {
    // Validate shop domain format
    if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
      return NextResponse.json(
        { error: 'Invalid Shopify store domain format' },
        { status: 400 }
      );
    }

    const authUrl = generateOAuthUrl('shopify', userId, { shop });
    
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Shopify OAuth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}