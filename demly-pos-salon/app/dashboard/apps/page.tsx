// app/dashboard/apps/page.tsx - IMPROVED VERSION
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  TrendingUp,
  Info
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
      "Real-time order sync",
      "Automatic inventory updates",
      "Customer data sync",
      "Product catalog sync"
    ],
    requirements: [
      "Active Shopify store",
      "Admin access to your store",
      "Custom app installed"
    ],
    setupType: 'oauth' // Will use OAuth flow
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
    setupType: 'coming_soon',
    comingSoon: true
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
    setupType: 'coming_soon',
    comingSoon: true
  }
];

export default function AppsPage() {
  const userId = useUserId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    // Check for success/error in URL params
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'shopify_connected') {
      setNotification({
        type: 'success',
        message: 'Shopify connected successfully! Your orders will now sync automatically.'
      });
      // Clean URL
      router.replace('/dashboard/apps');
    } else if (error) {
      setNotification({
        type: 'error',
        message: decodeURIComponent(error)
      });
      // Clean URL
      router.replace('/dashboard/apps');
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (userId) {
      loadIntegrations();
    }
  }, [userId]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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
      setNotification({
        type: 'error',
        message: 'Failed to load integrations'
      });
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
    const app = availableIntegrations.find(a => a.id === appSlug);
    
    if (app?.comingSoon) {
      setNotification({
        type: 'info',
        message: `${app.name} integration is coming soon!`
      });
      return;
    }

    if (appSlug === 'shopify') {
      setActiveIntegration(appSlug);
    } else {
      setActiveIntegration(appSlug);
    }
  };

  const handleDisconnect = async (appSlug: string) => {
    if (!confirm(`Are you sure you want to disconnect ${appSlug}? This will stop syncing orders.`)) return;
    
    try {
      await supabase
        .from("integrations")
        .delete()
        .eq("user_id", userId)
        .eq("app_slug", appSlug);
      
      await loadIntegrations();
      
      setNotification({
        type: 'success',
        message: `${appSlug} disconnected successfully`
      });
    } catch (error) {
      console.error("Error disconnecting integration:", error);
      setNotification({
        type: 'error',
        message: `Failed to disconnect ${appSlug}`
      });
    }
  };

  const handleSync = async (appSlug: string) => {
    setSyncing(appSlug);
    try {
      const response = await fetch(`/api/integrations/${appSlug}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      await supabase
        .from("integrations")
        .update({ last_sync: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("app_slug", appSlug);
      
      await loadIntegrations();
      
      setNotification({
        type: 'success',
        message: `${appSlug} synced successfully!`
      });
    } catch (error) {
      console.error("Error syncing:", error);
      setNotification({
        type: 'error',
        message: `Failed to sync ${appSlug}`
      });
    } finally {
      setSyncing(null);
    }
  };

  const ShopifySetupModal = () => {
    const [step, setStep] = useState(1);
    const [shopDomain, setShopDomain] = useState("");
    const [connecting, setConnecting] = useState(false);

    const handleShopifyConnect = () => {
      if (!shopDomain) {
        setNotification({
          type: 'error',
          message: 'Please enter your Shopify store domain'
        });
        return;
      }

      setConnecting(true);
      // Redirect to Shopify OAuth
      window.location.href = `/api/integrations/shopify/connect?userId=${userId}&shop=${encodeURIComponent(shopDomain)}`;
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-foreground">Connect Shopify</h3>
                <p className="text-muted-foreground">Step {step} of 3</p>
              </div>
              <button
                onClick={() => setActiveIntegration(null)}
                disabled={connecting}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
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
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-foreground">
                      <p className="font-medium mb-2">Before you begin:</p>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• You need admin access to your Shopify store</li>
                        <li>• The connection uses OAuth for secure authentication</li>
                        <li>• You'll be redirected to Shopify to authorize the app</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-4">What you'll get:</h4>
                  <ul className="space-y-2">
                    {availableIntegrations.find(a => a.id === 'shopify')?.features.map((feature, index) => (
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
                    Shopify Store Domain
                  </label>
                  <input
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="mystore or mystore.myshopify.com"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enter your Shopify store name (e.g., "mystore" or "mystore.myshopify.com")
                  </p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    How it works
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                    <li>You'll be redirected to Shopify</li>
                    <li>Log in to your Shopify admin</li>
                    <li>Review and approve the permissions</li>
                    <li>You'll be redirected back here automatically</li>
                  </ol>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-2">Ready to Connect!</h4>
                  <p className="text-muted-foreground">
                    Click the button below to securely connect your Shopify store
                  </p>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Store:</strong> {shopDomain || 'Not specified'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-8">
              {step > 1 && step < 3 && (
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={connecting}
                  className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Back
                </button>
              )}
              {step < 2 && (
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Continue
                </button>
              )}
              {step === 2 && (
                <button
                  onClick={() => setStep(3)}
                  disabled={!shopDomain}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Continue
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={handleShopifyConnect}
                  disabled={connecting}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect to Shopify
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
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
      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl border ${
          notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
          notification.type === 'error' ? 'bg-red-500/10 border-red-500/20' :
          'bg-blue-500/10 border-blue-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
              {notification.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
              {notification.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
              <p className={`font-medium ${
                notification.type === 'success' ? 'text-emerald-600' :
                notification.type === 'error' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
                        ) : app.comingSoon ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/10 text-orange-600 text-xs font-medium rounded-full border border-orange-500/20">
                            Coming Soon
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
                  disabled={isConnected && !app.comingSoon}
                  className={`w-full py-2 rounded-lg font-medium transition-opacity ${
                    isConnected && !app.comingSoon
                      ? 'bg-muted text-foreground cursor-not-allowed'
                      : app.comingSoon 
                      ? 'bg-muted text-foreground hover:opacity-90'
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  }`}
                >
                  {isConnected ? 'Connected' : app.comingSoon ? 'Coming Soon' : 'Connect'}
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
      {activeIntegration === 'shopify' && <ShopifySetupModal />}
    </div>
  );
}
