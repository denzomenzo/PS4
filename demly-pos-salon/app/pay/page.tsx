// app/pay/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, ArrowLeft, Sparkles, Sun, Moon, Menu, X, Zap, Shield, Clock, Package, Truck, CreditCard, Printer, Smartphone, Mail, Phone, MapPin, User } from "lucide-react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

type BundleType = "software" | "complete";

interface BundleData {
  name: string;
  price: number;
  description: string;
  popular?: boolean;
  features: string[];
  hardware?: string[];
}

export default function PaymentPage() {
  const [selectedBundle, setSelectedBundle] = useState<BundleType>("complete");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
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
      price: 650,
      description: "Full POS software license - yours forever",
      features: [
        "Complete POS System",
        "Lifetime updates",
        "Endless support",
        "Remote setup assistance",
        "All features included",
        "Unlimited transactions",
        "Unlimited customers",
        "Unlimited staff"
      ]
    },
    complete: {
      name: "Complete System",
      price: 1500,
      description: "Software + all hardware included, ready to run",
      popular: true,
      features: [
        "Complete POS Software",
        "Lifetime updates",
        "1 year priority support",
        "Remote setup assistance",
        "All features included"
      ],
      hardware: [
        "Epson TM-T20II Thermal Printer (£180 value)",
        "Heavy-duty cash drawer with automatic opening (£100 value)",
        "2D barcode scanner - scans from screen too (£120 value)",
        
        "10.1" display with stand (£150 value)",
        "Cash Drawer (£60 value)
        "All cables and connectors",
        "Pre-configured and tested",
        "Free UK shipping (2-3 business days)"
      ]
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email");
      return;
    }

    if (!fullName) {
      setError("Please enter your full name");
      return;
    }

    // Validate address for complete bundle
    if (selectedBundle === "complete") {
      if (!address.line1 || !address.city || !address.postcode) {
        setError("Please complete your shipping address");
        return;
      }
      if (!phone) {
        setError("Please enter your phone number for delivery");
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
          fullName,
          phone: selectedBundle === "complete" ? phone : undefined,
          bundle: selectedBundle,
          ...(selectedBundle === "complete" && { shippingAddress: address })
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

  // Calculate hardware value for complete bundle
  const hardwareValue = selectedBundle === "complete" ? 510 : 0; // £180+100+120+60+150 = £610, but we'll round to £600
  const softwareValue = selectedBundle === "complete" ? 890 : 650; // Software portion

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
                Simple, Transparent Pricing
              </span>
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black mb-4 ${textPrimary}`}>
              Own It <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Forever</span>
            </h1>
            
            <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
              No monthly fees. No hidden costs. Just powerful POS software that's yours to keep.
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
                <h2 className={`text-2xl font-bold mb-6 ${textPrimary}`}>Choose Your Option</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
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
                    <div className={`text-sm ${textMuted} mb-1`}>Software Only</div>
                    <div className={`text-2xl font-black mb-1 ${textPrimary}`}>£650</div>
                    <div className={`text-xs ${textMuted}`}>lifetime license</div>
                  </button>

                  <button
                    onClick={() => setSelectedBundle("complete")}
                    className={`p-6 rounded-2xl border-2 transition-all relative ${
                      selectedBundle === "complete"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : theme === 'dark' 
                          ? 'border-slate-700 hover:border-slate-600' 
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full whitespace-nowrap">
                      BEST VALUE
                    </div>
                    <div className={`text-sm ${textMuted} mb-1`}>Complete System</div>
                    <div className={`text-2xl font-black mb-1 ${textPrimary}`}>£1,500</div>
                    <div className={`text-xs ${textMuted}`}>software + hardware</div>
                  </button>
                </div>

                {selectedBundle === "complete" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center"
                  >
                    <p className="text-emerald-600 font-bold">
                      Save £{hardwareValue} on hardware!
                    </p>
                    <p className={`text-sm ${textMuted} mt-1`}>
                      Hardware valued at £{hardwareValue} • You pay £{selectedBundleData.price - softwareValue}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Features List */}
              <div className={`${cardBg} rounded-3xl p-6 sm:p-8 border`}>
                <h3 className={`text-xl font-bold mb-6 ${textPrimary}`}>
                  {selectedBundle === "complete" ? "What's Included" : "Software Features"}
                </h3>
                
                <div className="space-y-3">
                  {/* Software features always shown */}
                  <div className="mb-4">
                    <p className={`text-sm font-semibold text-emerald-600 mb-2`}>✓ SOFTWARE:</p>
                    {bundles.software.features.map((feature, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex items-start gap-2 text-sm mb-2"
                      >
                        <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className={`${textSecondary}`}>{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Hardware features for complete bundle */}
                  {selectedBundle === "complete" && bundles.complete.hardware && (
                    <div className="pt-4 border-t border-slate-700/30">
                      <p className={`text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-2`}>
                        <Package className="w-4 h-4" />
                        ✓ HARDWARE PACKAGE:
                      </p>
                      {bundles.complete.hardware.map((item, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-start gap-2 text-sm mb-2"
                        >
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className={`${textSecondary}`}>{item}</span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <p className={`text-sm ${textSecondary}`}>
                    <span className="font-bold text-emerald-600">All purchases include:</span> Unlimited transactions, customers, staff, inventory tracking, reports, customer display, VAT management, and all future software updates.
                  </p>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: Shield, text: "Lifetime License" },
                  { icon: Zap, text: "Instant Access" },
                  { icon: Truck, text: "Free UK Shipping*" }
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className={`${cardBg} rounded-xl p-3 text-center border`}>
                      <Icon className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                      <p className={`text-xs ${textMuted}`}>{item.text}</p>
                      {i === 2 && selectedBundle !== "complete" && (
                        <p className="text-[10px] text-emerald-600">*hardware only</p>
                      )}
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
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <div>
                      <label className={`block ${textPrimary} mb-2 text-sm font-medium flex items-center gap-2`}>
                        <Mail className="w-4 h-4 text-emerald-600" />
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
                        License and delivery updates will be sent here
                      </p>
                    </div>

                    <div>
                      <label className={`block ${textPrimary} mb-2 text-sm font-medium flex items-center gap-2`}>
                        <User className="w-4 h-4 text-emerald-600" />
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Smith"
                        required
                        className={`w-full ${inputBg} border rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all ${textPrimary} placeholder:text-slate-500`}
                      />
                    </div>
                  </div>

                  {/* Shipping Address - Only for complete bundle */}
                  {selectedBundle === "complete" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-2"
                    >
                      <h3 className={`font-bold ${textPrimary} flex items-center gap-2`}>
                        <MapPin className="w-5 h-5 text-emerald-600" />
                        Shipping Address
                      </h3>
                      
                      <div>
                        <label className={`block ${textMuted} mb-1 text-xs`}>Phone Number (for delivery)</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="07123 456789"
                          className={`w-full ${inputBg} border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className={`block ${textMuted} mb-1 text-xs`}>Address Line 1</label>
                        <input
                          type="text"
                          value={address.line1}
                          onChange={(e) => setAddress({...address, line1: e.target.value})}
                          placeholder="123 High Street"
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
                          placeholder="Flat 2, Building Name"
                          className={`w-full ${inputBg} border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={`block ${textMuted} mb-1 text-xs`}>City</label>
                          <input
                            type="text"
                            value={address.city}
                            onChange={(e) => setAddress({...address, city: e.target.value})}
                            placeholder="London"
                            className={`w-full ${inputBg} border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                            required
                          />
                        </div>
                        <div>
                          <label className={`block ${textMuted} mb-1 text-xs`}>Postcode</label>
                          <input
                            type="text"
                            value={address.postcode}
                            onChange={(e) => setAddress({...address, postcode: e.target.value})}
                            placeholder="SW1A 1AA"
                            className={`w-full ${inputBg} border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50`}
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-500/5 p-3 rounded-lg">
                        <Truck className="w-4 h-4" />
                        <span>Free UK shipping • 2-3 business days • Tracking provided</span>
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
                      
                      {selectedBundle === "complete" && (
                        <>
                          <div className="flex justify-between text-emerald-600 text-sm">
                            <span>Software</span>
                            <span className="font-bold">£{softwareValue}</span>
                          </div>
                          <div className="flex justify-between text-emerald-600 text-sm">
                            <span>Hardware package</span>
                            <span className="font-bold">£{hardwareValue}</span>
                          </div>
                          <div className="flex justify-between text-emerald-600 text-sm">
                            <span>Shipping</span>
                            <span className="font-bold">FREE</span>
                          </div>
                        </>
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
              Questions? Email us at{' '}
              <a href="mailto:contact@demly.co.uk" className="text-emerald-600 hover:text-emerald-700 transition-colors font-medium">
                contact@demly.co.uk
              </a>
              {' '}or call{' '}
              <a href="tel:+440000000000" className="text-emerald-600 hover:text-emerald-700 transition-colors font-medium">
                0800 123 4567
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
