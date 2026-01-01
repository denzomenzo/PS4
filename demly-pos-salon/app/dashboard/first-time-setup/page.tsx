// app/dashboard/first-time-setup/page.tsx
// This page handles first-time setup for new license holders
// It checks if staff exists, and if not, guides them through creating an owner account
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, User, Check, Loader2, AlertCircle } from "lucide-react";

export default function FirstTimeSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // User info
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Form data
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  
  // Email verification
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    checkIfSetupNeeded();
  }, []);

  const checkIfSetupNeeded = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");
      setOwnerEmail(user.email || "");

      // Check if staff already exists
      const { data: existingStaff } = await supabase
        .from("staff")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (existingStaff && existingStaff.length > 0) {
        // Staff exists, redirect to normal login
        router.push("/dashboard");
        return;
      }

      // Get business info from settings or user metadata
      const { data: settings } = await supabase
        .from("settings")
        .select("business_name, shop_name")
        .eq("user_id", user.id)
        .single();

      if (settings?.shop_name) {
        setBusinessName(settings.shop_name);
      } else if (settings?.business_name) {
        setBusinessName(settings.business_name);
      } else if (user.user_metadata?.business_name) {
        setBusinessName(user.user_metadata.business_name);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking setup:", error);
      setLoading(false);
    }
  };

  const sendVerificationCode = async () => {
    if (!ownerEmail || !ownerEmail.includes('@')) {
      setError("Please enter a valid email address");
      return;
    }

    if (ownerEmail !== userEmail) {
      setError("Email must match your license email: " + userEmail);
      return;
    }

    setProcessing(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);

    try {
      const { error: functionError } = await supabase.functions.invoke(
        'send-verification-email',
        {
          body: {
            email: ownerEmail,
            code: code,
            staffName: ownerName || "Owner"
          }
        }
      );

      if (functionError) {
        console.error("Error sending email:", functionError);
        setError("Failed to send verification email. Please check your email and try again.");
        setProcessing(false);
        return;
      }

      setCodeSent(true);
      setStep(3);
      setError("");
      setProcessing(false);
    } catch (error) {
      console.error("Error:", error);
      setError("Failed to send verification email. Please try again.");
      setProcessing(false);
    }
  };

  const completeSetup = async () => {
    if (verificationCode !== sentCode) {
      setError("Invalid verification code");
      return;
    }

    if (!ownerPin || ownerPin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    if (ownerPin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    setProcessing(true);

    try {
      // Create owner staff member
      const { error: staffError } = await supabase
        .from("staff")
        .insert({
          user_id: userId,
          name: ownerName || "Owner",
          email: ownerEmail,
          pin: ownerPin,
          role: "owner",
          permissions: {
            pos: true,
            inventory: true,
            reports: true,
            settings: true,
          }
        });

              // Success! Redirect to dashboard
              alert("✅ Setup complete! You can now login with your PIN.");
    
              // Clear the first-time setup flag
              localStorage.removeItem('isFirstTimeSetup');
    
              // Set completion flag
              localStorage.setItem('firstTimeSetupCompleted', 'true');
    
              router.push("/dashboard");
            } catch (error: any) {
              // ... error handling ...
            }
          };

      if (staffError) {
        console.error("Error creating staff:", staffError);
        setError("Failed to create owner account: " + staffError.message);
        setProcessing(false);
        return;
      }

      // Update business name in settings
      if (businessName) {
        await supabase
          .from("settings")
          .upsert({
            user_id: userId,
            shop_name: businessName,
            business_name: businessName,
            vat_enabled: true,
          });
      }

      // Success! Redirect to dashboard
      alert("✅ Setup complete! You can now login with your PIN.");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error:", error);
      setError("Failed to complete setup: " + error.message);
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
      <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 max-w-2xl w-full border border-slate-800/50 shadow-2xl">
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
              step >= 1 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
            }`}>
              {step > 1 ? <Check className="w-5 h-5" /> : "1"}
            </div>
            <div className={`h-1 w-16 ${step >= 2 ? "bg-emerald-500" : "bg-slate-700"}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
              step >= 2 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
            }`}>
              {step > 2 ? <Check className="w-5 h-5" /> : "2"}
            </div>
            <div className={`h-1 w-16 ${step >= 3 ? "bg-emerald-500" : "bg-slate-700"}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
              step >= 3 ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <span className="text-5xl">👋</span>
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-4">
              Welcome to Demly POS!
            </h1>
            <p className="text-xl text-slate-300 mb-2">
              Let's get you set up in just a few steps
            </p>
            <p className="text-slate-400 mb-8">
              {businessName && `Setting up for: ${businessName}`}
            </p>

            <div className="bg-slate-800/50 rounded-xl p-6 mb-8 text-left">
              <h3 className="text-lg font-bold text-white mb-4">What we'll do:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Create your owner account</p>
                    <p className="text-sm text-slate-400">You'll have full access to all features</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Set up your secure PIN</p>
                    <p className="text-sm text-slate-400">Quick login for daily use</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Start using your POS system</p>
                    <p className="text-sm text-slate-400">Process sales, manage inventory, and more</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-5 rounded-xl transition-all shadow-xl shadow-emerald-500/20 text-lg flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-slate-500 text-sm mt-6">
              Need help? Email <a href="mailto:support@demly.com" className="text-emerald-400 hover:underline">support@demly.com</a>
            </p>
          </div>
        )}

        {/* Step 2: Account Details */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Create Owner Account</h2>
              <p className="text-slate-400">This will be your main account with full access</p>
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
                  Your Name *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full bg-slate-800/50 border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email (License Email) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-slate-800/50 border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Must match your license email: {userEmail}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Create PIN (4-6 digits) *
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={ownerPin}
                    onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter PIN"
                    className="w-full bg-slate-800/50 border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm PIN *
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Confirm PIN"
                    className="w-full bg-slate-800/50 border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl font-bold transition-all"
              >
                Back
              </button>
              <button
                onClick={sendVerificationCode}
                disabled={processing || !ownerName || !ownerEmail || !ownerPin || !confirmPin}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-700 disabled:to-slate-700 py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Email Verification */}
        {step === 3 && (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">Verify Your Email</h2>
              <p className="text-slate-400">We sent a 6-digit code to</p>
              <p className="text-white font-bold text-lg mt-1">{ownerEmail}</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
                Enter Verification Code
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
              
              <div className="mt-4 text-center">
                <button
                  onClick={sendVerificationCode}
                  disabled={processing}
                  className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Resend Code
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep(2);
                  setCodeSent(false);
                  setVerificationCode("");
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl font-bold transition-all"
              >
                Back
              </button>
              <button
                onClick={completeSetup}
                disabled={processing || verificationCode.length !== 6}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-700 disabled:to-slate-700 py-4 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Complete Setup
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

}
