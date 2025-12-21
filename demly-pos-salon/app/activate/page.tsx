// app/activate/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Key, Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ActivatePage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    setUserEmail(session.user.email || "");

    // Check if already has active license
    const { data: license } = await supabase
      .from("licenses")
      .select("status")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .single();

    if (license) {
      router.push("/dashboard");
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("Please log in first");
        setLoading(false);
        return;
      }

      // Normalize license key (remove spaces, uppercase)
      const normalizedKey = licenseKey.trim().toUpperCase().replace(/\s+/g, '-');

      // Check if license exists and is valid
      const { data: license, error: fetchError } = await supabase
        .from("licenses")
        .select("*")
        .eq("license_key", normalizedKey)
        .single();

      if (fetchError || !license) {
        setError("Invalid license key. Please check and try again.");
        setLoading(false);
        return;
      }

      if (license.user_id) {
        setError("This license key has already been activated.");
        setLoading(false);
        return;
      }

      if (license.status !== "active") {
        setError("This license is not active. Please contact support.");
        setLoading(false);
        return;
      }

      // Check if license is expired
      if (new Date(license.expires_at) < new Date()) {
        setError("This license has expired. Please renew your subscription.");
        setLoading(false);
        return;
      }

      // Activate the license by assigning it to the user
      const { error: updateError } = await supabase
        .from("licenses")
        .update({ user_id: session.user.id })
        .eq("license_key", normalizedKey);

      if (updateError) {
        setError("Failed to activate license. Please try again.");
        setLoading(false);
        return;
      }

      // Create settings entry with business name from license email or default
      const { error: settingsError } = await supabase
        .from("settings")
        .insert({
          user_id: session.user.id,
          business_name: "My Business",
          vat_enabled: true,
        });

      if (settingsError) {
        console.error("Settings creation error:", settingsError);
        // Don't fail activation if settings creation fails
      }

      setSuccess(true);
      setLoading(false);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);

    } catch (err: any) {
      console.error("Activation error:", err);
      setError(err.message || "An error occurred during activation");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-12 max-w-md w-full border border-slate-800/50 text-center shadow-2xl">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 blur-3xl opacity-20 animate-pulse"></div>
            <CheckCircle className="w-24 h-24 text-emerald-400 mx-auto relative z-10" />
          </div>
          
          <h1 className="text-5xl font-black text-white mb-4">
            License Activated!
          </h1>
          
          <p className="text-xl text-slate-300 mb-8">
            Your Demly POS account is now active
          </p>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6">
            <p className="text-emerald-400 font-bold text-lg">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 border border-slate-800/50 shadow-2xl">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <Key className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-4">
              Activate Your License
            </h1>
            <p className="text-slate-400 text-lg">
              Enter your license key to unlock Demly POS
            </p>
          </div>

          {/* Current User Info */}
          <div className="bg-slate-800/30 rounded-xl p-4 mb-8 border border-slate-700/50">
            <p className="text-slate-400 text-sm mb-1">Activating for:</p>
            <p className="text-white font-bold text-lg">{userEmail}</p>
          </div>

          {/* Activation Form */}
          <form onSubmit={handleActivate} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-start gap-3 text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold mb-1">Activation Failed</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-white mb-3 text-sm font-semibold">
                License Key
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-6 py-5 text-center text-2xl font-bold tracking-widest text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all uppercase"
                maxLength={19}
                autoFocus
              />
              <p className="text-slate-500 text-sm mt-3 text-center">
                Your license key was sent to your email after purchase
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || licenseKey.length < 10}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-6 rounded-xl transition-all disabled:opacity-50 text-xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Activating License...
                </>
              ) : (
                <>
                  <Key className="w-6 h-6" />
                  Activate License
                </>
              )}
            </button>
          </form>

          {/* Help Section */}
          <div className="mt-8 pt-8 border-t border-slate-700/50 space-y-4">
            <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="text-xl">💡</span>
                Don't have a license key?
              </h3>
              <p className="text-slate-400 mb-4">
                Purchase a license to unlock full access to Demly POS
              </p>
              <Link
                href="/pay"
                className="inline-block bg-gradient-to-r from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 px-6 py-3 rounded-xl font-bold transition-all"
              >
                Purchase License
              </Link>
            </div>

            <div className="text-center">
              <p className="text-slate-500 text-sm">
                Having trouble? Check your spam folder or{" "}
                <a href="mailto:support@demly.com" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                  contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
