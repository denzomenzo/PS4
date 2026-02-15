"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserId } from '@/hooks/useUserId';
import { ArrowLeft, Copy, Check, Globe, Code, Loader2, Zap, Sparkles } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'widget' | 'api'>('widget');

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

  const widgetCode = `<!-- Demly POS Widget -->
<script 
  src="${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/demly-widget.js"
  data-api-key="${apiKey}"
  data-theme="light"
  data-position="bottom-right">
</script>`;

  const exampleHTML = `<!-- Example: Add to your product pages -->
<div class="product">
  <h2>Cappuccino</h2>
  <p>£3.50</p>
  
  <!-- Add this button -->
  <button 
    data-demly-product='{"id":"cappuccino","name":"Cappuccino","price":3.50,"image":"https://..."}'>
    Add to Cart
  </button>
</div>

<!-- That's it! The widget handles everything -->`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Website Orders</h1>
          <p className="text-muted-foreground mt-2">
            Add orders to your POS from any website in 60 seconds
          </p>
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
              <p className="text-muted-foreground text-sm">One-time setup, works forever</p>
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
                placeholder="My Coffee Shop"
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
                placeholder="https://mycoffeeshop.com"
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
                  placeholder="Click generate"
                  className="flex-1 bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none"
                />
                <button
                  onClick={generateApiKey}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
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

        {/* Integration Methods */}
        {isConnected && apiKey && (
          <>
            {/* Tab Selector */}
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab('widget')}
                className={`px-4 py-3 font-medium text-sm transition-all relative ${
                  activeTab === 'widget'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Widget (Recommended)
                </div>
                {activeTab === 'widget' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('api')}
                className={`px-4 py-3 font-medium text-sm transition-all relative ${
                  activeTab === 'api'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  API (Advanced)
                </div>
                {activeTab === 'api' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>

            {/* Widget Tab */}
            {activeTab === 'widget' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-primary/10 via-blue-500/5 to-purple-500/10 border border-primary/20 rounded-xl p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        ⚡ Instant Setup - Just Copy & Paste!
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Add ONE line of code to your website. That's it! The widget handles cart, checkout, and order submission automatically.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">
                          Step 1: Add this to your website's &lt;head&gt; or before &lt;/body&gt;
                        </label>
                        <button
                          onClick={() => copyToClipboard(widgetCode)}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-medium flex items-center gap-1.5"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="bg-background border border-border p-4 rounded-lg text-xs font-mono overflow-x-auto">
{widgetCode}</pre>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Step 2: Add "Add to Cart" buttons to your products
                      </label>
                      <pre className="bg-background border border-border p-4 rounded-lg text-xs font-mono overflow-x-auto">
{exampleHTML}</pre>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                      <h4 className="font-bold text-foreground text-sm mb-2">✨ What you get:</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• 🛒 Floating cart button (customizable position)</li>
                        <li>• 📱 Mobile-responsive cart panel</li>
                        <li>• ✏️ Customer checkout form</li>
                        <li>• 💾 Cart persists across page reloads</li>
                        <li>• ✅ Orders sent directly to your POS</li>
                        <li>• 🎨 Light/dark theme support</li>
                        <li>• 🚀 Zero maintenance required</li>
                      </ul>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        🎯 Perfect for: WordPress, Wix, Squarespace, Shopify (yes!), or ANY website
                      </p>
                    </div>
                  </div>
                </div>

                {/* Widget Customization */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">Widget Options</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">Theme</p>
                        <p className="text-xs text-muted-foreground">data-theme="light" or "dark"</p>
                      </div>
                      <code className="text-xs bg-background px-2 py-1 rounded border border-border">light</code>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">Position</p>
                        <p className="text-xs text-muted-foreground">Where the cart button appears</p>
                      </div>
                      <code className="text-xs bg-background px-2 py-1 rounded border border-border">bottom-right</code>
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Options: bottom-right, bottom-left, top-right, top-left
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* API Tab */}
            {activeTab === 'api' && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Code className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">API Integration</h2>
                    <p className="text-muted-foreground text-sm">For developers who want full control</p>
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
                    Example Request
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
      phone: '+44 7700 900000'
    },
    items: [{
      id: 'prod_1',
      name: 'Product Name',
      price: 19.99,
      quantity: 2
    }],
    total: 39.98
  })
});`}
                  </pre>
                </div>
              </div>
            )}

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
                  items: [{
                    id: 'test_1',
                    name: 'Test Product',
                    price: 9.99,
                    quantity: 1
                  }],
                  subtotal: 9.99,
                  vat: 2.00,
                  total: 11.99
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
                    alert('✅ Test order created! Check /dashboard/orders');
                  } else {
                    alert('❌ Error: ' + data.error);
                  }
                })
                .catch(err => alert('❌ Request failed: ' + err.message));
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Send Test Order
            </button>
          </>
        )}

      </div>
    </div>
  );
}
