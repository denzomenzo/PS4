"use client";

import Link from "next/link";
import { Check, ArrowRight, Zap, Shield, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-emerald-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-4xl font-black text-white tracking-tight">
              DEMLY
            </Link>
            
            <div className="hidden md:flex items-center gap-8 text-slate-300">
              <a href="#features" className="hover:text-emerald-400 transition-colors font-medium">Features</a>
              <a href="#pricing" className="hover:text-emerald-400 transition-colors font-medium">Pricing</a>
              <a href="#pos" className="hover:text-emerald-400 transition-colors font-medium">Demly POS</a>
            </div>
            
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <>
                  <Link href="/dashboard" className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all">
                    Go to Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-6 py-2.5 text-slate-300 hover:text-white transition-colors font-semibold">
                    Sign In
                  </Link>
                  <Link href="/pay" className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-6">
            <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-semibold">
              🚀 Trusted by 10,000+ businesses worldwide
            </span>
          </div>
          
          <h1 className="text-7xl md:text-8xl font-black mb-6 leading-tight text-white">
            Enterprise Software<br/>
            <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">Built for Growth</span>
          </h1>
          
          <p className="text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Transform your business operations with intelligent, scalable solutions. 
            From retail to services, we power businesses of all sizes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {isLoggedIn ? (
              <Link href="/dashboard" className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-2xl font-bold text-xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105">
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link href="/pay" className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-2xl font-bold text-xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105">
                  Start Now
                </Link>
                <Link href="#pos" className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 rounded-2xl font-bold text-xl transition-all text-white">
                  Explore Products
                </Link>
              </>
            )}
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">99.9%</div>
              <p className="text-slate-400 mt-2 font-medium">Uptime</p>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">10K+</div>
              <p className="text-slate-400 mt-2 font-medium">Active Users</p>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">150+</div>
              <p className="text-slate-400 mt-2 font-medium">Countries</p>
            </div>
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
              <div className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">24/7</div>
              <p className="text-slate-400 mt-2 font-medium">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Product: Demly POS */}
      <section id="pos" className="py-32 px-6 bg-gradient-to-b from-transparent to-emerald-500/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-semibold mb-6 inline-block">
              ⭐ Featured Product
            </span>
            <h2 className="text-6xl font-black mb-6 text-white">
              Introducing <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">Demly POS</span>
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              The most powerful, intuitive point-of-sale system for modern businesses. Built for speed, designed for growth.
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-3xl p-12">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-4xl font-black mb-6 text-white">Transform Your Business Operations</h3>
                
                <div className="space-y-6 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2 text-white">Lightning-Fast Checkout</h4>
                      <p className="text-slate-400">Process transactions in under 2 seconds with our optimized checkout flow.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2 text-white">Real-Time Analytics</h4>
                      <p className="text-slate-400">Track sales, inventory, and customer insights with live dashboards.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2 text-white">Cloud-Based & Secure</h4>
                      <p className="text-slate-400">Access from anywhere with enterprise-grade security and automatic backups.</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  {isLoggedIn ? (
                    <Link href="/dashboard" className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all">
                      Open Dashboard →
                    </Link>
                  ) : (
                    <Link href="/pay" className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all">
                      Get Started →
                    </Link>
                  )}
                </div>
              </div>
              
              {/* Modern POS Preview */}
              <div className="relative">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-1 shadow-2xl border border-slate-700/50">
                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-black rounded-2xl overflow-hidden">
                    {/* POS Header */}
                    <div className="bg-slate-900/50 border-b border-slate-700/50 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-lg">💳</span>
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">Point of Sale</div>
                          <div className="text-slate-400 text-xs">Ready for checkout</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                          <span className="text-slate-400 text-xs">👤</span>
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
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500"
                            readOnly
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { emoji: "✂️", name: "Haircut", price: "25.00" },
                            { emoji: "💅", name: "Manicure", price: "15.00" },
                            { emoji: "🧴", name: "Shampoo", price: "8.99" },
                            { emoji: "💆", name: "Facial", price: "45.00" },
                            { emoji: "🎨", name: "Color", price: "60.00" },
                            { emoji: "💇", name: "Blowdry", price: "20.00" },
                          ].map((item, i) => (
                            <div key={i} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/30 rounded-xl p-3 cursor-pointer transition-all group">
                              <div className="text-2xl mb-1">{item.emoji}</div>
                              <div className="text-xs font-bold text-white mb-1">{item.name}</div>
                              <div className="text-sm font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
                                £{item.price}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Cart */}
                      <div className="col-span-2 bg-slate-800/30 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/50">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                            <span className="text-sm">🛒</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">Cart</div>
                            <div className="text-[10px] text-slate-400">2 items</div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2 mb-3">
                          <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">✂️</span>
                                <span className="text-[11px] font-bold text-white">Haircut</span>
                              </div>
                              <span className="text-[11px] font-black text-emerald-400">£25.00</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-0.5 bg-slate-800 rounded px-1.5 py-0.5">
                                <button className="text-[10px] text-white">−</button>
                                <span className="text-[10px] font-bold px-1 text-white">1</span>
                                <button className="text-[10px] text-white">+</button>
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-2">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">🧴</span>
                                <span className="text-[11px] font-bold text-white">Shampoo</span>
                              </div>
                              <span className="text-[11px] font-black text-emerald-400">£8.99</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="flex items-center gap-0.5 bg-slate-800 rounded px-1.5 py-0.5">
                                <button className="text-[10px] text-white">−</button>
                                <span className="text-[10px] font-bold px-1 text-white">1</span>
                                <button className="text-[10px] text-white">+</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-2 mb-2">
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-slate-400">Subtotal</span>
                            <span className="font-bold text-white">£33.99</span>
                          </div>
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-slate-400">VAT (20%)</span>
                            <span className="font-bold text-white">£6.80</span>
                          </div>
                          <div className="border-t border-slate-700/50 pt-1 flex justify-between">
                            <span className="text-xs font-bold text-white">Total</span>
                            <span className="text-sm font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
                              £40.79
                            </span>
                          </div>
                        </div>

                        <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1 text-white shadow-lg shadow-emerald-500/20">
                          💳 Charge £40.79
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-6xl font-black mb-6 text-white">
              Everything You Need
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Powerful features that help you run your business better, faster, and smarter.
            </p>
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
              <div key={i} className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-6xl font-black mb-6 text-white">
              Simple, <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">Transparent Pricing</span>
            </h2>
            <p className="text-xl text-slate-400">
              Choose the plan that works best for your business.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Monthly Plan */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-10">
              <h3 className="text-2xl font-bold mb-4 text-white">Monthly</h3>
              <div className="mb-6">
                <span className="text-6xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">£29</span>
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
            </div>

            {/* Annual Plan */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/50 rounded-3xl p-10 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full text-sm font-bold">
                BEST VALUE
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Annual</h3>
              <div className="mb-2">
                <span className="text-6xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">£299</span>
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
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-6xl font-black mb-6 text-white">
            Ready to Transform<br/>
            <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">Your Business?</span>
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
            Join thousands of businesses already using Demly to power their operations.
          </p>
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

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-3xl font-black text-white mb-4 tracking-tight">DEMLY</div>
          <p className="text-slate-400 mb-6">© 2025 Demly. All rights reserved.</p>
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
