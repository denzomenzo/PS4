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
    
    // Remove trailing slashes
    shopDomain = shopDomain.replace(/\/$/, '');
    
    // Check if it's a custom domain or myshopify.com domain
    const isCustomDomain = shopDomain.includes('.') && !shopDomain.includes('.myshopify.com');
    const isMyShopifyDomain = shopDomain.includes('.myshopify.com');
    const isJustStoreName = !shopDomain.includes('.');
    
    // If it's just a store name (e.g., "mystore"), add .myshopify.com
    if (isJustStoreName) {
      shopDomain = `${shopDomain}.myshopify.com`;
    }
    
    // Validate domain format
    // Accept: mystore.myshopify.com OR custom domains like shop.example.com
    const validDomainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9-]+)+$/;
    
    if (!validDomainPattern.test(shopDomain)) {
      return NextResponse.json(
        { error: 'Invalid domain format. Please enter your Shopify store domain (e.g., "mystore.myshopify.com" or "shop.example.com")' },
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
