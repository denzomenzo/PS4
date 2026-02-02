// app/dashboard/card-terminal/page.tsx - PRODUCTION CARD TERMINAL
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { ArrowLeft, CreditCard, Check, Loader2, AlertCircle, Zap, X, ChevronDown } from "lucide-react";
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
    description: "All-in-one POS with card reader",
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
    description: "Mobile card readers for small businesses",
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
    description: "PayPal's card reader",
    fields: ["apiKey", "clientId"],
    connectionType: 'bluetooth',
    setupGuide: "https://www.zettle.com/gb",
    popularity: 5,
    ukMarketShare: "10%"
  },
  {
    id: "barclaycard",
    name: "Barclaycard Payments",
    logo: "🏦",
    description: "Barclays bank card terminals",
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
    description: "Fast-growing UK provider",
    fields: ["merchantId", "terminalId", "apiKey"],
    connectionType: 'wifi',
    setupGuide: "https://www.dojo.tech/",
    popularity: 7,
    ukMarketShare: "7%"
  },
  {
    id: "clover",
    name: "Clover",
    logo: "☘️",
    description: "All-in-one POS system",
    fields: ["apiToken", "merchantId"],
    connectionType: 'wifi',
    setupGuide: "https://www.clover.com/gb",
    popularity: 8,
    ukMarketShare: "2%"
  }
];

export default function CardTerminal() {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  
  const [enabled, setEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [showProviderList, setShowProviderList] = useState(true);
  
  // Connection fields
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
  
  // Connection status
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);

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
      if (data.provider) setShowProviderList(false);
      
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
      
      // Check if terminal is configured and set connection status
      if (data.enabled && data.provider) {
        setConnectionStatus('connected');
        setIsConnected(true);
        setConnectionMessage("Terminal configured and ready");
      }
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
      
      if (enabled && selectedProvider) {
        setConnectionStatus('connected');
        setIsConnected(true);
        setConnectionMessage("Settings saved - Terminal ready to use");
      }
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

    setTesting(true);
    setConnectionStatus('testing');
    setConnectionMessage("Testing connection to terminal...");

    try {
      const { data, error } = await supabase.functions.invoke('test-card-terminal', {
        body: {
          provider: selectedProvider,
          apiKey,
          deviceId,
          accessToken,
          locationId,
          merchantCode,
          merchantId,
          clientId,
          terminalId,
          terminalIp,
          port,
          apiToken,
          testMode
        }
      });

      if (error) throw error;

      if (data?.success) {
        setConnectionStatus('connected');
        setConnectionMessage(data.message || "✅ Connection successful!");
        setIsConnected(true);
        alert("✅ Terminal connection successful!\n\n" + (data.details || "Terminal is ready to accept payments."));
      } else {
        setConnectionStatus('error');
        setConnectionMessage(data?.error || "Connection test failed");
        setIsConnected(false);
        alert("❌ Connection Failed\n\n" + (data?.error || "Could not connect to terminal"));
      }
    } catch (error: any) {
      console.error("Connection test error:", error);
      setConnectionStatus('error');
      setConnectionMessage("Connection test failed: " + error.message);
      setIsConnected(false);
      alert("❌ Connection Test Failed\n\n" + error.message);
    } finally {
      setTesting(false);
    }
  };

  const connectTerminal = async () => {
    if (!selectedProvider) {
      alert("Please select a provider first");
      return;
    }

    // Validate required fields
    const provider = PROVIDERS.find(p => p.id === selectedProvider);
    if (!provider) return;

    const missingFields = [];
    if (provider.fields.includes("apiKey") && !apiKey) missingFields.push("API Key");
    if (provider.fields.includes("accessToken") && !accessToken) missingFields.push("Access Token");
    if (provider.fields.includes("merchantId") && !merchantId) missingFields.push("Merchant ID");
    if (provider.fields.includes("apiToken") && !apiToken) missingFields.push("API Token");

    if (missingFields.length > 0) {
      alert("⚠️ Missing Required Fields\n\n" + missingFields.join(", "));
      return;
    }

    setConnecting(true);
    setConnectionStatus('testing');
    setConnectionMessage("Establishing connection to terminal...");

    try {
      const { data, error } = await supabase.functions.invoke('connect-card-terminal', {
        body: {
          provider: selectedProvider,
          apiKey,
          deviceId,
          accessToken,
          locationId,
          merchantCode,
          merchantId,
          clientId,
          terminalId,
          terminalIp,
          port,
          apiToken,
          testMode
        }
      });

      if (error) throw error;

      if (data?.success) {
        setConnectionStatus('connected');
        setIsConnected(true);
        setConnectionMessage("✅ Terminal connected and ready");
        
        // Auto-save settings after successful connection
        await saveSettings();
        
        alert("✅ Terminal Connected Successfully!\n\n" + 
          (data.terminal_info || "Terminal is online and ready to accept payments.") +
          "\n\nSettings have been saved automatically.");
      } else {
        setConnectionStatus('error');
        setConnectionMessage(data?.error || "Failed to connect");
        setIsConnected(false);
        alert("❌ Connection Failed\n\n" + (data?.error || "Could not establish connection to terminal"));
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      setConnectionStatus('error');
      setConnectionMessage("Connection failed: " + error.message);
      setIsConnected(false);
      alert("❌ Connection Failed\n\n" + error.message);
    } finally {
      setConnecting(false);
    }
  };

  const changeProvider = () => {
    if (confirm("Change payment provider? This will clear current settings.")) {
      setSelectedProvider("");
      setShowProviderList(true);
      setConnectionStatus('idle');
      setIsConnected(false);
      setConnectionMessage("");
      // Clear all fields
      setApiKey("");
      setDeviceId("");
      setAccessToken("");
      setLocationId("");
      setMerchantCode("");
      setMerchantId("");
      setClientId("");
      setTerminalId("");
      setTerminalIp("");
      setPort("10009");
      setApiToken("");
    }
  };

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider);

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'bluetooth': return '📶';
      case 'wifi': return '📡';
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
    <div className="p-6 max-w-5xl mx-auto">
      
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

          {/* Connection Status */}
          {enabled && selectedProvider && (
            <div className={`mt-4 p-4 rounded-lg border ${
              connectionStatus === 'connected' ? 'bg-primary/5 border-primary/20' :
              connectionStatus === 'error' ? 'bg-destructive/5 border-destructive/20' :
              connectionStatus === 'testing' ? 'bg-blue-500/5 border-blue-500/20' :
              'bg-muted/50 border-border'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-primary animate-pulse' :
                    connectionStatus === 'error' ? 'bg-destructive' :
                    connectionStatus === 'testing' ? 'bg-blue-500 animate-pulse' :
                    'bg-muted-foreground'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${
                      connectionStatus === 'connected' ? 'text-primary' :
                      connectionStatus === 'error' ? 'text-destructive' :
                      'text-foreground'
                    }`}>
                      {connectionStatus === 'connected' ? '✅ Connected' :
                       connectionStatus === 'error' ? '❌ Connection Error' :
                       connectionStatus === 'testing' ? '⏳ Testing...' :
                       'Not Connected'}
                    </p>
                    <p className="text-xs text-muted-foreground">{connectionMessage}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={testConnection}
                    disabled={testing || connecting}
                    className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </button>
                  <button
                    onClick={connectTerminal}
                    disabled={testing || connecting}
                    className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Connect Terminal
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {enabled && (
          <>
            {/* Provider Selection */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">
                  {selectedProvider && !showProviderList ? "Selected Provider" : "Select Payment Provider"}
                </h2>
                {selectedProvider && !showProviderList && (
                  <button
                    onClick={changeProvider}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Change Provider
                  </button>
                )}
              </div>
              
              {showProviderList ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        setShowProviderList(false);
                      }}
                      className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-all text-left bg-background"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{provider.logo}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-bold text-foreground truncate">{provider.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{getConnectionIcon(provider.connectionType)}</span>
                            <span className="capitalize">{provider.connectionType}</span>
                            {provider.ukMarketShare && (
                              <span className="text-primary">• {provider.ukMarketShare}</span>
                            )}
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 text-muted-foreground -rotate-90" />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{provider.description}</p>
                    </button>
                  ))}
                </div>
              ) : currentProvider && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{currentProvider.logo}</span>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{currentProvider.name}</h3>
                      <p className="text-sm text-muted-foreground">{currentProvider.description}</p>
                      <a
                        href={currentProvider.setupGuide}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                      >
                        View Setup Guide →
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Provider Configuration */}
            {currentProvider && !showProviderList && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Terminal Configuration</h2>

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
                        placeholder="sk_live_..."
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
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
                        placeholder="Enter access token..."
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
                        placeholder="Location ID"
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
                        placeholder="Merchant code"
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
                        placeholder="Merchant ID"
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
                        placeholder="Client ID"
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
                        placeholder="Terminal serial"
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("apiToken") && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        API Token *
                      </label>
                      <input
                        type="password"
                        value={apiToken}
                        onChange={(e) => setApiToken(e.target.value)}
                        placeholder="API token"
                        className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  )}

                  {currentProvider.fields.includes("terminalIp") && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Terminal IP
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

                  {/* Test Mode */}
                  <div className="flex items-center justify-between bg-muted/50 border border-border p-4 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Test Mode</h3>
                      <p className="text-xs text-muted-foreground">Use sandbox credentials (no real charges)</p>
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

            {/* Info Box */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <div className="flex gap-4">
                <AlertCircle className="w-6 h-6 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">Setup Instructions</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">1.</span>
                      <span>Select your payment provider above</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">2.</span>
                      <span>Enter your API credentials from the provider's dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">3.</span>
                      <span>Click "Connect Terminal" to establish connection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">4.</span>
                      <span>Test the connection to verify everything works</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">5.</span>
                      <span>Save settings and start accepting payments!</span>
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
              Save Settings
            </>
          )}
        </button>

      </div>
    </div>
  );
}
