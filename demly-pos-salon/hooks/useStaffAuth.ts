// hooks/useStaffAuth.ts
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
    manage_transactions: boolean;
    manage_customers: boolean;
    access_display: boolean;
    manage_orders: boolean;
    
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
    manage_transactions: true,
    manage_customers: true,
    access_display: true,
    manage_orders: true,
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
    'transactions': 'manage_transactions',
    'process_transactions': 'manage_transactions',
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
    permissionValues.manage_transactions = true;
    permissionValues.manage_customers = true;
    permissionValues.access_display = true;
  } else if (role === "manager") {
    // Managers can have admin permissions only if explicitly granted
    permissionValues.manage_settings = dbPermissions.manage_settings === true || dbPermissions.settings === true;
    permissionValues.manage_staff = dbPermissions.manage_staff === true;
    
    // Manager core permissions are always true
    permissionValues.access_pos = true;
    permissionValues.manage_transactions = true;
    permissionValues.manage_customers = true;
    permissionValues.access_display = true;
  }

  return permissionValues;
};

// Helper to set cookie
const setStaffCookie = (staff: Staff) => {
  if (typeof document === 'undefined') return;
  
  try {
    // Create a simplified version for the cookie
    const cookieStaff = {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      permissions: staff.permissions
    };
    
    // Encode and set cookie with 8 hour expiration
    const cookieValue = encodeURIComponent(JSON.stringify(cookieStaff));
    const expires = new Date();
    expires.setHours(expires.getHours() + 8);
    
    document.cookie = `current_staff=${cookieValue}; path=/; expires=${expires.toUTCString()}; SameSite=Strict`;
    
    console.log("🍪 Staff cookie set for:", staff.name);
  } catch (error) {
    console.error("Error setting staff cookie:", error);
  }
};

// Helper to clear cookie
const clearStaffCookie = () => {
  if (typeof document === 'undefined') return;
  
  document.cookie = 'current_staff=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
  console.log("🍪 Staff cookie cleared");
};

// Helper to get cookie
const getStaffCookie = (): Staff | null => {
  if (typeof document === 'undefined') return null;
  
  try {
    const cookies = document.cookie.split(';');
    const staffCookie = cookies.find(cookie => cookie.trim().startsWith('current_staff='));
    
    if (staffCookie) {
      const cookieValue = staffCookie.split('=')[1];
      const decoded = decodeURIComponent(cookieValue);
      const parsed = JSON.parse(decoded);
      
      // Convert back to full Staff type
      return {
        id: parsed.id,
        name: parsed.name,
        email: null, // Email not stored in cookie for security
        pin: null,   // PIN not stored in cookie for security
        role: parsed.role,
        permissions: parsed.permissions
      };
    }
  } catch (error) {
    console.error("Error reading staff cookie:", error);
  }
  
  return null;
};

export function useStaffAuth() {
  const [staff, setStaff] = useState<Staff | null>(globalStaff);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSetStaff = (newStaff: Staff | null) => {
      setStaff(newStaff);
    };
    
    listeners.add(handleSetStaff);
    
    // Load staff from both localStorage and cookies
    const loadStaff = () => {
      try {
        if (typeof localStorage === 'undefined') {
          setLoading(false);
          return;
        }

        let loadedStaff: Staff | null = null;
        
        // First try to get from cookie (for proxy/middleware)
        const cookieStaff = getStaffCookie();
        if (cookieStaff) {
          loadedStaff = cookieStaff;
          console.log("Loaded staff from cookie:", loadedStaff.name);
        }
        
        // Then try localStorage (for client-side)
        const stored = localStorage.getItem("authenticated_staff");
        if (stored) {
          const data = JSON.parse(stored);
          if (data.expiresAt && new Date(data.expiresAt) > new Date()) {
            loadedStaff = data.staff;
            console.log("Loaded staff from localStorage:", loadedStaff?.name);
            
            // Sync cookie with localStorage
            if (loadedStaff && !cookieStaff) {
              setStaffCookie(loadedStaff);
            }
          } else {
            // Expired, clear it
            localStorage.removeItem("authenticated_staff");
            clearStaffCookie();
          }
        }
        
        notifyListeners(loadedStaff);
      } catch (error) {
        console.error("Error loading staff auth:", error);
        notifyListeners(null);
      } finally {
        setLoading(false);
      }
    };

    if (!globalStaff) {
      loadStaff();
    } else {
      setLoading(false);
    }

    return () => {
      listeners.delete(handleSetStaff);
    };
  }, []);

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

      // Set cookie for proxy/middleware
      setStaffCookie(staffMember);

      notifyListeners(staffMember);
      await logLogin(staffMember.id);

      console.log("✅ Login successful for:", staffMember.name);
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
    
    // Clear cookie
    clearStaffCookie();
    
    notifyListeners(null);
    console.log("✅ Logout successful");
  };

  const hasPermission = (permission: keyof Staff["permissions"]): boolean => {
    if (!staff) return false;
    
    // Owners have all permissions
    if (staff.role === "owner") {
      console.log(`🔐 Owner has all permissions, granting ${permission}`);
      return true;
    }
    
    const hasPerm = staff.permissions[permission];
    
    // For managers
    if (staff.role === "manager") {
      // Managers can't access admin operations unless explicitly granted
      if (permission === "manage_settings" || permission === "manage_staff") {
        const result = hasPerm === true;
        console.log(`🔐 Manager ${permission} check:`, { 
          hasPerm, 
          result,
          allPermissions: staff.permissions 
        });
        return result;
      }
      
      const result = hasPerm !== false;
      console.log(`🔐 Manager ${permission} check:`, { 
        hasPerm, 
        result,
        allPermissions: staff.permissions 
      });
      return result;
    }
    
    // For staff: permission must be explicitly true
    const result = hasPerm === true;
    console.log(`🔐 Staff ${permission} check:`, { 
      hasPerm, 
      result,
      allPermissions: staff.permissions 
    });
    return result;
  };

  const refreshAuth = () => {
    // Reload from storage
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem("authenticated_staff");
      if (stored) {
        const data = JSON.parse(stored);
        if (data.expiresAt && new Date(data.expiresAt) > new Date()) {
          notifyListeners(data.staff);
          // Also update cookie
          setStaffCookie(data.staff);
        } else {
          logout();
        }
      }
    }
  };

  const isOwner = (): boolean => {
    const result = staff?.role === "owner";
    console.log("👑 isOwner check:", { result, role: staff?.role });
    return result;
  };

  const isManager = (): boolean => {
    const result = staff?.role === "manager" || staff?.role === "owner";
    console.log("👔 isManager check:", { result, role: staff?.role });
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

export function getCurrentStaff(): Staff | null {
  return globalStaff;
}

export function isAuthenticated(): boolean {
  return globalStaff !== null;
}

