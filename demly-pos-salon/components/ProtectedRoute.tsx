"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { Loader2, Lock } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: "pos" | "inventory" | "reports" | "settings";
  requireOwner?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredPermission,
  requireOwner = false 
}: ProtectedRouteProps) {
  const router = useRouter();
  const { staff, loading, hasPermission } = useStaffAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!staff) {
        router.push("/dashboard"); // Redirect to POS login
      } else if (requireOwner && staff.role !== "owner") {
        setChecking(false); // Show access denied
      } else if (requiredPermission && !hasPermission(requiredPermission)) {
        setChecking(false); // Show access denied
      } else {
        setChecking(false); // Allow access
      }
    }
  }, [staff, loading, requiredPermission, requireOwner]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return null; // Will redirect
  }

  // Check permissions
  const hasAccess = requireOwner 
    ? staff.role === "owner"
    : requiredPermission 
      ? hasPermission(requiredPermission)
      : true;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-8">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-12 max-w-md w-full border border-red-500/30 shadow-2xl">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-4">Access Denied</h1>
            <p className="text-slate-400 mb-6">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => router.back()}
              className="bg-slate-700 hover:bg-slate-600 px-8 py-4 rounded-xl font-bold transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}