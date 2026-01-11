// /lib/auditLogger.ts - COMPLETE VERSION
import { supabase } from "./supabaseClient";

export interface AuditLogParams {
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

// Specific logging functions for common actions
export async function logLogin(staffId: number) {
  await logAuditAction({
    action: "STAFF_LOGIN",
    entityType: "staff",
    entityId: staffId.toString(),
    staffId
  });
}

export async function logLogout(staffId: number) {
  await logAuditAction({
    action: "STAFF_LOGOUT",
    entityType: "staff",
    entityId: staffId.toString(),
    staffId
  });
}

export async function logCustomerCreated(customerId: number, staffId?: number) {
  await logAuditAction({
    action: "CUSTOMER_CREATED",
    entityType: "customer",
    entityId: customerId.toString(),
    staffId
  });
}

export async function logCustomerUpdated(customerId: number, oldValues: any, newValues: any, staffId?: number) {
  await logAuditAction({
    action: "CUSTOMER_UPDATED",
    entityType: "customer",
    entityId: customerId.toString(),
    oldValues,
    newValues,
    staffId
  });
}

export async function logCustomerDeleted(customerId: number, oldValues: any, staffId?: number) {
  await logAuditAction({
    action: "CUSTOMER_DELETED",
    entityType: "customer",
    entityId: customerId.toString(),
    oldValues,
    staffId
  });
}

export async function logBalanceAdjusted(customerId: number, amount: number, action: string, staffId?: number) {
  await logAuditAction({
    action: "CUSTOMER_BALANCE_ADJUSTED",
    entityType: "customer",
    entityId: customerId.toString(),
    newValues: {
      amount,
      action
    },
    staffId
  });
}

export async function logTransactionCreated(transactionId: number, staffId?: number) {
  await logAuditAction({
    action: "TRANSACTION_CREATED",
    entityType: "transaction",
    entityId: transactionId.toString(),
    staffId
  });
}

export async function logReceiptPrinted(transactionId: number, staffId?: number) {
  await logAuditAction({
    action: "RECEIPT_PRINTED",
    entityType: "transaction",
    entityId: transactionId.toString(),
    staffId
  });
}

export async function logNoSale(staffId?: number) {
  await logAuditAction({
    action: "NO_SALE",
    entityType: "transaction",
    entityId: "no-sale",
    newValues: { reason: "No Sale - Cash Drawer Opened" },
    staffId
  });
}

export async function logInventoryUpdate(productId: number, oldStock: number, newStock: number, staffId?: number) {
  await logAuditAction({
    action: "INVENTORY_UPDATED",
    entityType: "product",
    entityId: productId.toString(),
    oldValues: { stock: oldStock },
    newValues: { stock: newStock },
    staffId
  });
}

export async function logSettingsChanged(oldValues: any, newValues: any, staffId?: number) {
  await logAuditAction({
    action: "SETTINGS_CHANGED",
    entityType: "settings",
    oldValues,
    newValues,
    staffId
  });
}

export async function logStaffCreated(staffId: number, staffName: string, changedByStaffId?: number) {
  await logAuditAction({
    action: "STAFF_CREATED",
    entityType: "staff",
    entityId: staffId.toString(),
    newValues: { name: staffName },
    staffId: changedByStaffId
  });
}

export async function logStaffUpdated(staffId: number, oldValues: any, newValues: any, changedByStaffId?: number) {
  await logAuditAction({
    action: "STAFF_UPDATED",
    entityType: "staff",
    entityId: staffId.toString(),
    oldValues,
    newValues,
    staffId: changedByStaffId
  });
}

export async function logStaffDeleted(staffId: number, staffName: string, changedByStaffId?: number) {
  await logAuditAction({
    action: "STAFF_DELETED",
    entityType: "staff",
    entityId: staffId.toString(),
    oldValues: { name: staffName },
    staffId: changedByStaffId
  });
}

// Helper to get readable action names
export function getActionDisplayName(action: string): string {
  const actionMap: Record<string, string> = {
    "STAFF_LOGIN": "Staff Login",
    "STAFF_LOGOUT": "Staff Logout",
    "CUSTOMER_CREATED": "Customer Created",
    "CUSTOMER_UPDATED": "Customer Updated",
    "CUSTOMER_DELETED": "Customer Deleted",
    "CUSTOMER_BALANCE_ADJUSTED": "Balance Adjusted",
    "TRANSACTION_CREATED": "Transaction Created",
    "TRANSACTION_COMPLETED": "Transaction Completed",
    "RECEIPT_PRINTED": "Receipt Printed",
    "NO_SALE": "No Sale",
    "INVENTORY_UPDATED": "Inventory Updated",
    "SETTINGS_CHANGED": "Settings Changed",
    "STAFF_CREATED": "Staff Member Created",
    "STAFF_UPDATED": "Staff Member Updated",
    "STAFF_DELETED": "Staff Member Deleted",
  };
  
  return actionMap[action] || action.replace(/_/g, ' ');
}
