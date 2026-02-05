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
    // Core POS Operations
    access_pos: boolean;
    process_transactions: boolean;
    manage_customers: boolean;
    access_display: boolean;
    
    // Management Operations
    manage_inventory: boolean;
    view_reports: boolean;
    manage_hardware: boolean;
    manage_card_terminal: boolean;
    
    // Administrative Operations
    manage_settings: boolean;
    manage_staff: boolean;
  };
}

// Create a singleton state that persists across component mounts
let globalStaff: Staff | null = null;
let listeners: Set<(staff: Staff | null) => void> = new Set();

const notifyListeners = (staff: Staff | null) => {
  globalStaff = staff;
  listeners.forEach(listener => listener(staff));
};

// Helper to convert old permission names to new ones
const normalizePermissions = (dbPermissions: any, role: "staff" | "manager" | "owner"): Staff["permissions"] => {
  // Default permissions based on role
  const defaultPermissions: Staff["permissions"] = {
    access_pos: true,
    process_transactions: true,
    manage_customers: true,
    access_display: true,
    manage_inventory: role === "staff" ? false : true,
    view_reports: role === "staff" ? false : true,
    manage_hardware: role === "staff" ? false : true,
    manage_card_terminal: role === "staff" ? false : true,
    manage_settings: role === "owner",
    manage_staff: role === "owner",
  };

  // If no permissions in DB, return defaults
  if (!dbPermissions || typeof dbPermissions !== 'object') {
    return defaultPermissions;
  }

  // Map to store both old and new permission values
  const permissionValues: any = { ...defaultPermissions };

  // Mapping from old names to new names
  const oldToNewMap = {
    'pos': 'access_pos',
    'transactions': 'process_transactions',
    'customers': 'manage_customers',
    'display': 'access_display',
    'inventory': 'manage_inventory',
    'reports': 'view_reports',
    'hardware': 'manage_hardware',
    'card_terminal': 'manage_card_terminal',
    'settings': 'manage_settings',
  };

  // Copy values from old names
  Object.entries(oldToNewMap).forEach(([oldName, newName]) => {
    if (dbPermissions[oldName] !== undefined) {
      permissionValues[newName] = Boolean(dbPermissions[oldName]);
    }
  });

  // Also check for new names directly
  Object.keys(defaultPermissions).forEach(key => {
    if (dbPermissions[key] !== undefined) {
      permissionValues[key] = Boolean(dbPermissions[key]);
    }
  });

  // Ensure role-based constraints
  if (role === "staff") {
    // Staff can't have admin permissions
    permissionValues.manage_settings = false;
    permissionValues.manage_staff = false;
    
    // Staff core permissions are always true
    permissionValues.access_pos = true;
    permissionValues.process_transactions = true;
    permissionValues.manage_customers = true;
    permissionValues.access_display = true;
  } else if (role === "manager") {
    // Managers can have admin permissions only if explicitly granted
    permissionValues.manage_settings = dbPermissions.manage_settings === true || dbPermissions.settings === true;
    permissionValues.manage_staff = dbPermissions.manage_staff === true;
    
    // Manager core permissions are always true
    permissionValues.access_pos = true;
    permissionValues.process_transactions = true;
    permissionValues.manage_customers = true;
    permissionValues.access_display = true;
  }

  return permissionValues;
};

export function useStaffAuth() {
  const [staff, setStaff] = useState<Staff | null>(globalStaff);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listeners.add(setStaff);
    
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

      const role: "staff" | "manager" | "owner" = staffData.role || "staff";
      const permissions = normalizePermissions(staffData.permissions, role);

      const staffMember: Staff = {
        id: staffData.id,
        name: staffData.name,
        email: staffData.email,
        pin: staffData.pin,
        role: role,
        permissions: permissions,
      };

      // Store in localStorage with expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem("authenticated_staff", JSON.stringify({
          staff: staffMember,
          expiresAt: expiresAt.toISOString(),
        }));
      }

      notifyListeners(staffMember);
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
    
    // Owners have all permissions
    if (staff.role === "owner") return true;
    
    const hasPerm = staff.permissions[permission];
    
    // For managers
    if (staff.role === "manager") {
      // Managers can't access admin operations unless explicitly granted
      if (permission === "manage_settings" || permission === "manage_staff") {
        return hasPerm === true;
      }
      return hasPerm !== false;
    }
    
    // For staff: permission must be explicitly true
    return hasPerm === true;
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

export function getCurrentStaff(): Staff | null {
  return globalStaff;
}

export function isAuthenticated(): boolean {
  return globalStaff !== null;
}
