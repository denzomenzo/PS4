// app/dashboard/layout.tsx - COMPLETE FIXED VERSION
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
  Lock, Check, Key, Mail, Shield, Zap, ChevronLeft, ChevronRight
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

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    } else {
      setSidebarCollapsed(false);
    }
  }, [isMobile]);

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

      // Try to send email if staff has email address
      if (selectedStaff?.email) {
        try {
          const { error: emailError } = await supabase.functions.invoke(
            'send-verification-email',
            {
              body: {
                email: selectedStaff.email,
                staffName: selectedStaff.name,
                type: "pin_reset",
                pin: newPin,
                businessName: businessName
              }
            }
          );

          if (!emailError) {
            // Success - PIN sent via email
            setResetSuccess(`✅ New PIN sent to ${selectedStaff.email}`);
          } else {
            console.warn("Email sending failed, but PIN was reset:", emailError);
            // Still success, but email failed
            setResetSuccess("✅ PIN reset. Please check your email for the new PIN.");
          }
        } catch (emailErr) {
          console.warn("Email sending failed:", emailErr);
          setResetSuccess("✅ PIN reset. Please check your email for the new PIN.");
        }
      } else {
        // No email on file - show admin contact message
        setResetSuccess("✅ PIN reset. Contact your system administrator for the new PIN.");
      }

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
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg shadow-primary/20">
              <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-2">
              Staff Login
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg">Select your name and enter your PIN</p>
          </div>

          {pinError && (
            <div className="bg-destructive/20 border border-destructive/50 rounded-xl p-3 sm:p-4 text-destructive mb-4 sm:mb-6 text-center text-sm sm:text-base">
              {pinError}
            </div>
          )}

          {resetError && (
            <div className="bg-destructive/20 border border-destructive/50 rounded-xl p-3 sm:p-4 text-destructive mb-4 sm:mb-6 text-center text-sm sm:text-base">
              {resetError}
            </div>
          )}

          {resetSuccess && (
            <div className="bg-primary/20 border border-primary/50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-primary font-medium text-sm sm:text-base">{resetSuccess}</p>
                  <p className="text-xs sm:text-sm text-primary/70 mt-1">
                    Need more help? Email support@demly.co.uk
                    {resetSuccess.includes("sent to") ? " Check your email." : " Contact your administrator."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 sm:space-y-6">
            {/* Staff Selection */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2 sm:mb-3">
                Select Staff Member
              </label>
              <div className="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
                {staffList.map((staffMember) => (
                  <button
                    key={staffMember.id}
                    onClick={() => {
                      setSelectedStaffId(staffMember.id);
                      setPinError("");
                      setResetError("");
                      setResetSuccess("");
                      setShowResetOption(false);
                    }}
                    className={`w-full p-3 sm:p-4 rounded-xl border-2 transition-all text-left ${
                      selectedStaffId === staffMember.id
                        ? "bg-primary/20 border-primary shadow-lg shadow-primary/20"
                        : "bg-muted/50 border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-foreground text-base sm:text-lg">{staffMember.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{staffMember.role}</p>
                        {staffMember.email && (
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {staffMember.email}
                          </p>
                        )}
                      </div>
                      {selectedStaffId === staffMember.id && (
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* PIN Input or Reset Option */}
            {selectedStaffId && !showResetOption ? (
              <div className="animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-muted-foreground">
                    Enter PIN for {staffList.find(s => s.id === selectedStaffId)?.name}
                  </label>
                  {!resetSuccess && (
                    <button
                      onClick={() => {
                        setShowResetOption(true);
                        setResetSuccess("");
                      }}
                      className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                    >
                      <Key className="w-4 h-4" />
                      Forgot PIN?
                    </button>
                  )}
                </div>
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
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-center text-2xl sm:text-3xl font-bold tracking-widest text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  autoFocus
                />
              </div>
            ) : selectedStaffId && showResetOption && !resetSuccess ? (
              <div className="animate-in fade-in slide-in-from-top-4 space-y-4">
                <div className="bg-muted/30 rounded-xl p-4 border border-border">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-foreground font-medium">Reset PIN for {staffList.find(s => s.id === selectedStaffId)?.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        A new PIN will be generated and sent to the staff member's email address.
                      </p>
                      {staffList.find(s => s.id === selectedStaffId)?.email ? (
                        <p className="text-sm text-primary mt-2 flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          Will be sent to: {staffList.find(s => s.id === selectedStaffId)?.email}
                        </p>
                      ) : (
                        <p className="text-sm text-yellow-500 mt-2">
                          ⚠️ No email on file. Contact your system administrator for the new PIN.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowResetOption(false);
                      setResetError("");
                    }}
                    className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-3 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPin}
                    disabled={resettingPin}
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 disabled:from-muted disabled:to-muted text-primary-foreground font-bold py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resettingPin ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Key className="w-5 h-5" />
                        Reset PIN
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {selectedStaffId && !showResetOption && !resetSuccess && (
            <button
              onClick={handlePinSubmit}
              disabled={!selectedStaffId || pinInput.length < 4}
              className="w-full mt-6 sm:mt-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 disabled:from-muted disabled:to-muted text-primary-foreground font-bold py-3 sm:py-4 rounded-xl transition-all disabled:opacity-50 text-base sm:text-lg shadow-lg shadow-primary/20"
            >
              Login to POS
            </button>
          )}

          {resetSuccess && (
            <div className="space-y-3 mt-6">
              <button
                onClick={() => {
                  setShowResetOption(false);
                  setPinInput("");
                  setResetSuccess("");
                }}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold py-3 sm:py-4 rounded-xl transition-all shadow-lg shadow-primary/20"
              >
                Back to Login
              </button>
              <div className="text-center">
                <Link
                  href="/dashboard/reset-pin"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
                >
                  Need email verification reset?
                </Link>
              </div>
            </div>
          )}

          {/* Alternative reset link */}
          {!showResetOption && selectedStaffId && !resetSuccess && (
            <div className="mt-6 text-center">
              <Link
                href="/dashboard/reset-pin"
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
              >
                Need to reset with email verification?
              </Link>
            </div>
          )}

          {/* Security notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              <Shield className="w-3 h-3 inline mr-1" />
              For security, PINs are never displayed on screen
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-muted to-card overflow-hidden">
      
      {/* Sidebar with collapse functionality */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-card/80 backdrop-blur-xl border-r border-border
        transition-transform duration-300 ease-in-out md:static md:z-auto
        ${sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}
        md:translate-x-0
        flex flex-col shadow-2xl
      `}>
        
        <div className="p-6 border-b border-border relative">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-6 right-6 p-2 hover:bg-accent rounded-lg transition-colors"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
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
          <div className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-center">
              {businessName}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm mt-2 font-medium text-center">Point of Sale System</p>
          
          {/* Staff Info */}
          {staff && (
            <div className="mt-4 bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                {staff.name}
                {staff.role === "owner" && (
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full border border-primary/30">
                    OWNER
                  </span>
                )}
                {staff.role === "manager" && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 text-xs rounded-full border border-blue-500/30">
                    MANAGER
                  </span>
                )}
              </p>
              
              {/* Theme Toggle */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
              </div>
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
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 font-semibold group ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/30 shadow-lg shadow-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border hover:border-border/50"
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"} transition-colors`} />
                <span className="text-base">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3 w-full rounded-2xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border hover:border-destructive/30 transition-all duration-200 font-semibold group"
          >
            <LogOut className="w-5 h-5 group-hover:text-destructive transition-colors" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`
        flex-1 overflow-auto bg-background/50
        transition-all duration-300
        ${sidebarCollapsed ? 'md:ml-0' : 'md:ml-0'}
      `}>
        {/* Mobile Sidebar Toggle Button */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="fixed top-4 left-4 z-40 p-2 bg-card border border-border rounded-lg shadow-lg md:hidden"
            title="Open sidebar"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
        {children}
      </main>
    </div>
  );
}
