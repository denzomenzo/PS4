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
  Menu, X, ChevronDown, ChevronUp, User
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Initialize sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    if (!selectedStaff?.email) {
      setResetError("Staff member must have an email to reset PIN");
      return;
    }
    
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

      // Send email with new PIN
      const { error: emailError } = await supabase.functions.invoke(
        'send-pin-reset-email',
        {
          body: {
            email: selectedStaff.email,
            staffName: selectedStaff.name,
            newPin: newPin,
            businessName: businessName
          }
        }
      );

      if (emailError) {
        console.warn("Failed to send email:", emailError);
        // Still show success but warn about email
        setResetSuccess(`✅ PIN reset for ${selectedStaff.name}. New PIN: ${newPin} (Email may not have been sent)`);
      } else {
        setResetSuccess(`✅ PIN reset for ${selectedStaff.name}. New PIN has been sent to their email.`);
      }
      
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
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-8 w-full max-w-md border border-border shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
              <Lock className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Staff Login</h1>
            <p className="text-muted-foreground">Select your name and enter your PIN</p>
          </div>

          {/* Staff Selection Dropdown - UPDATED */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-foreground mb-2">
              Staff Member
            </label>
            <button
              type="button"
              onClick={() => setShowStaffDropdown(!showStaffDropdown)}
              className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-left flex items-center justify-between hover:bg-muted transition-colors"
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
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {staffList.map((staffMember) => (
                  <button
                    key={staffMember.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(staffMember.id);
                      setShowStaffDropdown(false);
                      setPinError("");
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-muted transition-colors ${
                      selectedStaffId === staffMember.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <div className="font-medium">{staffMember.name}</div>
                        {staffMember.email && (
                          <div className="text-xs text-muted-foreground">{staffMember.email}</div>
                        )}
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

          {/* PIN Input - UPDATED to include email field */}
          <div className="mb-4">
            <div className="space-y-3">
              {selectedStaffId && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Verification
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={staffList.find(s => s.id === selectedStaffId)?.email || ""}
                      readOnly
                      className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-3 text-foreground/60"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  PIN Code
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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
                    className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                  />
                </div>
              </div>
            </div>
            {pinError && (
              <p className="mt-2 text-sm text-destructive">{pinError}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handlePinSubmit}
              disabled={!selectedStaffId || pinInput.length < 4}
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Login to Dashboard
            </button>

            {/* Reset PIN Section */}
            <div className="pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowResetOption(!showResetOption)}
                className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
              >
                {showResetOption ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Reset Options
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Forgot PIN?
                  </>
                )}
              </button>

              {showResetOption && (
                <div className="bg-muted/30 rounded-lg p-3 mt-2">
                  <p className="text-sm text-muted-foreground mb-2">
                    Reset PIN for selected staff member. A new PIN will be sent to their email.
                  </p>
                  
                  {resetSuccess && (
                    <div className="bg-success/20 border border-success/30 rounded-lg p-2 mb-2">
                      <p className="text-sm text-success font-medium">{resetSuccess}</p>
                    </div>
                  )}
                  
                  {resetError && (
                    <div className="bg-destructive/20 border border-destructive/30 rounded-lg p-2 mb-2">
                      <p className="text-sm text-destructive font-medium">{resetError}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleResetPin}
                    disabled={resettingPin || !selectedStaffId}
                    className="w-full bg-gradient-to-r from-destructive/80 to-destructive/60 text-destructive-foreground font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    {resettingPin ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Resetting PIN...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send New PIN to Email
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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-40 h-full bg-card border-r border-border
        transition-all duration-300 ease-in-out
        ${isMobile ? (isSidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        ${sidebarCollapsed ? 'w-20' : 'w-72'}
      `}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className={`p-4 border-b border-border ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            {!sidebarCollapsed ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {businessLogoUrl ? (
                    <img
                      src={businessLogoUrl}
                      alt={businessName}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
                      <span className="text-white font-bold">D</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-foreground truncate">{businessName}</h1>
                    <p className="text-xs text-muted-foreground truncate">POS System</p>
                  </div>
                </div>
                
                {/* Staff Info */}
                {staff && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">Logged in as</p>
                        <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                          {staff.name}
                          {staff.role === "owner" && (
                            <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] rounded-full border border-primary/30 shrink-0">
                              OWNER
                            </span>
                          )}
                        </p>
                      </div>
                      <ThemeToggle />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Collapsed state
              <div className="flex flex-col items-center gap-4">
                {businessLogoUrl ? (
                  <img
                    src={businessLogoUrl}
                    alt={businessName}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
                    <span className="text-white font-bold">D</span>
                  </div>
                )}
                {staff && <ThemeToggle />}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
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
                  onClick={() => isMobile && setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg transition-all duration-200 font-medium group ${
                    sidebarCollapsed ? 'justify-center p-3' : 'px-3 py-2.5 mx-2'
                  } ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                  {!sidebarCollapsed && (
                    <span className="text-sm truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`
        flex-1 overflow-auto transition-all duration-300
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}
      `}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors border border-border"
                >
                  <Menu className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
              
              {/* Desktop Toggle Button */}
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 hover:bg-accent rounded-lg transition-colors border border-border"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              )}
              
              {/* Page Title */}
              <h1 className="text-lg font-bold text-foreground">
                {navigation.find(item => item.href === pathname)?.name || "Dashboard"}
              </h1>
            </div>

            {/* User Info with Logout */}
            {staff && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{staff.name}</span>
                    <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded-full">
                      {staff.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors mt-0.5"
                  >
                    <LogOut className="w-3 h-3" />
                    Logout
                  </button>
                </div>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white font-bold text-sm">
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Mobile Dropdown */}
                  <div className="sm:hidden absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="p-3">
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white font-bold">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{staff.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{staff.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
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
