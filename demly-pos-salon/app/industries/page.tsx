"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, Check, Coffee, Store, Scissors, Warehouse, 
  UtensilsCrossed, ShoppingBag, Briefcase, Sparkles, 
  Sun, Moon, Menu, X, Star, Users, Clock, BarChart3,
  CreditCard, Package, Calendar, Phone, Mail, Globe
} from "lucide-react";
import Logo from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";

// Industry data
const INDUSTRIES = [
  {
    id: "restaurant",
    title: "Restaurants & Cafés",
    icon: Coffee,
    gradient: "from-orange-500 to-amber-600",
    description: "Complete solution for fast-casual, fine dining, and coffee shops",
    longDescription: "Streamline your entire restaurant operation with table management, kitchen display systems, and integrated payment processing.",
    features: [
      "Table management & floor plans",
      "Kitchen Display System (KDS)",
      "Digital menus & QR ordering",
      "Split bills & tip management",
      "Inventory tracking",
      "Staff scheduling"
    ],
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&crop=center",
    stats: {
      businesses: "3,500+",
      satisfaction: "98%"
    }
  },
  {
    id: "retail",
    title: "Retail Stores",
    icon: Store,
    gradient: "from-blue-500 to-cyan-600",
    description: "Powerful POS for boutiques, supermarkets, and everything in between",
    longDescription: "Manage inventory, process sales quickly, and keep customers coming back with loyalty programs and detailed analytics.",
    features: [
      "Barcode scanning",
      "Multi-store management",
      "Inventory tracking",
      "Customer loyalty programs",
      "Purchase orders",
      "Supplier management"
    ],
    image: "https://images.unsplash.com/photo-1604719311686-9a1a14f8f3c3?w=800&h=600&fit=crop&crop=center",
    stats: {
      businesses: "4,200+",
      satisfaction: "97%"
    }
  },
  {
    id: "salon",
    title: "Salons & Barbers",
    icon: Scissors,
    gradient: "from-purple-500 to-pink-600",
    description: "Everything you need for salons, barbershops, and spas",
    longDescription: "Book appointments, manage staff schedules, and sell products all from one intuitive platform.",
    features: [
      "Online booking",
      "Staff scheduling",
      "Service menu management",
      "Product retail",
      "Client history",
      "Gift cards & memberships"
    ],
    image: "https://images.unsplash.com/photo-1560066984-13812e1f5d3c?w=800&h=600&fit=crop&crop=center",
    stats: {
      businesses: "2,800+",
      satisfaction: "99%"
    }
  },
  {
    id: "warehouse",
    title: "Warehouses",
    icon: Warehouse,
    gradient: "from-emerald-500 to-green-600",
    description: "Enterprise-grade inventory and warehouse management",
    longDescription: "Track bulk inventory, manage suppliers, and handle high-volume transactions with ease.",
    features: [
      "Bulk inventory tracking",
      "Supplier management",
      "Purchase orders",
      "Stock alerts",
      "Multi-warehouse",
      "Batch tracking"
    ],
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop&crop=center",
    stats: {
      businesses: "1,500+",
      satisfaction: "96%"
    }
  },
  {
    id: "food-truck",
    title: "Food Trucks",
    icon: UtensilsCrossed,
    gradient: "from-red-500 to-orange-600",
    description: "Mobile POS for food trucks and pop-up vendors",
    longDescription: "Take payments anywhere with offline mode, manage inventory, and track sales on the go.",
    features: [
      "Offline mode",
      "Mobile printing",
      "Menu management",
      "Daily specials",
      "Sales analytics",
      "Inventory alerts"
    ],
    image: "https://images.unsplash.com/photo-1565124882421-63af5b4b0e3c?w=800&h=600&fit=crop&crop=center",
    stats: {
      businesses: "1,200+",
      satisfaction: "95%"
    }
  },
  {
    id: "bakery",
    title: "Bakeries",
    icon: Briefcase,
    gradient: "from-amber-500 to-yellow-600",
    description: "Fresh approach to bakery management",
    longDescription: "Track fresh ingredients, manage recipes, and handle high-volume rushes with ease.",
    features: [
      "Recipe costing",
      "Freshness tracking",
      "Batch management",
      "Wholesale orders",
      "Daily specials",
      "Expiry alerts"
    ],
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=600&fit=crop&crop=center",
    stats: {
      businesses: "1,800+",
      satisfaction: "98%"
    }
  }
];

export default function IndustriesPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

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
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className={`text-emerald-400 text-xs md:text-sm font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
                Industry Solutions
              </span>
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black mb-4 ${textPrimary}`}>
              Built for <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Every Business</span>
            </h1>
            
            <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
              Tailored solutions for your specific industry. From restaurants to warehouses, we've got you covered.
            </p>
          </motion.div>

          {/* Industry Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {INDUSTRIES.map((industry, index) => {
              const Icon = industry.icon;
              const isExpanded = selectedIndustry === industry.id;
              
              return (
                <motion.div
                  key={industry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${cardBg} rounded-3xl overflow-hidden border hover:border-emerald-500/30 transition-all cursor-pointer group`}
                  onClick={() => setSelectedIndustry(isExpanded ? null : industry.id)}
                >
                  {/* Image */}
                  <div className="h-48 overflow-hidden relative">
                    <div 
                      className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
                      style={{ backgroundImage: `url(${industry.image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Icon */}
                    <div className={`absolute bottom-4 left-4 w-12 h-12 rounded-2xl bg-gradient-to-r ${industry.gradient} flex items-center justify-center shadow-xl`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    {/* Stats */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full text-xs text-white border border-white/10">
                        ⭐ {industry.stats.satisfaction}
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>{industry.title}</h3>
                    <p className={`${textSecondary} text-sm mb-4`}>{industry.description}</p>
                    
                    {/* Features - Always visible */}
                    <div className="space-y-2 mb-4">
                      {industry.features.slice(0, isExpanded ? 6 : 3).map((feature, i) => (
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
                            {industry.longDescription}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                              <p className={`text-xs ${textMuted}`}>Businesses</p>
                              <p className={`text-lg font-bold ${textPrimary}`}>{industry.stats.businesses}</p>
                            </div>
                            <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                              <p className={`text-xs ${textMuted}`}>Satisfaction</p>
                              <p className={`text-lg font-bold ${textPrimary}`}>{industry.stats.satisfaction}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Expand/Collapse Indicator */}
                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-700/30">
                      <span className={`text-xs ${textMuted}`}>
                        {isExpanded ? 'Show less' : `${industry.features.length - 3} more features`}
                      </span>
                      <ArrowRight className={`w-4 h-4 text-emerald-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Why Choose Us Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-20"
          >
            <div className="text-center mb-12">
              <h2 className={`text-3xl md:text-4xl font-black mb-4 ${textPrimary}`}>
                Why <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Choose Demly</span>
              </h2>
              <p className={`text-lg ${textSecondary} max-w-2xl mx-auto`}>
                One platform, unlimited possibilities
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Users,
                  title: "10,000+ Businesses",
                  desc: "Trusted by businesses worldwide"
                },
                {
                  icon: Clock,
                  title: "24/7 Support",
                  desc: "Round-the-clock assistance"
                },
                {
                  icon: BarChart3,
                  title: "Real-time Analytics",
                  desc: "Make data-driven decisions"
                },
                {
                  icon: CreditCard,
                  title: "Flexible Payments",
                  desc: "Multiple payment methods"
                },
                {
                  icon: Package,
                  title: "Inventory Management",
                  desc: "Track stock in real-time"
                },
                {
                  icon: Calendar,
                  title: "Appointment Booking",
                  desc: "Seamless scheduling"
                }
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className={`${cardBg} rounded-2xl p-6 border text-center hover:border-emerald-500/30 transition-all group`}>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className={`font-bold mb-2 ${textPrimary}`}>{item.title}</h3>
                    <p className={`text-sm ${textSecondary}`}>{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </motion.section>

          {/* CTA Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-20 text-center"
          >
            <div className={`${cardBg} rounded-3xl p-12 border`}>
              <h2 className={`text-3xl md:text-4xl font-black mb-4 ${textPrimary}`}>
                Ready to Transform Your Business?
              </h2>
              <p className={`text-lg ${textSecondary} max-w-2xl mx-auto mb-8`}>
                Join thousands of businesses already using Demly POS
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
                  Talk to Sales
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
                © 2025 Demly. All rights reserved.
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
