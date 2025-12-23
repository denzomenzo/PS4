import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

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

export function useStaffAuth() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaffFromStorage();
  }, []);

  const loadStaffFromStorage = () => {
    try {
      const stored = localStorage.getItem("authenticated_staff");
      if (stored) {
        const data = JSON.parse(stored);
        // Check if session is still valid (within 8 hours)
        if (data.expiresAt && new Date(data.expiresAt) > new Date()) {
          setStaff(data.staff);
        } else {
          localStorage.removeItem("authenticated_staff");
        }
      }
    } catch (error) {
      console.error("Error loading staff auth:", error);
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

      const staffMember: Staff = staffData as Staff;

      // Store in localStorage with expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 8); // 8 hour session

      localStorage.setItem("authenticated_staff", JSON.stringify({
        staff: staffMember,
        expiresAt: expiresAt.toISOString(),
      }));

      setStaff(staffMember);

      // Log the login
      await logAuditAction({
        action: "STAFF_LOGIN",
        staffId: staffMember.id,
      });

      return { success: true, staff: staffMember };
    } catch (error: any) {
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
    setStaff(null);
  };

  const hasPermission = (permission: keyof Staff["permissions"]): boolean => {
    if (!staff) return false;
    if (staff.role === "owner") return true; // Owner has all permissions
    if (staff.role === "manager" && permission !== "settings") return true;
    return staff.permissions[permission] === true;
  };

  return { staff, loading, login, logout, hasPermission };
}