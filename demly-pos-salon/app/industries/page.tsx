"use client";

import Link from "next/link";
import { ArrowLeft, Coffee, Store, Scissors, Warehouse, Check, Zap, Shield, Users, TrendingUp, Smartphone } from "lucide-react";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";

const industries = [
  {
    id: "restaurants",
    title: "Restaurants",
    subtitle: "Tables, menus, kitchen displays",
    icon: Coffee,
    color: "from-orange-500 to-amber-600",
    features: [
      "Table management & reservations",
      "Digital menus with images",
      "Kitchen display system",
      "Order splitting & modifiers",
      "Takeout & delivery integration",
      "Loyalty programs"
    ],
    products: [
      { name: "Cheeseburger", price: 12.99, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop&crop=center" },
      { name: "Margherita Pizza", price: 14.99, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop&crop=center" },
      { name: "Caesar Salad", price: 10.99, image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=300&h=200&fit=crop&crop=center" },
      { name: "Latte", price: 4.50, image: "https://images.unsplash.com/photo-1561047029-3000c68339ca?w=300&h=200&fit=crop&crop=center" }
    ]
  },
  {
    id: "retailers",
    title: "Retailers",
    subtitle: "Inventory, barcode, checkout",
    icon: Store,
    color: "from-blue-500 to-cyan-600",
    features: [
      "Barcode scanning",
      "Inventory management",
      "Supplier ordering",
      "Multi-store support",
      "Returns & exchanges",
      "Customer CRM"
    ],
    products: [
      { name: "Wireless Headphones", price: 89.99, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop&crop=center" },
      { name: "Smart Watch", price: 199.99, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=200&fit=crop&crop=center" },
      { name: "T-Shirt", price: 24.99, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=200&fit=crop&crop=center" },
      { name: "Sneakers", price: 89.99, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop&crop=center" }
    ]
  },
  {
    id: "salons",
    title: "Barbers & Salons",
    subtitle: "Appointments, services, staff",
    icon: Scissors,
    color: "from-purple-500 to-pink-600",
    features: [
      "Online booking system",
      "Staff scheduling",
      "Service packages",
      "Client history tracking",
      "Product sales",
      "Membership plans"
    ],
    products: [
      { name: "Haircut & Style", price: 35.00, image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop&crop=center" },
      { name: "Beard Trim", price: 15.00, image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=300&h=200&fit=crop&crop=center" },
      { name: "Hair Color", price: 75.00, image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=300&h=200&fit=crop&crop=center" },
      { name: "Shampoo & Conditioner", price: 25.00, image: "https://images.unsplash.com/photo-1634942537034-2531766767d1?w=300&h=200&fit=crop&crop=center" }
    ]
  },
  {
    id: "warehouses",
    title: "Warehouses",
    subtitle: "Bulk sales, wholesale, stock",
    icon: Warehouse,
    color: "from-emerald-500 to-green-600",
    features: [
      "Bulk order management",
      "Pallet tracking",
      "Supplier management",
      "Batch/expiry tracking",
      "Warehouse picking",
      "Delivery scheduling"
    ],
    products: [
      { name: "Coca-Cola Case (24)", price: 28.80, image: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=300&h=200&fit=crop&crop=center" },
      { name: "Water Bottles (40)", price: 32.00, image: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300&h=200&fit=crop&crop=center" },
      { name: "Rice Bag (20kg)", price: 45.99, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=200&fit=crop&crop=center" },
      { name: "Toilet Paper (48 rolls)", price: 42.50, image: "https://images.unsplash.com/photo-1584556812952-a87f5c8f3388?w=300&h=200&fit=crop&crop=center" }
    ]
  }
];

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl shadow-2xl shadow-emerald-900/10 py-3">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-4">
              <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
              <Logo size="medium" />
            </Link>
            
            <div className="flex items-center gap-8 text-slate-300">
              <Link href="/" className="hover:text-emerald-400 transition-colors">
                Home
              </Link>
              <Link href="/pay" className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-bold text-white">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 text-white"
          >
            <span className="block">Built for</span>
            <span className="bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 bg-clip-text text-transparent">
              Every Industry
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto"
          >
            Demly POS adapts to your specific business needs with industry-tailored features.
          </motion.p>
        </div>
      </section>

      {/* Industry Showcase */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        {industries.map((industry, index) => (
          <motion.section
            key={industry.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
            className={`mb-32 ${index % 2 === 0 ? '' : 'lg:flex-row-reverse'}`}
          >
            <div className="lg:grid lg:grid-cols-2 gap-12 items-center">
              {/* Industry Info */}
              <div className={`mb-10 lg:mb-0 ${index % 2 === 0 ? '' : 'lg:order-2'}`}>
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${industry.color} flex items-center justify-center`}>
                    <industry.icon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white">{industry.title}</h2>
                    <p className="text-lg text-slate-400">{industry.subtitle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {industry.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link 
                  href="/pay" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl font-bold text-white transition-all"
                >
                  Get Started for {industry.title}
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Link>
              </div>

              {/* POS Preview */}
              <div className={`${index % 2 === 0 ? '' : 'lg:order-1'}`}>
                <div className="bg-gradient-to-br from-slate-900 to-black rounded-3xl p-1 border border-slate-800/50 shadow-2xl">
                  <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-black rounded-2xl overflow-hidden">
                    {/* POS Header */}
                    <div className="bg-slate-900/50 border-b border-slate-700/50 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                          <Store className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-bold">Demly POS - {industry.title}</div>
                          <div className="text-slate-400 text-sm">Ready for checkout</div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-emerald-500/20 rounded-lg">
                        <span className="text-emerald-400 text-sm font-semibold">Online</span>
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Search */}
                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="🔍 Search products..."
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500"
                          readOnly
                        />
                      </div>

                      {/* Products Grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {industry.products.map((product, i) => (
                          <div key={i} className="group bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden hover:border-emerald-500/50 transition-all cursor-pointer">
                            <div className="aspect-square overflow-hidden bg-slate-700/30">
                              <div 
                                className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                                style={{ backgroundImage: `url(${product.image})` }}
                              />
                            </div>
                            <div className="p-3">
                              <p className="font-bold text-white text-sm truncate">{product.name}</p>
                              <p className="text-lg font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                                £{product.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Cart Summary */}
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-white">Cart</p>
                            <p className="text-xs text-slate-400">2 items • £24.49</p>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Subtotal</span>
                            <span className="font-bold text-white">£24.49</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">VAT (20%)</span>
                            <span className="font-bold text-white">£4.90</span>
                          </div>
                          <div className="border-t border-slate-700/50 pt-2 flex justify-between">
                            <span className="font-bold text-white">Total</span>
                            <span className="text-xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                              £29.39
                            </span>
                          </div>
                        </div>

                        <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20">
                          💳 Process Payment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        ))}
      </div>

      {/* Universal Features */}
      <section className="py-20 px-6 bg-black/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black mb-8 text-white">
              <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                Universal Features
              </span>
              <span className="block text-white">For Every Business</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Process transactions in seconds" },
              { icon: Shield, title: "Bank-Level Security", desc: "Your data is always protected" },
              { icon: TrendingUp, title: "Real-Time Analytics", desc: "Make data-driven decisions" },
              { icon: Users, title: "Multi-User Access", desc: "Manage staff permissions easily" },
              { icon: Smartphone, title: "Mobile Ready", desc: "Works on any device" },
              { icon: Check, title: "24/7 Support", desc: "We're always here to help" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 hover:border-emerald-500/30 transition-all"
              >
                <div className="w-14 h-14 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <feature.icon className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-black mb-8 text-white">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-slate-300 mb-12">
            Join thousands of businesses using Demly POS across all industries.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link 
              href="/pay" 
              className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-2xl font-bold text-xl text-white transition-all hover:scale-105"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/" 
              className="px-10 py-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-emerald-500/30 rounded-2xl font-bold text-xl text-white transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
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