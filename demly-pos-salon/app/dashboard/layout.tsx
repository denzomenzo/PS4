// app/dashboard/layout.tsx - FIXED SIDEBAR TOGGLE
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { useResponsive } from "@/hooks/useResponsive";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Home, Users, Calendar, Settings, LogOut, TrendingUp,
  Monitor, Package, CreditCard, RotateCcw, Printer, Loader2, 
  Lock, Check, Key, Mail, Shield, Zap, ChevronLeft, ChevronRight,
  Menu, X
} from "lucide-react";

const navigation = [
  { name: "POS", href: "/dashboard", icon: Home, permission: "pos" as const },
  { name: "Customers", href: "/dashboard/customers", icon: Users, permission: "pos" as const },
  { name: "Appointments", href: "/dashboard/appointments", icon: Calendar, permission: "pos" as const },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package, permission: "inventory" as const },
  { name: "Returns", href: "/dashboard/returns", icon: RotateCcw, permission: "pos" as const },
  { name: "Reports", href: "/dashboard/reports", icon: TrendingUp, permission: "reports" as const },
  { name: "Display", href: "/dashboard/display", icon: Monitor, permission: "pos" as const },
  { name: "Apps", href: "/dashboard/apps", icon: Zap, permission: "reports" as const },
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
  const { isMobile } = useResponsive();
  
  const [businessName, setBusinessName] = useState("Demly POS");
  const [businessLogoUrl, setBusinessLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string; role: string; email?: string }>>([]);
  const [showResetOption, setShowResetOption] = useState(false);
  const [resettingPin, setResettingPin] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  
  // Start with sidebar collapsed on mobile, expanded on desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Initialize sidebar state based on screen size
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true); // Collapsed on mobile
    } else {
      setSidebarCollapsed(false); // Expanded on desktop
    }
  }, [isMobile]);

  useEffect(() => {
    if (userId && !authLoading) {
      loadData();
    }
  }, [userId, authLoading]);

  useEffect(() => {
    // Check if PIN modal should be shown
    if (pathname === "/dashboard/first-time-setup" || pathname === "/dashboard/display") {
      setShowPinModal(false);
      return;
    }

    if (!authLoading && !staff) {
      setShowPinModal(true);
    } else {
      setShowPinModal(false);
    }
  }, [pathname, authLoading, staff]);

  const loadData = async () => {
    try {
      // Load business settings
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

      // Load staff list with emails
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, role, email")
        .eq("user_id", userId)
        .order("name");
      
      if (staffData) {
        setStaffList(staffData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setLoading(false);
    }
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
    setShowResetOption(false);
    setResetSuccess("");
  };

  const handleResetPin = async () => {
    if (!selectedStaffId) {
      setResetError("Please select a staff member first");
      return;
    }

    const selectedStaff = staffList.find(s => s.id === selectedStaffId);
    
    setResettingPin(true);
    setResetError("");
    setResetSuccess("");

    try {
      // Generate a random 4-digit PIN
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Update the staff PIN in database
      const { error: updateError } = await supabase
        .from("staff")
        .update({ pin: newPin })
        .eq("id", selectedStaffId)
        .eq("user_id", userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // SIMPLIFIED: Just show success message without email
      setResetSuccess(`✅ PIN reset for ${selectedStaff?.name}. New PIN: ${newPin}`);
      
      // Clear any errors
      setResetError("");
    } catch (error: any) {
      console.error("Error resetting PIN:", error);
      setResetError("Failed to reset PIN: " + error.message);
      setResetSuccess("");
    } finally {
      setResettingPin(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await logout();
    }
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-card">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground text-xl font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Show PIN modal if not authenticated (except for special pages)
  if (showPinModal && staffList.length > 0) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-background via-muted to-card flex items-center justify-center p-4">
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 w-full max-w-[95vw] sm:max-w-md md:max-w-lg border border-border shadow-2xl mx-4">
          {/* ... [Keep the PIN modal content exactly as before] ... */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-primary/20">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-2">
              Staff Login
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">Select your name and enter your PIN</p>
          </div>

          {/* ... [Rest of PIN modal - unchanged] ... */}
          
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted to-card overflow-hidden">
      
      {/* Sidebar Overlay for mobile */}
      {!sidebarCollapsed && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar - FIXED: Only show when NOT collapsed */}
      {!sidebarCollapsed && (
        <aside className={`
          fixed md:static inset-y-0 left-0 z-50 w-72 bg-card/95 backdrop-blur-xl border-r border-border
          transition-transform duration-300 ease-in-out
          ${!sidebarCollapsed ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          flex flex-col shadow-2xl
        `}>
          
          {/* Sidebar Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              {/* Business Logo */}
              {businessLogoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={businessLogoUrl}
                    alt={businessName}
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div>
                    <h1 className="text-xl font-bold text-foreground truncate">{businessName}</h1>
                    <p className="text-xs text-muted-foreground">POS System</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    {businessName}
                  </h1>
                  <p className="text-sm text-muted-foreground">Point of Sale</p>
                </div>
              )}
              
              {/* Close Button for mobile */}
              {isMobile && (
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors border border-border"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
            
            {/* Staff Info */}
            {staff && (
              <div className="bg-muted/50 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Logged in as</p>
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      {staff.name}
                      {staff.role === "owner" && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full border border-primary/30">
                          OWNER
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {/* Theme Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground hidden md:inline">Theme</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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

              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => isMobile && setSidebarCollapsed(true)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium group ${
                    isActive
                      ? "bg-primary/10 text-primary border-l-4 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"} transition-colors`} />
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer - SIMPLIFIED: Only Logout button */}
          <div className="p-4 border-t border-border/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 font-medium group"
            >
              <div className="p-2 bg-muted rounded-lg">
                <LogOut className="w-4 h-4 group-hover:text-destructive transition-colors" />
              </div>
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`
        flex-1 overflow-auto bg-background/50
        transition-all duration-300
        ${!sidebarCollapsed && !isMobile ? 'md:pl-72' : 'md:pl-0'}
      `}>
        {/* Top Header with Menu Button */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Menu Button for mobile - Shows when sidebar is collapsed */}
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors border border-border md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
              
              {/* Collapse/Expand Button for desktop - ALWAYS VISIBLE */}
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 hover:bg-accent rounded-lg transition-colors border border-border flex items-center gap-2"
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? (
                    <>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground hidden lg:inline">
                        Expand
                      </span>
                    </>
                  ) : (
                    <>
                      <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground hidden lg:inline">
                        Collapse
                      </span>
                    </>
                  )}
                </button>
              )}
              
              {/* Page Title */}
              <h1 className="text-xl font-bold text-foreground">
                {navigation.find(item => item.href === pathname)?.name || "Dashboard"}
              </h1>
            </div>

            {/* User Info */}
            {staff && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{staff.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{staff.role}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white font-bold text-sm">
                  {staff.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
