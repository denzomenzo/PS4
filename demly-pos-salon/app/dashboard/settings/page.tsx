// app/dashboard/settings/page.tsx - COMPLETE SECURE VERSION
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { logAuditAction } from "@/lib/auditLogger";
import {
  ArrowLeft,
  Lock,
  Mail,
  Shield,
  AlertCircle,
  Check,
  X,
  Loader2,
  Clock,
  FileText,
  Settings as SettingsIcon,
} from "lucide-react";
import Link from "next/link";

interface Staff {
  id: number;
  name: string;
  email: string | null;
  pin: string | null;
  role: "staff" | "manager" | "owner";
  permissions: {
    pos: boolean;
    inventory: boolean;
    reports: boolean;
    settings: boolean;
  };
}

export default function SecureSettings() {
  const userId = useUserId();
  const { staff: currentStaff, logout } = useStaffAuth();

  // Auth State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authStep, setAuthStep] = useState<"email" | "code" | "pin">("email");
  const [licenseEmail, setLicenseEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<Date | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(true);

  // Settings State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopName, setShopName] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [receiptLogoUrl, setReceiptLogoUrl] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for your business!");
  const [staff, setStaff] = useState<Staff[]>([]);

  useEffect(() => {
    if (userId) {
      checkExistingAccess();
      loadData();
    }
  }, [userId]);

  // Timer for session expiry
  useEffect(() => {
    if (!unlockExpiresAt || !isUnlocked) return;

    const interval = setInterval(() => {
      if (new Date() >= unlockExpiresAt) {
        handleSessionExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [unlockExpiresAt, isUnlocked]);

  const checkExistingAccess = () => {
    try {
      const stored = localStorage.getItem("settings_unlock");
      if (stored) {
        const { expiresAt, method } = JSON.parse(stored);
        const expiry = new Date(expiresAt);
        
        if (expiry > new Date()) {
          setIsUnlocked(true);
          setUnlockExpiresAt(expiry);
          setShowAuthModal(false);
          setIsFirstTime(method === "email" ? false : true);
          
          logAuditAction({
            action: "SETTINGS_ACCESS_RESUMED",
            staffId: currentStaff?.id,
          });
        } else {
          localStorage.removeItem("settings_unlock");
        }
      }
    } catch (error) {
      console.error("Error checking access:", error);
    }
  };

  const handleSessionExpired = () => {
    setIsUnlocked(false);
    setShowAuthModal(true);
    setAuthStep(isFirstTime ? "email" : "pin");
    localStorage.removeItem("settings_unlock");
    
    logAuditAction({
      action: "SETTINGS_ACCESS_EXPIRED",
      staffId: currentStaff?.id,
    });

    alert("⏱️ Your settings access has expired. Please authenticate again.");
  };

  const loadData = async () => {
    setLoading(true);

    const [settingsRes, staffRes] = await Promise.all([
      supabase.from("settings").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("staff").select("*").eq("user_id", userId).order("name"),
    ]);

    if (settingsRes.data) {
      setShopName(settingsRes.data.shop_name || "");
      setVatEnabled(settingsRes.data.vat_enabled !== false);
      setBusinessName(settingsRes.data.business_name || settingsRes.data.shop_name || "");
      setBusinessAddress(settingsRes.data.business_address || "");
      setBusinessPhone(settingsRes.data.business_phone || "");
      setBusinessEmail(settingsRes.data.business_email || "");
      setReceiptLogoUrl(settingsRes.data.receipt_logo_url || "");
      setReceiptFooter(settingsRes.data.receipt_footer || "Thank you for your business!");
    }

    if (staffRes.data) setStaff(staffRes.data as Staff[]);

    setLoading(false);
  };

  const sendVerificationEmail = async () => {
    if (!licenseEmail || !licenseEmail.includes("@")) {
      setAuthError("Please enter a valid email address");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      // Get the current user's email from auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAuthError("Not authenticated");
        setAuthLoading(false);
        return;
      }

      console.log("Current user email:", user.email);
      console.log("Entered email:", licenseEmail);

      // Check if the entered email matches the authenticated user's email
      if (user.email?.toLowerCase() !== licenseEmail.toLowerCase()) {
        setAuthError("Email doesn't match your account email");
        setAuthLoading(false);
        return;
      }

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      // Send email
      const { error: emailError } = await supabase.functions.invoke(
        "send-verification-email",
        {
          body: {
            email: licenseEmail,
            code: code,
            type: "settings_access",
          },
        }
      );

      if (emailError) {
        console.error("Email send error:", emailError);
        setAuthError("Failed to send verification email");
        setAuthLoading(false);
        return;
      }

      setAuthStep("code");
      
      logAuditAction({
        action: "SETTINGS_VERIFICATION_EMAIL_SENT",
        staffId: currentStaff?.id,
      });

      alert(`✅ Verification code sent to ${licenseEmail}`);
    } catch (error: any) {
      console.error("Verification error:", error);
      setAuthError(error.message || "Failed to send email");
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode !== sentCode) {
      setAuthError("Invalid verification code");
      return;
    }

    // Grant access for 30 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    localStorage.setItem("settings_unlock", JSON.stringify({
      expiresAt: expiresAt.toISOString(),
      method: "email",
    }));

    setIsUnlocked(true);
    setUnlockExpiresAt(expiresAt);
    setShowAuthModal(false);
    setIsFirstTime(false);
    setAuthError("");

    logAuditAction({
      action: "SETTINGS_ACCESS_GRANTED_EMAIL",
      staffId: currentStaff?.id,
    });
  };

  const verifyPin = async () => {
    if (!currentStaff || pinInput !== currentStaff.pin) {
      setAuthError("Invalid PIN");
      setPinInput("");
      return;
    }

    if (currentStaff.role !== "owner") {
      setAuthError("Only the owner can access settings");
      setPinInput("");
      return;
    }

    // Grant access for 30 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    localStorage.setItem("settings_unlock", JSON.stringify({
      expiresAt: expiresAt.toISOString(),
      method: "pin",
    }));

    setIsUnlocked(true);
    setUnlockExpiresAt(expiresAt);
    setShowAuthModal(false);
    setAuthError("");

    logAuditAction({
      action: "SETTINGS_ACCESS_GRANTED_PIN",
      staffId: currentStaff.id,
    });
  };

  const saveAllSettings = async () => {
    if (!isUnlocked) {
      alert("Settings access has expired. Please re-authenticate.");
      setShowAuthModal(true);
      return;
    }

    setSaving(true);

    try {
      const oldSettings = {
        shop_name: shopName,
        vat_enabled: vatEnabled,
        business_name: businessName,
      };

      const { error } = await supabase.from("settings").upsert({
        user_id: userId,
        shop_name: shopName,
        vat_enabled: vatEnabled,
        business_name: businessName || shopName,
        business_address: businessAddress,
        business_phone: businessPhone,
        business_email: businessEmail,
        receipt_logo_url: receiptLogoUrl,
        receipt_footer: receiptFooter,
      }, { onConflict: "user_id" });

      if (error) throw error;

      await logAuditAction({
        action: "SETTINGS_UPDATED",
        entityType: "settings",
        oldValues: oldSettings,
        newValues: {
          shop_name: shopName,
          vat_enabled: vatEnabled,
          business_name: businessName,
        },
        staffId: currentStaff?.id,
      });

      alert("✅ Settings saved successfully!");
    } catch (error: any) {
      alert("❌ Error saving settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getRemainingTime = () => {
    if (!unlockExpiresAt) return "0:00";
    const now = new Date();
    const diff = unlockExpiresAt.getTime() - now.getTime();
    if (diff <= 0) return "0:00";
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!userId || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Auth Modal
  if (showAuthModal || !isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-6">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full border border-slate-800/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-white mb-2">Secure Access</h1>
            <p className="text-slate-400 text-lg">
              {authStep === "email" && "Verify your identity to access settings"}
              {authStep === "code" && "Enter the verification code"}
              {authStep === "pin" && "Enter your owner PIN"}
            </p>
          </div>

          {authError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 mb-6 text-center flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authStep === "email" && !authError && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-xl p-4 text-blue-400 mb-6 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">First Time Setup</p>
                <p className="text-blue-300">
                  Enter your account email (the one you used to sign up) to verify your identity and access settings.
                </p>
              </div>
            </div>
          )}

          {authStep === "email" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Your Account Email
                </label>
                <input
                  type="email"
                  value={licenseEmail}
                  onChange={(e) => {
                    setLicenseEmail(e.target.value);
                    setAuthError("");
                  }}
                  placeholder="your@email.com"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-2">
                  Enter the email address you used to sign up with
                </p>
              </div>
              <button
                onClick={sendVerificationEmail}
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50"
              >
                {authLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send Verification Code"
                )}
              </button>
              
              {!isFirstTime && (
                <button
                  onClick={() => setAuthStep("pin")}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all"
                >
                  Use PIN Instead
                </button>
              )}
            </div>
          )}

          {authStep === "code" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, ""));
                    setAuthError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                  placeholder="000000"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
                  autoFocus
                />
              </div>
              <button
                onClick={verifyCode}
                disabled={verificationCode.length !== 6}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50"
              >
                Verify & Unlock
              </button>
              <button
                onClick={() => {
                  setAuthStep("email");
                  setVerificationCode("");
                  setAuthError("");
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all"
              >
                Back
              </button>
            </div>
          )}

          {authStep === "pin" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Owner PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, ""));
                    setAuthError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && verifyPin()}
                  placeholder="••••"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20"
                  autoFocus
                />
              </div>
              <button
                onClick={verifyPin}
                disabled={pinInput.length < 4}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50"
              >
                Unlock Settings
              </button>
              <button
                onClick={() => {
                  setAuthStep("email");
                  setPinInput("");
                  setAuthError("");
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all"
              >
                Use Email Instead
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
            <Link
              href="/dashboard"
              className="text-slate-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Settings Content (only shown when unlocked)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header with Timer */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500 flex items-center gap-4">
              <Shield className="w-14 h-14 text-orange-500" />
              Settings
            </h1>
            <p className="text-slate-400 text-lg mt-2">Secure configuration area</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Session Timer */}
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl px-6 py-3">
              <div className="flex items-center gap-2 text-orange-400">
                <Clock className="w-5 h-5" />
                <span className="font-mono font-bold text-lg">{getRemainingTime()}</span>
              </div>
              <p className="text-xs text-slate-500 text-center mt-1">Session Time</p>
            </div>

            <Link
              href="/dashboard/settings/audit-logs"
              className="bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-xl border border-slate-700/50 hover:border-cyan-500/50 rounded-xl px-6 py-3 transition-all flex items-center gap-2"
            >
              <FileText className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold">Audit Logs</span>
            </Link>

            <Link
              href="/dashboard"
              className="bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-xl border border-slate-700/50 rounded-xl px-6 py-3 transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Your existing settings content goes here... */}
        <div className="space-y-8">
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
            <h2 className="text-3xl font-black mb-6">Business Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold mb-3">Business Name</label>
                <input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700/50 p-5 rounded-2xl text-xl"
                />
              </div>

              <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700/50 p-6 rounded-2xl">
                <div>
                  <h3 className="text-xl font-bold mb-1">VAT (20%)</h3>
                  <p className="text-slate-400">Add VAT to all transactions</p>
                </div>
                <button
                  onClick={() => setVatEnabled(!vatEnabled)}
                  className={`relative w-20 h-10 rounded-full transition-all ${
                    vatEnabled ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform ${
                      vatEnabled ? "translate-x-10" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveAllSettings}
            disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-black text-xl py-6 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl"
          >
            {saving ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-6 h-6" />
                Save All Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
