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
    // Core POS Operations
    access_pos: boolean;          // Access Point of Sale system
    process_transactions: boolean; // Process sales & returns
    manage_customers: boolean;    // Manage customer database
    access_display: boolean;      // Access customer display
    
    // Management Operations
    manage_inventory: boolean;    // Manage products & stock
    view_reports: boolean;        // View analytics & reports
    manage_hardware: boolean;     // Manage printers & hardware
    manage_card_terminal: boolean; // Manage card payments
    
    // Administrative Operations
    manage_settings: boolean;     // Access business settings
    manage_staff: boolean;        // Manage staff members
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

      // Get base permissions from database
      const dbPermissions = staffData.permissions || {};
      
      // Apply role-based permission presets
      let finalPermissions: Staff["permissions"];
      
      if (staffData.role === "staff") {
        // Staff presets: Core POS access only
        finalPermissions = {
          // Core POS Operations - Always enabled for staff
          access_pos: true,
          process_transactions: true,
          manage_customers: true,
          access_display: true,
          
          // Management Operations - Disabled for staff
          manage_inventory: false,
          view_reports: false,
          manage_hardware: false,
          manage_card_terminal: false,
          
          // Administrative Operations - Never for staff
          manage_settings: false,
          manage_staff: false,
        };
      } else if (staffData.role === "manager") {
        // Manager presets: Core POS + Management access
        finalPermissions = {
          // Core POS Operations - Always enabled
          access_pos: true,
          process_transactions: true,
          manage_customers: true,
          access_display: true,
          
          // Management Operations - Enabled by default for managers
          manage_inventory: true,
          view_reports: true,
          manage_hardware: true,
          manage_card_terminal: true,
          
          // Administrative Operations - Use database values or default to false
          manage_settings: dbPermissions.manage_settings || false,
          manage_staff: dbPermissions.manage_staff || false,
        };
      } else if (staffData.role === "owner") {
        // Owner presets: Everything enabled
        finalPermissions = {
          access_pos: true,
          process_transactions: true,
          manage_customers: true,
          access_display: true,
          manage_inventory: true,
          view_reports: true,
          manage_hardware: true,
          manage_card_terminal: true,
          manage_settings: true,
          manage_staff: true,
        };
      } else {
        // Fallback: use database values with defaults
        finalPermissions = {
          access_pos: dbPermissions.access_pos !== false,
          process_transactions: dbPermissions.process_transactions !== false,
          manage_customers: dbPermissions.manage_customers !== false,
          access_display: dbPermissions.access_display !== false,
          manage_inventory: dbPermissions.manage_inventory || false,
          view_reports: dbPermissions.view_reports || false,
          manage_hardware: dbPermissions.manage_hardware || false,
          manage_card_terminal: dbPermissions.manage_card_terminal || false,
          manage_settings: dbPermissions.manage_settings || false,
          manage_staff: dbPermissions.manage_staff || false,
        };
      }

      const staffMember: Staff = {
        id: staffData.id,
        name: staffData.name,
        email: staffData.email,
        pin: staffData.pin,
        role: staffData.role || "staff",
        permissions: finalPermissions,
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
    
    // Get the actual permission value
    const hasPerm = staff.permissions[permission];
    
    // For managers, check special cases
    if (staff.role === "manager") {
      // Managers can't access settings unless explicitly granted
      if (permission === "manage_settings" || permission === "manage_staff") {
        return staff.permissions[permission] || false;
      }
      return hasPerm;
    }
    
    // Staff members: check specific permission
    return hasPerm || false;
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


