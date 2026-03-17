// app/pay/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, ArrowLeft, Sparkles, Sun, Moon, Menu, X, Zap, Shield, Clock, Package, Truck, CreditCard, Printer, Smartphone } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

type BundleType = "software" | "starter" | "complete";

interface BundleData {
  name: string;
  price: number;
  description: string;
  popular?: boolean;
  hardware: string[];
  savings?: number;
}

export default function PaymentPage() {
  const [selectedBundle, setSelectedBundle] = useState<BundleType>("software");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    postcode: "",
    country: "UK"
  });

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

  const bundles: Record<BundleType, BundleData> = {
    software: {
      name: "Software Only",
      price: 1500,
      description: "Full POS software license - yours forever",
      hardware: [
        "✓ Complete POS System",
        "✓ Lifetime updates",
        "✓ 1 year support",
        "✓ Remote setup assistance",
        "✓ All features included"
      ],
      savings: 0
    },
    starter: {
      name: "Starter Bundle",
      price: 1800,
      description: "Software + essential hardware to get started",
      popular: true,
      hardware: [
        "✓ ✓ Software license",
        "✓ ✓ 2incel Bluetooth Printer (£80 value)",
        "✓ ✓ Basic cash drawer (£50 value)",
        "✓ ✓ 1D barcode scanner (£30 value)",
        "✓ ✓ All cables included",
        "✓ ✓ UK shipping included"
      ],
      savings: 130
    },
    complete: {
      name: "Complete Bundle",
      price: 2200,
      description: "Everything you need for a professional setup",
      hardware: [
        "✓ ✓ Software license",
        "✓ ✓ Epson TM-T20II Printer (£180 value)",
        "✓ ✓ Heavy-duty cash drawer (£100 value)",
        "✓ ✓ 2D barcode scanner (£120 value)",
        "✓ ✓ Card reader (£50 value)",
        "✓ ✓ Customer display (£150 value)",
        "✓ ✓ All cables & setup",
        "✓ ✓ 2-hour training call",
        "✓ ✓ UK shipping included"
      ],
      savings: 380
    },
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email");
      return;
    }

    // Validate address for hardware bundles
    if (selectedBundle !== "software") {
      if (!address.line1 || !address.city || !address.postcode) {
        setError("Please complete your shipping address");
        return;
      }
    }
    
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email,
          bundle: selectedBundle,
          ...(selectedBundle !== "software" && { shippingAddress: address })
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const selectedBundleData = bundles[selectedBundle];

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
      {/* Header */}
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

      {/* Main Content */}
      <div className="pt-28 md:pt-32 pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className={`text-emerald-400 text-xs md:text-sm font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
                One Payment. Lifetime Access.
              </span>
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black mb-4 ${textPrimary}`}>
              Own It <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Forever</span>
            </h1>
            
            <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
              No monthly fees. No subscriptions. Just a powerful POS system that's yours to keep.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Left: Bundle Selection & Features */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              
              {/* Bundle Selection */}
              <div className={`${cardBg} rounded-3xl p-6 sm:p-8 border`}>
                <h2 className={`text-2xl font-bold mb-6 ${textPrimary}`}>Choose Your Bundle</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <button
                    onClick={() => setSelectedBundle("software")}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      selectedBundle === "software"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : theme === 'dark' 
                          ? 'border-slate-700 hover:border-slate-600' 
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`text-sm ${textMuted} mb-1`}>Software</div>
                    <div className={`text-2xl font-black mb-1 ${textPrimary}`}>£1,500</div>
                    <div className={`text-xs ${textMuted}`}>lifetime license</div>
                  </button>

                  <button
                    onClick={() => setSelectedBundle("starter")}
                    className={`p-6 rounded-2xl border-2 transition-all relative ${
                      selectedBundle === "starter"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : theme === 'dark' 
                          ? 'border-slate-700 hover:border-slate-600' 
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full whitespace-nowrap">
                      POPULAR
                    </div>
                    <div className={`text-sm ${textMuted} mb-1`}>Starter</div>
                    <div className={`text-2xl font-black mb-1 ${textPrimary}`}>£1,800</div>
                    <div className={`text-xs ${textMuted}`}>+ hardware</div>
                  </button>

                  <button
                    onClick={() => setSelectedBundle("complete")}
                    className={`p-6 rounded-2xl border-2 transition-all ${
                      selectedBundle === "complete"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : theme === 'dark' 
                          ? 'border-slate-700 hover:border-slate-600' 
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`text-sm ${textMuted} mb-1`}>Complete</div>
                    <div className={`text-2xl font-black mb-1 ${textPrimary}`}>£2,200</div>
                    <div className={`text-xs ${textMuted}`}>+ pro hardware</div>
                  </button>
                </div>

                {selectedBundleData.savings && selectedBundleData.savings > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center"
                  >
                    <p className="text-emerald-600 font-bold">
                      Save £{selectedBundleData.savings} on hardware!
                    </p>
                    <p className={`text-sm ${textMuted} mt-1`}>
                      Bundle includes £{selectedBundleData.savings + selectedBundleData.price - 1500} worth of hardware
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Features List */}
              <div className={`${cardBg} rounded-3xl p-6 sm:p-8 border`}>
                <h3 className={`text-xl font-bold mb-6 ${textPrimary}`}>What's Included</h3>
                <div className="space-y-3">
                  {selectedBundleData.hardware.map((feature, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className={`${textSecondary}`}>{feature}</span>
                    </motion.div>
                  ))}
                </div>

                <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <p className={`text-sm ${textSecondary}`}>
                    <span className="font-bold text-emerald-600">All bundles include:</span> Unlimited transactions, customers, staff, inventory tracking, reports, customer display, VAT management, and all future software updates.
                  </p>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: Shield, text: "Lifetime License" },
                  { icon: Zap, text: "Instant Access" },
                  { icon: Package, text: "UK Shipping" }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={`${cardBg} rounded-xl p-3 text-center border`}>
                      <Icon className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <p className={`text-xs ${textMuted}`}>{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Right: Checkout Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className={`${cardBg} rounded-3xl p-6 sm:p-8 border sticky top-24`}>
                <h2 className={`text-2xl font-bold mb-6 ${textPrimary}`}>Complete Your Purchase</h2>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-600 mb-6 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleCheckout} className="space-y-6">
                  <div>
                    <label className={`block ${textPrimary} mb-2 text-sm font-medium`}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className={`w-full ${inputBg} border rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${textPrimary} placeholder:text-slate-500`}
                    />
                    <p className={`${textMuted} text-sm mt-2`}>
                      License and tracking details will be sent here
                    </p>
                  </div>

                  {/* Shipping Address - Only for hardware bundles */}
                  {selectedBundle !== "software" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4"
                    >
                      <h3 className={`font-bold ${textPrimary}`}>Shipping Address</h3>
                      
                      <div>
                        <label className={`block ${textMuted} mb-1 text-xs`}>Address Line 1 *</label>
                        <input
                          type="text"
                          value={address.line1}
                          onChange={(e) => setAddress({...address, line1: e.target.value})}
                          className={`w-full ${inputBg} border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                          required
                        />
                      </div>

                      <div>
                        <label className={`block ${textMuted} mb-1 text-xs`}>Address Line 2 (optional)</label>
                        <input
                          type="text"
                          value={address.line2}
                          onChange={(e) => setAddress({...address, line2: e.target.value})}
                          className={`w-full ${inputBg} border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`block ${textMuted} mb-1 text-xs`}>City *</label>
                          <input
                            type="text"
                            value={address.city}
                            onChange={(e) => setAddress({...address, city: e.target.value})}
                            className={`w-full ${inputBg} border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                            required
                          />
                        </div>
                        <div>
                          <label className={`block ${textMuted} mb-1 text-xs`}>Postcode *</label>
                          <input
                            type="text"
                            value={address.postcode}
                            onChange={(e) => setAddress({...address, postcode: e.target.value})}
                            className={`w-full ${inputBg} border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-emerald-600 text-sm">
                        <Truck className="w-4 h-4" />
                        <span>Free UK shipping • 2-3 business days</span>
                      </div>
                    </motion.div>
                  )}

{/* Order Summary */}
<div className={`${theme === 'dark' ? 'bg-slate-800/30' : 'bg-slate-50'} rounded-xl p-6 space-y-4 border ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'}`}>
  <h3 className={`font-bold text-lg ${textPrimary}`}>Order Summary</h3>
  
  <div className="space-y-3">
    <div className="flex justify-between">
      <span className={`${textSecondary}`}>
        {selectedBundleData.name}
      </span>
      <span className={`font-bold ${textPrimary}`}>£{selectedBundleData.price.toLocaleString()}</span>
    </div>
    
    {/* Fix: Add proper null check for savings */}
    {selectedBundleData.savings && selectedBundleData.savings > 0 && (
      <div className="flex justify-between text-emerald-600 text-sm">
        <span>Hardware value</span>
        <span className="font-bold">
          £{(selectedBundleData.savings + selectedBundleData.price - 1500).toLocaleString()}
        </span>
      </div>
    )}
    
    {selectedBundle !== "software" && (
      <div className="flex justify-between text-emerald-600 text-sm">
        <span>Shipping</span>
        <span className="font-bold">FREE</span>
      </div>
    )}
    
    <div className={`border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'} pt-3 flex justify-between text-lg`}>
      <span className={`font-bold ${textPrimary}`}>Total</span>
      <span className="font-black text-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
        £{selectedBundleData.price.toLocaleString()}
      </span>
    </div>
    
    <p className={`text-xs ${textMuted} text-center pt-2`}>
      One-time payment • Lifetime license • No recurring fees
    </p>
  </div>
</div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 rounded-full transition-all disabled:opacity-50 text-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Purchase for £{selectedBundleData.price.toLocaleString()}</>
                    )}
                  </button>

                  <div className="space-y-3 text-sm pt-4">
                    <div className="flex items-center gap-2 justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className={`${textMuted}`}>Secure payment via Stripe</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className={`${textMuted}`}>Lifetime license - never pay again</span>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className={`${textMuted}`}>30-day money-back guarantee</span>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>

          {/* Footer Note */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center"
          >
            <p className={`${textMuted} text-sm`}>
              Questions about hardware bundles? Email us at{' '}
              <a href="mailto:contact@demly.co.uk" className="text-emerald-600 hover:text-emerald-700 transition-colors font-medium">
                contact@demly.co.uk
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
