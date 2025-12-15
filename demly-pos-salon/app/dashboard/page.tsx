"use client";

import Link from "next/link";
import { Users, Calendar, Package, Settings, Monitor, TrendingUp, ArrowLeft } from "lucide-react";

export default function DashboardHome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
            Dashboard
          </h1>
          <Link href="/" className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
            Back to POS
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/" className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:border-cyan-500/50 transition-all group">
            <TrendingUp className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold mb-2">Point of Sale</h2>
            <p className="text-slate-400">Process transactions and manage sales</p>
          </Link>
          
          <Link href="/dashboard/customers" className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:border-cyan-500/50 transition-all group">
            <Users className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold mb-2">Customers</h2>
            <p className="text-slate-400">Manage your customer database</p>
          </Link>
          
          <Link href="/dashboard/appointments" className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:border-cyan-500/50 transition-all group">
            <Calendar className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold mb-2">Appointments</h2>
            <p className="text-slate-400">Schedule and track appointments</p>
          </Link>
          
          <Link href="/dashboard/inventory" className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:border-cyan-500/50 transition-all group">
            <Package className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold mb-2">Inventory</h2>
            <p className="text-slate-400">Track products and stock levels</p>
          </Link>
          
          <Link href="/dashboard/hardware" className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:border-cyan-500/50 transition-all group">
            <Monitor className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold mb-2">Hardware</h2>
            <p className="text-slate-400">Configure printers and displays</p>
          </Link>
          
          <Link href="/dashboard/settings" className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 hover:border-cyan-500/50 transition-all group">
            <Settings className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold mb-2">Settings</h2>
            <p className="text-slate-400">Business settings and preferences</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
