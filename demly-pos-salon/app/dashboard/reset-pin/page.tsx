// app/dashboard/reset-pin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowLeft, Loader2, Check, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ResetPinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [staffId, setStaffId] = useState<number | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");
      setEmail(user.email || "");
      setLoading(false);
    } catch (error) {
      console.error("Error checking auth:", error);
      router.push("/login");
    }
  };

  const sendVerificationCode = async () => {
    if (!email || !email.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }

    if (email !== userEmail) {
      setError("Email must match your account email: " + userEmail);
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // Find staff member with this email
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("id, name")
        .eq("user_id", userId)
        .eq("email", email)
        .single();

      if (staffError || !staffData) {
        setError("No staff member found with this email");
        setProcessing(false);
        return;
      }

      setStaffId(staffData.id);

      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      // Send verification email
      const { error: functionError } = await supabase.functions.invoke(
        'send-verification-email',
        {
          body: {
            email: email,
            code: code,
            staffName: staffData.name,
            type: "pin_reset"
          }
        }
      );

      if (functionError) {
        console.error("Error sending email:", functionError);
        setError("Failed to send verification email. Please try again.");
        setProcessing(false);
        return;
      }

      setStep(2);
      setProcessing(false);
    } catch (error: any) {
      console.error("Error:", error);
      setError("Failed to send verification code: " + error.message);
      setProcessing(false);
    }
  };

  const verifyCodeAndSetPin = async () => {
    if (verificationCode !== sentCode) {
      setError("Invalid verification code");
      return;
    }

    if (!newPin || newPin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("staff")
        .update({ pin: newPin })
        .eq("id", staffId)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating PIN:", updateError);
        setError("Failed to update PIN: " + updateError.message);
        setProcessing(false);
        return;
      }

      alert("✅ PIN reset successfully! You can now login with your new PIN.");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error:", error);
      setError("Failed to reset PIN: " + error.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-6">
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full border border-slate-800/50 shadow-2xl">
        
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Login
          </Link>
        </div>

        {/* Step 1: Enter Email */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                <Lock className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-2">
                Reset Your PIN
              </h1>
              <p className="text-slate-400 text-lg">
                We'll send you a verification code
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Your Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="your@email.com"
                    className="w-full bg-slate-800/50 border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Use the email associated with your staff account
                </p>
              </div>
            </div>

            <button
              onClick={sendVerificationCode}
              disabled={processing || !email}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending Code...
                </>
              ) : (
                "Send Verification Code"
              )}
            </button>
          </div>
        )}

        {/* Step 2: Verify & Set New PIN */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Check Your Email</h2>
              <p className="text-slate-400">We sent a 6-digit code to</p>
              <p className="text-white font-bold text-lg mt-1">{email}</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, ''));
                    setError("");
                  }}
                  placeholder="000000"
                  className="w-full bg-slate-800/50 border border-slate-700/50 px-6 py-5 rounded-xl text-center text-3xl font-bold tracking-widest text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New PIN (4-6 digits)
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => {
                      setNewPin(e.target.value.replace(/\D/g, ''));
                      setError("");
                    }}
                    placeholder="Enter new PIN"
                    className="w-full bg-slate-800/50 border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm New PIN
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => {
                      setConfirmPin(e.target.value.replace(/\D/g, ''));
                      setError("");
                    }}
                    placeholder="Confirm new PIN"
                    className="w-full bg-slate-800/50 border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={verifyCodeAndSetPin}
                disabled={processing || verificationCode.length !== 6 || !newPin || !confirmPin}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting PIN...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Reset PIN
                  </>
                )}
              </button>

              <button
                onClick={sendVerificationCode}
                disabled={processing}
                className="w-full text-sm text-emerald-400 hover:text-emerald-300 transition-colors py-2"
              >
                Resend Verification Code
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Need help?{" "}
            <a href="mailto:support@demly.com" className="text-emerald-400 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}