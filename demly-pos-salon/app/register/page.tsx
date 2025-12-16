"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          business_name: businessName,
        },
        emailRedirectTo: `${window.location.origin}/activate`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      if (data.user && !data.session) {
        setShowEmailVerification(true);
        setLoading(false);
      } else if (data.session) {
        router.push("/activate");
      }
    }
  };

  if (showEmailVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full border border-slate-800/50 text-center shadow-2xl">
          <CheckCircle className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-4">Check Your Email</h2>
          <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 mb-6 border border-slate-700/50">
            <Mail className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <p className="text-slate-300 text-lg mb-2">
              We've sent a verification link to:
            </p>
            <p className="text-white font-bold text-xl mb-4">{email}</p>
            <p className="text-slate-400">
              Click the link in the email to verify your account, then sign in to activate your license.
            </p>
          </div>
          
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 rounded-xl transition-all shadow-xl shadow-emerald-500/20"
            >
              Go to Login
            </Link>
            <p className="text-slate-500 text-sm">
              Didn't receive the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setShowEmailVerification(false);
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Branding */}
          <div className="hidden lg:block">
            <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-3xl p-12">
              <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-400 mb-8">
                Demly POS
              </h1>
              <h2 className="text-4xl font-black text-white mb-4">
                Start Your Journey with Demly POS
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                Join thousands of businesses managing their operations efficiently with our all-in-one platform.
              </p>
              
              <div className="space-y-4">
                {[
                  { icon: "⚡", title: "Quick Setup", desc: "Get started in minutes, not hours" },
                  { icon: "🔒", title: "Secure & Reliable", desc: "Bank-level encryption for your data" },
                  { icon: "📈", title: "Grow Your Business", desc: "Scale effortlessly as you expand" },
                  { icon: "💬", title: "24/7 Support", desc: "Always here when you need help" },
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-4 bg-slate-900/30 rounded-xl p-4 border border-slate-800/50">
                    <div className="text-3xl">{feature.icon}</div>
                    <div>
                      <h3 className="text-white font-bold mb-1">{feature.title}</h3>
                      <p className="text-slate-400 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Side - Registration Form */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 border border-slate-800/50 shadow-2xl">
            <div className="text-center mb-8 lg:hidden">
              <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-green-400 mb-4">
                Demly POS
              </h1>
            </div>

            <div className="mb-8">
              <h1 className="text-4xl font-black text-white mb-2">
                Create Account
              </h1>
              <p className="text-slate-400 text-lg">Sign up to get started with Demly POS</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              {error && (
                <div className="bg-red-500/20 backdrop-blur-lg border border-red-500/50 rounded-xl p-4 text-red-400">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-white mb-2 text-sm font-semibold">Business Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business Name"
                    required
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white mb-2 text-sm font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white mb-2 text-sm font-semibold">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <p className="text-slate-500 text-xs mt-1">Must be at least 6 characters</p>
              </div>

              <div>
                <label className="block text-white mb-2 text-sm font-semibold">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              <div className="pt-6 space-y-4 text-center border-t border-slate-800/50">
                <p className="text-slate-400">
                  Already have an account?{" "}
                  <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
                    Sign In
                  </Link>
                </p>
                <p className="text-slate-500 text-sm">
                  You'll need a license key to activate your account.{" "}
                  <Link href="/pay" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                    Purchase a license →
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
