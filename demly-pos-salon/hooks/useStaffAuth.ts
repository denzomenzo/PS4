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

// Helper function to ensure all permission fields exist with proper defaults
const ensureCompletePermissions = (permissions: any, role: "staff" | "manager" | "owner"): Staff["permissions"] => {
  const basePermissions: Staff["permissions"] = {
    // Core POS Operations
    access_pos: false,
    process_transactions: false,
    manage_customers: false,
    access_display: false,
    
    // Management Operations
    manage_inventory: false,
    view_reports: false,
    manage_hardware: false,
    manage_card_terminal: false,
    
    // Administrative Operations
    manage_settings: false,
    manage_staff: false,
  };

  // If we have existing permissions, merge them
  if (permissions && typeof permissions === 'object') {
    Object.keys(basePermissions).forEach((key) => {
      const permKey = key as keyof Staff["permissions"];
      if (permissions[permKey] !== undefined) {
        basePermissions[permKey] = Boolean(permissions[permKey]);
      }
    });
  }

  // Apply role-based presets
  if (role === "staff") {
    // Staff: Core POS only
    basePermissions.access_pos = true;
    basePermissions.process_transactions = true;
    basePermissions.manage_customers = true;
    basePermissions.access_display = true;
    // All others remain false
  } else if (role === "manager") {
    // Manager: Core POS + Management
    basePermissions.access_pos = true;
    basePermissions.process_transactions = true;
    basePermissions.manage_customers = true;
    basePermissions.access_display = true;
    basePermissions.manage_inventory = true;
    basePermissions.view_reports = true;
    basePermissions.manage_hardware = true;
    basePermissions.manage_card_terminal = true;
    // manage_settings and manage_staff remain false unless explicitly set
  } else if (role === "owner") {
    // Owner: Everything true
    Object.keys(basePermissions).forEach((key) => {
      const permKey = key as keyof Staff["permissions"];
      basePermissions[permKey] = true;
    });
  }

  return basePermissions;
};

// Debug logging utility
const debug = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[StaffAuth] ${message}`, data || '');
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[StaffAuth] ${message}`, error || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[StaffAuth] ${message}`, data || '');
  }
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
      debug.log("Using cached staff", { name: globalStaff.name, role: globalStaff.role });
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
          const staffData = data.staff;
          // Ensure permissions are complete
          staffData.permissions = ensureCompletePermissions(staffData.permissions, staffData.role);
          notifyListeners(staffData);
          debug.log("Loaded staff from storage", { name: staffData.name, role: staffData.role });
        } else {
          localStorage.removeItem("authenticated_staff");
          notifyListeners(null);
          debug.log("Session expired, logged out");
        }
      } else {
        notifyListeners(null);
        debug.log("No staff in storage");
      }
    } catch (error) {
      debug.error("Error loading staff auth:", error);
      notifyListeners(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (pin: string): Promise<{ success: boolean; staff?: Staff; error?: string }> => {
    debug.log("Attempting login with PIN");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        debug.error("No authenticated user");
        return { success: false, error: "Not authenticated" };
      }

      debug.log("Fetching staff with PIN", { userId: user.id });
      
      const { data: staffData, error } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", user.id)
        .eq("pin", pin)
        .single();

      if (error || !staffData) {
        debug.error("Invalid PIN or no staff found", error);
        return { success: false, error: "Invalid PIN" };
      }

      debug.log("Staff found in database", { 
        name: staffData.name, 
        role: staffData.role,
        hasPermissions: !!staffData.permissions
      });

      // Ensure we have a valid role
      const role: "staff" | "manager" | "owner" = 
        staffData.role === "owner" ? "owner" :
        staffData.role === "manager" ? "manager" : "staff";
      
      // Ensure complete permissions
      const permissions = ensureCompletePermissions(staffData.permissions, role);

      const staffMember: Staff = {
        id: staffData.id,
        name: staffData.name,
        email: staffData.email,
        pin: staffData.pin,
        role: role,
        permissions: permissions,
      };

      debug.log("Created staff member with permissions", {
        name: staffMember.name,
        role: staffMember.role,
        permissions: staffMember.permissions
      });

      // Store in localStorage with expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8); // 8 hour session

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem("authenticated_staff", JSON.stringify({
          staff: staffMember,
          expiresAt: expiresAt.toISOString(),
        }));
        debug.log("Saved staff to localStorage");
      }

      // Update global state
      notifyListeners(staffMember);

      // Log the login
      try {
        await logLogin(staffMember.id);
        debug.log("Logged login in audit");
      } catch (logError) {
        debug.warn("Failed to log login", logError);
      }

      return { success: true, staff: staffMember };
    } catch (error: any) {
      debug.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    if (staff) {
      try {
        await logLogout(staff.id);
        debug.log("Logged logout in audit");
      } catch (logError) {
        debug.warn("Failed to log logout", logError);
      }
    }
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem("authenticated_staff");
      debug.log("Removed staff from localStorage");
    }
    
    notifyListeners(null);
    debug.log("Logged out successfully");
  };

  const hasPermission = (permission: keyof Staff["permissions"]): boolean => {
    if (!staff) {
      debug.warn("hasPermission called with no staff");
      return false;
    }
    
    // Log the permission check
    debug.log(`Checking permission: ${permission}`, {
      staff: staff.name,
      role: staff.role,
      permissionValue: staff.permissions[permission]
    });
    
    // Owners have all permissions
    if (staff.role === "owner") {
      debug.log("Owner has all permissions - granted");
      return true;
    }
    
    const permissionValue = staff.permissions[permission];
    
    // For managers
    if (staff.role === "manager") {
      // Managers can't access admin operations unless explicitly granted
      if (permission === "manage_settings" || permission === "manage_staff") {
        const result = permissionValue === true;
        debug.log(`Manager checking admin permission "${permission}": ${result}`);
        return result;
      }
      // For other permissions, check the value
      const result = permissionValue !== false; // true or undefined
      debug.log(`Manager checking "${permission}": ${result}`);
      return result;
    }
    
    // For staff: permission must be explicitly true
    const result = permissionValue === true;
    debug.log(`Staff checking "${permission}": ${result}`);
    return result;
  };

  const refreshAuth = () => {
    debug.log("Refreshing auth");
    loadStaffFromStorage();
  };

  const isOwner = (): boolean => {
    const result = staff?.role === "owner";
    debug.log(`isOwner check: ${result}`);
    return result;
  };

  const isManager = (): boolean => {
    const result = staff?.role === "manager" || staff?.role === "owner";
    debug.log(`isManager check: ${result}`);
    return result;
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

// Export the ensureCompletePermissions function for use elsewhere
export { ensureCompletePermissions };
