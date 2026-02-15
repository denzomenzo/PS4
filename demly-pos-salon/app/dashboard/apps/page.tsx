"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { 
  ShoppingBag, Truck, Package, CreditCard, DollarSign, 
  Globe, Check, X, Loader2, Plus, ArrowRight, Zap,
  ChevronDown, Search, ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";

// App definitions
const APPS = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync your Shopify store with built-in inventory management",
    icon: ShoppingBag,
    category: "ecommerce",
    features: [
      "Two-way order sync",
      "Real-time inventory updates", 
      "Customer data import",
      "Product catalog sync"
    ],
    requirements: [
      "Shopify store",
      "Shopify Partner account",
      "API credentials"
    ],
    setupType: 'oauth' as const,
    comingSoon: false
  },
  {
    id: "website",
    name: "Website Orders",
    description: "Receive orders from your custom website via simple API",
    icon: Globe,
    category: "ecommerce",
    features: [
      "Works with any website platform",
      "WordPress/WooCommerce compatible",
      "Simple REST API",
      "Real-time order sync"
    ],
    requirements: [
      "Custom website or WordPress",
      "Ability to add code/webhooks",
      "HTTPS website"
    ],
    setupType: 'custom' as const,
    route: '/dashboard/apps/website',
    comingSoon: false
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
      "Restaurant ID",
      "API credentials"
    ],
    setupType: 'oauth' as const,
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
      "Restaurant ID",
      "API access"
    ],
    setupType: 'oauth' as const,
    comingSoon: true
  },
  {
    id: "ubereats",
    name: "Uber Eats",
    description: "Sync Uber Eats orders and manage deliveries",
    icon: Truck,
    category: "delivery",
    features: [
      "Real-time order sync",
      "Delivery tracking",
      "Automatic status updates",
      "Customer information"
    ],
    requirements: [
      "Uber Eats store account",
      "Store ID",
      "API credentials"
    ],
    setupType: 'oauth' as const,
    comingSoon: true
  }
];

export default function AppsPage() {
  const userId = useUserId();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [connectingShopify, setConnectingShopify] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, [userId]);

  const loadIntegrations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId);
    
    if (data) {
      setIntegrations(data);
    }
    setLoading(false);
  };

  const getIntegrationStatus = (appId: string) => {
    const integration = integrations.find(i => i.app_slug === appId);
    return integration?.status || 'not_connected';
  };

  const getIntegrationData = (appId: string) => {
    return integrations.find(i => i.app_slug === appId);
  };

  const handleAppClick = (app: any) => {
    if (app.setupType === 'oauth' && app.id === 'shopify') {
      setShowShopifyModal(true);
    } else if (app.setupType === 'custom' && app.route) {
      router.push(app.route);
    } else if (app.comingSoon) {
      alert(`${app.name} integration coming soon!`);
    }
  };

  const connectShopify = async () => {
    if (!shopifyDomain.trim()) {
      alert("Please enter your Shopify store domain");
      return;
    }

    setConnectingShopify(true);

    try {
      // Normalize domain
      let domain = shopifyDomain.trim().toLowerCase();
      domain = domain.replace(/^https?:\/\//, '');
      domain = domain.replace(/\/$/, '');
      
      if (!domain.includes('.myshopify.com') && !domain.includes('.')) {
        domain = `${domain}.myshopify.com`;
      }

      // Redirect to OAuth
      window.location.href = `/api/integrations/shopify/connect?shop=${domain}&userId=${userId}`;
    } catch (error: any) {
      console.error("Shopify connect error:", error);
      alert("Error: " + error.message);
      setConnectingShopify(false);
    }
  };

  const disconnectIntegration = async (appId: string) => {
    if (!confirm(`Disconnect ${appId}? This will stop syncing orders.`)) return;

    try {
      const { error } = await supabase
        .from("integrations")
        .delete()
        .eq("user_id", userId)
        .eq("app_slug", appId);

      if (error) throw error;

      alert("✅ Integration disconnected");
      loadIntegrations();
    } catch (error: any) {
      console.error("Disconnect error:", error);
      alert("Error disconnecting: " + error.message);
    }
  };

  const syncNow = async (appId: string) => {
    try {
      const response = await fetch(`/api/integrations/${appId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Synced ${data.synced || 0} orders from ${appId}`);
      } else {
        alert(`❌ Sync failed: ${data.error}`);
      }
    } catch (error: any) {
      alert("Sync error: " + error.message);
    }
  };

  const categories = [
    { id: "all", name: "All Apps", count: APPS.length },
    { id: "ecommerce", name: "E-commerce", count: APPS.filter(a => a.category === 'ecommerce').length },
    { id: "delivery", name: "Delivery", count: APPS.filter(a => a.category === 'delivery').length }
  ];

  const filteredApps = APPS.filter(app => {
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">App Integrations</h1>
        <p className="text-muted-foreground">
          Connect external platforms to sync orders and manage everything in one place
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search apps..."
            className="w-full bg-card border border-border pl-10 pr-4 py-3 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground hover:bg-accent'
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map((app) => {
          const status = getIntegrationStatus(app.id);
          const integration = getIntegrationData(app.id);
          const Icon = app.icon;

          return (
            <div
              key={app.id}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all group relative flex flex-col"
            >
              {/* Status Badge */}
              {status === 'connected' && (
                <div className="absolute top-4 right-4 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Connected
                </div>
              )}

              {/* Icon & Title */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground mb-1">{app.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{app.description}</p>
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">FEATURES</p>
                <ul className="space-y-1">
                  {app.features.slice(0, 3).map((feature, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Requirements */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">REQUIREMENTS</p>
                <div className="flex flex-wrap gap-1">
                  {app.requirements.slice(0, 2).map((req, idx) => (
                    <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                      {req}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions - Push to bottom with mt-auto */}
              <div className="mt-auto">
              {status === 'connected' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => syncNow(app.id)}
                      className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Sync Now
                    </button>
                    <button
                      onClick={() => disconnectIntegration(app.id)}
                      className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-lg font-medium text-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {integration?.last_sync && (
                    <p className="text-xs text-muted-foreground text-center">
                      Last synced: {new Date(integration.last_sync).toLocaleString('en-GB')}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleAppClick(app)}
                  disabled={app.comingSoon}
                  className="w-full bg-primary hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground py-3 rounded-lg font-medium transition-opacity flex items-center justify-center gap-2"
                >
                  {app.comingSoon ? (
                    <>Coming Soon</>
                  ) : (
                    <>
                      Connect
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
              </div>
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {filteredApps.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold text-foreground mb-2">No apps found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Shopify OAuth Modal */}
      {showShopifyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Connect Shopify</h2>
                  <p className="text-sm text-muted-foreground">Enter your store domain</p>
                </div>
              </div>
              <button
                onClick={() => setShowShopifyModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Shopify Store Domain
                </label>
                <input
                  type="text"
                  value={shopifyDomain}
                  onChange={(e) => setShopifyDomain(e.target.value)}
                  placeholder="mystore.myshopify.com"
                  className="w-full bg-background border border-border text-foreground p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  onKeyPress={(e) => e.key === 'Enter' && connectShopify()}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Enter your Shopify store domain (e.g., mystore.myshopify.com or custom domain)
                </p>
              </div>

              <button
                onClick={connectShopify}
                disabled={connectingShopify || !shopifyDomain.trim()}
                className="w-full bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground py-3 rounded-lg font-bold transition-opacity flex items-center justify-center gap-2"
              >
                {connectingShopify ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Continue to Shopify
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Note:</strong> You'll be redirected to Shopify to authorize this connection. Make sure you have a Shopify Partner account and custom app set up.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
