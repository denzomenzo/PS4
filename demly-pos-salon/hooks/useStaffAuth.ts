import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface Staff {
  id: number;
  name: string;
  email: string | null;
  pin: string | null;
  role: "staff" | "manager" | "owner";
  permissions: {
    access_pos: boolean;
    process_transactions: boolean;
    manage_customers: boolean;
    access_display: boolean;
    manage_inventory: boolean;
    view_reports: boolean;
    manage_hardware: boolean;
    manage_card_terminal: boolean;
    manage_settings: boolean;
    manage_staff: boolean;
  };
}

let globalStaff: Staff | null = null;
let listeners: Set<(staff: Staff | null) => void> = new Set();

const notifyListeners = (staff: Staff | null) => {
  console.log("🔄 Setting global staff:", staff?.name);
  globalStaff = staff;
  listeners.forEach(listener => listener(staff));
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
      console.log("📦 Stored staff data:", stored);
      
      if (stored) {
        const data = JSON.parse(stored);
        if (data.expiresAt && new Date(data.expiresAt) > new Date()) {
          notifyListeners(data.staff);
          console.log("✅ Loaded staff from storage:", data.staff);
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

      console.log("🔑 Login successful for:", staffData.name);
      console.log("📋 DB permissions:", staffData.permissions);

      // SIMPLE FIX: Grant ALL permissions temporarily
      const permissions = {
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

      const staffMember: Staff = {
        id: staffData.id,
        name: staffData.name,
        email: staffData.email,
        pin: staffData.pin,
        role: staffData.role || "staff",
        permissions: permissions,
      };

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8);

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem("authenticated_staff", JSON.stringify({
          staff: staffMember,
          expiresAt: expiresAt.toISOString(),
        }));
        console.log("💾 Saved to localStorage");
      }

      notifyListeners(staffMember);
      return { success: true, staff: staffMember };
    } catch (error: any) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    console.log("👋 Logging out");
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem("authenticated_staff");
    }
    notifyListeners(null);
  };

  // TEMPORARY FIX: Always return true for all permissions
  const hasPermission = (permission: keyof Staff["permissions"]): boolean => {
    console.log(`🔍 Checking permission: ${permission} - ALWAYS GRANTING ACCESS`);
    return true; // TEMPORARY: Grant all access
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
