"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Mail, Key, Sparkles, Sun, Moon, Menu, X } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

export default function Success() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                href="/register" 
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
                    href="/register" 
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
        <div className="max-w-2xl w-full">
          
          {/* Success Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${cardBg} rounded-3xl p-8 sm:p-12 border`}
          >
            {/* Success Icon with Glow */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 blur-3xl opacity-20 animate-pulse"></div>
              <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto relative z-10">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
            </div>
            
            {/* Welcome Text */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className={`text-emerald-400 text-xs font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
                  Payment Successful!
                </span>
              </div>
              
              <h1 className={`text-4xl md:text-5xl font-black mb-4 ${textPrimary}`}>
                Thank You for <br />
                <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                  Choosing Demly
                </span>
              </h1>
              
              <p className={`text-lg ${textSecondary}`}>
                Your payment has been processed successfully
              </p>
            </div>

            {/* Info Cards */}
            <div className="space-y-4 mb-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={`${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'} rounded-2xl p-6 border ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <h3 className={`text-lg font-bold mb-1 ${textPrimary}`}>Check Your Email</h3>
                    <p className={`${textSecondary} text-sm`}>
                      Your license key has been sent to your email address. It should arrive within a few minutes.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={`${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'} rounded-2xl p-6 border ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Key className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <h3 className={`text-lg font-bold mb-1 ${textPrimary}`}>Activate Your License</h3>
                    <p className={`${textSecondary} text-sm`}>
                      Create an account or sign in, then enter your license key to start using Demly POS.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href="/register"
                className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-full transition-all text-center shadow-lg shadow-emerald-600/20"
              >
                Create Account & Activate
              </Link>
              
              <Link
                href="/login"
                className={`block w-full ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'} border rounded-full font-bold py-4 transition-all text-center ${textPrimary}`}
              >
                Already Have an Account? Sign In
              </Link>
            </div>

            {/* Help Text */}
            <div className={`mt-8 text-center ${textMuted} text-sm`}>
              <p>Didn't receive your license key?</p>
              <p>
                Check your spam folder or{' '}
                <a href="mailto:support@demly.com" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                  contact support
                </a>
              </p>
            </div>
          </motion.div>

          {/* Trust Badge */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`mt-6 p-4 ${cardBg} rounded-2xl border text-center`}
          >
            <p className={`text-xs ${textMuted}`}>
              <span className="font-bold text-emerald-600">Secure payment processed</span> • Your license key is on its way
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
