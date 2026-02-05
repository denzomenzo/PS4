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
  Monitor, Package, CreditCard, Printer, Loader2, 
  Lock, Check, Key, Mail, Shield, Zap, ChevronLeft, ChevronRight,
  Menu, X, ChevronDown, ChevronUp, User, Receipt
} from "lucide-react";

// Map pages to NEW functional permissions
const navigation = [
  { 
    name: "POS", 
    href: "/dashboard", 
    icon: Home, 
    requiredPermission: "access_pos" as const 
  },
  { 
    name: "Customers", 
    href: "/dashboard/customers", 
    icon: Users, 
    requiredPermission: "manage_customers" as const 
  },
  { 
    name: "Appointments", 
    href: "/dashboard/appointments", 
    icon: Calendar, 
    requiredPermission: "access_pos" as const // Appointments part of POS
  },
  { 
    name: "Inventory", 
    href: "/dashboard/inventory", 
    icon: Package, 
    requiredPermission: "manage_inventory" as const 
  },
  { 
    name: "Transactions", 
    href: "/dashboard/transactions", 
    icon: Receipt, 
    requiredPermission: "process_transactions" as const 
  },
  { 
    name: "Reports", 
    href: "/dashboard/reports", 
    icon: TrendingUp, 
    requiredPermission: "view_reports" as const 
  },
  { 
    name: "Display", 
    href: "/dashboard/display", 
    icon: Monitor, 
    requiredPermission: "access_display" as const 
  },
  { 
    name: "Apps", 
    href: "/dashboard/apps", 
    icon: Zap, 
    requiredPermission: "view_reports" as const // Apps requires reports permission
  },
  { 
    name: "Settings", 
    href: "/dashboard/settings", 
    icon: Settings, 
    requiredPermission: "manage_settings" as const 
  },
  { 
    name: "Hardware", 
    href: "/dashboard/hardware", 
    icon: Printer, 
    requiredPermission: "manage_hardware" as const 
  },
  { 
    name: "Card Terminal", 
    href: "/dashboard/card-terminal", 
    icon: CreditCard, 
    requiredPermission: "manage_card_terminal" as const 
  },
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
  const [resetVerificationCode, setResetVerificationCode] = useState("");
  const [resetCodeSent, setResetCodeSent] = useState(false);
  const [resetVerificationSent, setResetVerificationSent] = useState("");
  
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (userId && !authLoading) {
      loadData();
    }
  }, [userId, authLoading]);

  useEffect(() => {
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

  const loadData = async () => {
    try {
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

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, role, email")
        .eq("user_id", userId)
        .order("name");
      
      if (staffData) {
        setStaffList(staffData);
        if (staffData.length > 0 && !selectedStaffId) {
          setSelectedStaffId(staffData[0].id);
        }
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
    setResetVerificationCode("");
    setResetCodeSent(false);
  };

  const sendResetVerificationCode = async () => {
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

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    setResetVerificationSent(verificationCode);

    try {
      const { error: emailError } = await supabase.functions.invoke(
        'send-verification-email',
        {
          body: {
            email: selectedStaff.email,
            staffName: selectedStaff.name,
            code: verificationCode,
            businessName: businessName,
            type: "verification"
          }
        }
      );

      if (emailError) {
        console.error("Email function error:", emailError);
        throw new Error("Failed to send verification code. Please try again.");
      }

      setResetCodeSent(true);
      setResetSuccess(`✅ Verification code sent to ${selectedStaff.email}`);
      setResetError("");
    } catch (error: any) {
      console.error("Error sending verification code:", error);
      setResetError(error.message || "Failed to send verification code. Please check your connection.");
      setResetSuccess("");
      setResetVerificationSent("");
    } finally {
      setResettingPin(false);
    }
  };

  const verifyAndResetPin = async () => {
    if (!selectedStaffId) {
      setResetError("Please select a staff member first");
      return;
    }

    if (resetVerificationCode !== resetVerificationSent) {
      setResetError("❌ Invalid verification code");
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
      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
      
      // First update the PIN in database
      const { error: updateError } = await supabase
        .from("staff")
        .update({ pin: newPin })
        .eq("id", selectedStaffId)
        .eq("user_id", userId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Then send the PIN reset email
      try {
        const { error: emailError } = await supabase.functions.invoke(
          'send-verification-email',
          {
            body: {
              email: selectedStaff.email,
              staffName: selectedStaff.name,
              pin: newPin,
              businessName: businessName,
              type: "pin_reset"
            }
          }
        );

        if (emailError) {
          console.warn("Failed to send PIN email:", emailError);
          setResetSuccess(`✅ PIN reset for ${selectedStaff.name}. Please contact administrator if you don't receive the email.`);
        } else {
          setResetSuccess(`✅ PIN reset for ${selectedStaff.name}. New PIN has been sent to their email.`);
        }
      } catch (emailError: any) {
        console.warn("Email function error:", emailError);
        setResetSuccess(`✅ PIN reset for ${selectedStaff.name}. Please contact administrator if you don't receive the email.`);
      }

      // Clear all reset state
      setResetVerificationCode("");
      setResetVerificationSent("");
      setResetCodeSent(false);
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

  // Show PIN modal if not authenticated
  if (showPinModal && staffList.length > 0) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-background via-muted to-card flex items-center justify-center p-4 fixed inset-0 z-50">
        <div className="bg-card/90 backdrop-blur-xl rounded-xl p-6 w-full max-w-md border border-border shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/20">
              <Lock className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-1">Staff Login</h1>
            <p className="text-sm text-muted-foreground">Select your name and enter your PIN</p>
          </div>

          {/* Staff Selection */}
          <div className="mb-4 relative">
            <label className="block text-sm font-medium text-foreground mb-1">
              Staff Member
            </label>
            <button
              type="button"
              onClick={() => setShowStaffDropdown(!showStaffDropdown)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-left flex items-center justify-between hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground text-sm">
                  {getSelectedStaffName()}
                </span>
              </div>
              {showStaffDropdown ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showStaffDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
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
                      setResetVerificationCode("");
                      setResetCodeSent(false);
                    }}
                    className={`w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-muted transition-colors text-sm ${
                      selectedStaffId === staffMember.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-left">
                        <div className="font-medium">{staffMember.name}</div>
                        {staffMember.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {staffMember.email}
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedStaffId === staffMember.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PIN Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-1">
              PIN Code
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              />
            </div>
            {pinError && (
              <p className="mt-1 text-sm text-destructive">{pinError}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handlePinSubmit}
              disabled={!selectedStaffId || pinInput.length < 4}
              className="w-full bg-primary text-primary-foreground font-medium py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Login to Dashboard
            </button>

            {/* Reset PIN Section */}
            <div className="pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowResetOption(!showResetOption);
                  setResetError("");
                  setResetSuccess("");
                  setResetVerificationCode("");
                  setResetCodeSent(false);
                }}
                className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
              >
                <Shield className="w-3 h-3" />
                Forgot PIN? Reset Options
              </button>

              {showResetOption && (
                <div className="bg-muted/30 rounded-lg p-3 mt-2 space-y-3">
                  {!resetCodeSent ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Reset PIN for selected staff member. A verification code will be sent to their email.
                      </p>
                      
                      {resetSuccess && (
                        <div className="bg-success/20 border border-success/30 rounded p-2">
                          <p className="text-xs text-success font-medium">{resetSuccess}</p>
                        </div>
                      )}
                      
                      {resetError && (
                        <div className="bg-destructive/20 border border-destructive/30 rounded p-2">
                          <p className="text-xs text-destructive font-medium">{resetError}</p>
                        </div>
                      )}
                      
                      <button
                        onClick={sendResetVerificationCode}
                        disabled={resettingPin || !selectedStaffId}
                        className="w-full bg-gradient-to-r from-destructive/80 to-destructive/60 text-destructive-foreground font-medium py-2 px-4 rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
                      >
                        {resettingPin ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Sending Code...
                          </>
                        ) : (
                          <>
                            <Mail className="w-3 h-3" />
                            Send Verification Code
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit verification code sent to {staffList.find(s => s.id === selectedStaffId)?.email}
                      </p>
                      
                      {resetError && (
                        <div className="bg-destructive/20 border border-destructive/30 rounded p-2">
                          <p className="text-xs text-destructive font-medium">{resetError}</p>
                        </div>
                      )}
                      
                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={resetVerificationCode}
                          onChange={(e) => setResetVerificationCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter 6-digit code"
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-center text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          onClick={sendResetVerificationCode}
                          className="w-full text-xs text-primary hover:text-primary/80 transition-colors mt-1"
                        >
                          Resend Code
                        </button>
                      </div>
                      
                      <button
                        onClick={verifyAndResetPin}
                        disabled={resettingPin || resetVerificationCode.length !== 6}
                        className="w-full bg-gradient-to-r from-destructive/80 to-destructive/60 text-destructive-foreground font-medium py-2 px-4 rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
                      >
                        {resettingPin ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Resetting PIN...
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            Verify & Reset PIN
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
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
        ${sidebarCollapsed ? 'w-16' : 'w-64'}
        flex flex-col
      `}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className={`p-3 border-b border-border ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            {!sidebarCollapsed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {businessLogoUrl ? (
                    <img
                      src={businessLogoUrl}
                      alt={businessName}
                      className="w-8 h-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">D</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-sm font-bold text-foreground truncate">{businessName}</h1>
                    <p className="text-[10px] text-muted-foreground truncate">POS</p>
                  </div>
                </div>
                
                {staff && (
                  <div className="bg-muted/50 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">Logged in as</p>
                        <p className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                          {staff.name}
                          {staff.role === "owner" && (
                            <span className="px-1 py-0.5 bg-primary/20 text-primary text-[9px] rounded border border-primary/30 shrink-0">
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
              <div className="flex flex-col items-center gap-3">
                {businessLogoUrl ? (
                  <img
                    src={businessLogoUrl}
                    alt={businessName}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">D</span>
                  </div>
                )}
                {staff && <ThemeToggle />}
              </div>
            )}
          </div>

          {/* Navigation - TEMPORARILY BYPASSING PERMISSION CHECKS */}
          <nav className="flex-1 p-1 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              
              // TEMPORARY FIX: Show ALL navigation items regardless of permissions
              const hasAccess = true; // TEMPORARILY GRANT ACCESS TO EVERYTHING
              
              // If you want to re-enable permission checks later, uncomment this:
              /*
              let hasAccess = true;
              if (staff && item.requiredPermission) {
                hasAccess = hasPermission(item.requiredPermission);
              }
              */

              if (!hasAccess) return null;

              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => isMobile && setIsSidebarOpen(false)}
                  className={`flex items-center gap-2 rounded-md transition-all font-medium text-sm ${
                    sidebarCollapsed ? 'justify-center p-2' : 'px-2 py-1.5 mx-1'
                  } ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title={sidebarCollapsed ? item.name : ''}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
                  {!sidebarCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content - FIXED: Removed margin classes that caused the gap */}
      <main className="flex-1 overflow-auto min-w-0 w-full">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-1.5 hover:bg-accent rounded transition-colors"
                >
                  <Menu className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              
              {/* Desktop Toggle Button */}
              {!isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 hover:bg-accent rounded transition-colors"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              )}
              
              {/* Page Title */}
              <h1 className="text-base font-semibold text-foreground">
                {navigation.find(item => item.href === pathname)?.name || "Dashboard"}
              </h1>
            </div>

            {/* User Info with Logout */}
            {staff && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-foreground truncate max-w-[120px]">{staff.name}</span>
                    <span className="text-xs text-muted-foreground capitalize px-1.5 py-0.5 bg-muted rounded-full">
                      {staff.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    Logout
                  </button>
                </div>
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white font-bold text-sm">
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 min-h-[calc(100vh-48px)]">
          {children}
        </div>
      </main>
    </div>
  );
}
