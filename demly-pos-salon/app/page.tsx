// app/page.tsx
"use client";

import Link from "next/link";
import { 
  Check, Zap, Shield, TrendingUp, Sparkles, Star, ShoppingCart, 
  Package, Users, Globe, Clock, Coffee, Store, Scissors, Warehouse, 
  ArrowRight, ChevronRight, Sun, Moon, Menu, X
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import { motion, AnimatePresence } from "framer-motion";

// REAL IMAGES - Using your provided URLs and high-quality Unsplash for variety
const REAL_IMAGES = {
  warehouse: {
    bacon: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTlW5bP40uTsLv73KrVLZXldWSKBb6FoN4kGz-DlJKb8DWW_cEM0YkCt0wa-D6-QRi14Nl70HgfMvGKeDT7YVxT2eeNHUIhb4ecJEKCYVO6Jod02QjOV8DS8Klk-N8YXnXI7536iJsyNEo&usqp=CAc",
    cola: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcSPoGxa7USQj2zOB0yghsImVUGzQnv7HYWKBnnRj_OtLD1TzDYRbtRhk9iXfvcVvFjkb034-d6Q58zCRW9CwCfvzlYc2pVdelrz_i4XIZXZgSKDZf4cgYO2KOmDzIAEEb-SQ9F4HA&usqp=CAc",
    waterPallet: "https://images.unsplash.com/photo-1595435934247-5d33b7f92c70?w=400&h=300&fit=crop&crop=center",
    snacks: "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400&h=300&fit=crop&crop=center"
  },
  restaurant: {
    avocadoToast: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop&crop=center",
    soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop&crop=center",
    burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&crop=center",
    salad: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&crop=center"
  },
  retail: {
    headphones: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop&crop=center",
    cables: "https://images.unsplash.com/photo-1589561454226-796a8e89e2de?w=400&h=300&fit=crop&crop=center",
    coldDrinks: "https://images.unsplash.com/photo-1603561596112-0a132b757442?w=400&h=300&fit=crop&crop=center",
    accessories: "https://images.unsplash.com/photo-1581235720705-6d2a6e5d2c9a?w=400&h=300&fit=crop&crop=center"
  },
  salon: {
    quiffHair: "https://cdn.luxuo.com/2022/05/2-Quiff.jpg",
    salonTools: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTeIZLpfpxNzq4KNw-RGGGqTWW5Dhot-vw76w&s",
    hairProducts: "https://images.unsplash.com/photo-1634942537034-2531766767d1?w=400&h=300&fit=crop&crop=center",
    beardStyle: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=300&fit=crop&crop=center"
  }
};

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('light', savedTheme === 'light');
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    
    handleScroll();
    checkMobile();
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', checkMobile);
    
    return () => {
      subscription.unsubscribe();
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
  const bgGradient = theme === 'dark' 
    ? 'bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950' 
    : 'bg-gradient-to-br from-slate-50 via-white to-slate-100';
  
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-300' : 'text-slate-600';
  const textMuted = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  
  const cardBg = theme === 'dark' 
    ? 'bg-slate-900/40 backdrop-blur-xl border-slate-800/50' 
    : 'bg-white/80 backdrop-blur-xl border-slate-200/50 shadow-lg';
  
  const cardBgSolid = theme === 'dark'
    ? 'bg-slate-800/50 border-slate-700/50'
    : 'bg-white border-slate-200';

  const headerBg = 'bg-black'; // Keep header black as requested

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgGradient}`}>
      {/* Fixed Header - Pure Black (unchanged) */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black py-3 shadow-xl' : 'bg-black py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="group">
              <Logo size={isMobile ? "medium" : "large"} />
            </Link>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300" /> : <Moon className="w-5 h-5 text-slate-300" />}
              </button>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-slate-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8 text-slate-300">
              <a href="#features" className="hover:text-emerald-400 transition-colors text-sm lg:text-base">Features</a>
              <a href="#pos" className="hover:text-emerald-400 transition-colors text-sm lg:text-base">POS Demo</a>
              <a href="/industries" className="hover:text-emerald-400 transition-colors text-sm lg:text-base">Industries</a>
              <a href="#pricing" className="hover:text-emerald-400 transition-colors text-sm lg:text-base">Pricing</a>
            </div>
            
            {/* Action Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? 
                  <Sun className="w-5 h-5 text-slate-300" /> : 
                  <Moon className="w-5 h-5 text-slate-300" />
                }
              </button>
              {isLoggedIn ? (
                <Link 
                  href="/dashboard" 
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white transition-colors text-sm lg:text-base"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="px-5 py-2.5 text-slate-300 hover:text-white transition-colors font-semibold text-sm lg:text-base"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/pay" 
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white transition-colors text-sm lg:text-base"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 border-t border-white/10 pt-4"
              >
                <div className="flex flex-col space-y-3">
                  <a href="#features" className="text-slate-300 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5">Features</a>
                  <a href="#pos" className="text-slate-300 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5">POS Demo</a>
                  <a href="/industries" className="text-slate-300 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5">Industries</a>
                  <a href="#pricing" className="text-slate-300 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5">Pricing</a>
                  <div className="border-t border-white/10 pt-3 flex gap-3">
                    {isLoggedIn ? (
                      <Link href="/dashboard" className="flex-1 bg-emerald-600 text-white text-center py-2 rounded-lg font-bold">
                        Dashboard
                      </Link>
                    ) : (
                      <>
                        <Link href="/login" className="flex-1 border border-white/10 text-slate-300 text-center py-2 rounded-lg font-semibold">
                          Sign In
                        </Link>
                        <Link href="/pay" className="flex-1 bg-emerald-600 text-white text-center py-2 rounded-lg font-bold">
                          Get Started
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Hero Section - Modern gradient background */}
      <section className={`pt-28 md:pt-32 pb-16 md:pb-20 px-4 sm:px-6 ${theme === 'dark' ? 'bg-black' : 'bg-gradient-to-br from-emerald-50 to-white'}`}>
        <div className="max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6 md:mb-8"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className={`text-emerald-400 text-xs md:text-sm font-semibold ${theme === 'light' ? 'text-emerald-600' : ''}`}>
              Trusted by 10,000+ businesses
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight ${textPrimary}`}
          >
            Modern POS Solutions
            <br />
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
              for Growing Businesses
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-base sm:text-lg md:text-xl ${textSecondary} mb-8 md:mb-12 max-w-2xl md:max-w-3xl mx-auto px-4`}
          >
            Streamline your operations with our all-in-one POS system. 
            Perfect for retail, restaurants, salons, and warehouses.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4"
          >
            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="px-8 sm:px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg text-white transition-colors shadow-lg shadow-emerald-600/20"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/pay" 
                  className="px-8 sm:px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg text-white transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Start Free Trial
                </Link>
                <Link 
                  href="/industries" 
                  className={`px-8 sm:px-10 py-3 sm:py-4 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200'} border rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg ${textPrimary} transition-colors`}
                >
                  Browse Industries
                </Link>
              </>
            )}
          </motion.div>

          {/* Trust badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 mt-12 md:mt-16"
          >
            {['Trustpilot 4.8', 'GDPR Compliant', 'PCI DSS Level 1', '24/7 Support'].map((badge, i) => (
              <div key={i} className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className={`text-xs font-medium ${textMuted}`}>{badge}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Real POS Demo Section */}
      <section id="pos" className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 ${textPrimary}`}>
              The Real <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Demly POS</span>
            </h2>
            <p className={`text-base sm:text-lg md:text-xl ${textSecondary} max-w-2xl md:max-w-3xl mx-auto`}>
              See the actual interface used by thousands of businesses
            </p>
          </div>
          
          {/* POS Interface */}
          <div className={`${cardBg} rounded-2xl md:rounded-3xl border p-4 sm:p-6 shadow-2xl`}>
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              {/* Products Grid */}
              <div className="lg:w-2/3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { name: "Bacon Case", price: 42.50, stock: 7, image: REAL_IMAGES.warehouse.bacon, category: "warehouse" },
                    { name: "Coca-Cola 24pk", price: 28.80, stock: 15, image: REAL_IMAGES.warehouse.cola, category: "warehouse" },
                    { name: "Wireless Headphones", price: 89.99, stock: 12, image: REAL_IMAGES.retail.headphones, category: "retail" },
                    { name: "USB-C Cables", price: 14.99, stock: 25, image: REAL_IMAGES.retail.cables, category: "retail" },
                    { name: "Avocado Toast", price: 12.99, stock: 8, image: REAL_IMAGES.restaurant.avocadoToast, category: "restaurant" },
                    { name: "Butternut Soup", price: 8.99, stock: 5, image: REAL_IMAGES.restaurant.soup, category: "restaurant" },
                    { name: "Hair Styling Gel", price: 18.50, stock: 6, image: REAL_IMAGES.salon.hairProducts, category: "salon" },
                    { name: "Quiff Haircut", price: 35.00, stock: 10, image: REAL_IMAGES.salon.quiffHair, category: "salon" }
                  ].map((item, i) => (
                    <div key={i} className={`group ${cardBgSolid} rounded-xl p-3 sm:p-4 hover:border-emerald-500/50 transition-all border`}>
                      <div className="aspect-square rounded-lg mb-2 sm:mb-3 overflow-hidden bg-slate-700/30">
                        <div 
                          className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                          style={{ backgroundImage: `url(${item.image})` }}
                        />
                      </div>
                      <p className={`font-bold ${textPrimary} text-xs sm:text-sm truncate`}>{item.name}</p>
                      <div className="flex justify-between items-center mt-1 sm:mt-2">
                        <span className="text-sm sm:text-lg font-black bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                          £{item.price}
                        </span>
                        <span className={`text-[10px] sm:text-xs ${theme === 'dark' ? 'bg-slate-700/50' : 'bg-slate-100'} px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${textMuted}`}>
                          Stock: {item.stock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Side */}
              <div className={`lg:w-1/3 ${cardBgSolid} rounded-xl sm:rounded-2xl p-4 sm:p-6 mt-4 lg:mt-0 border`}>
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div>
                      <h3 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>Transaction #001</h3>
                      <p className={`text-xs sm:text-sm ${textMuted}`}>3 items • Staff: Mike</p>
                    </div>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                    {[
                      { name: "Bacon Case", price: 42.50, qty: 1 },
                      { name: "Coca-Cola 24pk", price: 28.80, qty: 2 }
                    ].map((item, i) => (
                      <div key={i} className={`${cardBgSolid} rounded-lg sm:rounded-xl p-3 border`}>
                        <div className="flex justify-between items-start mb-1 sm:mb-2">
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold ${textPrimary} text-sm truncate`}>{item.name}</p>
                            <p className={`text-xs ${textMuted}`}>£{item.price} each</p>
                          </div>
                          <span className={`text-base sm:text-lg font-bold text-emerald-600 ml-2`}>
                            £{(item.price * item.qty).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-1 sm:gap-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg px-2 sm:px-3 py-1`}>
                            <button className={`${textPrimary} hover:text-emerald-600 text-xs`}>−</button>
                            <span className={`font-bold ${textPrimary} text-sm px-1 sm:px-2`}>{item.qty}</span>
                            <button className={`${textPrimary} hover:text-emerald-600 text-xs`}>+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className={`${cardBgSolid} rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border`}>
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className={`flex justify-between text-xs sm:text-sm ${textSecondary}`}>
                        <span>Subtotal</span>
                        <span className="font-bold">£100.10</span>
                      </div>
                      <div className={`flex justify-between text-xs sm:text-sm ${textSecondary}`}>
                        <span>VAT (20%)</span>
                        <span className="font-bold">£20.02</span>
                      </div>
                      <div className={`border-t ${theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200'} pt-2 sm:pt-3 flex justify-between`}>
                        <span className={`text-sm sm:text-xl font-bold ${textPrimary}`}>Total</span>
                        <span className="text-lg sm:text-2xl font-black bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">
                          £120.12
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                    {['Discount', 'Misc', 'Print', 'Recent'].map((btn, i) => (
                      <button key={i} className={`${cardBgSolid} hover:bg-opacity-80 border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} ${textPrimary} font-bold py-2 sm:py-3 rounded-lg text-xs sm:text-sm transition-all`}>
                        {btn === 'Misc' && <Package className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />}
                        {btn}
                      </button>
                    ))}
                  </div>

                  {/* Pay Button */}
                  <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base sm:text-xl py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-colors shadow-lg shadow-emerald-600/20">
                    PAY £120.12
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Preview Section */}
      <section className={`py-16 md:py-20 px-4 sm:px-6 ${theme === 'dark' ? 'bg-black/50' : 'bg-emerald-50/50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 ${textPrimary}`}>
              Built for <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Every Business</span>
            </h2>
            <p className={`text-base sm:text-lg md:text-xl ${textSecondary} max-w-2xl md:max-w-3xl mx-auto`}>
              Industry-specific features for maximum efficiency
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                title: "Restaurants & Cafés",
                icon: Coffee,
                gradient: "from-orange-500 to-amber-600",
                image: REAL_IMAGES.restaurant.avocadoToast,
                features: ["Table Management", "Digital Menus", "Kitchen Display"]
              },
              {
                title: "Retail Stores",
                icon: Store,
                gradient: "from-blue-500 to-cyan-600",
                image: REAL_IMAGES.retail.coldDrinks,
                features: ["Barcode Scanning", "Multi-Store", "Inventory"]
              },
              {
                title: "Salons & Barbers",
                icon: Scissors,
                gradient: "from-purple-500 to-pink-600",
                image: REAL_IMAGES.salon.quiffHair,
                features: ["Appointments", "Staff Scheduling", "Services"]
              },
              {
                title: "Warehouses",
                icon: Warehouse,
                gradient: "from-emerald-500 to-green-600",
                image: REAL_IMAGES.warehouse.cola,
                features: ["Bulk Sales", "Pallet Tracking", "Supplier"]
              }
            ].map((industry, i) => (
              <div key={i} className={`group ${cardBg} rounded-xl sm:rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all border`}>
                <div className="h-40 sm:h-48 overflow-hidden">
                  <div 
                    className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                    style={{ backgroundImage: `url(${industry.image})` }}
                  />
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r ${industry.gradient} bg-opacity-20 flex items-center justify-center`}>
                      <industry.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h3 className={`text-lg sm:text-xl font-bold ${textPrimary}`}>{industry.title}</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {industry.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 flex-shrink-0" />
                        <span className={`truncate ${textSecondary}`}>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link 
                    href="/industries" 
                    className="mt-4 inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs sm:text-sm font-semibold group"
                  >
                    See more <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 ${textPrimary}`}>
              Everything You Need to Succeed
            </h2>
            <p className={`text-base sm:text-lg md:text-xl ${textSecondary} max-w-2xl md:max-w-3xl mx-auto`}>
              Enterprise-grade features packed into one powerful platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Shield, title: "Bank-Level Security", desc: "End-to-end encryption and PCI compliance" },
              { icon: Zap, title: "Lightning Fast", desc: "Process transactions in under 2 seconds" },
              { icon: TrendingUp, title: "Real-Time Analytics", desc: "Live dashboards and business insights" },
              { icon: Users, title: "Multi-User Access", desc: "Role-based permissions for your staff" },
              { icon: Globe, title: "Cloud-Based", desc: "Access from anywhere, automatic backups" },
              { icon: Clock, title: "24/7 Support", desc: "Dedicated team always available" },
            ].map((feature, i) => (
              <div key={i} className={`${cardBg} rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-emerald-500/30 transition-all border group`}>
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                </div>
                <h3 className={`text-lg sm:text-xl font-bold mb-2 ${textPrimary}`}>{feature.title}</h3>
                <p className={`${textSecondary} text-sm sm:text-base`}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={`py-16 md:py-20 px-4 sm:px-6 ${theme === 'dark' ? 'bg-black/50' : 'bg-emerald-50/50'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 ${textPrimary}`}>
              Simple, <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 bg-clip-text text-transparent">Transparent Pricing</span>
            </h2>
            <p className={`text-base sm:text-lg md:text-xl ${textSecondary} max-w-2xl md:max-w-3xl mx-auto`}>
              No hidden fees. Cancel anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Monthly Plan */}
            <div className={`${cardBg} rounded-2xl p-6 md:p-8 border hover:border-emerald-500/30 transition-all`}>
              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Monthly</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-emerald-600">£29</span>
                  <span className={`${textMuted}`}>/month</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Complete POS System",
                  "Unlimited transactions",
                  "Staff accounts (up to 10)",
                  "Basic reporting",
                  "Email support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className={`text-sm ${textSecondary}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/pay?plan=monthly"
                className={`block w-full text-center py-3 rounded-xl font-bold transition-colors ${
                  theme === 'dark' 
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10' 
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                } ${textPrimary}`}
              >
                Get Started
              </Link>
            </div>

            {/* Annual Plan */}
            <div className={`${cardBg} rounded-2xl p-6 md:p-8 border-2 border-emerald-500/30 relative`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                BEST VALUE
              </div>
              <div className="mb-6">
                <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Annual</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-emerald-600">£299</span>
                  <span className={`${textMuted}`}>/year</span>
                </div>
                <p className={`text-sm ${textMuted} mt-1`}>Save £49 compared to monthly</p>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  "Everything in Monthly",
                  "Advanced analytics",
                  "Priority support 24/7",
                  "Custom reporting",
                  "API access"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className={`text-sm ${textSecondary}`}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/pay?plan=annual"
                className="block w-full text-center py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black mb-6 ${textPrimary}`}>
            Ready to transform your business?
          </h2>
          <p className={`text-lg md:text-xl ${textSecondary} mb-8`}>
            Join thousands of businesses already using Demly POS
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/pay"
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Start Free Trial
                </Link>
                <Link
                  href="/industries"
                  className={`px-8 py-4 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-emerald-50 hover:bg-emerald-100'} rounded-xl font-bold ${textPrimary} transition-colors`}
                >
                  View Industries
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${theme === 'dark' ? 'bg-black' : 'bg-white'} py-12 px-4 sm:px-6 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="mb-4">
                <Logo size="medium" />
              </div>
              <p className={`${textMuted} text-sm`}>
                © 2025 Demly. All rights reserved.
              </p>
            </div>
            <div className={`flex flex-wrap gap-4 sm:gap-6 md:gap-8 ${textMuted} text-sm justify-center`}>
              <a href="/privacy" className="hover:text-emerald-600 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-emerald-600 transition-colors">Terms</a>
              <a href="mailto:support@demly.com" className="hover:text-emerald-600 transition-colors">Contact</a>
              <a href="/industries" className="hover:text-emerald-600 transition-colors">Industries</a>
            </div>
          </div>
          <div className={`mt-8 pt-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} text-center`}>
            <p className={`${theme === 'dark' ? 'text-slate-600' : 'text-slate-400'} text-sm`}>
              Enterprise software & security solutions
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
