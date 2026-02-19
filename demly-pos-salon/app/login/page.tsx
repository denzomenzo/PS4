"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, ArrowLeft, Check, Sparkles, Sun, Moon, Menu, X } from "lucide-react";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }

    const handleScroll = () => setScrolled(window.scrollY > 50);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    
    handleScroll();
    checkMobile();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
  };

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

  // Theme-based classes
  const bgGradient = theme === 'dark' 
    ? 'bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950' 
    : 'bg-gradient-to-br from-slate-50 via-white to-slate-100';
  
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const textMuted = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  
  const cardBg = theme === 'dark' 
    ? 'bg-slate-900/40 backdrop-blur-xl border-slate-800/50' 
    : 'bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg';

  const headerBg = theme === 'dark' 
    ? 'bg-black/80 backdrop-blur-xl' 
    : 'bg-white/80 backdrop-blur-xl border-b border-slate-200';

  const inputBg = theme === 'dark'
    ? 'bg-slate-800/50 border-slate-700/50'
    : 'bg-white border-slate-200';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgGradient}`}>
      {/* Navigation - Same style as landing page */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2 shadow-xl' : 'py-3'} ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex-shrink-0">
              <Logo size={isMobile ? "large" : "large"} />
            </Link>
            
            <div className="md:hidden flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-full ${theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-black hover:bg-black/5'} transition-colors`}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <Link 
                href="/register" 
                className={`px-5 py-2.5 rounded-full font-semibold text-sm lg:text-base transition-colors ${
                  theme === 'dark' 
                    ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                    : 'text-slate-600 hover:text-black hover:bg-black/5'
                }`}
              >
                Sign Up
              </Link>
              <Link 
                href="/pay" 
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold text-white transition-colors text-sm lg:text-base shadow-lg shadow-emerald-600/20"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-28 md:pt-32 pb-16 md:pb-20 px-4 sm:px-6 flex items-center justify-center min-h-screen">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Left Side - Benefits */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className={`text-emerald-400 text-xs md:text-sm font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
                Welcome Back
              </span>
            </div>
            
            <h1 className={`text-5xl lg:text-6xl font-black mb-6 leading-tight ${textPrimary}`}>
              Welcome Back to
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                Demly POS
              </span>
            </h1>
            
            <p className={`text-xl ${textSecondary} leading-relaxed mb-8`}>
              Sign in to access your complete business management system.
            </p>

            <div className="space-y-4">
              {[
                "Access your dashboard instantly",
                "Manage sales & inventory in real-time",
                "Track customer data & analytics",
                "Process transactions seamlessly"
              ].map((benefit, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className={`flex items-center gap-4 ${cardBg} rounded-2xl p-4 hover:border-emerald-500/30 transition-all border`}
                >
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className={`${textSecondary} font-medium`}>{benefit}</span>
                </motion.div>
              ))}
            </div>

            <div className={`p-6 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-2xl border border-emerald-500/20`}>
              <p className={`${textSecondary} text-sm leading-relaxed`}>
                <span className="font-bold text-emerald-600">Trusted by 10,000+ businesses</span> worldwide. 
                Join the growing community of successful businesses powered by Demly.
              </p>
            </div>
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full"
          >
            <div className={`${cardBg} rounded-3xl p-6 sm:p-8 lg:p-10 border`}>
              
              {/* Mobile Title */}
              <div className="lg:hidden text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className={`text-emerald-400 text-xs font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
                    Welcome Back
                  </span>
                </div>
                <h1 className={`text-4xl font-black mb-2 ${textPrimary}`}>
                  Sign In
                </h1>
                <p className={`${textSecondary}`}>Access your dashboard</p>
              </div>

              {/* Desktop Title */}
              <div className="hidden lg:block mb-8">
                <h2 className={`text-3xl font-bold mb-2 ${textPrimary}`}>Sign In</h2>
                <p className={`${textSecondary}`}>Enter your credentials to continue</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-600 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <label className={`block ${textPrimary} mb-2 text-sm font-medium`}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className={`w-full ${inputBg} border rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${textPrimary} placeholder:text-slate-500`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`block ${textPrimary} text-sm font-medium`}>Password</label>
                    <Link 
                      href="/forgot-password"
                      className="text-sm text-emerald-600 hover:text-emerald-700 transition-colors font-medium"
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
                      className={`w-full ${inputBg} border rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${textPrimary} placeholder:text-slate-500`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
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
                    <div className={`w-full border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className={`px-4 ${cardBg} ${textMuted} font-medium rounded-full`}>
                      Don't have an account?
                    </span>
                  </div>
                </div>

                <Link 
                  href="/register"
                  className={`block w-full ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'} border rounded-xl font-bold py-4 transition-all text-center ${textPrimary}`}
                >
                  Create Account
                </Link>

                <p className={`text-center ${textMuted} text-sm`}>
                  Need a license?{" "}
                  <Link href="/pay" className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
                    Purchase Here
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
