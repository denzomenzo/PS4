"use client";

import Link from "next/link";
import { ArrowLeft, Check, Coffee, Store, Scissors, Warehouse, ShoppingCart } from "lucide-react";
import Logo from "@/components/Logo";

const REAL_IMAGES = {
  restaurant: {
    main: "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&h=400&fit=crop&crop=center",
    products: [
      { name: "Avocado Toast", price: 12.99, image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=300&h=200&fit=crop" },
      { name: "Butternut Soup", price: 8.99, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=300&h=200&fit=crop" },
      { name: "Gourmet Burger", price: 14.99, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop" },
      { name: "Fresh Salad", price: 10.99, image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop" }
    ]
  },
  retail: {
    main: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop&crop=center",
    products: [
      { name: "Premium Headphones", price: 89.99, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop" },
      { name: "Cold Energy Drinks", price: 2.99, image: "https://images.unsplash.com/photo-1603561596112-0a132b757442?w=300&h=200&fit=crop" },
      { name: "USB-C Cable Pack", price: 14.99, image: "https://images.unsplash.com/photo-1589561454226-796a8e89e2de?w=300&h=200&fit=crop" },
      { name: "Phone Accessories", price: 24.99, image: "https://images.unsplash.com/photo-1581235720705-6d2a6e5d2c9a?w=300&h=200&fit=crop" }
    ]
  },
  salon: {
    main: "https://cdn.luxuo.com/2022/05/2-Quiff.jpg",
    products: [
      { name: "Quiff Haircut", price: 35.00, image: "https://cdn.luxuo.com/2022/05/2-Quiff.jpg" },
      { name: "Hair Styling Gel", price: 18.50, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTeIZLpfpxNzq4KNw-RGGGqTWW5Dhot-vw76w&s" },
      { name: "Beard Trim", price: 15.00, image: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=300&h=200&fit=crop" },
      { name: "Salon Scissors", price: 45.00, image: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=300&h=200&fit=crop" }
    ]
  },
  warehouse: {
    main: "https://images.unsplash.com/photo-1597557314810-5694f1bd37b7?w=800&h=400&fit=crop&crop=center",
    products: [
      { name: "Bacon Case (48)", price: 42.50, image: "https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcTlW5bP40uTsLv73KrVLZXldWSKBb6FoN4kGz-DlJKb8DWW_cEM0YkCt0wa-D6-QRi14Nl70HgfMvGKeDT7YVxT2eeNHUIhb4ecJEKCYVO6Jod02QjOV8DS8Klk-N8YXnXI7536iJsyNEo&usqp=CAc" },
      { name: "Coca-Cola 24pk", price: 28.80, image: "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcSPoGxa7USQj2zOB0yghsImVUGzQnv7HYWKBnnRj_OtLD1TzDYRbtRhk9iXfvcVvFjkb034-d6Q58zCRW9CwCfvzlYc2pVdelrz_i4XIZXZgSKDZf4cgYO2KOmDzIAEEb-SQ9F4HA&usqp=CAc" },
      { name: "Water Pallet", price: 32.00, image: "https://images.unsplash.com/photo-1595435934247-5d33b7f92c70?w=300&h=200&fit=crop" },
      { name: "Snack Boxes", price: 38.99, image: "https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=300&h=200&fit=crop" }
    ]
  }
};

const industries = [
  {
    id: "restaurants",
    title: "Restaurants & Cafés",
    icon: Coffee,
    color: "from-orange-500 to-amber-600",
    description: "Complete POS solution for food service businesses",
    features: ["Table management & reservations", "Digital menus with images", "Kitchen display system", "Order modifiers & splitting", "Takeout & delivery", "Loyalty programs"],
    images: REAL_IMAGES.restaurant
  },
  {
    id: "retail",
    title: "Retail Stores",
    icon: Store,
    color: "from-blue-500 to-cyan-600",
    description: "Inventory management and checkout for retail",
    features: ["Barcode scanning", "Multi-store inventory", "Supplier ordering", "Returns & exchanges", "Customer CRM", "Sales analytics"],
    images: REAL_IMAGES.retail
  },
  {
    id: "salons",
    title: "Salons & Barbers",
    icon: Scissors,
    color: "from-purple-500 to-pink-600",
    description: "Appointment-based service management",
    features: ["Online booking system", "Staff scheduling", "Service packages", "Client history", "Product sales", "Membership plans"],
    images: REAL_IMAGES.salon
  },
  {
    id: "warehouses",
    title: "Warehouses & Wholesale",
    icon: Warehouse,
    color: "from-emerald-500 to-green-600",
    description: "Bulk sales and inventory for wholesale",
    features: ["Bulk order management", "Pallet tracking", "Supplier management", "Batch/expiry tracking", "Warehouse picking", "Delivery scheduling"],
    images: REAL_IMAGES.warehouse
  }
];

export default function IndustriesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black py-3 sm:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 sm:gap-4">
              <ArrowLeft className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
              <Logo size="medium" />
            </Link>
            
            <div className="flex items-center gap-4 sm:gap-6">
              <Link href="/" className="text-slate-300 hover:text-emerald-400 transition-colors text-sm sm:text-base">
                Home
              </Link>
              <Link href="/pay" className="px-4 sm:px-5 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white text-sm sm:text-base transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-16 px-4 sm:px-6 bg-black">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 sm:mb-6 text-white">
            Built for
            <span className="block bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              Every Industry
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-8 sm:mb-12 max-w-2xl md:max-w-3xl mx-auto">
            Demly POS adapts to your specific business needs with industry-tailored features and workflows.
          </p>
        </div>
      </section>

      {/* Industries */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-20">
        {industries.map((industry, index) => (
          <section key={industry.id} className="mb-16 sm:mb-20 last:mb-0">
            <div className="lg:grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              {/* Industry Info */}
              <div className="mb-8 sm:mb-0">
                <div className="inline-flex items-center gap-3 sm:gap-4 mb-6">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r ${industry.color} flex items-center justify-center`}>
                    <industry.icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{industry.title}</h2>
                    <p className="text-slate-400 text-sm sm:text-base">{industry.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  {industry.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 sm:gap-3">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300 text-sm sm:text-base">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link 
                  href="/pay" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white text-sm sm:text-base transition-colors"
                >
                  Start with {industry.title}
                </Link>
              </div>

              {/* POS Preview */}
              <div className="bg-gradient-to-br from-slate-900 to-black rounded-2xl sm:rounded-3xl border border-slate-800/50 p-4 sm:p-6 shadow-2xl">
                <div className="mb-4">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
                    <div 
                      className="w-full h-32 sm:h-40 rounded-lg bg-cover bg-center mb-3"
                      style={{ backgroundImage: `url(${industry.images.main})` }}
                    />
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{industry.title} POS</h3>
                    <p className="text-slate-400 text-sm">Ready for checkout</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {industry.images.products.slice(0, 4).map((product, i) => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                      <div 
                        className="h-20 sm:h-24 bg-cover bg-center"
                        style={{ backgroundImage: `url(${product.image})` }}
                      />
                      <div className="p-2 sm:p-3">
                        <p className="font-bold text-white text-xs sm:text-sm truncate">{product.name}</p>
                        <p className="text-emerald-400 font-bold text-sm">£{product.price}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                      <span className="text-white text-sm sm:text-base font-bold">Cart Total</span>
                    </div>
                    <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                      £{industry.id === "warehouses" ? "129.99" : "89.99"}
                    </span>
                  </div>
                  <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 sm:py-3 rounded-lg text-sm sm:text-base transition-colors">
                    Process Order
                  </button>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-black/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 sm:mb-8 text-white">
            Ready for Your Business?
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mb-8 sm:mb-12">
            Join thousands of businesses using Demly POS across all industries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/pay" 
              className="px-8 sm:px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl sm:rounded-2xl font-bold text-white text-base sm:text-lg transition-colors"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/" 
              className="px-8 sm:px-10 py-3 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl sm:rounded-2xl font-bold text-white text-base sm:text-lg transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 px-4 sm:px-6 border-t border-white/5">
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
