// app/dashboard/apps/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import Link from "next/link";
import {
  ShoppingBag,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink,
  ArrowRight,
  Globe,
  Loader2,
  RefreshCw,
  AlertCircle,
  Zap,
  Link as LinkIcon,
  Key,
  Server,
  Database,
  TrendingUp
} from "lucide-react";

interface Integration {
  id: number;
  app_slug: string;
  app_name: string;
  status: "connected" | "disconnected" | "error";
  connected_at: string;
  last_sync: string | null;
  settings: any;
  api_keys?: Record<string, string>;
}

const availableIntegrations = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync products, orders, and inventory with your Shopify store",
    icon: ShoppingBag,
    category: "ecommerce",
    features: [
      "Sync products & inventory",
      "Import Shopify orders",
      "Real-time stock updates",
      "Customer data sync"
    ],
    requirements: [
      "Shopify Store URL",
      "API Access Token",
      "Products in Shopify"
    ],
    setupSteps: 3
  },
  {
    id: "deliveroo",
    name: "Deliveroo",
    description: "Receive and manage Deliveroo orders directly in your POS",
    icon: Truck,
    category: "delivery",
    features: [
      "Real-time order import",
      "Automatic order status updates",
      "Driver tracking",
      "Menu synchronization"
    ],
    requirements: [
      "Deliveroo Partner account",
      "API credentials",
      "Approved menu items"
    ],
    setupSteps: 4
  },
  {
    id: "justeat",
    name: "Just Eat",
    description: "Integrate Just Eat orders into your workflow",
    icon: Package,
    category: "delivery",
    features: [
      "Order notifications",
      "Menu management",
      "Pricing sync",
      "Order preparation tracking"
    ],
    requirements: [
      "Just Eat partner account",
      "API access",
      "Valid menu setup"
    ],
    setupSteps: 4
  }
];

export default function AppsPage() {
  const userId = useUserId();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadIntegrations();
    }
  }, [userId]);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", userId)
        .order("connected_at", { ascending: false });

      setIntegrations(data || []);
    } catch (error) {
      console.error("Error loading integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationStatus = (appSlug: string) => {
    const integration = integrations.find(i => i.app_slug === appSlug);
    if (!integration) return "disconnected";
    return integration.status;
  };

  const handleConnect = async (appSlug: string) => {
    setActiveIntegration(appSlug);
  };

  const handleDisconnect = async (appSlug: string) => {
    if (!confirm(`Are you sure you want to disconnect ${appSlug}?`)) return;
    
    try {
      await supabase
        .from("integrations")
        .delete()
        .eq("user_id", userId)
        .eq("app_slug", appSlug);
      
      await loadIntegrations();
    } catch (error) {
      console.error("Error disconnecting integration:", error);
    }
  };

  const handleSync = async (appSlug: string) => {
    setSyncing(appSlug);
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update last sync time
      await supabase
        .from("integrations")
        .update({ last_sync: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("app_slug", appSlug);
      
      await loadIntegrations();
      
      alert(`Synced ${appSlug} successfully!`);
    } catch (error) {
      console.error("Error syncing:", error);
      alert(`Error syncing ${appSlug}`);
    } finally {
      setSyncing(null);
    }
  };

  const saveIntegrationSettings = async (appSlug: string, settings: any) => {
    try {
      const integration = integrations.find(i => i.app_slug === appSlug);
      
      if (integration) {
        // Update existing
        await supabase
          .from("integrations")
          .update({
            settings,
            status: "connected",
            connected_at: new Date().toISOString()
          })
          .eq("id", integration.id);
      } else {
        // Create new
        const app = availableIntegrations.find(a => a.id === appSlug);
        await supabase
          .from("integrations")
          .insert({
            user_id: userId,
            app_slug: appSlug,
            app_name: app?.name || appSlug,
            status: "connected",
            settings,
            connected_at: new Date().toISOString()
          });
      }
      
      setActiveIntegration(null);
      await loadIntegrations();
      alert(`${appSlug} connected successfully!`);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert(`Error connecting ${appSlug}`);
    }
  };

  const IntegrationSetupModal = ({ appSlug }: { appSlug: string }) => {
    const app = availableIntegrations.find(a => a.id === appSlug);
    const [step, setStep] = useState(1);
    const [settings, setSettings] = useState({
      apiKey: "",
      storeUrl: "",
      webhookUrl: "",
      syncInventory: true,
      syncOrders: true
    });

    if (!app) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-foreground">Connect {app.name}</h3>
                <p className="text-muted-foreground">Step {step} of {app.setupSteps}</p>
              </div>
              <button
                onClick={() => setActiveIntegration(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-between mb-8">
              {[1, 2, 3].map((stepNum) => (
                <div key={stepNum} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${stepNum <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  `}>
                    {stepNum}
                  </div>
                  {stepNum < 3 && (
                    <div className={`w-16 h-1 mx-2 ${stepNum < step ? 'bg-primary' : 'bg-border'}`}></div>
                  )}
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-foreground mb-4">Requirements</h4>
                  <ul className="space-y-2">
                    {app.requirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-4">Features</h4>
                  <ul className="space-y-2">
                    {app.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-muted-foreground">
                        <Zap className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {app.id === 'shopify' ? 'Shopify Store URL' : 'API Key'}
                  </label>
                  <input
                    type="text"
                    value={app.id === 'shopify' ? settings.storeUrl : settings.apiKey}
                    onChange={(e) => setSettings({
                      ...settings,
                      [app.id === 'shopify' ? 'storeUrl' : 'apiKey']: e.target.value
                    })}
                    placeholder={app.id === 'shopify' ? 'https://your-store.myshopify.com' : 'Enter API key'}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {app.id === 'shopify' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Admin API Access Token
                    </label>
                    <input
                      type="password"
                      value={settings.apiKey}
                      onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                      placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4" />
                    {app.id === 'shopify' 
                      ? 'Get your API credentials from Shopify Admin → Settings → Apps → Develop apps'
                      : 'Contact your account manager for API credentials'}
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.syncInventory}
                      onChange={(e) => setSettings({ ...settings, syncInventory: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-foreground">Sync inventory automatically</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.syncOrders}
                      onChange={(e) => setSettings({ ...settings, syncOrders: e.target.checked })}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-foreground">Import new orders automatically</span>
                  </label>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">Webhook URL</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Set this as your webhook URL in {app.name} settings:
                  </p>
                  <code className="block bg-background border border-border rounded-lg p-3 text-sm font-mono text-foreground break-all">
                    https://api.demlypos.com/webhooks/{app.id}/{userId}
                  </code>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Back
                </button>
              )}
              {step < app.setupSteps ? (
                <button
                  onClick={() => setStep(step + 1)}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={() => saveIntegrationSettings(appSlug, settings)}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Connect {app.name}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground">Connect with delivery platforms and e-commerce</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadIntegrations}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Connected Integrations */}
      {integrations.filter(i => i.status === 'connected').length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Connected Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {integrations
              .filter(i => i.status === 'connected')
              .map((integration) => {
                const app = availableIntegrations.find(a => a.id === integration.app_slug);
                if (!app) return null;

                const Icon = app.icon;
                const isSyncing = syncing === integration.app_slug;

                return (
                  <div key={integration.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">{integration.app_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-xs font-medium rounded-full border border-emerald-500/20">
                              <CheckCircle className="w-3 h-3" />
                              Connected
                            </span>
                            {integration.last_sync && (
                              <span className="text-xs text-muted-foreground">
                                Synced {new Date(integration.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDisconnect(integration.app_slug)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSync(integration.app_slug)}
                          disabled={isSyncing}
                          className="flex-1 px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isSyncing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Sync Now
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleConnect(integration.app_slug)}
                          className="px-3 py-1.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>

                      {app.id === 'shopify' && (
                        <Link
                          href="/dashboard/orders"
                          className="block w-full px-3 py-1.5 bg-emerald-500/10 text-emerald-600 text-sm font-medium rounded-lg hover:bg-emerald-500/20 transition-colors text-center"
                        >
                          View Orders
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableIntegrations.map((app) => {
            const Icon = app.icon;
            const status = getIntegrationStatus(app.id);
            const isConnected = status === 'connected';

            return (
              <div key={app.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isConnected ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`w-6 h-6 ${isConnected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{app.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {isConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-xs font-medium rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs font-medium rounded-full border border-blue-500/20">
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{app.description}</p>

                <div className="space-y-2 mb-4">
                  {app.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-foreground">
                      <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleConnect(app.id)}
                  disabled={isConnected}
                  className={`w-full py-2 rounded-lg font-medium transition-opacity ${
                    isConnected
                      ? 'bg-muted text-foreground'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}
                >
                  {isConnected ? 'Configure' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Integration Benefits */}
      <div className="mt-8 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-3">Benefits of Integration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Automated Inventory</h4>
                  <p className="text-sm text-muted-foreground">Stock levels update automatically across all platforms</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Package className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Centralized Orders</h4>
                  <p className="text-sm text-muted-foreground">Manage all orders from one dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Setup Modal */}
      {activeIntegration && <IntegrationSetupModal appSlug={activeIntegration} />}
    </div>
  );
}
