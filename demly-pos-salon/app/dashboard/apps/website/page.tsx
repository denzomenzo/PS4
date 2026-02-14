// app/dashboard/apps/website/page.tsx
// Website orders integration setup

"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserId } from '@/hooks/useUserId';
import { ArrowLeft, Copy, Check, Globe, Code, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function WebsiteIntegration() {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadIntegration();
  }, [userId]);

  const loadIntegration = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('app_slug', 'website')
      .single();

    if (data) {
      setIsConnected(data.status === 'connected');
      setApiKey(data.settings?.api_key || '');
      setWebsiteName(data.app_name || 'My Website');
      setWebsiteUrl(data.settings?.website_url || '');
    }

    setLoading(false);
  };

  const generateApiKey = () => {
    const key = `dmly_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    setApiKey(key);
  };

  const saveIntegration = async () => {
    if (!websiteName || !websiteUrl) {
      alert('Please enter website name and URL');
      return;
    }

    if (!apiKey) {
      alert('Please generate an API key');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('integrations')
        .upsert({
          user_id: userId,
          app_slug: 'website',
          app_name: websiteName,
          status: 'connected',
          settings: {
            api_key: apiKey,
            website_url: websiteUrl,
            last_sync_at: new Date().toISOString()
          },
          connected_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,app_slug'
        });

      if (error) throw error;

      setIsConnected(true);
      alert('✅ Website integration configured successfully!');
    } catch (error: any) {
      console.error('Save error:', error);
      alert('❌ Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const apiEndpoint = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/orders/website`
    : 'https://your-domain.com/api/orders/website';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Website Orders</h1>
          <p className="text-muted-foreground mt-2">Receive orders from your custom website</p>
        </div>
        <Link 
          href="/dashboard/apps" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
      </div>

      {/* Setup */}
      <div className="space-y-6">
        
        {/* Configuration */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Website Configuration</h2>
              <p className="text-muted-foreground text-sm">Connect your custom website</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Website Name
              </label>
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="My Online Store"
                className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Website URL
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://mystore.com"
                className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  placeholder="Click generate to create API key"
                  className="flex-1 bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none"
                />
                <button
                  onClick={generateApiKey}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Generate
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Keep this secret! Use it to authenticate API requests from your website.
              </p>
            </div>
          </div>

          <button
            onClick={saveIntegration}
            disabled={saving}
            className="w-full mt-6 bg-primary hover:opacity-90 text-primary-foreground py-3 rounded-lg font-bold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Save Configuration
              </>
            )}
          </button>
        </div>

        {/* API Documentation */}
        {isConnected && apiKey && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Code className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">API Documentation</h2>
                <p className="text-muted-foreground text-sm">How to send orders from your website</p>
              </div>
            </div>

            {/* API Endpoint */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                API Endpoint
              </label>
              <div className="flex gap-2">
                <code className="flex-1 bg-muted border border-border text-foreground p-3 rounded-lg text-sm font-mono overflow-x-auto">
                  POST {apiEndpoint}
                </code>
                <button
                  onClick={() => copyToClipboard(apiEndpoint)}
                  className="px-4 py-2 bg-muted hover:bg-accent border border-border rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Example Request */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                Example Request (JavaScript)
              </label>
              <pre className="bg-muted border border-border p-4 rounded-lg text-sm font-mono overflow-x-auto">
{`fetch('${apiEndpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${apiKey}'
  },
  body: JSON.stringify({
    orderId: 'ORDER-123',
    customer: {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '+44 7700 900000',
      address: '123 High Street, London, UK'
    },
    items: [
      {
        id: 'prod_1',
        name: 'Product Name',
        price: 19.99,
        quantity: 2
      }
    ],
    subtotal: 39.98,
    vat: 8.00,
    deliveryFee: 3.99,
    total: 51.97,
    notes: 'Please ring doorbell',
    paymentMethod: 'card',
    paymentStatus: 'paid'
  })
})
.then(res => res.json())
.then(data => console.log('Order created:', data));`}
              </pre>
            </div>

            {/* Test Button */}
            <button
              onClick={() => {
                const testOrder = {
                  orderId: `TEST-${Date.now()}`,
                  customer: {
                    name: 'Test Customer',
                    email: 'test@example.com',
                    phone: '+44 7700 900000'
                  },
                  items: [
                    {
                      id: 'test_1',
                      name: 'Test Product',
                      price: 9.99,
                      quantity: 1
                    }
                  ],
                  subtotal: 9.99,
                  vat: 2.00,
                  total: 11.99,
                  notes: 'Test order from API'
                };

                fetch(apiEndpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey
                  },
                  body: JSON.stringify(testOrder)
                })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    alert('✅ Test order created! Check your POS orders page.');
                  } else {
                    alert('❌ Error: ' + data.error);
                  }
                })
                .catch(err => alert('❌ Request failed: ' + err.message));
              }}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors"
            >
              Send Test Order
            </button>
          </div>
        )}

        {/* WordPress Plugin Example */}
        {isConnected && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-3">
              WordPress / WooCommerce Integration
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add this code to your theme's functions.php or create a custom plugin:
            </p>
            <pre className="bg-background border border-border p-4 rounded-lg text-xs font-mono overflow-x-auto">
{`// Send order to Demly POS after WooCommerce checkout
add_action('woocommerce_thankyou', 'send_order_to_demly');

function send_order_to_demly($order_id) {
    $order = wc_get_order($order_id);
    
    $items = array();
    foreach ($order->get_items() as $item) {
        $items[] = array(
            'id' => $item->get_product_id(),
            'name' => $item->get_name(),
            'price' => $item->get_total() / $item->get_quantity(),
            'quantity' => $item->get_quantity()
        );
    }
    
    $data = array(
        'orderId' => $order->get_order_number(),
        'customer' => array(
            'name' => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
            'email' => $order->get_billing_email(),
            'phone' => $order->get_billing_phone(),
            'address' => $order->get_formatted_billing_address()
        ),
        'items' => $items,
        'subtotal' => $order->get_subtotal(),
        'vat' => $order->get_total_tax(),
        'deliveryFee' => $order->get_shipping_total(),
        'total' => $order->get_total(),
        'paymentMethod' => $order->get_payment_method_title()
    );
    
    wp_remote_post('${apiEndpoint}', array(
        'headers' => array(
            'Content-Type' => 'application/json',
            'x-api-key' => '${apiKey}'
        ),
        'body' => json_encode($data)
    ));
}`}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}