// hooks/useStaffAuth.ts - UPDATED VERSION
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logAuditAction } from "@/lib/auditLogger";

interface Staff {
  id: number;
  name: string;
  email: string | null;
  pin: string | null;
  role: "staff" | "manager" | "owner";
  permissions: {
    pos: boolean;
    inventory: boolean;
    reports: boolean;
    settings: boolean;
  };
}

// Create a singleton state that persists across component mounts
let globalStaff: Staff | null = null;
let listeners: Set<(staff: Staff | null) => void> = new Set();

const notifyListeners = (staff: Staff | null) => {
  globalStaff = staff;
  listeners.forEach(listener => listener(staff));
};

export function useStaffAuth() {
  const [staff, setStaff] = useState<Staff | null>(globalStaff);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to global state changes
    listeners.add(setStaff);
    
    // Load on mount if not already loaded
    if (!globalStaff) {
      loadStaffFromStorage();
    } else {
      setLoading(false);
    }

    return () => {
      listeners.delete(setStaff);
    };
  }, []);

  const loadStaffFromStorage = () => {
    try {
      const stored = localStorage.getItem("authenticated_staff");
      if (stored) {
        const data = JSON.parse(stored);
        // Check if session is still valid (within 8 hours)
        if (data.expiresAt && new Date(data.expiresAt) > new Date()) {
          notifyListeners(data.staff);
        } else {
          localStorage.removeItem("authenticated_staff");
          notifyListeners(null);
        }
      } else {
        notifyListeners(null);
      }
    } catch (error) {
      console.error("Error loading staff auth:", error);
      notifyListeners(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (pin: string): Promise<{ success: boolean; staff?: Staff; error?: string }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: "Not authenticated" };

      const { data: staffData, error } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", user.id)
        .eq("pin", pin)
        .single();

      if (error || !staffData) {
        return { success: false, error: "Invalid PIN" };
      }

      const staffMember: Staff = {
        id: staffData.id,
        name: staffData.name,
        email: staffData.email,
        pin: staffData.pin,
        role: staffData.role || "staff",
        permissions: staffData.permissions || {
          pos: true,
          inventory: false,
          reports: false,
          settings: false,
        },
      };

      // Store in localStorage with expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8); // 8 hour session

      localStorage.setItem("authenticated_staff", JSON.stringify({
        staff: staffMember,
        expiresAt: expiresAt.toISOString(),
      }));

      // Update global state
      notifyListeners(staffMember);

      // Log the login
      await logAuditAction({
        action: "STAFF_LOGIN",
        staffId: staffMember.id,
      });

      return { success: true, staff: staffMember };
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    if (staff) {
      await logAuditAction({
        action: "STAFF_LOGOUT",
        staffId: staff.id,
      });
    }
    localStorage.removeItem("authenticated_staff");
    notifyListeners(null);
  };

  const hasPermission = (permission: keyof Staff["permissions"]): boolean => {
    if (!staff) return false;
    if (staff.role === "owner") return true; // Owner has all permissions
    if (staff.role === "manager" && permission !== "settings") return true;
    return staff.permissions[permission] === true;
  };

  const refreshAuth = () => {
    loadStaffFromStorage();
  };

  return { 
    staff, 
    loading, 
    login, 
    logout, 
    hasPermission,
    refreshAuth 
  };
}