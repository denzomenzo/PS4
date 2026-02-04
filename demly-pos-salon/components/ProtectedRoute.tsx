import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffAuth, Staff } from "@/hooks/useStaffAuth";
import { Loader2 } from "lucide-react";

// Define the permission keys from the Staff interface
type StaffPermissionKey = keyof Staff["permissions"];

// Map old permission names to new functional permission names
const permissionMap: Record<string, keyof Staff["permissions"]> = {
  // Map page-based permissions to functional permissions
  pos: "access_pos",
  transactions: "process_transactions", 
  customers: "manage_customers",
  display: "access_display",
  inventory: "manage_inventory",
  reports: "view_reports",
  hardware: "manage_hardware",
  card_terminal: "manage_card_terminal",
  settings: "manage_settings",

  // Note: manage_staff doesn't have a direct page mapping
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: keyof typeof permissionMap;
  ownerOnly?: boolean;
  managerOnly?: boolean;
  staffOnly?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredPermission,
  ownerOnly = false,
  managerOnly = false,
  staffOnly = false
}: ProtectedRouteProps) {
  const router = useRouter();
  const { staff, loading, hasPermission, isOwner, isManager } = useStaffAuth();
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    if (!loading) {
      let hasAccess = false;

      // If no staff is logged in, deny access
      if (!staff) {
        hasAccess = false;
      }
      // Check role-specific requirements
      else if (ownerOnly) {
        hasAccess = isOwner();
      }
      else if (managerOnly) {
        hasAccess = isManager();
      }
      else if (staffOnly) {
        // Staff only means any authenticated staff (not owner/manager specific)
        hasAccess = true;
      }
      // Check permission requirement
      else if (requiredPermission) {
        // Map old permission name to new functional permission
        const functionalPermission = permissionMap[requiredPermission];
        if (functionalPermission) {
          hasAccess = hasPermission(functionalPermission);
        } else {
          // If no mapping found, deny access
          console.warn(`No permission mapping found for: ${requiredPermission}`);
          hasAccess = false;
        }
      } else {
        // No specific requirements - just need to be logged in
        hasAccess = true;
      }

      setAccessGranted(hasAccess);

      // If access denied and user is logged in, redirect to dashboard
      if (!hasAccess && staff) {
        router.push("/dashboard");
      }
    }
  }, [staff, loading, requiredPermission, ownerOnly, managerOnly, staffOnly, router, hasPermission, isOwner, isManager]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-card">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground text-xl font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    // This will be caught by the PIN modal in dashboard layout
    return null;
  }

  if (!accessGranted) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-8">
        <div className="bg-card/50 backdrop-blur-xl rounded-xl p-8 max-w-md border border-border">
          <div className="text-center">
            <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.928-.833-2.698 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

