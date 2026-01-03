"use client";

import Link from "next/link";
import { Check, ArrowRight, Zap, Shield, TrendingUp, Sparkles, Star, ChevronRight, ShoppingCart, Package, Scissors, Coffee, Store, Warehouse, Utensils, Building } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 overflow-x-hidden">
      {/* Navigation - Black Background */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/95 backdrop-blur-xl shadow-2xl shadow-emerald-900/10 py-3' : 'bg-black/90 py-4'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="group">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Logo size="large" />
              </motion.div>
            </Link>
            
            <div className="hidden md:flex items-center gap-8 text-slate-300">
              <motion.a 
                href="#features"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="group relative px-3 py-2 hover:text-emerald-400 transition-all duration-300"
              >
                <span className="relative z-10">Features</span>
                <span className="absolute inset-0 bg-emerald-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300" />
              </motion.a>

              {/* Industries */}
          <motion.a 
            href="/industries"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="group relative px-3 py-2 hover:text-emerald-400 transition-all duration-300"
          >
            <span className="relative z-10">Industries</span>
            <span className="absolute inset-0 bg-emerald-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300" />
          </motion.a>
              
              <motion.a 
                href="#pricing"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="group relative px-3 py-2 hover:text-emerald-400 transition-all duration-300"
              >
                <span className="relative z-10">Pricing</span>
                <span className="absolute inset-0 bg-emerald-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300" />
              </motion.a>
              
              <motion.a 
                href="#pos"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="group relative px-3 py-2 hover:text-emerald-400 transition-all duration-300"
              >
                <span className="relative z-10">Demly POS</span>
                <span className="absolute inset-0 bg-emerald-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300" />
              </motion.a>
            </div>
            
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Link 
                    href="/dashboard" 
                    className="group relative px-6 py-2.5 rounded-xl font-bold transition-all duration-300 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 text-white flex items-center gap-2">
                      Dashboard <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                </motion.div>
              ) : (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Link href="/login" className="px-6 py-2.5 text-slate-300 hover:text-white transition-colors font-semibold hover:scale-105 duration-200">
                      Sign In
                    </Link>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <Link href="/pay" className="group relative px-6 py-2.5 rounded-xl font-bold transition-all duration-300 overflow-hidden">
                      <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                      <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 text-white flex items-center gap-2">
                        Get Started <Sparkles className="w-4 h-4" />
                      </span>
                    </Link>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold">Trusted by 10,000+ businesses worldwide</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-white"
          >
            <span className="block">Universal POS</span>
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              Built for Growth
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Transform your business operations with intelligent, scalable solutions. 
            From retail to services, we power businesses of all sizes.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            {isLoggedIn ? (
              <Link href="/dashboard" className="group relative px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-white flex items-center justify-center gap-3">
                  Open Dashboard
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </span>
              </Link>
            ) : (
              <>
                <Link href="/pay" className="group relative px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 overflow-hidden">
                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 text-white flex items-center justify-center gap-3">
                    Start Free Trial
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </span>
                </Link>
                <Link href="#pos" className="px-10 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-emerald-500/30 rounded-2xl font-bold text-lg transition-all duration-300 text-white">
                  Explore POS
                </Link>
              </>
            )}
          </motion.div>
          
          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto"
          >
            {[
              { value: "99.9%", label: "Uptime", icon: "⚡" },
              { value: "10K+", label: "Active Users", icon: "👥" },
              { value: "150+", label: "Countries", icon: "🌎" },
              { value: "24/7", label: "Support", icon: "🛡️" }
            ].map((stat, index) => (
              <div 
                key={index}
                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <p className="text-slate-400 mt-2 font-medium text-sm">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* POS Preview Section - Real POS Interface */}
      <section id="pos" className="py-20 px-6 bg-black/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-5xl md:text-6xl font-black mb-6 text-white"
            >
              The Real <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">Demly POS</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-xl text-slate-300 max-w-2xl mx-auto"
            >
              Powerful, intuitive point-of-sale system designed for modern businesses.
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-slate-900 to-black rounded-3xl p-6 border border-slate-800/50 shadow-2xl"
          >
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Products Side */}
              <div className="lg:w-2/3">
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                      🔍
                    </div>
                    <input
                      type="text"
                      placeholder="Search products, SKU, or barcode..."
                      className="w-full bg-slate-800/50 border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                      readOnly
                    />
                  </div>
                </div>

                {/* Products Grid - Warehouse/Retail Items */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { name: "COCA", price: "12.00", stock: 7, image: "🥤" },
                    { name: "PEPSI", price: "11.50", stock: 12, image: "🥤" },
                    { name: "BURGER", price: "8.99", stock: 5, image: "🍔" },
                    { name: "PIZZA", price: "14.99", stock: 3, image: "🍕" },
                    { name: "COFFEE", price: "4.50", stock: 25, image: "☕" },
                    { name: "SALAD", price: "9.50", stock: 8, image: "🥗" },
                    { name: "FRIES", price: "3.99", stock: 15, image: "🍟" },
                    { name: "ICECREAM", price: "5.50", stock: 6, image: "🍦" },
                  ].map((item, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/50 transition-all cursor-pointer">
                      <div className="text-3xl mb-2 text-center">{item.image}</div>
                      <div className="text-center">
                        <p className="font-bold text-white text-sm mb-1">{item.name}</p>
                        <p className="text-lg font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                          £{item.price}
                        </p>
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${item.stock > 10 ? 'bg-emerald-500/20 text-emerald-400' : item.stock > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400'}`}>
                            Stock: {item.stock}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Side - Matching Your Screenshot */}
              <div className="lg:w-1/3 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Transaction 1</h3>
                      <p className="text-sm text-slate-400">1 items • Staff: Mike</p>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-3 mb-6">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🥤</span>
                          <div>
                            <p className="font-bold text-white">COCA</p>
                            <p className="text-sm text-slate-400">£12.00 each</p>
                          </div>
                        </div>
                        <span className="text-lg font-bold text-emerald-400">£12.00</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1">
                          <button className="text-white hover:text-emerald-400">−</button>
                          <span className="font-bold text-white px-3">1</span>
                          <button className="text-white hover:text-emerald-400">+</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Select */}
                  <select className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-xl mb-6 focus:outline-none focus:border-emerald-500/50">
                    <option>Select Customer (Optional)</option>
                    <option>John Smith</option>
                    <option>Sarah Johnson</option>
                    <option>Mike Wilson</option>
                  </select>

                  {/* Totals */}
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span>Subtotal</span>
                        <span className="font-bold">£12.00</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>VAT (20%)</span>
                        <span className="font-bold">£2.40</span>
                      </div>
                      <div className="border-t border-slate-700/50 pt-3 flex justify-between">
                        <span className="text-xl font-bold text-white">Total</span>
                        <span className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                          £14.40
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Grid - EXACTLY as in your screenshot */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      <span>Discount</span>
                    </button>
                    
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      <Package className="w-4 h-4" />
                      <span>Misc Item</span>
                    </button>

                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      <span>Print</span>
                    </button>

                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      <span>Recent</span>
                    </button>

                    <button className="col-span-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all">
                      Clear
                    </button>
                    
                    <button className="col-span-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all">
                      No Sale
                    </button>
                  </div>

                  {/* Pay Button */}
                  <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-xl py-4 rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all">
                    PAY £14.40
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Versatility Section */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 text-center"
          >
            <h3 className="text-3xl md:text-4xl font-bold mb-8 text-white">
              <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                Extremely Versatile & Scalable
              </span>
            </h3>
            <p className="text-xl text-slate-300 mb-10 max-w-3xl mx-auto">
              Perfect for restaurants, retailers, barbershops, warehouses, and more.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: <Utensils className="w-10 h-10" />, title: "Restaurants", desc: "Tables, menus, kitchen displays" },
                { icon: <Store className="w-10 h-10" />, title: "Retailers", desc: "Inventory, barcode, checkout" },
                { icon: <Scissors className="w-10 h-10" />, title: "Barbers/Salons", desc: "Appointments, services, staff" },
                { icon: <Warehouse className="w-10 h-10" />, title: "Warehouses", desc: "Bulk sales, wholesale, stock" },
              ].map((industry, i) => (
                <div key={i} className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
                  <div className="w-16 h-16 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <div className="text-emerald-400">{industry.icon}</div>
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-white">{industry.title}</h4>
                  <p className="text-slate-400 text-sm">{industry.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-5xl md:text-6xl font-black mb-6 text-white"
            >
              Everything You Need
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-xl text-slate-300 max-w-2xl mx-auto"
            >
              Powerful features that help you run your business better, faster, and smarter.
            </motion.p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🔒", title: "Bank-Level Security", desc: "End-to-end encryption and compliance with industry standards." },
              { icon: "📱", title: "Multi-Platform", desc: "Works seamlessly on desktop, tablet, and mobile devices." },
              { icon: "🔄", title: "Real-Time Sync", desc: "Instant synchronization across all your devices and locations." },
              { icon: "🎯", title: "Customizable", desc: "Tailor every aspect to match your business workflow." },
              { icon: "📈", title: "Growth Analytics", desc: "AI-powered insights to help you make better decisions." },
              { icon: "🌐", title: "Global Ready", desc: "Multi-currency, multi-language, and multi-location support." },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-black/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-5xl md:text-6xl font-black mb-6 text-white"
            >
              Simple, <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">Transparent Pricing</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-xl text-slate-300"
            >
              Choose the plan that works best for your business.
            </motion.p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Monthly Plan */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8"
            >
              <h3 className="text-2xl font-bold mb-4 text-white">Monthly</h3>
              <div className="mb-6">
                <span className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">£29</span>
                <span className="text-xl text-slate-400">/month</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Full POS System",
                  "Unlimited Transactions",
                  "Customer Management",
                  "Inventory Tracking",
                  "Reports & Analytics",
                  "Email Support",
                  "Cancel Anytime"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pay" className="block w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold text-center transition-all text-white">
                Get Started
              </Link>
            </motion.div>

            {/* Annual Plan */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/50 rounded-3xl p-8 relative"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full text-sm font-bold">
                BEST VALUE
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Annual</h3>
              <div className="mb-2">
                <span className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">£299</span>
                <span className="text-xl text-slate-400">/year</span>
              </div>
              <p className="text-emerald-400 font-bold mb-6">Save £49/year</p>
              <ul className="space-y-4 mb-8">
                {[
                  "Everything in Monthly",
                  "Priority Support",
                  "Advanced Analytics",
                  "Custom Branding",
                  "API Access",
                  "Dedicated Account Manager",
                  "2 Months Free"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pay" className="block w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold text-center shadow-lg shadow-emerald-500/20 transition-all">
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-5xl md:text-6xl font-black mb-6 text-white"
          >
            Ready to Transform<br/>
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">Your Business?</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto"
          >
            Join thousands of businesses already using Demly to power their operations.
          </motion.p>
          {isLoggedIn ? (
            <Link href="/dashboard" className="inline-block px-12 py-6 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-2xl font-bold text-2xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105">
              Open Dashboard
            </Link>
          ) : (
            <Link href="/pay" className="inline-block px-12 py-6 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-2xl font-bold text-2xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105">
              Start Now
            </Link>
          )}
        </div>
      </section>

      {/* Footer - Black Background */}
      <footer className="bg-black py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Logo size="medium" />
          </div>
          <p className="text-slate-500 mb-6">© 2025 Demly. All rights reserved.</p>
          <div className="flex gap-6 justify-center text-slate-500 text-sm">
            <a href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-emerald-400 transition-colors">Terms</a>
            <a href="mailto:support@demly.com" className="hover:text-emerald-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

