// app/dashboard/page.tsx - REDESIGNED DASHBOARD HOME
"use client";

import Link from "next/link";
import { 
  Users, 
  Calendar, 
  Package, 
  Settings, 
  Monitor, 
  ShoppingCart, 
  ArrowLeft,
  CreditCard,
  Receipt,
  BarChart3,
  FileText,
  Zap,
  ChevronRight
} from "lucide-react";

const menuItems = [
  {
    href: "/",
    icon: ShoppingCart,
    title: "Point of Sale",
    description: "Process transactions and manage sales",
    color: "primary",
    featured: true
  },
  {
    href: "/dashboard/customers",
    icon: Users,
    title: "Customers",
    description: "Manage customer database & balances",
    color: "blue-500"
  },
  {
    href: "/dashboard/appointments",
    icon: Calendar,
    title: "Appointments",
    description: "Schedule and track bookings",
    color: "purple-500"
  },
  {
    href: "/dashboard/inventory",
    icon: Package,
    title: "Inventory",
    description: "Track products and stock levels",
    color: "emerald-500"
  },
  {
    href: "/dashboard/transactions",
    icon: Receipt,
    title: "Transactions",
    description: "View sales history and reports",
    color: "orange-500"
  },
  {
    href: "/dashboard/reports",
    icon: BarChart3,
    title: "Reports",
    description: "Analytics and business insights",
    color: "pink-500"
  },
  {
    href: "/dashboard/card-terminal",
    icon: CreditCard,
    title: "Card Terminal",
    description: "Configure payment terminals",
    color: "indigo-500"
  },
  {
    href: "/dashboard/hardware",
    icon: Monitor,
    title: "Hardware",
    description: "Printers, scanners & displays",
    color: "cyan-500"
  },
  {
    href: "/dashboard/settings",
    icon: Settings,
    title: "Settings",
    description: "Business settings & preferences",
    color: "slate-500"
  }
];

export default function DashboardHome() {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Manage your business from here.</p>
          </div>
          <Link 
            href="/" 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            Open POS
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Today's Sales</p>
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">£0.00</p>
            <p className="text-xs text-muted-foreground mt-1">0 transactions</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">-</p>
            <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Low Stock Items</p>
              <Package className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">-</p>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Today's Bookings</p>
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">-</p>
            <p className="text-xs text-muted-foreground mt-1">Appointments</p>
          </div>
        </div>

        {/* Main Menu Grid */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const colorClass = item.color === 'primary' ? 'primary' : item.color;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group bg-card border border-border rounded-xl p-6 hover:border-${colorClass}/50 transition-all ${
                    item.featured ? 'md:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      item.color === 'primary' 
                        ? 'bg-primary/10' 
                        : `bg-${item.color}/10`
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        item.color === 'primary' 
                          ? 'text-primary' 
                          : `text-${item.color}`
                      }`} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Getting Started</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Configure your business settings and branding</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Add your products to the inventory</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Set up hardware (printer, scanner, card terminal)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Import or add your customers</span>
              </li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
            </div>
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground mt-1">Start using the POS to see transactions here</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
