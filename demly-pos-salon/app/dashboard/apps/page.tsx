"use client";

import { useState, useEffect } from "react"; // Make sure useEffect is imported
import Link from "next/link";
import { 
  ShoppingBag, Truck, Coffee, CreditCard, 
  Printer, Mail, MessageSquare, Wifi,
  Zap, CheckCircle, XCircle, Settings,
  ExternalLink, ArrowRight, Globe, Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";


const availableApps = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync products, orders, and inventory with your Shopify store",
    icon: ShoppingBag,
    category: "ecommerce",
    setupRequired: true,
    comingSoon: false,
  },
  {
    id: "deliveroo",
    name: "Deliveroo",
    description: "Receive and manage Deliveroo orders directly in your POS",
    icon: Truck,
    category: "delivery",
    setupRequired: true,
    comingSoon: true,
  },
  {
    id: "ubereats",
    name: "Uber Eats",
    description: "Integrate Uber Eats orders into your workflow",
    icon: Coffee,
    category: "delivery",
    setupRequired: true,
    comingSoon: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept online payments and manage subscriptions",
    icon: CreditCard,
    category: "payment",
    setupRequired: true,
    comingSoon: false,
  },
  {
    id: "receipt-printer",
    name: "Receipt Printer",
    description: "Connect thermal printers for automatic receipt printing",
    icon: Printer,
    category: "hardware",
    setupRequired: false,
    comingSoon: false,
  },
  {
    id: "email-marketing",
    name: "Email Marketing",
    description: "Send automated emails and newsletters to customers",
    icon: Mail,
    category: "marketing",
    setupRequired: true,
    comingSoon: false,
  },
];

interface InstalledApp {
  id: string;
  app_slug: string;
  status: "connected" | "disconnected" | "error";
  installed_at: string;
}

export default function AppsPage() {
  const userId = useUserId();
  const [activeCategory, setActiveCategory] = useState("all");
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingApp, setConnectingApp] = useState<string | null>(null);

  // Load installed apps
  const loadInstalledApps = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data } = await supabase
        .from("app_integrations")
        .select("id, app_slug, status, installed_at")
        .eq("user_id", userId);
      
      setInstalledApps(data || []);
    } catch (error) {
      console.error("Error loading installed apps:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadInstalledApps();
  }, [userId]);

  const categories = [
    { id: "all", name: "All Apps", count: availableApps.length },
    { id: "ecommerce", name: "E-commerce", count: availableApps.filter(a => a.category === "ecommerce").length },
    { id: "delivery", name: "Delivery", count: availableApps.filter(a => a.category === "delivery").length },
    { id: "payment", name: "Payments", count: availableApps.filter(a => a.category === "payment").length },
    { id: "hardware", name: "Hardware", count: availableApps.filter(a => a.category === "hardware").length },
    { id: "marketing", name: "Marketing", count: availableApps.filter(a => a.category === "marketing").length },
  ];

  const filteredApps = activeCategory === "all" 
    ? availableApps 
    : availableApps.filter(app => app.category === activeCategory);

  const isInstalled = (appSlug: string) => {
    return installedApps.some(app => app.app_slug === appSlug);
  };

  const getAppStatus = (appSlug: string) => {
    const installed = installedApps.find(app => app.app_slug === appSlug);
    if (!installed) return "disconnected";
    return installed.status;
  };

  const handleConnect = async (appSlug: string) => {
    if (!userId) return;
    
    setConnectingApp(appSlug);
    
    try {
      // For demo - simulate connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Save to database
      const app = availableApps.find(a => a.id === appSlug);
      await supabase
        .from("app_integrations")
        .upsert({
          user_id: userId,
          app_slug: appSlug,
          app_name: app?.name || appSlug,
          status: "connected",
          installed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      // Refresh list
      await loadInstalledApps();
      
    } catch (error) {
      console.error("Error connecting app:", error);
    } finally {
      setConnectingApp(null);
    }
  };

  const handleDisconnect = async (appSlug: string) => {
    if (!userId) return;
    
    if (!confirm("Are you sure you want to disconnect this app?")) return;
    
    try {
      await supabase
        .from("app_integrations")
        .delete()
        .eq("user_id", userId)
        .eq("app_slug", appSlug);
      
      await loadInstalledApps();
    } catch (error) {
      console.error("Error disconnecting app:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Apps & Integrations</h1>
        <p className="text-slate-400">Connect your favorite services to your POS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Connected Apps</p>
              <p className="text-2xl font-bold text-white mt-1">
                {installedApps.filter(a => a.status === "connected").length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-500/50" />
          </div>
        </div>
        
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Available Apps</p>
              <p className="text-2xl font-bold text-white mt-1">
                {availableApps.length}
              </p>
            </div>
            <Zap className="w-8 h-8 text-blue-500/50" />
          </div>
        </div>
        
        <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Ready to Connect</p>
              <p className="text-2xl font-bold text-white mt-1">
                {availableApps.filter(a => !a.comingSoon).length}
              </p>
            </div>
            <Globe className="w-8 h-8 text-amber-500/50" />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg border transition-all ${
              activeCategory === cat.id
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                : "bg-slate-900/50 border-slate-800/50 text-slate-400 hover:border-slate-700/50"
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredApps.map((app) => {
          const Icon = app.icon;
          const installed = isInstalled(app.id);
          const status = getAppStatus(app.id);
          const isConnecting = connectingApp === app.id;
          
          return (
            <div key={app.id} className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5 hover:border-slate-700/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    installed && status === "connected" 
                      ? "bg-emerald-500/20" 
                      : "bg-slate-800/50"
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      installed && status === "connected" 
                        ? "text-emerald-400" 
                        : "text-slate-400"
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{app.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {app.comingSoon ? (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          Coming Soon
                        </span>
                      ) : installed ? (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          status === "connected"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}>
                          {status === "connected" ? "Connected" : "Disconnected"}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          Available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {installed && status === "connected" && (
                  <button 
                    onClick={() => handleDisconnect(app.id)}
                    className="p-2 hover:bg-slate-800/50 rounded-lg"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
              
              <p className="text-slate-400 text-sm mb-4">{app.description}</p>
              
              <div className="flex justify-between items-center">
                {installed && (
                  <p className="text-xs text-slate-500">
                    Installed {new Date(
                      installedApps.find(a => a.app_slug === app.id)?.installed_at || new Date()
                    ).toLocaleDateString()}
                  </p>
                )}
                
                {app.comingSoon ? (
                  <button disabled className="px-4 py-2 bg-slate-800/50 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed">
                    Coming Soon
                  </button>
                ) : installed ? (
                  status === "connected" ? (
                    <Link
                      href={`/dashboard/apps/${app.id}`}
                      className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors"
                    >
                      Configure
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleConnect(app.id)}
                      disabled={isConnecting}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        "Reconnect"
                      )}
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleConnect(app.id)}
                    disabled={isConnecting}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
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

      {/* Developer Section */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-6 mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Want to build your own integration?</h3>
            <p className="text-slate-300">
              Join our developer program and reach thousands of businesses using Demly POS.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-100 transition-colors">
              View API Docs
            </button>
            <button className="px-6 py-3 border border-white/20 text-white font-bold rounded-lg hover:bg-white/10 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  );

}
