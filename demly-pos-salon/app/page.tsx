"use client";

import Link from "next/link";
import { Check, Zap, Shield, TrendingUp, Sparkles, Star, ShoppingCart, Package, Users, Globe, Clock, Coffee, Store, Scissors, Warehouse, ArrowRight, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

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

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
      {/* Fixed Header - Pure Black for better logo contrast */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black py-3 shadow-xl' : 'bg-black py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="group">
              <Logo size={isMobile ? "medium" : "large"} />
            </Link>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button className="text-slate-300 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8 text-slate-300">
              <a href="#features" className="hover:text-emerald-400 transition-colors text-sm lg:text-base">Features</a>
              <a href="#pos" className="hover:text-emerald-400 transition-colors text-sm lg:text-base">POS Demo</a>
              <a href="/industries" className="hover:text-emerald-400 transition-colors text-sm lg:text-base">Industries</a>
              <a href="#pricing" className="hover:text-emerald-400 transition-colors text-sm lg:text-base">Pricing</a>
            </div>
            
            {/* Action Buttons - Clean solid colors */}
            <div className="hidden md:flex items-center gap-4">
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
        </div>
      </nav>

      {/* Hero Section - Pure Black Background */}
      <section className="pt-28 md:pt-32 pb-16 md:pb-20 px-4 sm:px-6 bg-black">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6 md:mb-8"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs md:text-sm font-semibold">Trusted by 10,000+ businesses</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 leading-tight text-white"
          >
            Enterprise Solutions
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              Built for Growth
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 md:mb-12 max-w-2xl md:max-w-3xl mx-auto px-4"
          >
            From warehouses to restaurants, retail to salons — one universal POS system that adapts to your business needs.
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
                className="px-8 sm:px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg text-white transition-colors"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/pay" 
                  className="px-8 sm:px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg text-white transition-colors"
                >
                  Start Free Trial
                </Link>
                <Link 
                  href="/industries" 
                  className="px-8 sm:px-10 py-3 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg text-white transition-colors"
                >
                  Browse Industries
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Real POS Demo Section */}
      <section id="pos" className="py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 text-white">
              The Real <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">Demly POS</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl md:max-w-3xl mx-auto">
              See the actual interface used by thousands of businesses
            </p>
          </div>
          
          {/* POS Interface */}
          <div className="bg-gradient-to-br from-slate-900 to-black rounded-2xl md:rounded-3xl border border-slate-800/50 p-4 sm:p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
              {/* Products Grid - Mobile optimized */}
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
                    <div key={i} className="group bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 sm:p-4 hover:border-emerald-500/50 transition-all">
                      <div className="aspect-square rounded-lg mb-2 sm:mb-3 overflow-hidden bg-slate-700/30">
                        <div 
                          className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                          style={{ backgroundImage: `url(${item.image})` }}
                        />
                      </div>
                      <p className="font-bold text-white text-xs sm:text-sm truncate">{item.name}</p>
                      <div className="flex justify-between items-center mt-1 sm:mt-2">
                        <span className="text-sm sm:text-lg font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                          £{item.price}
                        </span>
                        <span className="text-[10px] sm:text-xs bg-slate-700/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-slate-300">
                          Stock: {item.stock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Side - Responsive */}
              <div className="lg:w-1/3 bg-slate-900/50 border border-slate-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mt-4 lg:mt-0">
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">Transaction #001</h3>
                      <p className="text-xs sm:text-sm text-slate-400">3 items • Staff: Mike</p>
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
                      <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl p-3">
                        <div className="flex justify-between items-start mb-1 sm:mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-sm truncate">{item.name}</p>
                            <p className="text-xs text-slate-400">£{item.price} each</p>
                          </div>
                          <span className="text-base sm:text-lg font-bold text-emerald-400 ml-2">
                            £{(item.price * item.qty).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 sm:gap-2 bg-slate-800 rounded-lg px-2 sm:px-3 py-1">
                            <button className="text-white hover:text-emerald-400 text-xs">−</button>
                            <span className="font-bold text-white text-sm px-1 sm:px-2">{item.qty}</span>
                            <button className="text-white hover:text-emerald-400 text-xs">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm text-slate-300">
                        <span>Subtotal</span>
                        <span className="font-bold">£100.10</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm text-slate-300">
                        <span>VAT (20%)</span>
                        <span className="font-bold">£20.02</span>
                      </div>
                      <div className="border-t border-slate-700/50 pt-2 sm:pt-3 flex justify-between">
                        <span className="text-sm sm:text-xl font-bold text-white">Total</span>
                        <span className="text-lg sm:text-2xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                          £120.12
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Responsive grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2 sm:py-3 rounded-lg text-xs sm:text-sm transition-all">
                      Discount
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2 sm:py-3 rounded-lg text-xs sm:text-sm transition-all flex items-center justify-center gap-1">
                      <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Misc</span>
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2 sm:py-3 rounded-lg text-xs sm:text-sm transition-all">
                      Print
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2 sm:py-3 rounded-lg text-xs sm:text-sm transition-all">
                      Recent
                    </button>
                  </div>

                  {/* Pay Button */}
                  <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base sm:text-xl py-3 sm:py-4 rounded-xl sm:rounded-2xl transition-colors">
                    PAY £120.12
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Preview Section */}
      <section className="py-16 md:py-20 px-4 sm:px-6 bg-black/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 text-white">
              Built for <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">Every Business</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl md:max-w-3xl mx-auto">
              Industry-specific features for maximum efficiency
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                title: "Restaurants & Cafés",
                icon: Coffee,
                color: "from-orange-500/20 to-amber-600/20",
                image: REAL_IMAGES.restaurant.avocadoToast,
                features: ["Table Management", "Digital Menus", "Kitchen Display"]
              },
              {
                title: "Retail Stores",
                icon: Store,
                color: "from-blue-500/20 to-cyan-600/20",
                image: REAL_IMAGES.retail.coldDrinks,
                features: ["Barcode Scanning", "Multi-Store", "Inventory"]
              },
              {
                title: "Salons & Barbers",
                icon: Scissors,
                color: "from-purple-500/20 to-pink-600/20",
                image: REAL_IMAGES.salon.quiffHair,
                features: ["Appointments", "Staff Scheduling", "Services"]
              },
              {
                title: "Warehouses",
                icon: Warehouse,
                color: "from-emerald-500/20 to-green-600/20",
                image: REAL_IMAGES.warehouse.cola,
                features: ["Bulk Sales", "Pallet Tracking", "Supplier"]
              }
            ].map((industry, i) => (
              <div key={i} className="group bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl sm:rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all">
                <div className="h-40 sm:h-48 overflow-hidden">
                  <div 
                    className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                    style={{ backgroundImage: `url(${industry.image})` }}
                  />
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-r ${industry.color} flex items-center justify-center`}>
                      <industry.icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">{industry.title}</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {industry.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs sm:text-sm text-slate-300">
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link 
                    href="/industries" 
                    className="mt-4 inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs sm:text-sm font-semibold"
                  >
                    See more <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-4 md:mb-6 text-white">
              Enterprise-Grade Features
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl md:max-w-3xl mx-auto">
              Everything you need to run your business efficiently
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Shield, title: "Bank-Level Security", desc: "End-to-end encryption and GDPR compliance" },
              { icon: Zap, title: "Lightning Fast", desc: "Process transactions in under 2 seconds" },
              { icon: TrendingUp, title: "Real-Time Analytics", desc: "Live dashboards and business insights" },
              { icon: Users, title: "Multi-User Access", desc: "Role-based permissions for your staff" },
              { icon: Globe, title: "Cloud-Based", desc: "Access from anywhere, automatic backups" },
              { icon: Clock, title: "24/7 Support", desc: "Dedicated team always available" },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-emerald-500/30 transition-all">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 text-sm sm:text-base">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Pure Black */}
      <footer className="bg-black py-12 px-4 sm:px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="mb-4">
                <Logo size="medium" />
              </div>
              <p className="text-slate-500 text-sm">
                © 2025 Demly. All rights reserved.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 text-slate-500 text-sm justify-center">
              <a href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-emerald-400 transition-colors">Terms</a>
              <a href="mailto:support@demly.com" className="hover:text-emerald-400 transition-colors">Contact</a>
              <a href="/industries" className="hover:text-emerald-400 transition-colors">Industries</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-600 text-sm">
              Enterprise software & security solutions
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
