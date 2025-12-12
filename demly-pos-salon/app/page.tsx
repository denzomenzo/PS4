"use client";

import Link from "next/link";
import { Check, Zap, Shield, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-emerald-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-4xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
              Demly
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-slate-300">
              <a href="#features" className="hover:text-emerald-400 transition-colors font-medium">Features</a>
              <a href="#pricing" className="hover:text-emerald-400 transition-colors font-medium">Pricing</a>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/login" className="px-6 py-2.5 text-slate-300 hover:text-white transition-colors font-semibold">
                Sign In
              </Link>
              <Link href="/pay" className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-7xl md:text-8xl font-black mb-6 leading-tight text-white">
            Enterprise Software<br/>
            <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">Built for Growth</span>
          </h1>
          
          <p className="text-2xl text-slate-400 mb-12 max-w-3xl mx-auto">
            Transform your business with Demly POS. Powerful, intuitive, and built for modern businesses.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/pay" className="px-10 py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-2xl font-bold text-xl shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105">
              Start Now
            </Link>
            <Link href="#features" className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-xl transition-all text-white">
              Learn More
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { value: "99.9%", label: "Uptime" },
              { value: "10K+", label: "Users" },
              { value: "150+", label: "Countries" },
              { value: "24/7", label: "Support" },
            ].map((stat) => (
              <div key={stat.label} className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                <div className="text-5xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">{stat.value}</div>
                <p className="text-slate-400 mt-2 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POS Preview */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-3xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black text-white mb-4">Demly POS Interface</h2>
              <p className="text-slate-400 text-lg">Beautiful, intuitive, and lightning-fast</p>
            </div>
            
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-emerald-500/20">
              <div className="grid grid-cols-3 gap-4">
                {/* Products Grid */}
                <div className="col-span-2 space-y-3">
                  <div className="bg-slate-800/50 rounded-xl px-4 py-3 flex items-center gap-2">
                    <span className="text-slate-500">🔍</span>
                    <span className="text-slate-500 text-sm">Search products, SKU, barcode...</span>
                  </div>
                  <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { icon: '✂️', name: 'Haircut', price: '25.00' },
                        { icon: '💅', name: 'Manicure', price: '15.00' },
                        { icon: '🧴', name: 'Shampoo', price: '8.99' },
                        { icon: '💆', name: 'Facial', price: '45.00' },
                        { icon: '🎨', name: 'Color', price: '60.00' },
                        { icon: '💇', name: 'Blowdry', price: '20.00' },
                        { icon: '🧖', name: 'Spa', price: '80.00' },
                        { icon: '💄', name: 'Makeup', price: '35.00' },
                      ].map((item, i) => (
                        <div key={i} className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50 hover:border-emerald-500/50 transition-all cursor-pointer">
                          <div className="text-2xl mb-1">{item.icon}</div>
                          <div className="text-xs font-bold text-white mb-1">{item.name}</div>
                          <div className="text-xs font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">£{item.price}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Cart */}
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/50">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg">
                      <span className="text-sm">🛒</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Cart</div>
                      <div className="text-xs text-slate-400">2 items</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="bg-slate-800/50 rounded p-2 text-xs border border-slate-700/50">
                      <div className="flex justify-between mb-1">
                        <span className="text-white">✂️ Haircut</span>
                        <span className="font-bold text-emerald-400">£25.00</span>
                      </div>
                    </div>
                    <div className="bg-slate-800/50 rounded p-2 text-xs border border-slate-700/50">
                      <div className="flex justify-between mb-1">
                        <span className="text-white">🧴 Shampoo</span>
                        <span className="font-bold text-emerald-400">£8.99</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-700/50">
                    <div className="flex justify-between text-xs mb-1 text-slate-300">
                      <span>Subtotal</span>
                      <span className="font-bold">£33.99</span>
                    </div>
                    <div className="flex justify-between text-xs mb-2 text-slate-300">
                      <span>VAT (20%)</span>
                      <span className="font-bold">£6.80</span>
                    </div>
                    <div className="border-t border-slate-700/50 pt-2 flex justify-between">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-lg font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">£40.79</span>
                    </div>
                  </div>
                  
                  <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    💳 Charge £40.79
                  </button>
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
            <h2 className="text-6xl font-black mb-6 text-white">Everything You Need</h2>
            <p className="text-xl text-slate-400">Powerful features for modern businesses</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <Zap className="w-8 h-8" />, title: "Lightning Fast", desc: "Process transactions in under 2 seconds" },
              { icon: <Shield className="w-8 h-8" />, title: "Secure", desc: "Bank-level security and encryption" },
              { icon: <TrendingUp className="w-8 h-8" />, title: "Analytics", desc: "Real-time reports and insights" },
            ].map((feature) => (
              <div key={feature.title} className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 hover:border-emerald-500/30 transition-all">
                <div className="text-emerald-400 mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-6xl font-black mb-6 text-white">
            Simple <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">Pricing</span>
          </h2>
          <p className="text-xl text-slate-400 mb-12">Choose the plan that works for you</p>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-10">
              <h3 className="text-2xl font-bold mb-4 text-white">Monthly</h3>
              <div className="text-6xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-2">£29</div>
              <p className="text-slate-400 mb-8">per month</p>
              <ul className="space-y-3 mb-8 text-left">
                {["Full POS System", "Unlimited Transactions", "Customer Management", "Inventory Tracking", "Email Support"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pay" className="block w-full py-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold transition-all text-white">
                Get Started
              </Link>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 border-2 border-emerald-500/50 rounded-3xl p-10 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full text-sm font-bold">
                SAVE £49
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Annual</h3>
              <div className="text-6xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-2">£299</div>
              <p className="text-slate-400 mb-8">per year</p>
              <ul className="space-y-3 mb-8 text-left">
                {["Everything in Monthly", "Priority Support", "Advanced Analytics", "Custom Branding", "API Access"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-300">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pay" className="block w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold shadow-lg transition-all">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-3xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-4">Demly</div>
          <p className="text-slate-400 mb-6">© 2024 Demly. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
