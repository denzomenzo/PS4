// lib/integrations/oauth.ts
import { supabase } from "@/lib/supabaseClient";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// Get OAuth configuration for each platform
export function getOAuthConfig(platform: string): OAuthConfig {
  const configs: Record<string, OAuthConfig> = {
    shopify: {
      clientId: process.env.SHOPIFY_PARTNER_API_KEY!,
      clientSecret: process.env.SHOPIFY_PARTNER_API_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/shopify/callback`,
      scopes: [
        'read_orders',
        'write_orders',
        'read_products',
        'write_inventory',
        'read_customers',
        'read_locations'
      ]
    },
    deliveroo: {
      clientId: process.env.DELIVEROO_PARTNER_CLIENT_ID!,
      clientSecret: process.env.DELIVEROO_PARTNER_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/deliveroo/callback`,
      scopes: ['order.read', 'order.write', 'restaurant.read']
    },
    justeat: {
      clientId: process.env.JUSTEAT_PARTNER_CLIENT_ID!,
      clientSecret: process.env.JUSTEAT_PARTNER_CLIENT_SECRET!,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/justeat/callback`,
      scopes: ['orders.read', 'orders.write', 'menu.read']
    }
  };

  if (!configs[platform]) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  if (!configs[platform].clientId || !configs[platform].clientSecret) {
    throw new Error(`Missing OAuth credentials for ${platform}`);
  }

  return configs[platform];
}

// Generate OAuth URL for a platform
export function generateOAuthUrl(platform: string, userId: string, additionalParams: Record<string, string> = {}) {
  const config = getOAuthConfig(platform);
  
  switch (platform) {
    case 'shopify':
      const { shop } = additionalParams;
      if (!shop) throw new Error('Shopify store domain required');
      
      return `https://${shop}/admin/oauth/authorize?client_id=${config.clientId}&scope=${config.scopes.join(',')}&redirect_uri=${encodeURIComponent(config.redirectUri)}&state=${userId}&grant_options[]=per-user`;
    
    case 'deliveroo':
      return `https://partner.deliveroo.com/oauth2/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&state=${userId}&scope=${config.scopes.join(' ')}`;
    
    case 'justeat':
      return `https://identity.just-eat.com/connect/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&state=${userId}&scope=${config.scopes.join(' ')}`;
    
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(platform: string, code: string, additionalParams: Record<string, string> = {}) {
  const config = getOAuthConfig(platform);
  
  switch (platform) {
    case 'shopify':
      const { shop } = additionalParams;
      if (!shop) throw new Error('Shopify store domain required');
      
      const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code
        })
      });
      
      if (!response.ok) {
        throw new Error(`Shopify token exchange failed: ${response.statusText}`);
      }
      
      return await response.json();
    
    case 'deliveroo':
      const deliverooResponse = await fetch('https://partner.deliveroo.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri
        })
      });
      
      if (!deliverooResponse.ok) {
        throw new Error(`Deliveroo token exchange failed: ${deliverooResponse.statusText}`);
      }
      
      return await deliverooResponse.json();
    
    default:
      throw new Error(`Token exchange not implemented for ${platform}`);
  }
}

// Save integration after OAuth success
export async function saveIntegration(userId: string, platform: string, tokenData: any, additionalData: Record<string, any> = {}) {
  const platformNames: Record<string, string> = {
    shopify: 'Shopify',
    deliveroo: 'Deliveroo',
    justeat: 'Just Eat'
  };

  const integrationData = {
    user_id: userId,
    app_slug: platform,
    app_name: platformNames[platform] || platform,
    status: 'connected',
    settings: {
      ...additionalData,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type
    },
    oauth_token: tokenData,
    connected_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('integrations')
    .upsert(integrationData, {
      onConflict: 'user_id,app_slug'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save integration: ${error.message}`);
  }

  return data;
}

// Refresh expired token
export async function refreshToken(platform: string, refreshToken: string) {
  const config = getOAuthConfig(platform);
  
  switch (platform) {
    case 'deliveroo':
      const response = await fetch('https://partner.deliveroo.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        })
      });
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }
      
      return await response.json();
    
    default:
      throw new Error(`Token refresh not implemented for ${platform}`);
  }
}