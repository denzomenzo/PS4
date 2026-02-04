// components/ProtectedRoute.tsx - Updated version
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { Loader2, Lock, Home } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: 
    "pos" | "transactions" | "customers" | "display" | 
    "inventory" | "reports" | "settings" | "hardware" | "card_terminal";
  requireOwner?: boolean;
  requireManager?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredPermission,
  requireOwner = false,
  requireManager = false
}: ProtectedRouteProps) {
  const router = useRouter();
  const { staff, loading, hasPermission, isOwner, isManager } = useStaffAuth();
  const [checking, setChecking] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!loading && staff !== undefined) {
      let hasAccess = false;
      
      if (!staff) {
        // No staff logged in - redirect to dashboard (which will show PIN modal)
        router.push("/dashboard");
        return;
      }

      // Check role requirements
      if (requireOwner) {
        hasAccess = isOwner();
      } else if (requireManager) {
        hasAccess = isManager();
      }
      // Check permission requirement
      else if (requiredPermission) {
        hasAccess = hasPermission(requiredPermission);
      } else {
        // No specific requirements - just need to be logged in
        hasAccess = true;
      }

      if (!hasAccess) {
        setAccessDenied(true);
      }
      
      setChecking(false);
    }
  }, [staff, loading, requiredPermission, requireOwner, requireManager, router, hasPermission, isOwner, isManager]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    const getDeniedMessage = () => {
      if (requireOwner) {
        return "This page is only accessible by business owners.";
      }
      if (requireManager) {
        return "This page requires manager or owner access.";
      }
      if (requiredPermission) {
        const permissionNames = {
          pos: "Point of Sale",
          transactions: "Transactions",
          customers: "Customers",
          display: "Display",
          inventory: "Inventory",
          reports: "Reports",
          settings: "Settings",
          hardware: "Hardware",
          card_terminal: "Card Terminal"
        };
        return `You need "${permissionNames[requiredPermission]}" permission to access this page.`;
      }
      return "You don't have permission to access this page.";
    };

    const getCurrentStaffRole = () => {
      if (!staff) return "Not logged in";
      return staff.role.charAt(0).toUpperCase() + staff.role.slice(1);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card flex items-center justify-center p-8">
        <div className="bg-card/80 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full border border-destructive/30 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              {getDeniedMessage()}
            </p>
            
            {staff && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6 border border-border">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white font-bold">
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground">{staff.name}</p>
                    <p className="text-sm text-muted-foreground">Role: {getCurrentStaffRole()}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                <Home className="w-4 h-4" />
                Go to POS Dashboard
              </button>
              
              {staff?.role === "staff" && (
                <p className="text-xs text-muted-foreground">
                  Contact a manager or owner to request access
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If we get here, user has access
  return <>{children}</>;
}
