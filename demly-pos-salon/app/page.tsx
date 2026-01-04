"use client";

import Link from "next/link";
import { Check, Zap, Shield, TrendingUp, Sparkles, Star, ChevronRight, ShoppingCart, Package, Users, Globe, Clock, Award, Coffee, Store, Scissors, Warehouse, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

// Realistic product images (using Unsplash for demo - replace with your own in production)
const REALISTIC_IMAGES = {
  warehouse: {
    colaBox: "https://images.unsplash.com/photo-1597557314810-5694f1bd37b7?w=400&h=300&fit=crop&crop=center",
    baconCase: "https://images.unsplash.com/photo-1559620192-032c64bc86af?w=400&h=300&fit=crop&crop=center",
    waterPallet: "https://images.unsplash.com/photo-1595435934247-5d33b7f92c70?w=400&h=300&fit=crop&crop=center",
    snackBox: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&crop=center"
  },
  restaurant: {
    avocadoToast: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop&crop=center",
    soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop&crop=center",
    burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop&crop=center",
    salad: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&crop=center"
  },
  retail: {
    headphones: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop&crop=center",
    perfume: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=300&fit=crop&crop=center",
    shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop&crop=center",
    clothing: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&h=300&fit=crop&crop=center"
  },
  salon: {
    hairProducts: "https://images.unsplash.com/photo-1634942537034-2531766767d1?w=400&h=300&fit=crop&crop=center",
    tools: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=300&fit=crop&crop=center",
    salonChair: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop&crop=center",
    cosmetics: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=300&fit=crop&crop=center"
  }
};

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

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
      {/* Fixed Header with Solid Buttons */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/95 backdrop-blur-xl py-3' : 'bg-black/90 py-4'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="group">
              <Logo size={scrolled ? "medium" : "large"} />
            </Link>
            
            <div className="hidden md:flex items-center gap-8 text-slate-300">
              <a href="#features" className="hover:text-emerald-400 transition-colors font-medium">Features</a>
              <a href="#pricing" className="hover:text-emerald-400 transition-colors font-medium">Pricing</a>
              <a href="#pos" className="hover:text-emerald-400 transition-colors font-medium">POS Demo</a>
              <a href="/industries" className="hover:text-emerald-400 transition-colors font-medium">Industries</a>
            </div>
            
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <Link 
                  href="/dashboard" 
                  // Fixed: Solid background, no gradient bleeding
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white transition-colors shadow-lg shadow-emerald-900/30"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className="px-6 py-2.5 text-slate-300 hover:text-white transition-colors font-semibold"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/pay" 
                    // Fixed: Solid background, no gradient bleeding
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white transition-colors shadow-lg shadow-emerald-900/30"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-semibold">Trusted by 10,000+ businesses</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight text-white"
          >
            Enterprise POS
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              Built for Growth
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto"
          >
            From warehouses to restaurants, retail to salons - one universal system that adapts to your business.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-bold text-lg text-white transition-colors"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/pay" 
                  className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-bold text-lg text-white transition-colors"
                >
                  Start Free Trial
                </Link>
                <Link 
                  href="/industries" 
                  className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-lg text-white transition-colors"
                >
                  Browse Industries
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Industry Showcase Preview */}
      <section id="industries" className="py-20 px-6 bg-black/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6 text-white">
              Built for <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">Every Industry</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Tailored solutions with industry-specific features
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Restaurants & Cafés",
                icon: Coffee,
                desc: "Tables, digital menus, kitchen displays",
                image: REALISTIC_IMAGES.restaurant.avocadoToast,
                features: ["Table management", "Order modifiers", "Kitchen tickets"]
              },
              {
                title: "Retail Stores",
                icon: Store,
                desc: "Inventory, barcode scanning, checkout",
                image: REALISTIC_IMAGES.retail.headphones,
                features: ["Barcode scanning", "Multi-store", "CRM"]
              },
              {
                title: "Salons & Barbers",
                icon: Scissors,
                desc: "Appointments, services, staff",
                image: REALISTIC_IMAGES.salon.hairProducts,
                features: ["Online booking", "Staff scheduling", "Packages"]
              },
              {
                title: "Warehouses",
                icon: Warehouse,
                desc: "Bulk sales, wholesale, inventory",
                image: REALISTIC_IMAGES.warehouse.colaBox,
                features: ["Pallet tracking", "Batch control", "Supplier mgmt"]
              }
            ].map((industry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all"
              >
                <div className="h-48 overflow-hidden">
                  <div 
                    className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-500"
                    style={{ backgroundImage: `url(${industry.image})` }}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center">
                      <industry.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{industry.title}</h3>
                      <p className="text-sm text-slate-400">{industry.desc}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {industry.features.map((feature, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Link 
                    href="/industries" 
                    className="mt-4 inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-semibold"
                  >
                    Learn more <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Real POS Demo */}
      <section id="pos" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6 text-white">
              The Real <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">Demly POS</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              See the actual interface used by thousands of businesses
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-slate-900 to-black rounded-3xl border border-slate-800/50 p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Products Side */}
              <div className="lg:w-2/3">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { name: "Avocado Toast", price: 12.99, stock: 8, image: REALISTIC_IMAGES.restaurant.avocadoToast },
                    { name: "Cola Case (24)", price: 28.80, stock: 15, image: REALISTIC_IMAGES.warehouse.colaBox },
                    { name: "Wireless Headphones", price: 89.99, stock: 12, image: REALISTIC_IMAGES.retail.headphones },
                    { name: "Hair Serum", price: 25.00, stock: 6, image: REALISTIC_IMAGES.salon.hairProducts },
                    { name: "Butternut Soup", price: 8.99, stock: 5, image: REALISTIC_IMAGES.restaurant.soup },
                    { name: "Bacon Case (48)", price: 42.50, stock: 7, image: REALISTIC_IMAGES.warehouse.baconCase },
                    { name: "Running Shoes", price: 89.99, stock: 9, image: REALISTIC_IMAGES.retail.shoes },
                    { name: "Salon Scissors", price: 45.00, stock: 4, image: REALISTIC_IMAGES.salon.tools }
                  ].map((item, i) => (
                    <div key={i} className="group bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/50 transition-all">
                      <div className="aspect-square rounded-lg mb-3 overflow-hidden bg-slate-700/30">
                        <div 
                          className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                          style={{ backgroundImage: `url(${item.image})` }}
                        />
                      </div>
                      <p className="font-bold text-white text-sm truncate">{item.name}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-lg font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                          £{item.price}
                        </span>
                        <span className="text-xs bg-slate-700/50 px-2 py-1 rounded-full text-slate-300">
                          Stock: {item.stock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cart Side */}
              <div className="lg:w-1/3 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">Transaction 1</h3>
                      <p className="text-sm text-slate-400">3 items • Staff: Mike</p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {[
                      { name: "Avocado Toast", price: 12.99, qty: 2 },
                      { name: "Cola Case (24)", price: 28.80, qty: 1 }
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-white">{item.name}</p>
                            <p className="text-sm text-slate-400">£{item.price} each</p>
                          </div>
                          <span className="text-lg font-bold text-emerald-400">£{(item.price * item.qty).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1">
                            <button className="text-white hover:text-emerald-400">−</button>
                            <span className="font-bold text-white px-3">{item.qty}</span>
                            <button className="text-white hover:text-emerald-400">+</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-slate-300">
                        <span>Subtotal</span>
                        <span className="font-bold">£54.78</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>VAT (20%)</span>
                        <span className="font-bold">£10.96</span>
                      </div>
                      <div className="border-t border-slate-700/50 pt-3 flex justify-between">
                        <span className="text-xl font-bold text-white">Total</span>
                        <span className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                          £65.74
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all">
                      Discount
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                      <Package className="w-4 h-4" />
                      Misc Item
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all">
                      Print
                    </button>
                    <button className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 rounded-xl transition-all">
                      Recent
                    </button>
                  </div>

                  <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl py-4 rounded-2xl transition-colors">
                    PAY £65.74
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-black/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-6 text-white">
              Enterprise-Grade Features
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Everything you need to run your business efficiently
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Bank-Level Security", desc: "End-to-end encryption and GDPR compliance" },
              { icon: Zap, title: "Lightning Fast", desc: "Process transactions in under 2 seconds" },
              { icon: TrendingUp, title: "Real-Time Analytics", desc: "Live dashboards and insights" },
              { icon: Users, title: "Multi-User Access", desc: "Role-based permissions for staff" },
              { icon: Globe, title: "Cloud-Based", desc: "Access from anywhere, automatic backups" },
              { icon: Clock, title: "24/7 Support", desc: "Dedicated support team always available" },
            ].map((feature, i) => (
              <div key={i} className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
                <div className="w-14 h-14 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div>
              <Logo size="medium" />
              <p className="text-slate-500 mt-4">© 2025 Demly. All rights reserved.</p>
            </div>
            <div className="flex gap-8 text-slate-500">
              <a href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-emerald-400 transition-colors">Terms</a>
              <a href="mailto:support@demly.com" className="hover:text-emerald-400 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
