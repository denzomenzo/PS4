// app/dashboard/layout.tsx - UPDATED WITH LOGO SUPPORT
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import {
  Home, Users, Calendar, Settings, LogOut, TrendingUp,
  Monitor, Package, CreditCard, RotateCcw, Printer, Loader2, Lock, Check
} from "lucide-react";

const navigation = [
  { name: "POS", href: "/dashboard", icon: Home, permission: "pos" as const },
  { name: "Customers", href: "/dashboard/customers", icon: Users, permission: "pos" as const },
  { name: "Appointments", href: "/dashboard/appointments", icon: Calendar, permission: "pos" as const },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package, permission: "inventory" as const },
  { name: "Returns", href: "/dashboard/returns", icon: RotateCcw, permission: "pos" as const },
  { name: "Reports", href: "/dashboard/reports", icon: TrendingUp, permission: "reports" as const },
  { name: "Display", href: "/dashboard/display", icon: Monitor, permission: "pos" as const },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, ownerOnly: true },
  { name: "Hardware", href: "/dashboard/hardware", icon: Printer, permission: "reports" as const },
  { name: "Card Terminal", href: "/dashboard/card-terminal", icon: CreditCard, permission: "reports" as const },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const userId = useUserId();
  const { staff, loading: authLoading, login, logout, hasPermission } = useStaffAuth();
  
  const [businessName, setBusinessName] = useState("Demly POS");
  const [businessLogoUrl, setBusinessLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string; role: string }>>([]);

  useEffect(() => {
    if (userId && !authLoading) {
      loadData();
      checkAuthRequired();
    }
  }, [userId, authLoading, pathname]);

  const checkAuthRequired = () => {
    // Check if we need to show PIN modal for this route
    if (!staff && pathname !== "/dashboard/display") {
      setShowPinModal(true);
    } else {
      setShowPinModal(false);
    }
  };

  const loadData = async () => {
    // Load business name and logo
    const { data } = await supabase
      .from("settings")
      .select("business_name, shop_name, business_logo_url")
      .eq("user_id", userId)
      .single();
    
    if (data?.shop_name) {
      setBusinessName(data.shop_name);
    } else if (data?.business_name) {
      setBusinessName(data.business_name);
    }
    
    if (data?.business_logo_url) {
      setBusinessLogoUrl(data.business_logo_url);
    }

    // Load staff list for selection
    const { data: staffData } = await supabase
      .from("staff")
      .select("id, name, role")
      .eq("user_id", userId)
      .order("name");
    
    if (staffData) {
      setStaffList(staffData);
    }
    
    setLoading(false);
  };

  const handlePinSubmit = async () => {
    if (!selectedStaffId) {
      setPinError("Please select a staff member");
      return;
    }

    if (pinInput.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }

    const result = await login(pinInput);
    
    if (!result.success) {
      setPinError(result.error || "Invalid PIN");
      setPinInput("");
      return;
    }

    // Verify the logged-in staff matches selected staff
    if (result.staff && result.staff.id !== selectedStaffId) {
      setPinError("PIN doesn't match selected staff member");
      setPinInput("");
      await logout();
      return;
    }

    setShowPinModal(false);
    setPinError("");
    setPinInput("");
    setSelectedStaffId(null);
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await logout();
      setShowPinModal(true);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-white text-xl font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Show PIN modal if not authenticated (except for display page)
  if (showPinModal && pathname !== "/dashboard/display") {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-6">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full border border-slate-800/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-2">
              Staff Login
            </h1>
            <p className="text-slate-400 text-lg">Select your name and enter your PIN</p>
          </div>

          {pinError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 mb-6 text-center">
              {pinError}
            </div>
          )}

          <div className="space-y-6">
            {/* Staff Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Select Staff Member
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {staffList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p className="mb-2">No staff members found</p>
                    <p className="text-sm">Please create staff in Settings first</p>
                  </div>
                ) : (
                  staffList.map((staffMember) => (
                    <button
                      key={staffMember.id}
                      onClick={() => {
                        setSelectedStaffId(staffMember.id);
                        setPinError("");
                      }}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        selectedStaffId === staffMember.id
                          ? "bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20"
                          : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white text-lg">{staffMember.name}</p>
                          <p className="text-xs text-slate-400 capitalize">{staffMember.role}</p>
                        </div>
                        {selectedStaffId === staffMember.id && (
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* PIN Input */}
            {selectedStaffId && (
              <div style={{ animation: "fadeIn 0.3s ease-in" }}>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Enter PIN for {staffList.find(s => s.id === selectedStaffId)?.name}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setPinInput(value);
                    setPinError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                  placeholder="••••"
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-6 py-5 text-center text-3xl font-bold tracking-widest text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
              </div>
            )}
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={!selectedStaffId || pinInput.length < 4}
            className="w-full mt-8 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-5 rounded-xl transition-all disabled:opacity-50 text-xl shadow-xl shadow-emerald-500/20"
          >
            Login to POS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden">
      
      <aside className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col shadow-2xl">
        
        <div className="p-6 border-b border-slate-800/50">
          {/* Business Logo */}
          {businessLogoUrl && (
            <div className="mb-4 flex items-center justify-center">
              <img
                src={businessLogoUrl}
                alt={businessName}
                className="max-w-full max-h-20 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Business Name */}
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
            <h1 className="text-4xl font-black tracking-tight text-center">
              {businessName}
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-2 font-medium text-center">Point of Sale System</p>
          
          {/* Staff Info */}
          {staff && (
            <div className="mt-4 bg-slate-800/50 rounded-xl p-3">
              <p className="text-xs text-slate-500">Logged in as</p>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                {staff.name}
                {staff.role === "owner" && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                    OWNER
                  </span>
                )}
                {staff.role === "manager" && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                    MANAGER
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            
            // Check permissions
            let hasAccess = true;
            if (staff) {
              if (item.ownerOnly) {
                hasAccess = staff.role === "owner";
              } else if (item.permission) {
                hasAccess = hasPermission(item.permission);
              }
            }

            if (!hasAccess) return null;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 font-semibold group ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-white border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50 hover:border hover:border-slate-700/50"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-400"} transition-colors`} />
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
