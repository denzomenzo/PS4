// hooks/useStaffAuth.ts - Updated version
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logLogin, logLogout } from "@/lib/auditLogger";

export interface Staff {
  id: number;
  name: string;
  email: string | null;
  pin: string | null;
  role: "staff" | "manager" | "owner";
  permissions: {
    pos: boolean;
    transactions: boolean;
    customers: boolean;
    display: boolean;
    inventory: boolean;
    reports: boolean;
    settings: boolean;
    hardware: boolean;
    card_terminal: boolean;
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
      if (typeof localStorage === 'undefined') {
        setLoading(false);
        return;
      }

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

      // Ensure permissions object has all required fields with defaults
      const staffMember: Staff = {
        id: staffData.id,
        name: staffData.name,
        email: staffData.email,
        pin: staffData.pin,
        role: staffData.role || "staff",
        permissions: {
          pos: staffData.permissions?.pos !== false,
          transactions: staffData.permissions?.transactions !== false,
          customers: staffData.permissions?.customers !== false,
          display: staffData.permissions?.display !== false,
          inventory: staffData.permissions?.inventory || false,
          reports: staffData.permissions?.reports || false,
          settings: staffData.permissions?.settings || false,
          hardware: staffData.permissions?.hardware || false,
          card_terminal: staffData.permissions?.card_terminal || false,
        },
      };

      // Store in localStorage with expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8); // 8 hour session

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem("authenticated_staff", JSON.stringify({
          staff: staffMember,
          expiresAt: expiresAt.toISOString(),
        }));
      }

      // Update global state
      notifyListeners(staffMember);

      // Log the login
      await logLogin(staffMember.id);

      return { success: true, staff: staffMember };
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    if (staff) {
      await logLogout(staff.id);
    }
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem("authenticated_staff");
    }
    
    notifyListeners(null);
  };

  const hasPermission = (permission: keyof Staff["permissions"]): boolean => {
    if (!staff) return false;
    
    // Owners have all permissions by default
    if (staff.role === "owner") return true;
    
    // Managers have most permissions, but check specific ones
    if (staff.role === "manager") {
      // Managers can't access settings unless explicitly granted
      if (permission === "settings") {
        return staff.permissions.settings || false;
      }
      // For other permissions, use their individual setting
      return staff.permissions[permission] !== false;
    }
    
    // Staff members: check specific permission
    return staff.permissions[permission] || false;
  };

  const refreshAuth = () => {
    loadStaffFromStorage();
  };

  const isOwner = (): boolean => {
    return staff?.role === "owner";
  };

  const isManager = (): boolean => {
    return staff?.role === "manager" || staff?.role === "owner";
  };

  return { 
    staff, 
    loading, 
    login, 
    logout, 
    hasPermission,
    refreshAuth,
    isOwner,
    isManager,
  };
}

// Export a utility function to get current staff without hook
export function getCurrentStaff(): Staff | null {
  return globalStaff;
}

// Export a utility function to check if user is authenticated
export function isAuthenticated(): boolean {
  return globalStaff !== null;
}
