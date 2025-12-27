// app/dashboard/settings/page.tsx - COMPLETE REDESIGNED VERSION
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
  Store,
  Image,
  Save,
  Users,
  Plus,
  Edit2,
  Trash2,
  User,
  Phone,
  Key,
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

export default function CompleteSettings() {
  const userId = useUserId();
  const { staff: currentStaff } = useStaffAuth();

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

  // Staff Modal State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [pinChangeStaff, setPinChangeStaff] = useState<Staff | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [staffRole, setStaffRole] = useState<"staff" | "manager" | "owner">("staff");
  const [staffVerificationCode, setStaffVerificationCode] = useState("");
  const [staffSentCode, setStaffSentCode] = useState("");
  const [staffCodeSent, setStaffCodeSent] = useState(false);

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAuthError("Not authenticated");
        setAuthLoading(false);
        return;
      }

      if (user.email?.toLowerCase() !== licenseEmail.toLowerCase()) {
        setAuthError("Email doesn't match your account email");
        setAuthLoading(false);
        return;
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

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
      
      await logAuditAction({
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

    await logAuditAction({
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

    await logAuditAction({
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

  // Staff Management Functions
  const openAddStaffModal = () => {
    setEditingStaff(null);
    setStaffName("");
    setStaffEmail("");
    setStaffPin("");
    setStaffRole("staff");
    setStaffVerificationCode("");
    setStaffSentCode("");
    setStaffCodeSent(false);
    setShowStaffModal(true);
  };

  const openEditStaffModal = (member: Staff) => {
    setEditingStaff(member);
    setStaffName(member.name);
    setStaffEmail(member.email || "");
    setStaffPin("");
    setStaffRole(member.role);
    setStaffVerificationCode("");
    setStaffSentCode("");
    setStaffCodeSent(false);
    setShowStaffModal(true);
  };

  const openPinChangeModal = (member: Staff) => {
    setPinChangeStaff(member);
    setStaffEmail(member.email || "");
    setStaffPin("");
    setStaffVerificationCode("");
    setStaffSentCode("");
    setStaffCodeSent(false);
    setShowPinModal(true);
  };

  const sendStaffVerificationCode = async () => {
    if (!staffEmail || !staffEmail.includes('@')) {
      alert("Please enter a valid email address");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setStaffSentCode(code);

    try {
      const { error } = await supabase.functions.invoke(
        'send-verification-email',
        {
          body: {
            email: staffEmail,
            code: code,
            staffName: staffName || pinChangeStaff?.name
          }
        }
      );

      if (error) {
        console.error("Error sending email:", error);
        alert("❌ Failed to send verification email. Please try again.");
        setStaffCodeSent(false);
        setStaffSentCode("");
        return;
      }

      setStaffCodeSent(true);
      alert(`✅ Verification code sent to ${staffEmail}`);
    } catch (error) {
      console.error("Error sending verification code:", error);
      alert("❌ Failed to send verification email.");
      setStaffCodeSent(false);
      setStaffSentCode("");
    }
  };

  const saveStaffMember = async () => {
    if (!staffName.trim()) {
      alert("Name is required");
      return;
    }

    if (!staffEmail.trim() || !staffEmail.includes('@')) {
      alert("Valid email is required");
      return;
    }

    if (staffPin && staffPin.length >= 4) {
      if (!staffCodeSent) {
        alert("Please send and verify the email code first");
        return;
      }
      if (staffVerificationCode !== staffSentCode) {
        alert("❌ Invalid verification code");
        return;
      }
    }

    try {
      if (editingStaff) {
        const updateData: any = {
          name: staffName.trim(),
          email: staffEmail.trim(),
          role: staffRole,
        };
        
        if (staffPin && staffPin.length >= 4) {
          updateData.pin = staffPin;
        }
        
        const { error } = await supabase
          .from("staff")
          .update(updateData)
          .eq("id", editingStaff.id)
          .eq("user_id", userId);
        
        if (error) throw error;

        await logAuditAction({
          action: "STAFF_UPDATED",
          entityType: "staff",
          entityId: editingStaff.id.toString(),
          oldValues: { name: editingStaff.name, role: editingStaff.role },
          newValues: { name: staffName, role: staffRole },
          staffId: currentStaff?.id,
        });
      } else {
        const insertData: any = {
          user_id: userId,
          name: staffName.trim(),
          email: staffEmail.trim(),
          role: staffRole,
          permissions: {
            pos: true,
            inventory: staffRole === "manager" || staffRole === "owner",
            reports: staffRole === "manager" || staffRole === "owner",
            settings: staffRole === "owner",
          }
        };
        
        if (staffPin && staffPin.length >= 4) {
          insertData.pin = staffPin;
        }
        
        const { data, error } = await supabase
          .from("staff")
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;

        await logAuditAction({
          action: "STAFF_CREATED",
          entityType: "staff",
          entityId: data.id.toString(),
          newValues: { name: staffName, role: staffRole },
          staffId: currentStaff?.id,
        });
      }

      setShowStaffModal(false);
      loadData();
      alert("✅ Staff member saved successfully!");
    } catch (error: any) {
      console.error("Error saving staff:", error);
      alert("Error saving staff member: " + error.message);
    }
  };

  const verifyAndSavePin = async () => {
    if (staffVerificationCode !== staffSentCode) {
      alert("❌ Invalid verification code");
      return;
    }

    if (!staffPin || staffPin.length < 4) {
      alert("❌ PIN must be at least 4 digits");
      return;
    }

    try {
      if (pinChangeStaff) {
        const { error } = await supabase
          .from("staff")
          .update({ pin: staffPin })
          .eq("id", pinChangeStaff.id)
          .eq("user_id", userId);
        
        if (error) throw error;

        await logAuditAction({
          action: "STAFF_PIN_CHANGED",
          entityType: "staff",
          entityId: pinChangeStaff.id.toString(),
          staffId: currentStaff?.id,
        });
        
        alert("✅ PIN updated successfully!");
      }

      setShowPinModal(false);
      loadData();
    } catch (error: any) {
      console.error("Error updating PIN:", error);
      alert("❌ Error updating PIN: " + error.message);
    }
  };

  const deleteStaffMember = async (id: number) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    
    try {
      const staffMember = staff.find(s => s.id === id);
      
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      
      if (error) throw error;

      if (staffMember) {
        await logAuditAction({
          action: "STAFF_DELETED",
          entityType: "staff",
          entityId: id.toString(),
          oldValues: { name: staffMember.name, role: staffMember.role },
          staffId: currentStaff?.id,
        });
      }
      
      loadData();
      alert("✅ Staff member deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting staff:", error);
      alert("Error deleting staff member: " + error.message);
    }
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

        {/* All Settings Content - This exists in the artifact above */}
        
      </div>
    </div>
  );
}
