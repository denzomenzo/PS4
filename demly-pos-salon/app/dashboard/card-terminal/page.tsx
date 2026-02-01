// app/dashboard/card-terminal/page.tsx - COMPLETE CARD TERMINAL INTEGRATION
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { ArrowLeft, CreditCard, Check, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Provider {
  id: string;
  name: string;
  logo: string;
  description: string;
  fields: string[];
  connectionType: 'api' | 'bluetooth' | 'wifi';
  setupGuide: string;
  popularity: number;
  ukMarketShare?: string;
}

const PROVIDERS: Provider[] = [
  // TOP PROVIDERS
  {
    id: "worldpay",
    name: "Worldpay",
    logo: "🌍",
    description: "UK's leading payment processor - FIS Worldpay terminals",
    fields: ["merchantId", "terminalId", "apiKey"],
    connectionType: 'wifi',
    setupGuide: "https://developer.worldpay.com/",
    popularity: 1,
    ukMarketShare: "25%"
  },
  {
    id: "stripe",
    name: "Stripe Terminal",
    logo: "💳",
    description: "Modern payment platform - BBPOS WisePad 3, Verifone P400",
    fields: ["apiKey", "deviceId"],
    connectionType: 'bluetooth',
    setupGuide: "https://stripe.com/gb/terminal",
    popularity: 2,
    ukMarketShare: "18%"
  },
  {
    id: "square",
    name: "Square",
    logo: "⬛",
    description: "All-in-one POS with card reader - Very popular for small businesses",
    fields: ["accessToken", "locationId"],
    connectionType: 'wifi',
    setupGuide: "https://squareup.com/gb/en",
    popularity: 3,
    ukMarketShare: "15%"
  },
  {
    id: "sumup",
    name: "SumUp",
    logo: "🔵",
    description: "Mobile card readers - Very popular with sole traders & small shops",
    fields: ["apiKey", "merchantCode"],
    connectionType: 'bluetooth',
    setupGuide: "https://sumup.co.uk/",
    popularity: 4,
    ukMarketShare: "12%"
  },
  {
    id: "zettle",
    name: "Zettle by PayPal",
    logo: "🅿️",
    description: "PayPal's card reader - Popular with market stalls & mobile vendors",
    fields: ["apiKey", "clientId"],
    connectionType: 'bluetooth',
    setupGuide: "https://www.zettle.com/gb",
    popularity: 5,
    ukMarketShare: "10%"
  },
  // OTHER MAJOR UK PROVIDERS
  {
    id: "barclaycard",
    name: "Barclaycard Payments",
    logo: "🏦",
    description: "Barclays bank card terminals - Smartpay series",
    fields: ["merchantId", "terminalId", "apiKey"],
    connectionType: 'wifi',
    setupGuide: "https://www.barclaycard.co.uk/business/accepting-payments",
    popularity: 6,
    ukMarketShare: "8%"
  },
  {
    id: "dojo",
    name: "Dojo (Paymentsense)",
    logo: "🥋",
    description: "Fast-growing UK provider - Portable & countertop terminals",
    fields: ["merchantId", "terminalId", "apiKey"],
    connectionType: 'wifi',
    setupGuide: "https://www.dojo.tech/",
    popularity: 7,
    ukMarketShare: "7%"
  },
  {
    id: "lloyds-cardnet",
    name: "Lloyds Cardnet",
    logo: "🐴",
    description: "Lloyds Banking Group's payment service",
    fields: ["merchantId", "terminalId"],
    connectionType: 'wifi',
    setupGuide: "https://www.lloydsbankinggroup.com/",
    popularity: 8,
    ukMarketShare: "6%"
  },
  {
    id: "elavon",
    name: "Elavon",
    logo: "🔷",
    description: "Global payment processor with strong UK presence",
    fields: ["merchantId", "terminalId", "apiKey"],
    connectionType: 'wifi',
    setupGuide: "https://www.elavon.co.uk/",
    popularity: 9,
    ukMarketShare: "5%"
  },
  {
    id: "handepay",
    name: "Handepay",
    logo: "🤝",
    description: "UK mobile card payment specialist",
    fields: ["merchantCode", "apiKey"],
    connectionType: 'bluetooth',
    setupGuide: "https://www.handepay.co.uk/",
    popularity: 10,
    ukMarketShare: "4%"
  },
  {
    id: "takepayments",
    name: "takepayments",
    logo: "💷",
    description: "UK card payment solutions - Portable terminals",
    fields: ["merchantId", "apiKey"],
    connectionType: 'bluetooth',
    setupGuide: "https://www.takepayments.com/",
    popularity: 11,
    ukMarketShare: "3%"
  },
  {
    id: "clover",
    name: "Clover",
    logo: "☘️",
    description: "All-in-one POS system by First Data",
    fields: ["apiToken", "merchantId"],
    connectionType: 'wifi',
    setupGuide: "https://www.clover.com/gb",
    popularity: 12,
    ukMarketShare: "2%"
  },
  {
    id: "pax",
    name: "PAX Technology",
    logo: "🏧",
    description: "PAX countertop terminals - A920, A80, popular in restaurants",
    fields: ["terminalId", "merchantId"],
    connectionType: 'wifi',
    setupGuide: "https://www.paxtechnology.com/",
    popularity: 13
  },
  {
    id: "ingenico",
    name: "Ingenico/Worldline",
    logo: "🌐",
    description: "Enterprise-grade terminals - Move 5000, Desk 5000",
    fields: ["terminalIp", "port"],
    connectionType: 'wifi',
    setupGuide: "https://www.ingenico.com/",
    popularity: 14
  },
  {
    id: "verifone",
    name: "Verifone",
    logo: "✓",
    description: "Global payment terminals - V400m series",
    fields: ["terminalId", "merchantId"],
    connectionType: 'wifi',
    setupGuide: "https://www.verifone.com/",
    popularity: 15
  }
];

export default function CardTerminal() {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [enabled, setEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [apiKey, setApiKey] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [locationId, setLocationId] = useState("");
  const [merchantCode, setMerchantCode] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [clientId, setClientId] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [terminalIp, setTerminalIp] = useState("");
  const [port, setPort] = useState("10009");
  const [apiToken, setApiToken] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("Not connected");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from("card_terminal_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setEnabled(data.enabled || false);
      setSelectedProvider(data.provider || "");
      setApiKey(data.api_key || "");
      setDeviceId(data.device_id || "");
      setAccessToken(data.access_token || "");
      setLocationId(data.location_id || "");
      setMerchantCode(data.merchant_code || "");
      setMerchantId(data.merchant_id || "");
      setClientId(data.client_id || "");
      setTerminalId(data.terminal_id || "");
      setTerminalIp(data.terminal_ip || "");
      setPort(data.port || "10009");
      setApiToken(data.api_token || "");
      setTestMode(data.test_mode !== false);
    }
    
    setLoading(false);
  };

  const saveSettings = async () => {
    if (enabled && !selectedProvider) {
      alert("Please select a payment provider");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("card_terminal_settings")
        .upsert({
          user_id: userId,
          enabled,
          provider: selectedProvider,
          api_key: apiKey || null,
          device_id: deviceId || null,
          access_token: accessToken || null,
          location_id: locationId || null,
          merchant_code: merchantCode || null,
          merchant_id: merchantId || null,
          client_id: clientId || null,
          terminal_id: terminalId || null,
          terminal_ip: terminalIp || null,
          port: port || null,
          api_token: apiToken || null,
          test_mode: testMode,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      alert("✅ Card terminal settings saved!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert("❌ Error saving settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!selectedProvider) {
      alert("Please select a provider first");
      return;
    }

    setConnectionStatus("Testing connection...");
    
    try {
      const { data, error } = await supabase.functions.invoke('test-card-terminal', {
        body: {
          provider: selectedProvider,
          apiKey,
          deviceId,
          accessToken,
          terminalIp,
          port,
          testMode
        }
      });

      if (error) throw error;

      if (data?.connected) {
        setIsConnected(true);
        setConnectionStatus("✅ Connected successfully!");
        alert("✅ Terminal connected successfully!");
      } else {
        setIsConnected(false);
        setConnectionStatus("❌ Connection failed");
        alert("❌ Could not connect to terminal: " + (data?.error || "Unknown error"));
      }
    } catch (error: any) {
      console.error("Connection test error:", error);
      setIsConnected(false);
      setConnectionStatus("❌ Connection failed");
      alert("❌ Connection test failed: " + error.message);
    }
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider);

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'bluetooth': return '📶';
      case 'wifi': return '📡';
      case 'usb': return '🔌';
      default: return '🌐';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Loading card terminal settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Card Terminal</h1>
          <p className="text-muted-foreground mt-2">Configure physical card payment devices</p>
        </div>
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>

      <div className="space-y-6">
        
        {/* Enable/Disable */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Card Terminal Integration</h2>
                <p className="text-muted-foreground text-sm">Accept card payments through physical terminals</p>
              </div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-16 h-8 rounded-full transition-all ${
                enabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-background rounded-full transition-transform flex items-center justify-center ${
                  enabled ? 'translate-x-8' : 'translate-x-0'
                }`}
              >
                {enabled && <Check className="w-4 h-4 text-primary" />}
              </div>
            </button>
          </div>

          {enabled && currentProvider && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className="text-sm text-foreground">{connectionStatus}</span>
                </div>
                <button
                  onClick={testConnection}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
                >
                  Test Connection
                </button>
              </div>
            </div>
          )}
        </div>

        {enabled && (
          <>
            {/* Provider Selection */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Select Payment Provider</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedProvider === provider.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-muted/50 border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{provider.logo}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-foreground truncate">{provider.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{getConnectionIcon(provider.connectionType)}</span>
                          <span className="capitalize">{provider.connectionType}</span>
                          {provider.ukMarketShare && (
                            <span className="ml-2 text-primary">• {provider.ukMarketShare}</span>
                          )}
                        </div>
                      </div>
                      {selectedProvider === provider.id && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{provider.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Configuration */}
            {currentProvider && (
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-foreground">Configure {currentProvider.name}</h2>
                  <a
                    href={currentProvider.setupGuide}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Setup Guide →
                  </a>
                </div>

                <div className="space-y-4">
                  {currentProvider.fields.includes("apiKey") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        API Key / Secret Key *
                      </label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk_test_..."
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Find this in your {currentProvider.name} dashboard under API settings
                      </p>
                    </div>
                  )}

                  {currentProvider.fields.includes("deviceId") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Device ID / Reader ID
                      </label>
                      <input
                        type="text"
                        value={deviceId}
                        onChange={(e) => setDeviceId(e.target.value)}
                        placeholder="tmr_xxxxxxxxxxxxx"
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pair your reader first, then enter its ID here
                      </p>
                    </div>
                  )}

                  {currentProvider.fields.includes("accessToken") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Access Token *
                      </label>
                      <input
                        type="password"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        placeholder="Enter your access token..."
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("locationId") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Location ID
                      </label>
                      <input
                        type="text"
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        placeholder="Your business location ID"
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("merchantCode") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Merchant Code
                      </label>
                      <input
                        type="text"
                        value={merchantCode}
                        onChange={(e) => setMerchantCode(e.target.value)}
                        placeholder="Your merchant code"
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("merchantId") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Merchant ID
                      </label>
                      <input
                        type="text"
                        value={merchantId}
                        onChange={(e) => setMerchantId(e.target.value)}
                        placeholder="Your merchant ID"
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("clientId") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Client ID
                      </label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        placeholder="Your client ID"
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("terminalId") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Terminal ID
                      </label>
                      <input
                        type="text"
                        value={terminalId}
                        onChange={(e) => setTerminalId(e.target.value)}
                        placeholder="Terminal serial number"
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("apiToken") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        API Token
                      </label>
                      <input
                        type="password"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        placeholder="Your API token"
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("terminalIp") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Terminal IP Address
                        </label>
                        <input
                          type="text"
                          value={terminalIp}
                          onChange={(e) => setTerminalIp(e.target.value)}
                          placeholder="192.168.1.100"
                          className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Port
                        </label>
                        <input
                          type="text"
                          value={port}
                          onChange={(e) => setPort(e.target.value)}
                          placeholder="10009"
                          className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {/* Test Mode Toggle */}
                  <div className="flex items-center justify-between bg-muted/50 border border-border p-4 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Test Mode</h3>
                      <p className="text-xs text-muted-foreground">Use test credentials (no real charges)</p>
                    </div>
                    <button
                      onClick={() => setTestMode(!testMode)}
                      className={`relative w-14 h-7 rounded-full transition-all ${
                        testMode ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-background rounded-full transition-transform ${
                          testMode ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Setup Instructions */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <div className="flex gap-4">
                <AlertCircle className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">Setup Instructions</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">1.</span>
                      <span>Create account with your chosen provider and get API credentials</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">2.</span>
                      <span>For Bluetooth readers: Pair device in your device settings first</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">3.</span>
                      <span>For WiFi terminals: Ensure terminal is on same network as POS</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">4.</span>
                      <span>Enable test mode and test transactions before going live</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">5.</span>
                      <span>Click "Test Connection" to verify terminal is reachable</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full bg-primary hover:opacity-90 text-primary-foreground py-4 rounded-xl text-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-6 h-6" />
              Save Card Terminal Settings
            </>
          )}
        </button>

      </div>
    </div>
  );
}
