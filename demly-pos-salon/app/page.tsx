"use client";

import Link from "next/link";
import { Check, ArrowRight, Zap, Shield, TrendingUp, Users, Sparkles, Star, ChevronRight } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);

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
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 overflow-x-hidden">
      {/* Navigation - Modern Glassmorphism */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/90 backdrop-blur-xl shadow-2xl shadow-emerald-900/10 py-3' : 'bg-transparent py-4'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="group">
              <Logo size={scrolled ? "medium" : "large"} />
              <div className="text-xs text-emerald-400/70 font-medium tracking-widest mt-1">Security, Software, Enterprise</div>
            </Link>
            
            <div className="hidden md:flex items-center gap-8 text-slate-300">
              <a href="#features" className="group relative px-3 py-2 hover:text-emerald-400 transition-all duration-300">
                <span className="relative z-10">Features</span>
                <span className="absolute inset-0 bg-emerald-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300" />
              </a>
              <a href="#pricing" className="group relative px-3 py-2 hover:text-emerald-400 transition-all duration-300">
                <span className="relative z-10">Pricing</span>
                <span className="absolute inset-0 bg-emerald-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300" />
              </a>
              <a href="#pos" className="group relative px-3 py-2 hover:text-emerald-400 transition-all duration-300">
                <span className="relative z-10">Demly POS</span>
                <span className="absolute inset-0 bg-emerald-500/10 rounded-lg scale-0 group-hover:scale-100 transition-transform duration-300" />
              </a>
            </div>
            
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
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
              ) : (
                <>
                  <Link href="/login" className="px-6 py-2.5 text-slate-300 hover:text-white transition-colors font-semibold hover:scale-105 duration-200">
                    Sign In
                  </Link>
                  <Link href="/pay" className="group relative px-6 py-2.5 rounded-xl font-bold transition-all duration-300 overflow-hidden">
                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative z-10 text-white flex items-center gap-2">
                      Get Started <Sparkles className="w-4 h-4" />
                    </span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Animated Background */}
      <section ref={heroRef} className="pt-40 pb-28 px-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-500/3 to-green-500/3 rounded-full blur-3xl" />
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
            className="text-7xl md:text-8xl lg:text-9xl font-black mb-8 leading-tight text-white"
          >
            <span className="block">Enterprise</span>
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              Software Suite
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-2xl md:text-3xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
          >
            Transform your business operations with intelligent, scalable solutions. 
            From retail to services, we power businesses of all sizes.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-6 justify-center mb-20"
          >
            {isLoggedIn ? (
              <Link href="/dashboard" className="group relative px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-white flex items-center justify-center gap-3">
                  Open Dashboard
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </span>
              </Link>
            ) : (
              <>
                <Link href="/pay" className="group relative px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 overflow-hidden">
                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 text-white flex items-center justify-center gap-3">
                    Start Free Trial
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  </span>
                </Link>
                <Link href="#pos" className="group px-12 py-6 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-emerald-500/30 rounded-2xl font-bold text-xl transition-all duration-300 text-white flex items-center justify-center gap-3">
                  Explore Products
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
              </>
            )}
          </motion.div>
          
          {/* Stats Grid with Hover Effects */}
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
                className="group bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 hover:border-emerald-500/30 hover:transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-300">{stat.icon}</div>
                <div className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <p className="text-slate-400 mt-2 font-medium text-sm uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Product: Demly POS - Enhanced Preview */}
      <section id="pos" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6"
            >
              <Star className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-semibold">Featured Product</span>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-6xl md:text-7xl font-black mb-8 text-white"
            >
              Introducing{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
                Demly POS
              </span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed"
            >
              The most powerful, intuitive point-of-sale system for modern businesses. 
              Built for speed, designed for growth.
            </motion.p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-slate-900/50 via-slate-900/30 to-emerald-900/20 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 md:p-12 overflow-hidden"
          >
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-4xl md:text-5xl font-black mb-8 text-white">
                  Transform Your<br />
                  <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                    Business Operations
                  </span>
                </h3>
                
                <div className="space-y-8 mb-10">
                  {[
                    {
                      icon: <Zap className="w-8 h-8 text-emerald-400" />,
                      title: "Lightning-Fast Checkout",
                      desc: "Process transactions in under 2 seconds with our optimized checkout flow.",
                      color: "from-emerald-500/20 to-green-500/20"
                    },
                    {
                      icon: <TrendingUp className="w-8 h-8 text-emerald-400" />,
                      title: "Real-Time Analytics",
                      desc: "Track sales, inventory, and customer insights with live dashboards.",
                      color: "from-blue-500/20 to-cyan-500/20"
                    },
                    {
                      icon: <Shield className="w-8 h-8 text-emerald-400" />,
                      title: "Cloud-Based & Secure",
                      desc: "Access from anywhere with enterprise-grade security and automatic backups.",
                      color: "from-purple-500/20 to-pink-500/20"
                    }
                  ].map((feature, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="group flex items-start gap-6 p-4 rounded-2xl hover:bg-slate-800/30 transition-all duration-300"
                    >
                      <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        {feature.icon}
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold mb-3 text-white group-hover:text-emerald-400 transition-colors">
                          {feature.title}
                        </h4>
                        <p className="text-slate-400 text-lg leading-relaxed">{feature.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="flex gap-4">
                  {isLoggedIn ? (
                    <Link href="/dashboard" className="group relative px-8 py-4 rounded-xl font-bold transition-all duration-300 overflow-hidden">
                      <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 text-white flex items-center gap-3">
                        Open Dashboard
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      </span>
                    </Link>
                  ) : (
                    <Link href="/pay" className="group relative px-8 py-4 rounded-xl font-bold transition-all duration-300 overflow-hidden">
                      <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10 text-white flex items-center gap-3">
                        Get Started Free
                        <Sparkles className="w-5 h-5" />
                      </span>
                    </Link>
                  )}
                </div>
              </div>
              
              {/* Modern POS Preview - Enhanced with Real Products */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-3xl blur-xl opacity-50" />
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-1 shadow-2xl border border-slate-700/50">
                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-black rounded-2xl overflow-hidden">
                    {/* POS Header */}
                    <div className="bg-slate-900/50 border-b border-slate-700/50 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-xl">💳</span>
                        </div>
                        <div>
                          <div className="text-white font-bold">Demly POS</div>
                          <div className="text-slate-400 text-sm">Ready for checkout</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-emerald-500/20 rounded-lg">
                          <span className="text-emerald-400 text-sm font-semibold">Online</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 p-4">
                      {/* Products Grid */}
                      <div className="col-span-3 space-y-3">
                        <div className="bg-slate-800/30 rounded-xl p-3">
                          <input 
                            type="text" 
                            placeholder="🔍 Search products..." 
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500"
                            readOnly
                          />
                        </div>
                        
                        {/* Realistic Products with Images */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { 
                              emoji: "🥤", 
                              name: "Coca-Cola", 
                              price: "2.50",
                              image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=100&h=100&fit=crop&crop=center"
                            },
                            { 
                              emoji: "🍔", 
                              name: "Cheeseburger", 
                              price: "8.99",
                              image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w-100&h=100&fit=crop&crop=center"
                            },
                            { 
                              emoji: "☕", 
                              name: "Latte", 
                              price: "4.50",
                              image: "https://images.unsplash.com/photo-1561047029-3000c68339ca?w=100&h=100&fit=crop&crop=center"
                            },
                            { 
                              emoji: "🍕", 
                              name: "Pepperoni Pizza", 
                              price: "12.99",
                              image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&h=100&fit=crop&crop=center"
                            },
                            { 
                              emoji: "🥗", 
                              name: "Caesar Salad", 
                              price: "9.50",
                              image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=100&h=100&fit=crop&crop=center"
                            },
                            { 
                              emoji: "🍰", 
                              name: "Chocolate Cake", 
                              price: "6.75",
                              image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=100&h=100&fit=crop&crop=center"
                            }
                          ].map((item, i) => (
                            <div key={i} className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 rounded-xl p-2 cursor-pointer transition-all duration-300">
                              <div className="aspect-square rounded-lg mb-2 overflow-hidden bg-slate-700/30">
                                <div 
                                  className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                                  style={{ backgroundImage: `url(${item.image})` }}
                                />
                              </div>
                              <div className="text-xs font-bold text-white mb-1 truncate">{item.name}</div>
                              <div className="text-sm font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                                £{item.price}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cart */}
                      <div className="col-span-2 bg-slate-800/30 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700/50">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                            <span className="text-lg">🛒</span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">Shopping Cart</div>
                            <div className="text-xs text-slate-400">3 items • £33.99</div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2 mb-4">
                          {[
                            { emoji: "🥤", name: "Coca-Cola", price: "2.50", qty: 2 },
                            { emoji: "🍔", name: "Cheeseburger", price: "8.99", qty: 1 },
                            { emoji: "☕", name: "Latte", price: "4.50", qty: 1 }
                          ].map((item, i) => (
                            <div key={i} className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-2">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{item.emoji}</span>
                                  <span className="text-xs font-bold text-white">{item.name}</span>
                                </div>
                                <span className="text-xs font-black text-emerald-400">£{item.price}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-2 py-1">
                                  <button className="text-xs text-white hover:text-emerald-400">−</button>
                                  <span className="text-xs font-bold px-2 text-white">{item.qty}</span>
                                  <button className="text-xs text-white hover:text-emerald-400">+</button>
                                </div>
                                <span className="text-xs font-bold text-white">
                                  £{(parseFloat(item.price) * item.qty).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 mb-3">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Subtotal</span>
                              <span className="font-bold text-white">£24.49</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">VAT (20%)</span>
                              <span className="font-bold text-white">£4.90</span>
                            </div>
                            <div className="border-t border-slate-700/50 pt-2 flex justify-between">
                              <span className="text-sm font-bold text-white">Total</span>
                              <span className="text-lg font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                                £29.39
                              </span>
                            </div>
                          </div>
                        </div>

                        <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:scale-105">
                          💳 Process Payment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features - Enhanced */}
      <section id="features" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-transparent" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-6xl md:text-7xl font-black mb-8 text-white"
            >
              Everything You Need
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed"
            >
              Powerful features that help you run your business better, faster, and smarter.
            </motion.p>
          </div>
          
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              { icon: "🔒", title: "Bank-Level Security", desc: "End-to-end encryption and compliance with industry standards.", color: "from-red-500/20 to-orange-500/20" },
              { icon: "📱", title: "Multi-Platform", desc: "Works seamlessly on desktop, tablet, and mobile devices.", color: "from-blue-500/20 to-cyan-500/20" },
              { icon: "🔄", title: "Real-Time Sync", desc: "Instant synchronization across all your devices and locations.", color: "from-green-500/20 to-emerald-500/20" },
              { icon: "🎯", title: "Customizable", desc: "Tailor every aspect to match your business workflow.", color: "from-purple-500/20 to-pink-500/20" },
              { icon: "📈", title: "Growth Analytics", desc: "AI-powered insights to help you make better decisions.", color: "from-yellow-500/20 to-amber-500/20" },
              { icon: "🌐", title: "Global Ready", desc: "Multi-currency, multi-language, and multi-location support.", color: "from-indigo-500/20 to-violet-500/20" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="group bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 hover:border-emerald-500/30 hover:transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`text-5xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-emerald-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-400 text-lg leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing - Enhanced */}
      <section id="pricing" className="py-32 px-6 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="text-6xl md:text-7xl font-black mb-8 text-white"
            >
              Simple,{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
                Transparent Pricing
              </span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-2xl text-slate-300 max-w-2xl mx-auto"
            >
              Choose the plan that works best for your business. No hidden fees, no surprises.
            </motion.p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Monthly Plan */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="group bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-10 hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="mb-8">
                <h3 className="text-3xl font-bold mb-3 text-white">Monthly</h3>
                <p className="text-slate-400">Perfect for growing businesses</p>
              </div>
              <div className="mb-8">
                <span className="text-7xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">£29</span>
                <span className="text-2xl text-slate-400">/month</span>
              </div>
              <ul className="space-y-5 mb-10">
                {[
                  "Full POS System",
                  "Unlimited Transactions",
                  "Customer Management",
                  "Inventory Tracking",
                  "Reports & Analytics",
                  "Email Support",
                  "Cancel Anytime"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-slate-300 group-hover:text-slate-200 transition-colors">
                    <Check className="w-6 h-6 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pay" className="block w-full py-5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 hover:border-emerald-500/30 rounded-2xl font-bold text-center transition-all duration-300 text-white text-xl hover:scale-105">
                Get Started
              </Link>
            </motion.div>

            {/* Annual Plan */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="relative group bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-green-500/20 border-2 border-emerald-500/50 rounded-3xl p-10 hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full text-sm font-bold shadow-lg shadow-emerald-500/30">
                BEST VALUE
              </div>
              <div className="mb-8">
                <h3 className="text-3xl font-bold mb-3 text-white">Annual</h3>
                <p className="text-emerald-400 font-semibold">Save £49/year</p>
              </div>
              <div className="mb-2">
                <span className="text-7xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">£299</span>
                <span className="text-2xl text-slate-400">/year</span>
              </div>
              <p className="text-slate-400 mb-8">Equivalent to £24.92/month</p>
              <ul className="space-y-5 mb-10">
                {[
                  "Everything in Monthly",
                  "Priority Support",
                  "Advanced Analytics",
                  "Custom Branding",
                  "API Access",
                  "Dedicated Account Manager",
                  "2 Months Free"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-slate-300 group-hover:text-white transition-colors">
                    <Check className="w-6 h-6 text-emerald-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pay" className="group relative block w-full py-5 rounded-2xl font-bold text-center transition-all duration-300 overflow-hidden hover:scale-105">
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-white text-xl flex items-center justify-center gap-3">
                  Get Started
                  <Sparkles className="w-5 h-5" />
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-green-500/10" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold">Join Thousands of Businesses</span>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-7xl font-black mb-8 text-white"
          >
            Ready to Transform
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              Your Business?
            </span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Join thousands of businesses already using Demly to power their operations.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-6 justify-center"
          >
            {isLoggedIn ? (
              <Link href="/dashboard" className="group relative px-14 py-6 rounded-2xl font-bold text-2xl transition-all duration-300 overflow-hidden">
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-white flex items-center justify-center gap-4">
                  Open Dashboard
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </span>
              </Link>
            ) : (
              <Link href="/pay" className="group relative px-14 py-6 rounded-2xl font-bold text-2xl transition-all duration-300 overflow-hidden hover:scale-105">
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 text-white flex items-center justify-center gap-4">
                  Start Free Trial
                  <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                </span>
              </Link>
            )}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="mb-4">
                <Logo size="medium" />
              </div>
              <p className="text-slate-500 text-sm">© 2025 Demly. All rights reserved.</p>
            </div>
            
            <div className="flex gap-8 text-slate-500">
              <a href="/privacy" className="hover:text-emerald-400 transition-colors duration-300">Privacy</a>
              <a href="/terms" className="hover:text-emerald-400 transition-colors duration-300">Terms</a>
              <a href="mailto:support@demly.com" className="hover:text-emerald-400 transition-colors duration-300">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-600 text-sm">
              Demly is a universal SaaS point-of-sale project built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
