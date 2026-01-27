// app/dashboard/layout.tsx - COMPREHENSIVE FIX
"use client";

import { useEffect, useState, useCallback } from "react";
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
  Menu, X, ChevronDown, ChevronUp, User, LogOutIcon
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
  
  // New state for staff dropdown in PIN modal
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  
  // Initialize sidebar state - desktop: expanded, mobile: collapsed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Properly initialize sidebar state based on screen size
  useEffect(() => {
    setIsClient(true);
    
    const handleResize = () => {
      if (window.innerWidth < 768) { // Mobile
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    // Initial check
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const loadData = useCallback(async () => {
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
        // Auto-select first staff member if available
        if (staffData.length > 0 && !selectedStaffId) {
          setSelectedStaffId(staffData[0].id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setLoading(false);
    }
  }, [userId, selectedStaffId]);

  useEffect(() => {
    if (userId && !authLoading) {
      loadData();
    }
  }, [userId, authLoading, loadData]);

  useEffect(() => {
    // Check if PIN modal should be shown
    const exemptPaths = ["/dashboard/first-time-setup", "/dashboard/display"];
    
    if (exemptPaths.includes(pathname)) {
      setShowPinModal(false);
      return;
    }

    if (!authLoading && !staff) {
      setShowPinModal(true);
    } else {
      setShowPinModal(false);
    }
  }, [pathname, authLoading, staff]);

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
    setShowStaffDropdown(false);
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

      setResetSuccess(`✅ PIN reset for ${selectedStaff?.name}. New PIN: ${newPin}`);
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

  const getSelectedStaffName = () => {
    const staff = staffList.find(s => s.id === selectedStaffId);
    return staff ? staff.name : "Select Staff";
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
      <div className="h-screen w-screen bg-gradient-to-br from-background via-muted to-card flex items-center justify-center p-4 fixed inset-0 z-50">
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 w-full max-w-[95vw] sm:max-w-md md:max-w-lg border border-border shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-primary/20">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-2">
              Staff Login
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
              Select your name and enter your PIN
            </p>
          </div>

          {/* Staff Selection Dropdown */}
          <div className="mb-6 relative">
            <label className="block text-sm font-medium text-foreground mb-2">
              Staff Member
            </label>
            <button
              type="button"
              onClick={() => setShowStaffDropdown(!showStaffDropdown)}
              className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3.5 text-left flex items-center justify-between hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {getSelectedStaffName()}
                </span>
              </div>
              {showStaffDropdown ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>

            {/* Dropdown Menu */}
            {showStaffDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                {staffList.map((staffMember) => (
                  <button
                    key={staffMember.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(staffMember.id);
                      setShowStaffDropdown(false);
                      setPinError("");
                      setResetError("");
                      setResetSuccess("");
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-muted transition-colors ${
                      selectedStaffId === staffMember.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {staffMember.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-left">
                        <div className="font-medium">{staffMember.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {staffMember.role}
                        </div>
                      </div>
                    </div>
                    {selectedStaffId === staffMember.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PIN Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              PIN Code
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPinInput(value);
                  setPinError("");
                }}
                placeholder="Enter 4-6 digit PIN"
                className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3.5 text-lg font-mono tracking-wider placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePinSubmit();
                  }
                }}
              />
            </div>
            {pinError && (
              <p className="mt-2 text-sm text-destructive">{pinError}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handlePinSubmit}
              disabled={!selectedStaffId || pinInput.length < 4}
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold py-3.5 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              Login to Dashboard
            </button>

            {/* Reset PIN Section */}
            <div className="border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowResetOption(!showResetOption)}
                className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 mb-2"
              >
                {showResetOption ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Reset Options
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Forgot PIN? Reset Options
                  </>
                )}
              </button>

              {showResetOption && (
                <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Reset PIN for selected staff member. A new PIN will be generated.
                  </p>
                  
                  {resetSuccess && (
                    <div className="bg-success/20 border border-success/30 rounded-lg p-3">
                      <p className="text-sm text-success font-medium">{resetSuccess}</p>
                    </div>
                  )}
                  
                  {resetError && (
                    <div className="bg-destructive/20 border border-destructive/30 rounded-lg p-3">
                      <p className="text-sm text-destructive font-medium">{resetError}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleResetPin}
                    disabled={resettingPin || !selectedStaffId}
                    className="w-full bg-gradient-to-r from-destructive/80 to-destructive/60 text-destructive-foreground font-medium py-3 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {resettingPin ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Resetting PIN...
                      </>
                    ) : (
                      <>
                        <Key className="w-5 h-5" />
                        Reset PIN for {getSelectedStaffName()}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render layout until client-side to avoid hydration issues
  if (!isClient) {
    return null;
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

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-40 w-72 bg-card/95 backdrop-blur-xl border-r border-border
        transform transition-all duration-300 ease-in-out h-full
        ${sidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 md:w-72'}
        flex flex-col shadow-2xl overflow-hidden
      `}>
        
        {/* Sidebar Header */}
        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex items-center justify-between">
            {/* Business Logo - Hidden when collapsed */}
            {!sidebarCollapsed ? (
              businessLogoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={businessLogoUrl}
                    alt={businessName}
                    className="w-10 h-10 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="overflow-hidden">
                    <h1 className="text-xl font-bold text-foreground truncate">{businessName}</h1>
                    <p className="text-xs text-muted-foreground truncate">POS System</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent truncate">
                    {businessName}
                  </h1>
                  <p className="text-sm text-muted-foreground truncate">Point of Sale</p>
                </div>
              )
            ) : (
              // Collapsed state - show only logo/icon
              <div className="flex justify-center w-full">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">D</span>
                </div>
              </div>
            )}
            
            {/* Close Button for mobile */}
            {!sidebarCollapsed && isMobile && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-2 hover:bg-accent rounded-lg transition-colors border border-border md:hidden"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
          
          {/* Staff Info - Only show when expanded */}
          {!sidebarCollapsed && staff && (
            <div className="mt-4 bg-muted/50 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="overflow-hidden">
                  <p className="text-xs text-muted-foreground">Logged in as</p>
                  <p className="text-sm font-bold text-foreground flex items-center gap-2 truncate">
                    {staff.name}
                    {staff.role === "owner" && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full border border-primary/30 shrink-0">
                        OWNER
                      </span>
                    )}
                  </p>
                </div>
                
                {/* Theme Toggle */}
                <div className="flex items-center gap-2 shrink-0">
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
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? item.name : ''}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"} transition-colors`} />
                {!sidebarCollapsed && (
                  <span className="text-sm truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button in Sidebar Footer (removed since we moved it to header) */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-border/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 font-medium group"
            >
              <div className="p-2 bg-muted rounded-lg">
                <LogOutIcon className="w-4 h-4 group-hover:text-destructive transition-colors" />
              </div>
              <span className="text-sm">Logout</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`
        flex-1 overflow-auto bg-background/50
        transition-all duration-300
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}
      `}>
        {/* Top Header with Menu Button */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Menu Button - Shows when sidebar is collapsed on mobile */}
              {sidebarCollapsed && isMobile ? (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors border border-border"
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5 text-muted-foreground" />
                </button>
              ) : null}
              
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

            {/* User Info with Logout Button */}
            {staff && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{staff.name}</p>
                    <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded-full">
                      {staff.role}
                    </span>
                  </div>
                  {/* Logout Button moved here */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors group"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Logout</span>
                  </button>
                </div>
                <div className="relative group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white font-bold text-sm cursor-pointer">
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Mobile Logout Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 sm:hidden">
                    <div className="p-3">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white font-bold">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{staff.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{staff.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 min-h-[calc(100vh-64px)]">
          {children}
        </div>
      </main>
    </div>
  );
}
