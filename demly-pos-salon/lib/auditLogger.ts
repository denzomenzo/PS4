import { supabase } from "./supabaseClient";

interface AuditLogParams {
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  staffId?: number;
}

export async function logAuditAction(params: AuditLogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get IP and user agent (in real app, get from request headers)
    const ip_address = "unknown"; // Will be populated from API route
    const user_agent = typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown';

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      staff_id: params.staffId || null,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId?.toString() || null,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      ip_address,
      user_agent,
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
}