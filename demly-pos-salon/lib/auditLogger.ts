// lib/auditLogger.ts - Complete Implementation
import { supabase } from "./supabaseClient";

interface AuditLogParams {
  action: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  staffId?: number;
}

export async function logAuditAction(params: AuditLogParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("Cannot log audit action: No authenticated user");
      return;
    }

    // Get IP and user agent (in browser environment)
    const ip_address = "client"; // In production, get from API route
    const user_agent = typeof window !== 'undefined' ? window.navigator.userAgent : 'server';

    const logEntry = {
      user_id: user.id,
      staff_id: params.staffId || null,
      action: params.action,
      entity_type: params.entityType || null,
      entity_id: params.entityId?.toString() || null,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      ip_address,
      user_agent,
    };

    const { error } = await supabase
      .from("audit_logs")
      .insert(logEntry);

    if (error) {
      console.error("Failed to log audit action:", error);
    }
  } catch (error) {
    console.error("Error in logAuditAction:", error);
    // Don't throw - logging failures shouldn't break the app
  }
}

// Convenience functions for common actions
export async function logLogin(staffId: number): Promise<void> {
  await logAuditAction({
    action: "STAFF_LOGIN",
    staffId,
  });
}

export async function logLogout(staffId: number): Promise<void> {
  await logAuditAction({
    action: "STAFF_LOGOUT",
    staffId,
  });
}

export async function logTransaction(transactionId: string, total: number, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "TRANSACTION_COMPLETED",
    entityType: "transaction",
    entityId: transactionId,
    newValues: { total },
    staffId,
  });
}

export async function logProductCreated(product: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "PRODUCT_CREATED",
    entityType: "product",
    entityId: product.id?.toString(),
    newValues: product,
    staffId,
  });
}

export async function logProductUpdated(productId: string, oldValues: any, newValues: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "PRODUCT_UPDATED",
    entityType: "product",
    entityId: productId,
    oldValues,
    newValues,
    staffId,
  });
}

export async function logProductDeleted(productId: string, product: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "PRODUCT_DELETED",
    entityType: "product",
    entityId: productId,
    oldValues: product,
    staffId,
  });
}

export async function logCustomerCreated(customer: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "CUSTOMER_CREATED",
    entityType: "customer",
    entityId: customer.id?.toString(),
    newValues: customer,
    staffId,
  });
}

export async function logCustomerUpdated(customerId: string, oldValues: any, newValues: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "CUSTOMER_UPDATED",
    entityType: "customer",
    entityId: customerId,
    oldValues,
    newValues,
    staffId,
  });
}

export async function logCustomerDeleted(customerId: string, customer: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "CUSTOMER_DELETED",
    entityType: "customer",
    entityId: customerId,
    oldValues: customer,
    staffId,
  });
}

export async function logStaffCreated(staff: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "STAFF_CREATED",
    entityType: "staff",
    entityId: staff.id?.toString(),
    newValues: { ...staff, pin: undefined }, // Don't log PIN
    staffId,
  });
}

export async function logStaffUpdated(staffMemberId: string, oldValues: any, newValues: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "STAFF_UPDATED",
    entityType: "staff",
    entityId: staffMemberId,
    oldValues: { ...oldValues, pin: undefined },
    newValues: { ...newValues, pin: undefined },
    staffId,
  });
}

export async function logStaffDeleted(staffMemberId: string, staff: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "STAFF_DELETED",
    entityType: "staff",
    entityId: staffMemberId,
    oldValues: { ...staff, pin: undefined },
    staffId,
  });
}

export async function logSettingsUpdated(oldValues: any, newValues: any, staffId?: number): Promise<void> {
  await logAuditAction({
    action: "SETTINGS_UPDATED",
    entityType: "settings",
    oldValues,
    newValues,
    staffId,
  });
}

export async function logSettingsAccess(method: "email" | "pin", staffId?: number): Promise<void> {
  await logAuditAction({
    action: method === "email" ? "SETTINGS_ACCESS_GRANTED_EMAIL" : "SETTINGS_ACCESS_GRANTED_PIN",
    staffId,
  });
}
