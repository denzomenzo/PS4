"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, ArrowLeft, Check } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-emerald-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
              <span className="text-4xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
                Demly
              </span>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link href="/register" className="px-6 py-2.5 text-slate-300 hover:text-white transition-colors font-semibold">
                Sign Up
              </Link>
              <Link href="/pay" className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-32 pb-20 px-6 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Benefits */}
          <div className="hidden lg:block">
            <div className="mb-8">
              <h1 className="text-6xl font-black mb-6 leading-tight text-white">
                Welcome Back to
                <br />
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
                  Demly POS
                </span>
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed">
                Sign in to access your complete business management system.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "Access your dashboard instantly",
                "Manage sales & inventory in real-time",
                "Track customer data & analytics",
                "Process transactions seamlessly"
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-4 hover:border-emerald-500/30 transition-all">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                  <span className="text-slate-300 font-medium">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-2xl">
              <p className="text-slate-300 text-sm leading-relaxed">
                <span className="font-bold text-emerald-400">Trusted by 10,000+ businesses</span> worldwide. 
                Join the growing community of successful businesses powered by Demly.
              </p>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full">
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 border border-slate-800/50 shadow-2xl">
              
              {/* Mobile Title */}
              <div className="lg:hidden text-center mb-8">
                <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-2">
                  Sign In
                </h1>
                <p className="text-slate-400 text-lg">Access your dashboard</p>
              </div>

              {/* Desktop Title */}
              <div className="hidden lg:block mb-8">
                <h2 className="text-3xl font-black text-white mb-2">Sign In</h2>
                <p className="text-slate-400">Enter your credentials to continue</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="bg-red-500/20 backdrop-blur-lg border border-red-500/50 rounded-xl p-4 text-red-400">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-white mb-2 text-sm font-semibold">Email</label>
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-white text-sm font-semibold">Password</label>
                    <Link 
                      href="/forgot-password"
                      className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
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
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="mt-8 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700/50"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-900/50 text-slate-400 font-medium">
                      Don't have an account?
                    </span>
                  </div>
                </div>

                <Link 
                  href="/register"
                  className="block w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-white font-bold py-4 rounded-xl transition-all text-center"
                >
                  Create Account
                </Link>

                <p className="text-center text-slate-400 text-sm">
                  Need a license?{" "}
                  <Link href="/pay" className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">
                    Purchase Here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
