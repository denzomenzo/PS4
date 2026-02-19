"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Loader2, CheckCircle, ArrowLeft, Sparkles, Sun, Moon, Menu, X, Store } from "lucide-react";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
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

  // Theme-based classes
  const bgColor = theme === 'dark' ? 'bg-black' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100';
  
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

  // Email Verification Screen
  if (showEmailVerification) {
    return (
      <div className={`min-h-screen transition-colors duration-300 ${bgColor} flex items-center justify-center p-4`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`${cardBg} rounded-3xl p-10 max-w-md w-full border text-center`}
        >
          <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className={`text-4xl font-bold mb-4 ${textPrimary}`}>Check Your Email</h2>
          <div className={`${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'} rounded-2xl p-6 mb-6 border ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
            <Mail className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <p className={`${textSecondary} text-lg mb-2`}>
              We've sent a verification link to:
            </p>
            <p className={`${textPrimary} font-bold text-xl mb-4`}>{email}</p>
            <p className={`${textMuted}`}>
              Click the link in the email to verify your account, then sign in to activate your license.
            </p>
          </div>
          
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-full transition-all shadow-lg shadow-emerald-600/20"
            >
              Go to Login
            </Link>
            <p className={`${textMuted} text-sm`}>
              Didn't receive the email? Check your spam folder or{" "}
              <button
                onClick={() => {
                  setShowEmailVerification(false);
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-emerald-600 hover:text-emerald-700 font-medium underline"
              >
                try again
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgColor}`}>
      {/* Navigation */}
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
                href="/login" 
                className={`px-5 py-2.5 rounded-full font-semibold text-sm lg:text-base transition-colors ${
                  theme === 'dark' 
                    ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                    : 'text-slate-600 hover:text-black hover:bg-black/5'
                }`}
              >
                Sign In
              </Link>
              <Link 
                href="/pay" 
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold text-white transition-colors text-sm lg:text-base shadow-lg shadow-emerald-600/20"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 border-t border-slate-200 dark:border-white/10 pt-4"
            >
              <div className="flex flex-col space-y-2">
                <Link 
                  href="/login" 
                  className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    theme === 'dark' 
                      ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                      : 'text-slate-600 hover:text-black hover:bg-black/5'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <div className="border-t border-slate-200 dark:border-white/10 pt-4 mt-2">
                  <Link 
                    href="/pay" 
                    className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center py-3 rounded-xl font-bold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Main Content - Centered */}
      <div className="pt-28 md:pt-32 pb-16 md:pb-20 px-4 sm:px-6 flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full">
          
          {/* Welcome Text - Centered */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className={`text-emerald-400 text-xs font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
                Get Started
              </span>
            </div>
            
            <h1 className={`text-4xl font-black mb-2 ${textPrimary}`}>
              Create Account
            </h1>
            <p className={`${textSecondary}`}>
              Sign up to get started with Demly POS
            </p>
          </motion.div>

          {/* Registration Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${cardBg} rounded-3xl p-6 sm:p-8 border`}
          >
            <form onSubmit={handleRegister} className="space-y-5">
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
                <label className={`block ${textPrimary} mb-2 text-sm font-medium`}>Business Name</label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Your Business Name"
                    required
                    className={`w-full ${inputBg} border rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${textPrimary} placeholder:text-slate-500`}
                  />
                </div>
              </div>

              <div>
                <label className={`block ${textPrimary} mb-2 text-sm font-medium`}>Email Address</label>
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
                <label className={`block ${textPrimary} mb-2 text-sm font-medium`}>Password</label>
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
                <p className={`${textMuted} text-xs mt-1`}>Must be at least 6 characters</p>
              </div>

              <div>
                <label className={`block ${textPrimary} mb-2 text-sm font-medium`}>Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Creating account...
                  </>
                ) : (
                  "Create Account"
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
                    Already have an account?
                  </span>
                </div>
              </div>

              <Link 
                href="/login"
                className={`block w-full ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'} border rounded-xl font-bold py-4 transition-all text-center ${textPrimary}`}
              >
                Sign In
              </Link>

              <p className={`text-center ${textMuted} text-sm`}>
                Need a license?{" "}
                <Link href="/pay" className="text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
                  Purchase Here →
                </Link>
              </p>
            </div>
          </motion.div>

          {/* Trust Badge */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`mt-6 p-4 ${cardBg} rounded-2xl border text-center`}
          >
            <p className={`text-xs ${textMuted}`}>
              <span className="font-bold text-emerald-600">14-day free trial</span> • No credit card required
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
