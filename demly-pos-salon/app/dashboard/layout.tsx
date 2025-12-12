"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import {
  Home, Users, Calendar, Settings, LogOut, TrendingUp,
  Monitor, Package, CreditCard, RotateCcw, Printer, Loader2
} from "lucide-react";

const navigation = [
  { name: "POS", href: "/dashboard", icon: Home },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Appointments", href: "/dashboard/appointments", icon: Calendar },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  { name: "Returns", href: "/dashboard/returns", icon: RotateCcw },
  { name: "Reports", href: "/dashboard/reports", icon: TrendingUp },
  { name: "Display", href: "/dashboard/display", icon: Monitor },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Hardware", href: "/dashboard/hardware", icon: Printer },
  { name: "Card Terminal", href: "/dashboard/card-terminal", icon: CreditCard },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const userId = useUserId();
  const [businessName, setBusinessName] = useState("Demly POS");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      checkAuth();
    }
  }, [userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    // Check license
    const { data: license } = await supabase
      .from("licenses")
      .select("status")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .single();

    if (!license) {
      router.push("/activate");
      return;
    }

    loadBusinessName();
    setLoading(false);
  };

  const loadBusinessName = async () => {
    const { data } = await supabase
      .from("settings")
      .select("business_name")
      .eq("user_id", userId)
      .single();
    
    if (data?.business_name) {
      setBusinessName(data.business_name);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden">
      
      <aside className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shadow-2xl">
        
        <div className="p-6 border-b border-slate-800/50">
          <div className="bg-gradient-to-r from-cyan-500 to-emerald-500 bg-clip-text text-transparent">
            <h1 className="text-4xl font-black tracking-tight">
              {businessName}
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-2 font-medium">Point of Sale System</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 font-semibold group ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-white border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50 hover:border hover:border-slate-700/50"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-400"} transition-colors`} />
                <span className="text-base">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-5 py-4 w-full rounded-2xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border hover:border-red-500/30 transition-all duration-200 font-semibold group"
          >
            <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-950/50">
        {children}
      </main>
    </div>
  );
}
