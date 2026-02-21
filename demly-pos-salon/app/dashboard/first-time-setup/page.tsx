"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Mail, User, Check, Loader2, AlertCircle, Sparkles, Store } from "lucide-react";
import { motion } from "framer-motion";

export default function FirstTimeSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  // User info
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [businessName, setBusinessName] = useState("Business Name"); // Default changed to "Business Name"

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
        router.push("/dashboard");
        return;
      }

      // Get business name from user metadata or use default
      if (user.user_metadata?.business_name) {
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
      setError("Email must match your account email: " + userEmail);
      return;
    }

    setProcessing(true);
    setError("");
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);

    try {
      const { error: functionError } = await supabase.functions.invoke(
        'send-verification-email',
        {
          body: {
            email: ownerEmail,
            code: code,
            staffName: ownerName || "Owner",
            businessName: businessName
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
    setError("");

    try {
      // Create owner staff member with updated permissions structure
      const { error: staffError } = await supabase
        .from("staff")
        .insert({
          user_id: userId,
          name: ownerName || "Owner",
          email: ownerEmail,
          pin: ownerPin,
          role: "owner",
          permissions: {
            access_pos: true,
            manage_transactions: true,
            manage_customers: true,
            access_display: true,
            manage_inventory: true,
            view_reports: true,
            manage_hardware: true,
            manage_card_terminal: true,
            manage_settings: true,
            manage_staff: true,
          }
        });

      if (staffError) {
        console.error("Error creating staff:", staffError);
        setError("Failed to create owner account: " + staffError.message);
        setProcessing(false);
        return;
      }

      // Update business name in settings with default if empty
      await supabase
        .from("settings")
        .upsert({
          user_id: userId,
          shop_name: businessName || "Business Name",
          business_name: businessName || "Business Name",
          vat_enabled: true,
        });

      // Set flag to prevent infinite redirect
      sessionStorage.setItem('justCompletedSetup', 'true');
      
      // Small delay to ensure data is committed
      setTimeout(() => {
        alert("✅ Setup complete! You can now login with your PIN.");
        router.push("/dashboard");
      }, 500);
      
    } catch (error: any) {
      console.error("Error:", error);
      setError("Failed to complete setup: " + error.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-400">Loading setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-semibold">
              First Time Setup
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
            Welcome to <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Demly POS</span>
          </h1>
          
          <p className="text-slate-400">
            Let's get your business set up in just a few steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= i 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {step > i ? <Check className="w-4 h-4" /> : i}
                </div>
                {i < 3 && (
                  <div className={`w-12 h-1 mx-1 rounded-full ${
                    step > i ? 'bg-emerald-600' : 'bg-slate-800'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8"
          >
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Store className="w-10 h-10 text-emerald-600" />
              </div>
              
              <p className="text-slate-300 mb-2">
                Setting up for: <span className="font-bold text-emerald-600">{businessName}</span>
              </p>
            </div>

            <div className="space-y-4 mb-8">
              {[
                {
                  icon: <User className="w-5 h-5 text-emerald-600" />,
                  title: "Create your owner account",
                  desc: "You'll have full access to all features"
                },
                {
                  icon: <Lock className="w-5 h-5 text-emerald-600" />,
                  title: "Set up your secure PIN",
                  desc: "Quick login for daily use"
                },
                {
                  icon: <Store className="w-5 h-5 text-emerald-600" />,
                  title: "Configure your business",
                  desc: "Set up your business name and preferences"
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-center text-slate-500 text-sm mt-6">
              Need help? Email{' '}
              <a href="mailto:support@demly.com" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                support@demly.co.uk
              </a>
            </p>
          </motion.div>
        )}

        {/* Step 2: Account Details */}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Create Owner Account</h2>
              <p className="text-slate-400">This will be your main account with full access</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
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
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email (Account Email) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Must match your account email: <span className="text-emerald-600">{userEmail}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Business Name *
                </label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business Name"
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This will appear on your POS and receipts
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
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
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
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all"
              >
                Back
              </button>
              <button
                onClick={sendVerificationCode}
                disabled={processing || !ownerName || !ownerEmail || !businessName || !ownerPin || !confirmPin}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
          </motion.div>
        )}

        {/* Step 3: Email Verification */}
        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verify Your Email</h2>
              <p className="text-slate-400">We sent a 6-digit code to</p>
              <p className="text-emerald-600 font-bold text-lg mt-1">{ownerEmail}</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-6">
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
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-6 py-4 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                autoFocus
              />
              
              <div className="mt-4 text-center">
                <button
                  onClick={sendVerificationCode}
                  disabled={processing}
                  className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Resend Code
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep(2);
                  setCodeSent(false);
                  setVerificationCode("");
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all"
              >
                Back
              </button>
              <button
                onClick={completeSetup}
                disabled={processing || verificationCode.length !== 6}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
          </motion.div>
        )}

        {/* Trust Badge */}
        <div className="mt-6 p-4 bg-slate-900/20 backdrop-blur-xl border border-slate-800/50 rounded-2xl text-center">
          <p className="text-xs text-slate-500">
            <span className="font-bold text-emerald-600">Secure setup</span> • Your information is encrypted
          </p>
        </div>
      </motion.div>
    </div>
  );
}

