// app/api/integrations/shopify/connect/route.ts - IMPROVED VERSION
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
    // Validate and normalize shop domain format
    let shopDomain = shop.trim().toLowerCase();
    
    // Remove https:// or http:// if present
    shopDomain = shopDomain.replace(/^https?:\/\//, '');
    
    // Add .myshopify.com if not present
    if (!shopDomain.includes('.myshopify.com')) {
      shopDomain = `${shopDomain}.myshopify.com`;
    }
    
    // Validate final format
    if (!shopDomain.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
      return NextResponse.json(
        { error: 'Invalid Shopify store domain format. Please enter your store name (e.g., "mystore" or "mystore.myshopify.com")' },
        { status: 400 }
      );
    }

    const authUrl = generateOAuthUrl('shopify', userId, { shop: shopDomain });
    
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Shopify OAuth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
