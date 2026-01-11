// /lib/auditLogger.ts
import { supabase } from "./supabaseClient";

interface AuditLogParams {
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  staffId?: number;
}

export async function logAuditAction(params: AuditLogParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get IP and user agent if available
    const ipAddress = params.ipAddress || (typeof window !== 'undefined' ? '' : '');
    const userAgent = params.userAgent || (typeof window !== 'undefined' ? navigator.userAgent : '');

    const { error } = await supabase.from("audit_logs").insert({
      user_id: user.id,
      staff_id: params.staffId || null,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error("Error logging audit action:", error);
    }
  } catch (error) {
    console.error("Error in audit logger:", error);
  }
}