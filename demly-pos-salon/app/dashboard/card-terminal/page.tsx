"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { ArrowLeft, CreditCard, Check, X, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Provider {
  id: string;
  name: string;
  logo: string;
  description: string;
  fields: string[];
}

const PROVIDERS: Provider[] = [
  {
    id: "stripe",
    name: "Stripe Terminal",
    logo: "💳",
    description: "Accept in-person payments with Stripe Terminal readers",
    fields: ["apiKey", "deviceId"],
  },
  {
    id: "square",
    name: "Square Terminal",
    logo: "⬛",
    description: "Process payments with Square Terminal devices",
    fields: ["accessToken", "locationId"],
  },
  {
    id: "sumup",
    name: "SumUp",
    logo: "🔵",
    description: "Mobile card reader for small businesses",
    fields: ["apiKey", "merchantCode"],
  },
  {
    id: "zettle",
    name: "Zettle by PayPal",
    logo: "🅿️",
    description: "PayPal's card payment solution",
    fields: ["apiKey", "clientId"],
  },
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
  const [clientId, setClientId] = useState("");
  const [testMode, setTestMode] = useState(true);

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
      setClientId(data.client_id || "");
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
          client_id: clientId || null,
          test_mode: testMode,
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

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading card terminal settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
            Card Terminal
          </h1>
          <Link href="/" className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
            Back to POS
          </Link>
        </div>

        <div className="space-y-8">
          
          {/* Enable/Disable */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">Card Terminal Integration</h2>
                  <p className="text-slate-400">Accept card payments directly through POS</p>
                </div>
              </div>
              <button
                onClick={() => setEnabled(!enabled)}
                className={`relative w-20 h-10 rounded-full transition-all shadow-lg ${
                  enabled ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform flex items-center justify-center shadow-lg ${
                    enabled ? 'translate-x-10' : 'translate-x-0'
                  }`}
                >
                  {enabled && <Check className="w-5 h-5 text-emerald-500" />}
                </div>
              </button>
            </div>
          </div>

          {enabled && (
            <>
              {/* Provider Selection */}
              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                <h2 className="text-2xl font-black mb-6">Select Payment Provider</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => setSelectedProvider(provider.id)}
                      className={`p-6 rounded-2xl border-2 transition-all text-left ${
                        selectedProvider === provider.id
                          ? 'bg-cyan-500/20 backdrop-blur-lg border-cyan-500 shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-900/50 backdrop-blur-lg border-slate-700/50 hover:border-slate-600/50'
                      }`}
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-4xl">{provider.logo}</span>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{provider.name}</h3>
                        </div>
                        {selectedProvider === provider.id && (
                          <Check className="w-6 h-6 text-cyan-400" />
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{provider.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider Configuration */}
              {currentProvider && (
                <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                  <h2 className="text-2xl font-black mb-6">Configure {currentProvider.name}</h2>

                  <div className="space-y-6">
                    {currentProvider.fields.includes("apiKey") && (
                      <div>
                        <label className="block text-xl font-semibold mb-3 text-slate-300">API Key / Access Token *</label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your API key..."
                          className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        />
                      </div>
                    )}

                    {currentProvider.fields.includes("deviceId") && (
                      <div>
                        <label className="block text-xl font-semibold mb-3 text-slate-300">Device ID / Reader ID</label>
                        <input
                          type="text"
                          value={deviceId}
                          onChange={(e) => setDeviceId(e.target.value)}
                          placeholder="e.g. tmr_xxxxxxxxxxxxx"
                          className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        />
                      </div>
                    )}

                    {currentProvider.fields.includes("accessToken") && (
                      <div>
                        <label className="block text-xl font-semibold mb-3 text-slate-300">Access Token *</label>
                        <input
                          type="password"
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          placeholder="Enter your access token..."
                          className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        />
                      </div>
                    )}

                    {currentProvider.fields.includes("locationId") && (
                      <div>
                        <label className="block text-xl font-semibold mb-3 text-slate-300">Location ID</label>
                        <input
                          type="text"
                          value={locationId}
                          onChange={(e) => setLocationId(e.target.value)}
                          placeholder="Your business location ID"
                          className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        />
                      </div>
                    )}

                    {currentProvider.fields.includes("merchantCode") && (
                      <div>
                        <label className="block text-xl font-semibold mb-3 text-slate-300">Merchant Code</label>
                        <input
                          type="text"
                          value={merchantCode}
                          onChange={(e) => setMerchantCode(e.target.value)}
                          placeholder="Your merchant code"
                          className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        />
                      </div>
                    )}

                    {currentProvider.fields.includes("clientId") && (
                      <div>
                        <label className="block text-xl font-semibold mb-3 text-slate-300">Client ID</label>
                        <input
                          type="text"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          placeholder="Your client ID"
                          className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                        />
                      </div>
                    )}

                    {/* Test Mode Toggle */}
                    <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-xl hover:border-slate-600/50 transition-all">
                      <div>
                        <h3 className="text-lg font-bold">Test Mode</h3>
                        <p className="text-sm text-slate-400">Use test credentials for development</p>
                      </div>
                      <button
                        onClick={() => setTestMode(!testMode)}
                        className={`relative w-16 h-8 rounded-full transition-all ${
                          testMode ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                            testMode ? 'translate-x-8' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-500/20 backdrop-blur-lg border border-blue-500/30 rounded-3xl p-6 shadow-lg">
                <div className="flex gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-blue-400">Setup Instructions</h3>
                    <ul className="space-y-2 text-slate-300">
                      <li>• Create an account with your chosen payment provider</li>
                      <li>• Generate API keys/access tokens from their dashboard</li>
                      <li>• For hardware terminals, pair the device first</li>
                      <li>• Use test mode during setup to avoid real charges</li>
                      <li>• Test transactions before going live</li>
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
            className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 py-6 rounded-3xl text-2xl font-bold transition-all shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <Loader2 className="w-7 h-7 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-7 h-7" />
                Save Card Terminal Settings
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}