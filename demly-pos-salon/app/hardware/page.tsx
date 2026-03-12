// app/hardware/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, Check, Printer, CreditCard, Monitor, 
  Sun, Moon, Menu, X, Sparkles, Wifi, Bluetooth, Usb,
  Coffee, Store, Scissors, Warehouse, UtensilsCrossed,
  ShoppingBag, Briefcase, Package, Smartphone, Tablet,
  Zap, Shield, Truck, HelpCircle, Download, BookOpen,
  Youtube, MessageCircle, Mail, Globe, Star, Users, Clock,
  BarChart3, Calendar, ChevronRight, ChevronLeft, ExternalLink
} from "lucide-react";
import Logo from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";

// Hardware categories
const HARDWARE_CATEGORIES = [
  {
    id: "printer",
    title: "Receipt Printers",
    icon: Printer,
    gradient: "from-blue-500 to-cyan-600",
    description: "Thermal printers for receipts, kitchen orders, and labels",
    image: "https://images.unsplash.com/photo-1612815150376-8e0b7f1e1f1e?w=800&h=600&fit=crop&crop=center",
    longDescription: "Fast, reliable thermal printers that produce crisp receipts in seconds. Compatible with all Demly POS features.",
    features: [
      "Thermal printing (no ink needed)",
      "USB, Ethernet, or Bluetooth connectivity",
      "Automatic paper cutter",
      "Receipt logos and branding",
      "Kitchen order printing",
      "Label printing support"
    ],
    popular: "Epson TM-T20II",
    price: "£180-300",
    setupGuide: "Connect via USB or network, install driver, select in POS settings"
  },
  {
    id: "cash-drawer",
    title: "Cash Drawers",
    icon: Briefcase,
    gradient: "from-emerald-500 to-green-600",
    description: "Secure cash management for your business",
    image: "https://images.unsplash.com/photo-1586500036707-8ffc6c7f2b6f?w=800&h=600&fit=crop&crop=center",
    longDescription: "Heavy-duty cash drawers that automatically open with each cash transaction. Connects directly to your receipt printer.",
    features: [
      "Automatic opening via printer",
      "Manual key override",
      "Multiple bill compartments",
      "Coin tray included",
      "Durable steel construction",
      "Anti-theft design"
    ],
    popular: "APG Vasario",
    price: "£80-150",
    setupGuide: "Connect RJ12 cable to printer's cash drawer port, enable in POS settings"
  },
  {
    id: "scanner",
    title: "Barcode Scanners",
    icon: Package,
    gradient: "from-purple-500 to-pink-600",
    description: "Fast, accurate scanning for inventory and checkout",
    image: "https://images.unsplash.com/photo-1588964898-4f9a0c4b8b0a?w=800&h=600&fit=crop&crop=center",
    longDescription: "Scan products instantly at checkout or during inventory counts. Works with 1D and 2D barcodes.",
    features: [
      "1D and 2D barcode support",
      "USB plug-and-play",
      "Wireless Bluetooth options",
      "Scan from screen (QR codes)",
      "Inventory counting mode",
      "Durable drop protection"
    ],
    popular: "Honeywell 1400g",
    price: "£60-200",
    setupGuide: "Plug into USB port, scans as keyboard input - works immediately"
  },
  {
    id: "card-terminal",
    title: "Card Terminals",
    icon: CreditCard,
    gradient: "from-orange-500 to-amber-600",
    description: "Accept card payments anywhere",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop&crop=center",
    longDescription: "Process card payments securely with contactless, chip, and magnetic stripe support. Works with all major providers.",
    features: [
      "Contactless (Apple Pay, Google Pay)",
      "Chip & PIN support",
      "Magnetic stripe backup",
      "Bluetooth or WiFi connection",
      "Receipt printing",
      "Multiple provider support"
    ],
    popular: "Stripe BBPOS WisePad 3",
    price: "£50-150",
    setupGuide: "Pair via Bluetooth, configure in Demly Card Terminal settings"
  },
  {
    id: "customer-display",
    title: "Customer Displays",
    icon: Monitor,
    gradient: "from-red-500 to-pink-600",
    description: "Show customers their order total",
    image: "https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=800&h=600&fit=crop&crop=center",
    longDescription: "Dual-screen setup lets customers see their items, prices, and total as you ring them up.",
    features: [
      "Second screen for customers",
      "Shows items and prices",
      "Displays promotional messages",
      "HDMI or USB connection",
      "Pole or wall mountable",
      "Promotes upsells"
    ],
    popular: "Epson DM-D110",
    price: "£150-300",
    setupGuide: "Connect to POS device via HDMI or USB, enable customer display in settings"
  },
  {
    id: "tablet-stand",
    title: "Tablet Stands & Mounts",
    icon: Tablet,
    gradient: "from-indigo-500 to-blue-600",
    description: "Secure your iPad or Android tablet",
    image: "https://images.unsplash.com/photo-1587033411391-5a9e51e4e6c0?w=800&h=600&fit=crop&crop=center",
    longDescription: "Professional stands that transform your tablet into a fixed POS station. Adjustable angles and secure locking.",
    features: [
      "Adjustable viewing angles",
      "Secure tablet locking",
      "Cable management",
      "Counter or wall mount",
      "Charging pass-through",
      "Anti-theft design"
    ],
    popular: "Square Stand",
    price: "£50-200",
    setupGuide: "Mount tablet, connect peripherals via USB hub"
  }
];

// Starter bundles by business type
const STARTER_BUNDLES = [
  {
    id: "cafe",
    title: "Café & Coffee Shop",
    icon: Coffee,
    gradient: "from-amber-500 to-orange-600",
    hardware: [
      "Epson TM-T20II Printer (£180)",
      "APG Cash Drawer (£80)",
      "Honeywell Scanner (£100)",
      "Total: £360"
    ],
    description: "Everything a small café needs to start accepting payments and managing orders."
  },
  {
    id: "retail",
    title: "Retail Store",
    icon: Store,
    gradient: "from-blue-500 to-cyan-600",
    hardware: [
      "Star TSP143IIIU Printer (£160)",
      "MMF Cash Drawer (£90)",
      "Zebra DS2208 Scanner (£120)",
      "Total: £370"
    ],
    description: "Complete setup for boutiques, gift shops, and general retail."
  },
  {
    id: "restaurant",
    title: "Restaurant",
    icon: UtensilsCrossed,
    gradient: "from-red-500 to-orange-600",
    hardware: [
      "Epson TM-T88VI Printer (£300)",
      "APG Cash Drawer (£80)",
      "Kitchen Printer Epson TM-U220 (£200)",
      "Total: £580"
    ],
    description: "Includes kitchen printer for sending orders directly to the kitchen."
  },
  {
    id: "food-truck",
    title: "Food Truck",
    icon: Truck,
    gradient: "from-purple-500 to-pink-600",
    hardware: [
      "2incel Bluetooth Printer (£70)",
      "Manual Cash Box (£25)",
      "SumUp Card Reader (£40)",
      "Total: £135"
    ],
    description: "Mobile setup perfect for food trucks and market stalls."
  }
];

// FAQ items
const FAQ_ITEMS = [
  {
    question: "Do I need all this hardware to start?",
    answer: "No! You can start with just an iPad or computer and email receipts. Add hardware as your business grows. Many businesses start with just a card reader and add printers later."
  },
  {
    question: "What's the minimum I need?",
    answer: "Just a device (iPad, Android tablet, or computer) with internet connection. You can accept card payments through your phone and email receipts to customers."
  },
  {
    question: "Will my existing hardware work?",
    answer: "Most standard POS hardware works with Demly. Printers with ESC/POS support, USB scanners, and common card terminals are all compatible. Check our compatibility list."
  },
  {
    question: "How do I set everything up?",
    answer: "Each hardware page has a setup guide. For most devices, it's plug-and-play. For printers, you'll need to install drivers and select them in Demly settings."
  },
  {
    question: "What if something breaks?",
    answer: "Hardware warranties are handled by the manufacturer. We provide setup support and troubleshooting guides. Consider our hardware rental program for free replacements."
  },
  {
    question: "Can you ship to me?",
    answer: "Yes! We partner with UK distributors who can ship directly to you. Most orders arrive next business day. International shipping also available."
  }
];

export default function HardwarePage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeBundle, setActiveBundle] = useState<string>("cafe");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
                href="/" 
                className={`px-5 py-2.5 rounded-full font-semibold text-sm lg:text-base transition-colors ${
                  theme === 'dark' 
                    ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                    : 'text-slate-600 hover:text-black hover:bg-black/5'
                }`}
              >
                ← Back to Home
              </Link>
              <Link 
                href="/industries" 
                className={`px-5 py-2.5 rounded-full font-semibold text-sm lg:text-base transition-colors ${
                  theme === 'dark' 
                    ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                    : 'text-slate-600 hover:text-black hover:bg-black/5'
                }`}
              >
                Industries
              </Link>
              <Link 
                href="/pay" 
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-full font-bold text-white transition-colors text-sm lg:text-base shadow-lg shadow-emerald-600/20"
              >
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
                  <Link 
                    href="/" 
                    className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      theme === 'dark' 
                        ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                        : 'text-slate-600 hover:text-black hover:bg-black/5'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ← Back to Home
                  </Link>
                  <Link 
                    href="/industries" 
                    className={`px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      theme === 'dark' 
                        ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                        : 'text-slate-600 hover:text-black hover:bg-black/5'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Industries
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
          </AnimatePresence>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-24 md:pt-28 pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className={`text-emerald-400 text-xs md:text-sm font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
                POS Hardware Guide
              </span>
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black mb-4 ${textPrimary}`}>
              <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Hardware</span> That Just Works
            </h1>
            
            <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
              Everything you need to build the perfect POS setup. From receipt printers to card terminals, we've got you covered.
            </p>
          </motion.div>

          {/* Quick Start Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`${cardBg} rounded-3xl p-8 mb-12 border-2 border-emerald-500/30`}
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Just starting out?</h2>
                <p className={`${textSecondary}`}>
                  You don't need all this hardware on day one. Start with just your phone or tablet, 
                  add a card reader, then expand as you grow. Most businesses begin with a printer and 
                  card reader, then add cash drawers and scanners later.
                </p>
              </div>
              <Link
                href="/pay"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold whitespace-nowrap"
              >
                Start Free Trial
              </Link>
            </div>
          </motion.div>

          {/* Hardware Categories Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {HARDWARE_CATEGORIES.map((category, index) => {
              const Icon = category.icon;
              const isExpanded = selectedCategory === category.id;
              
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${cardBg} rounded-3xl overflow-hidden border hover:border-emerald-500/30 transition-all cursor-pointer group`}
                  onClick={() => setSelectedCategory(isExpanded ? null : category.id)}
                >
                  {/* Image */}
                  <div className="h-40 overflow-hidden relative">
                    <div 
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                      style={{ backgroundImage: `url(${category.image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Icon */}
                    <div className={`absolute bottom-4 left-4 w-12 h-12 rounded-2xl bg-gradient-to-r ${category.gradient} flex items-center justify-center shadow-xl`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    {/* Price tag */}
                    <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white border border-white/10">
                      {category.price}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>{category.title}</h3>
                    <p className={`${textSecondary} text-sm mb-4`}>{category.description}</p>
                    
                    {/* Features - Always visible */}
                    <div className="space-y-2 mb-4">
                      {category.features.slice(0, isExpanded ? 6 : 3).map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className={`text-xs ${textSecondary}`}>{feature}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <p className={`text-sm ${textSecondary} pt-2 border-t border-slate-700/30`}>
                            {category.longDescription}
                          </p>
                          
                          <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
                            <p className={`text-xs ${textMuted} mb-1`}>Popular choice</p>
                            <p className={`text-sm font-bold ${textPrimary} mb-2`}>{category.popular}</p>
                            <p className={`text-xs ${textMuted}`}>💰 {category.price}</p>
                          </div>
                          
                          <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10">
                            <p className={`text-xs font-medium text-blue-400 mb-1 flex items-center gap-1`}>
                              <BookOpen className="w-3 h-3" />
                              Quick Setup
                            </p>
                            <p className={`text-xs ${textSecondary}`}>{category.setupGuide}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Expand/Collapse Indicator */}
                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-700/30">
                      <span className={`text-xs ${textMuted}`}>
                        {isExpanded ? 'Show less' : `${category.features.length - 3} more details`}
                      </span>
                      <ArrowRight className={`w-4 h-4 text-emerald-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Starter Bundles Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-16"
          >
            <div className="text-center mb-8">
              <h2 className={`text-3xl md:text-4xl font-black mb-4 ${textPrimary}`}>
                <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Starter Bundles</span> by Business Type
              </h2>
              <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
                Ready-to-go hardware packages tailored to your industry
              </p>
            </div>

            {/* Bundle Selector */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {STARTER_BUNDLES.map((bundle) => {
                const Icon = bundle.icon;
                const isActive = activeBundle === bundle.id;
                
                return (
                  <button
                    key={bundle.id}
                    onClick={() => setActiveBundle(bundle.id)}
                    className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                      isActive
                        ? `bg-gradient-to-r ${bundle.gradient} text-white shadow-lg`
                        : theme === 'dark'
                        ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {bundle.title}
                  </button>
                );
              })}
            </div>

            {/* Active Bundle Display */}
            <AnimatePresence mode="wait">
              {STARTER_BUNDLES.map((bundle) => {
                if (bundle.id !== activeBundle) return null;
                const Icon = bundle.icon;
                
                return (
                  <motion.div
                    key={bundle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`${cardBg} rounded-3xl p-8 border-2 border-emerald-500/30`}
                  >
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="md:w-1/3">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${bundle.gradient} flex items-center justify-center mb-4`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <h3 className={`text-2xl font-bold mb-2 ${textPrimary}`}>{bundle.title} Bundle</h3>
                        <p className={`${textSecondary} mb-4`}>{bundle.description}</p>
                        <div className="flex items-center gap-2 text-emerald-500 font-bold">
                          <Truck className="w-4 h-4" />
                          <span>Free UK shipping</span>
                        </div>
                      </div>
                      
                      <div className="md:w-2/3">
                        <div className="bg-emerald-500/5 rounded-2xl p-6 border border-emerald-500/10 mb-4">
                          <h4 className={`font-bold mb-3 ${textPrimary}`}>Includes:</h4>
                          <div className="space-y-3">
                            {bundle.hardware.map((item, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                </div>
                                <span className={`${textSecondary}`}>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <Link
                          href="/pay"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold transition-colors"
                        >
                          Get This Bundle
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.section>

          {/* Hardware Rental Program */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`${cardBg} rounded-3xl p-8 mb-16 border-2 border-purple-500/30`}
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/3 flex justify-center">
                <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-xl">
                  <Shield className="w-16 h-16 text-white" />
                </div>
              </div>
              
              <div className="md:w-2/3 text-center md:text-left">
                <h2 className={`text-2xl md:text-3xl font-bold mb-3 ${textPrimary}`}>
                  Hardware Rental Program
                </h2>
                <p className={`${textSecondary} mb-4`}>
                  Don't want to buy hardware upfront? Rent everything for a low monthly fee. 
                  Includes free replacement if anything breaks.
                </p>
                
                <div className="grid sm:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-500">£15</div>
                    <div className={`text-xs ${textMuted}`}>per month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-500">24/7</div>
                    <div className={`text-xs ${textMuted}`}>support</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-500">Free</div>
                    <div className={`text-xs ${textMuted}`}>replacements</div>
                  </div>
                </div>
                
                <Link
                  href="/pay?rental=true"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full font-bold transition-colors"
                >
                  Learn About Rental
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.section>

          {/* FAQ Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-16"
          >
            <div className="text-center mb-8">
              <h2 className={`text-3xl md:text-4xl font-black mb-4 ${textPrimary}`}>
                Frequently Asked <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Questions</span>
              </h2>
              <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
                Everything you need to know about POS hardware
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {FAQ_ITEMS.map((faq, index) => {
                const isExpanded = expandedFaq === index;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`${cardBg} rounded-2xl border hover:border-emerald-500/30 transition-all cursor-pointer overflow-hidden`}
                    onClick={() => setExpandedFaq(isExpanded ? null : index)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className={`font-bold ${textPrimary}`}>{faq.question}</h3>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'
                        }`}>
                          {isExpanded ? (
                            <ChevronLeft className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`mt-3 text-sm ${textSecondary}`}
                          >
                            {faq.answer}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>

          {/* Resources Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-16"
          >
            <div className="grid md:grid-cols-3 gap-6">
              <Link
                href="/guides/setup-printer"
                className={`${cardBg} rounded-2xl p-6 border hover:border-emerald-500/30 transition-all group`}
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Download className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className={`font-bold mb-2 ${textPrimary}`}>Printer Drivers</h3>
                <p className={`text-sm ${textSecondary} mb-4`}>Download drivers for all supported printers</p>
                <span className="text-emerald-500 text-sm flex items-center gap-1">
                  Download <ArrowRight className="w-3 h-3" />
                </span>
              </Link>

              <Link
                href="/guides/video-setup"
                className={`${cardBg} rounded-2xl p-6 border hover:border-emerald-500/30 transition-all group`}
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Youtube className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className={`font-bold mb-2 ${textPrimary}`}>Video Tutorials</h3>
                <p className={`text-sm ${textSecondary} mb-4`}>Watch step-by-step setup guides</p>
                <span className="text-emerald-500 text-sm flex items-center gap-1">
                  Watch now <ArrowRight className="w-3 h-3" />
                </span>
              </Link>

              <Link
                href="/contact"
                className={`${cardBg} rounded-2xl p-6 border hover:border-emerald-500/30 transition-all group`}
              >
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className={`font-bold mb-2 ${textPrimary}`}>Need Help?</h3>
                <p className={`text-sm ${textSecondary} mb-4`}>Contact our hardware support team</p>
                <span className="text-emerald-500 text-sm flex items-center gap-1">
                  Get help <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </motion.section>

          {/* CTA Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center"
          >
            <div className={`${cardBg} rounded-3xl p-12 border`}>
              <h2 className={`text-3xl md:text-4xl font-black mb-4 ${textPrimary}`}>
                Ready to Build Your Setup?
              </h2>
              <p className={`text-lg ${textSecondary} max-w-2xl mx-auto mb-8`}>
                Start with our software today, add hardware as you grow
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pay"
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/contact"
                  className={`px-8 py-4 rounded-full font-bold transition-colors ${
                    theme === 'dark' 
                      ? 'bg-white/5 hover:bg-white/10 text-white' 
                      : 'bg-emerald-50 hover:bg-emerald-100 text-slate-900'
                  }`}
                >
                  Talk to Hardware Specialist
                </Link>
              </div>
            </div>
          </motion.section>
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
              <Link href="/hardware" className="hover:text-emerald-600 transition-colors px-3 py-1 rounded-full hover:bg-emerald-50/10">Hardware</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}