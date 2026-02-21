"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Check, AlertCircle, Mail, Sun, Moon, Menu, X } from "lucide-react";
import Logo from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";

export default function TermsPage() {
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

  const lastUpdated = "February 19, 2025";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgGradient}`}>
      {/* Header - Same as privacy page */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2 shadow-xl' : 'py-3'} ${headerBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="group flex-shrink-0">
              <Logo size={isMobile ? "large" : "large"} />
            </Link>
            
            <div className="md:hidden flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`p-2 rounded-full ${theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-black hover:bg-black/5'} transition-colors`}>
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-700" />}
              </button>
              <Link href="/" className={`px-5 py-2.5 rounded-full font-semibold text-sm lg:text-base transition-colors ${
                theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-black hover:bg-black/5'
              }`}>
                ← Back to Home
              </Link>
              <Link href="/pay" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold text-white transition-colors text-sm lg:text-base shadow-lg shadow-emerald-600/20">
                Get Started
              </Link>
            </div>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 border-t border-slate-200 dark:border-white/10 pt-4"
              >
                <div className="flex flex-col space-y-2">
                  <Link href="/" className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    theme === 'dark' ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-black hover:bg-black/5'
                  }`} onClick={() => setMobileMenuOpen(false)}>
                    ← Back to Home
                  </Link>
                  <div className="border-t border-slate-200 dark:border-white/10 pt-4 mt-2">
                    <Link href="/pay" className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white text-center py-3 rounded-xl font-bold" onClick={() => setMobileMenuOpen(false)}>
                      Get Started
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 md:pt-28 pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span className={`text-emerald-400 text-xs md:text-sm font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
                Legal & Terms
              </span>
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black mb-4 ${textPrimary}`}>
              Terms of <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Service</span>
            </h1>
            
            <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
              Please read these terms carefully before using Demly POS.
            </p>
            
            <p className={`text-sm ${textMuted} mt-4`}>
              Last Updated: {lastUpdated}
            </p>
          </motion.div>

          {/* Terms Content Cards */}
          <div className="space-y-6">
            {/* Agreement */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`${cardBg} rounded-3xl p-8 border`}
            >
              <h2 className={`text-2xl font-bold mb-4 ${textPrimary}`}>1. Agreement to Terms</h2>
              <p className={`${textSecondary} leading-relaxed`}>
                By accessing or using Demly POS, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use our services.
              </p>
            </motion.div>

            {/* Subscription Terms */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`${cardBg} rounded-3xl p-8 border`}
            >
              <h2 className={`text-2xl font-bold mb-4 ${textPrimary}`}>2. Subscription Terms</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className={`font-semibold ${textPrimary}`}>Billing</h3>
                    <p className={`${textSecondary} text-sm`}>Subscriptions are billed monthly or annually in advance. Fees are non-refundable except as required by law.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className={`font-semibold ${textPrimary}`}>Cancellation</h3>
                    <p className={`${textSecondary} text-sm`}>You may cancel your subscription at any time. Access continues until the end of your billing period.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className={`font-semibold ${textPrimary}`}>Price Changes</h3>
                    <p className={`${textSecondary} text-sm`}>We may adjust pricing with 30 days notice. Continued use constitutes acceptance.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* User Responsibilities */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`${cardBg} rounded-3xl p-8 border`}
            >
              <h2 className={`text-2xl font-bold mb-4 ${textPrimary}`}>3. User Responsibilities</h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-1" />
                  <span className={`${textSecondary} text-sm`}>Maintain the confidentiality of your account credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-1" />
                  <span className={`${textSecondary} text-sm`}>Ensure all information provided is accurate and up-to-date</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-1" />
                  <span className={`${textSecondary} text-sm`}>Comply with all applicable laws and regulations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-1" />
                  <span className={`${textSecondary} text-sm`}>Not misuse or attempt to circumvent our security measures</span>
                </li>
              </ul>
            </motion.div>

            {/* Intellectual Property */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`${cardBg} rounded-3xl p-8 border`}
            >
              <h2 className={`text-2xl font-bold mb-4 ${textPrimary}`}>4. Intellectual Property</h2>
              <p className={`${textSecondary} leading-relaxed`}>
                Demly POS and its original content, features, and functionality are owned by Demly and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </motion.div>

            {/* Limitation of Liability */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`${cardBg} rounded-3xl p-8 border`}
            >
              <h2 className={`text-2xl font-bold mb-4 ${textPrimary}`}>5. Limitation of Liability</h2>
              <p className={`${textSecondary} leading-relaxed`}>
                Demly shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service.
              </p>
            </motion.div>

            {/* Termination */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={`${cardBg} rounded-3xl p-8 border`}
            >
              <h2 className={`text-2xl font-bold mb-4 ${textPrimary}`}>6. Termination</h2>
              <p className={`${textSecondary} leading-relaxed`}>
                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </motion.div>

            {/* Contact */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className={`${cardBg} rounded-3xl p-8 border text-center`}
            >
              <AlertCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Questions About Terms?</h2>
              <p className={`${textSecondary} mb-6`}>
                Our legal team is happy to clarify any questions about our terms.
              </p>
              <Link 
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold transition-colors"
              >
                Contact Legal Team
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-12 px-4 sm:px-6 border-t ${theme === 'dark' ? 'bg-black border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="mb-4">
                <Logo size="large" />
              </div>
              <p className={`${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-sm`}>
                © 2026 Demly. All rights reserved.
              </p>
            </div>
            <div className={`flex flex-wrap gap-4 sm:gap-6 md:gap-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} text-sm justify-center`}>
              <Link href="/privacy" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Privacy</Link>
              <Link href="/terms" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Terms</Link>
              <Link href="/contact" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Contact</Link>
              <Link href="/industries" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Industries</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

}
