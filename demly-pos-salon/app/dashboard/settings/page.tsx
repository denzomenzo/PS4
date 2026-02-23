// app/dashboard/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { 
  Plus, Trash2, Edit2, Check, ArrowLeft, Users, Store, Loader2, X, 
  FileText, Image, Save, Lock, Shield, AlertCircle, Mail, CreditCard,
  Calendar, Clock, Download, ChevronDown, ChevronUp, Receipt, Zap,
  CircleDollarSign, History, ExternalLink, AlertTriangle
} from "lucide-react";
import Link from "next/link";

// Import Staff type from useStaffAuth to ensure consistency
import type { Staff as StaffType } from "@/hooks/useStaffAuth";

interface Staff {
  id: number;
  name: string;
  email?: string | null;
  pin?: string | null;
  role: "staff" | "manager" | "owner";
  permissions: {
    // Core POS Operations
    access_pos: boolean;
    manage_transactions: boolean;
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

interface Subscription {
  id: string;
  plan: 'monthly' | 'annual';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  price: number;
  currency: string;
  payment_method?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  created: string;
  cooling_days_left?: number;
  deletion_scheduled?: boolean;
  days_until_deletion?: number;
  deletion_date?: string;
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  pdf_url: string | null;
  hosted_url: string | null;
}

const COOLING_PERIOD_DAYS = 14;

export default function Settings() {
  const userId = useUserId();
  const { staff: currentStaff, isOwner, isManager } = useStaffAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  // Business Settings
  const [shopName, setShopName] = useState("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);
  
  // Receipt Settings
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [receiptLogoUrl, setReceiptLogoUrl] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for your business!");
  const [refundDays, setRefundDays] = useState("");
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(true);
  const [receiptFontSize, setReceiptFontSize] = useState("12");
  const [barcodeType, setBarcodeType] = useState("code128");
  const [showBarcodeOnReceipt, setShowBarcodeOnReceipt] = useState(true);

  // Subscription
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [coolingDaysLeft, setCoolingDaysLeft] = useState<number | null>(null);

  // Account Deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Staff
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [staffRole, setStaffRole] = useState<"staff" | "manager" | "owner">("staff");
  const [staffPermissions, setStaffPermissions] = useState({
    // Core POS Operations
    access_pos: true,
    manage_transactions: true,
    manage_customers: true,
    access_display: true,
    
    // Management Operations
    manage_inventory: false,
    view_reports: false,
    manage_hardware: false,
    manage_card_terminal: false,
    
    // Administrative Operations
    manage_settings: false,
    manage_staff: false,
  });
  
  // PIN Change Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinChangeStaff, setPinChangeStaff] = useState<Staff | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    business: true,
    receipt: false,
    subscription: false,
    staff: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Username field for staff
  const [staffUsername, setStaffUsername] = useState("");

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || cancelError) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setCancelError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, cancelError]);

  // Set cooling days from subscription
  useEffect(() => {
    if (subscription?.cooling_days_left !== undefined) {
      setCoolingDaysLeft(subscription.cooling_days_left);
    } else {
      setCoolingDaysLeft(null);
    }
  }, [subscription]);

  // FIXED: Simplified permission checking
  useEffect(() => {
    console.log("🔄 Settings page useEffect triggered", { userId, currentStaff });
    
    if (userId && currentStaff) {
      console.log("👤 Current staff:", {
        id: currentStaff.id,
        name: currentStaff.name,
        role: currentStaff.role,
        permissions: currentStaff.permissions
      });
      
      // SIMPLIFIED: Direct permission check
      const canAccessSettings = 
        currentStaff.role === "owner" || 
        currentStaff.role === "manager" || 
        currentStaff.permissions.manage_settings === true;
      
      console.log("🔐 Settings access check:", {
        role: currentStaff.role,
        manage_settings: currentStaff.permissions.manage_settings,
        canAccessSettings
      });
      
      if (!canAccessSettings) {
        console.log("❌ Access denied to settings");
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      
      console.log("✅ Access granted to settings, loading data...");
      loadData();
      loadSubscription();
    } else if (!currentStaff) {
      console.log("❌ No staff logged in");
      setLoading(false);
    }
  }, [userId, currentStaff]);

  // Function to apply role-based permission presets
  const applyRolePreset = (role: "staff" | "manager" | "owner") => {
    console.log("🎭 Applying role preset:", role);
    
    if (role === "staff") {
      setStaffPermissions({
        // Core POS Operations - Required for staff
        access_pos: true,
        manage_transactions: true,
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
      });
    } else if (role === "manager") {
      setStaffPermissions({
        // Core POS Operations - Required for managers
        access_pos: true,
        manage_transactions: true,
        manage_customers: true,
        access_display: true,
        
        // Management Operations - Enabled for managers
        manage_inventory: true,
        view_reports: true,
        manage_hardware: true,
        manage_card_terminal: true,
        
        // Administrative Operations - Default false for managers
        manage_settings: false,
        manage_staff: false,
      });
    } else if (role === "owner") {
      // Owners have everything enabled
      setStaffPermissions({
        access_pos: true,
        manage_transactions: true,
        manage_customers: true,
        access_display: true,
        manage_inventory: true,
        view_reports: true,
        manage_hardware: true,
        manage_card_terminal: true,
        manage_settings: true,
        manage_staff: true,
      });
    }
  };

  const loadData = async () => {
    console.log("🔄 Starting loadData...");
    setLoading(true);

    try {
      console.log("📊 Loading settings data for user:", userId);
      
      const { data: settingsData, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      console.log("Settings query result:", { settingsData, settingsError });
      
      if (settingsError) {
        console.error("Error loading settings:", settingsError);
      }
      
      if (settingsData) {
        console.log("✅ Settings data loaded:", settingsData);
        setShopName(settingsData.shop_name || settingsData.business_name || "");
        setBusinessLogoUrl(settingsData.business_logo_url || "");
        setVatEnabled(settingsData.vat_enabled !== false);
        
        setBusinessName(settingsData.business_name || settingsData.shop_name || "");
        setBusinessAddress(settingsData.business_address || "");
        setBusinessPhone(settingsData.business_phone || "");
        setBusinessEmail(settingsData.business_email || "");
        setBusinessWebsite(settingsData.business_website || "");
        setTaxNumber(settingsData.tax_number || "");
        setReceiptLogoUrl(settingsData.receipt_logo_url || "");
        setReceiptFooter(settingsData.receipt_footer || "Thank you for your business!");
        setRefundDays(settingsData.refund_days?.toString() || "");
        setShowTaxBreakdown(settingsData.show_tax_breakdown !== false);
        setReceiptFontSize(settingsData.receipt_font_size?.toString() || "12");
        setBarcodeType(settingsData.barcode_type || "code128");
        setShowBarcodeOnReceipt(settingsData.show_barcode_on_receipt !== false);
      } else {
        console.log("ℹ️ No settings data found, using defaults");
      }

      console.log("👥 Loading staff data...");
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", userId)
        .order("name");
      
      console.log("Staff query result:", { staffData: staffData?.length, staffError });
      
      if (staffError) {
        console.error("Error loading staff:", staffError);
      }
      
      if (staffData) {
        // Convert any old format permissions to new format for display
        const normalizedStaffData = staffData.map((member: any) => {
          const dbPermissions = member.permissions || {};
          
          // Helper to get permission value (handles both old and new names)
          const getPermission = (oldName: string, newName: string, defaultValue: boolean = false) => {
            if (dbPermissions[newName] !== undefined) return Boolean(dbPermissions[newName]);
            if (dbPermissions[oldName] !== undefined) return Boolean(dbPermissions[oldName]);
            return defaultValue;
          };

          // Determine defaults based on role
          const isOwner = member.role === "owner";
          const isManager = member.role === "manager";
          
          return {
            ...member,
            permissions: {
              // Core POS Operations
              access_pos: getPermission('pos', 'access_pos', true),
              manage_transactions: getPermission('transactions', 'manage_transactions', true) || getPermission('process_transactions', 'manage_transactions', true),
              manage_customers: getPermission('customers', 'manage_customers', true),
              access_display: getPermission('display', 'access_display', true),
              
              // Management Operations
              manage_inventory: getPermission('inventory', 'manage_inventory', isManager || isOwner),
              view_reports: getPermission('reports', 'view_reports', isManager || isOwner),
              manage_hardware: getPermission('hardware', 'manage_hardware', isManager || isOwner),
              manage_card_terminal: getPermission('card_terminal', 'manage_card_terminal', isManager || isOwner),
              
              // Administrative Operations
              manage_settings: getPermission('settings', 'manage_settings', isOwner),
              manage_staff: dbPermissions.manage_staff || isOwner,
            },
          };
        });
        console.log(`✅ Loaded ${normalizedStaffData.length} staff members`);
        setStaff(normalizedStaffData);
      }

    } catch (error) {
      console.error("❌ Error loading settings:", error);
    } finally {
      console.log("🏁 loadData completed");
      setLoading(false);
    }
  };

  const loadSubscription = async () => {
    setLoadingSubscription(true);
    setCancelError(null);
    
    try {
      // Fetch subscription from API
      const response = await fetch('/api/subscription');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.subscription) {
        setSubscription(data.subscription);
        // Also load invoices if we have a subscription
        loadInvoices();
      } else {
        setSubscription(null);
      }
      
    } catch (error) {
      console.error("Error loading subscription:", error);
      setCancelError("Failed to load subscription details");
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadInvoices = async () => {
    setLoadingInvoices(true);
    
    try {
      const response = await fetch('/api/invoices');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch invoices: ${response.status}`);
      }
      
      const data = await response.json();
      setInvoices(data.invoices || []);
      
    } catch (error) {
      console.error("Error loading invoices:", error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    setCancelError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }
      
      // Update local state
      if (data.refunded) {
        setSubscription(null);
        setSuccessMessage("✅ Subscription cancelled and refunded successfully.");
      } else if (data.cancel_at_period_end) {
        setSubscription(prev => prev ? {
          ...prev,
          cancel_at_period_end: true
        } : null);
        setSuccessMessage("✅ Subscription will be cancelled at the end of the billing period.");
      }
      
      setShowCancelConfirm(false);
      
      // Refresh subscription data
      loadSubscription();
      
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      setCancelError(error.message || "❌ Failed to cancel subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setCancelling(true);
    setCancelError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }
      
      // Update local state
      setSubscription(prev => prev ? {
        ...prev,
        cancel_at_period_end: false
      } : null);
      
      setSuccessMessage("✅ Subscription reactivated successfully.");
      
      // Refresh subscription data
      loadSubscription();
      
    } catch (error: any) {
      console.error("Error reactivating subscription:", error);
      setCancelError(error.message || "❌ Failed to reactivate subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    try {
      const response = await fetch('/api/subscription/create-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to open customer portal');
      }
      
      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
      
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      setCancelError(error.message || "❌ Failed to open customer portal. Please try again.");
    }
  };

  const handleScheduleDeletion = async () => {
    if (!confirm("Are you sure you want to schedule account deletion? This will permanently delete all your data in 14 days.")) {
      return;
    }
    
    setDeleting(true);
    try {
      const response = await fetch('/api/account/schedule-deletion', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule deletion');
      }
      
      setSuccessMessage("✅ Account deletion scheduled. You have 14 days to cancel.");
      setShowDeleteConfirm(false);
      
      // Refresh subscription data
      loadSubscription();
      
    } catch (error: any) {
      console.error('Error scheduling deletion:', error);
      alert(error.message || 'Failed to schedule deletion');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setDeleting(true);
    try {
      const response = await fetch('/api/account/cancel-deletion', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel deletion');
      }
      
      setSuccessMessage("✅ Account deletion cancelled.");
      setShowDeleteConfirm(false);
      
      // Refresh subscription data
      loadSubscription();
      
    } catch (error: any) {
      console.error('Error cancelling deletion:', error);
      alert(error.message || 'Failed to cancel deletion');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const resetModalStates = () => {
    setStaffName("");
    setStaffEmail("");
    setStaffUsername("");
    setStaffPin("");
    setStaffRole("staff");
    setStaffPermissions({
      access_pos: true,
      manage_transactions: true,
      manage_customers: true,
      access_display: true,
      manage_inventory: false,
      view_reports: false,
      manage_hardware: false,
      manage_card_terminal: false,
      manage_settings: false,
      manage_staff: false,
    });
    setVerificationCode("");
    setSentCode("");
    setCodeSent(false);
    setEditingStaff(null);
    setPinChangeStaff(null);
  };

  const openAddStaffModal = () => {
    console.log("➕ Opening add staff modal");
    resetModalStates();
    setShowStaffModal(true);
  };

  const openEditStaffModal = (member: Staff) => {
    console.log("✏️ Opening edit staff modal for:", member.name);
    setEditingStaff(member);
    setStaffName(member.name);
    setStaffEmail(member.email || "");
    setStaffUsername(member.email?.split('@')[0] || "");
    setStaffPin("");
    setStaffRole(member.role);
    
    // Use the member's permissions directly (already normalized)
    setStaffPermissions({
      access_pos: member.permissions.access_pos,
      manage_transactions: member.permissions.manage_transactions,
      manage_customers: member.permissions.manage_customers,
      access_display: member.permissions.access_display,
      manage_inventory: member.permissions.manage_inventory,
      view_reports: member.permissions.view_reports,
      manage_hardware: member.permissions.manage_hardware,
      manage_card_terminal: member.permissions.manage_card_terminal,
      manage_settings: member.permissions.manage_settings,
      manage_staff: member.permissions.manage_staff,
    });
    
    setShowStaffModal(true);
  };


  const openPinChangeModal = (member: Staff) => {
    console.log("🔒 Opening PIN change modal for:", member.name);
    setPinChangeStaff(member);
    setStaffEmail(member.email || "");
    setStaffPin("");
    setVerificationCode("");
    setSentCode("");
    setCodeSent(false);
    setShowPinModal(true);
  };

  const sendVerificationCode = async () => {
    console.log("📧 Sending verification code to:", staffEmail);
    if (!staffEmail || !staffEmail.includes('@')) {
      alert("Please enter a valid email address");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);

    try {
      const { error: functionError } = await supabase.functions.invoke(
        'send-verification-email',
        {
          body: {
            email: staffEmail,
            code: code,
            staffName: staffName || pinChangeStaff?.name
          }
        }
      );

      if (functionError) {
        console.error("❌ Failed to send verification email:", functionError);
        alert("❌ Failed to send verification email. Please try again.");
        setCodeSent(false);
        setSentCode("");
        return;
      }

      setCodeSent(true);
      alert(`✅ Verification code sent to ${staffEmail}`);
    } catch (error) {
      console.error("❌ Failed to send verification email:", error);
      alert("❌ Failed to send verification email. Please check your connection.");
      setCodeSent(false);
      setSentCode("");
    }
  };

  const verifyAndSavePin = async () => {
    console.log("✅ Verifying and saving PIN");
    if (verificationCode !== sentCode) {
      alert("❌ Invalid verification code");
      return;
    }

    if (!staffPin || staffPin.length < 4) {
      alert("❌ PIN must be at least 4 digits");
      return;
    }

    setVerifying(true);
    try {
      if (pinChangeStaff) {
        const { error } = await supabase
          .from("staff")
          .update({ pin: staffPin })
          .eq("id", pinChangeStaff.id)
          .eq("user_id", userId);
        
        if (error) throw error;
        
        alert("✅ PIN updated successfully!");
      }

      setShowPinModal(false);
      resetModalStates();
      loadData();
    } catch (error: any) {
      console.error("❌ Error updating PIN:", error);
      alert("❌ Error updating PIN: " + error.message);
    } finally {
      setVerifying(false);
    }
  };

  const saveStaffMember = async () => {
    console.log("💾 Saving staff member...");
    if (!staffName.trim()) {
      alert("Name is required");
      return;
    }

    if (!staffEmail.trim() || !staffEmail.includes('@')) {
      alert("Valid email is required");
      return;
    }

    // If setting a new PIN, require verification
    if (staffPin && staffPin.length >= 4) {
      if (!codeSent) {
        alert("Please send and verify the email code first");
        return;
      }
      if (verificationCode !== sentCode) {
        alert("❌ Invalid verification code");
        return;
      }
    }

    try {
      // Save permissions in NEW format only
      const permissions = {
        // Core POS Operations
        access_pos: staffPermissions.access_pos,
        manage_transactions: staffPermissions.manage_transactions,
        manage_customers: staffPermissions.manage_customers,
        access_display: staffPermissions.access_display,
        
        // Management Operations
        manage_inventory: staffPermissions.manage_inventory,
        view_reports: staffPermissions.view_reports,
        manage_hardware: staffPermissions.manage_hardware,
        manage_card_terminal: staffPermissions.manage_card_terminal,
        
        // Administrative Operations
        manage_settings: staffPermissions.manage_settings,
        manage_staff: staffPermissions.manage_staff,
      };

      const staffData: any = {
        user_id: userId,
        name: staffName.trim(),
        email: staffEmail.trim(),
        role: staffRole,
        permissions: permissions, // NEW format only
      };
      
      if (staffPin && staffPin.length >= 4) {
        staffData.pin = staffPin;
      }
      
      if (editingStaff) {
        console.log("✏️ Updating existing staff member:", editingStaff.id);
        const { error } = await supabase
          .from("staff")
          .update(staffData)
          .eq("id", editingStaff.id)
          .eq("user_id", userId);
        
        if (error) throw error;
      } else {
        console.log("➕ Adding new staff member");
        const { error } = await supabase
          .from("staff")
          .insert(staffData);
        
        if (error) throw error;
      }

      setShowStaffModal(false);
      resetModalStates();
      loadData();
      alert("✅ Staff member saved successfully!");
    } catch (error: any) {
      console.error("❌ Error saving staff member:", error);
      alert("Error saving staff member: " + error.message);
    }
  };

  const deleteStaffMember = async (id: number) => {
    console.log("🗑️ Deleting staff member:", id);
    if (!confirm("Are you sure you want to delete this staff member?")) return;
    
    try {
      const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      
      if (error) throw error;
      
      loadData();
    } catch (error: any) {
      console.error("❌ Error deleting staff member:", error);
      alert("Error deleting staff member: " + error.message);
    }
  };

  const saveAllSettings = async () => {
    console.log("💾 Saving all settings...");
    setSaving(true);
    try {
      const { error } = await supabase
        .from("settings")
        .upsert(
          {
            user_id: userId,
            shop_name: shopName,
            business_logo_url: businessLogoUrl,
            vat_enabled: vatEnabled,
            business_name: businessName,
            business_address: businessAddress,
            business_phone: businessPhone,
            business_email: businessEmail,
            business_website: businessWebsite,
            tax_number: taxNumber,
            receipt_logo_url: receiptLogoUrl,
            receipt_footer: receiptFooter,
            refund_days: refundDays ? parseInt(refundDays) : null,
            show_tax_breakdown: showTaxBreakdown,
            receipt_font_size: parseInt(receiptFontSize),
            barcode_type: barcodeType,
            show_barcode_on_receipt: showBarcodeOnReceipt,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error("❌ Error saving settings:", error);
        alert("❌ Error saving settings: " + error.message);
      } else {
        console.log("✅ Settings saved successfully");
        alert("✅ All settings saved successfully!");
      }
    } catch (err) {
      console.error("❌ Unexpected error saving settings:", err);
      alert("❌ An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Toggle component for settings
  const ToggleSwitch = ({ 
    enabled, 
    onChange, 
    size = 'default',
    label 
  }: { 
    enabled: boolean; 
    onChange: () => void; 
    size?: 'small' | 'default';
    label?: string;
  }) => {
    const width = size === 'small' ? 'w-12' : 'w-16';
    const height = size === 'small' ? 'h-6' : 'h-8';
    const circleSize = size === 'small' ? 'w-5 h-5' : 'w-7 h-7';
    const translateX = size === 'small' ? 'translate-x-6' : 'translate-x-8';
    
    return (
      <button
        onClick={onChange}
        className={`relative ${width} ${height} rounded-full transition-all ${
          enabled 
            ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30' 
            : 'bg-red-400 hover:bg-red-500 shadow-lg shadow-red-500/30'
        }`}
        aria-label={label}
      >
        <div
          className={`absolute top-0.5 left-0.5 ${circleSize} bg-white rounded-full shadow-md transition-transform ${
            enabled ? translateX : 'translate-x-0'
          }`}
        >
          {enabled ? (
            <Check className={`${size === 'small' ? 'w-4 h-4' : 'w-5 h-5'} text-green-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`} />
          ) : (
            <X className={`${size === 'small' ? 'w-4 h-4' : 'w-5 h-5'} text-red-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`} />
          )}
        </div>
      </button>
    );
  };

  if (!userId || !currentStaff) {
    console.log("⏳ Waiting for user ID or current staff...");
    return null;
  }

  if (loading) {
    console.log("⏳ Loading settings page...");
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    console.log("🚫 Access denied to settings page");
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-8">
        <div className="bg-card/50 backdrop-blur-xl rounded-xl p-8 max-w-md border border-border">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              Only managers and owners can access settings.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your business configuration</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Audit Log Button */}
              <Link
                href="/dashboard/settings/audit-logs"
                className="flex items-center gap-2 bg-muted hover:bg-accent text-foreground px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <History className="w-4 h-4" />
                Audit Logs
              </Link>
              <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-600 text-sm">
              {successMessage}
            </div>
          )}
          
          {cancelError && (
            <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-destructive text-sm">
              {cancelError}
            </div>
          )}

          {/* TEMPORARY DEBUG SECTION - Remove after fixing */}
<div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
  <h3 className="text-sm font-medium text-blue-600 mb-2">🔍 Debug Info</h3>
  <div className="flex gap-2">
    <button
      onClick={async () => {
        try {
          const res = await fetch('/api/debug/staff-email');
          const data = await res.json();
          console.log('Staff email debug:', data);
          alert(JSON.stringify(data, null, 2));
        } catch (e) {
          alert('Error: ' + e);
        }
      }}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
    >
      Check Staff Email
    </button>
    <button
      onClick={async () => {
        try {
          const res = await fetch('/api/subscription');
          const data = await res.json();
          console.log('Subscription API response:', data);
          alert(JSON.stringify(data, null, 2));
        } catch (e) {
          alert('Error: ' + e);
        }
      }}
      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
    >
      Check Subscription API
    </button>
  </div>
  {subscription && (
    <div className="mt-3 p-3 bg-green-500/20 border border

          <div className="space-y-3">
            
            {/* Business Settings */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('business')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <Store className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Business Settings</h2>
                    <p className="text-xs text-muted-foreground">Configure your business information</p>
                  </div>
                </div>
                {expandedSections.business ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {expandedSections.business && (
                <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">Business Name (POS Display)</label>
                    <input
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Your Business Name"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">This name appears on the POS sidebar</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
                      <Image className="w-3 h-3" />
                      Business Logo (Optional)
                    </label>
                    <input
                      type="url"
                      value={businessLogoUrl}
                      onChange={(e) => setBusinessLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {businessLogoUrl && (
                      <div className="mt-2 bg-muted rounded-lg p-2">
                        <p className="text-xs text-muted-foreground mb-1">Logo Preview:</p>
                        <img
                          src={businessLogoUrl}
                          alt="Business logo preview"
                          className="max-w-[100px] max-h-[50px] object-contain"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-muted/30 border border-border rounded-lg p-3">
                    <div>
                      <p className="text-xs font-medium text-foreground">VAT (20%)</p>
                      <p className="text-xs text-muted-foreground">Add VAT to all transactions</p>
                    </div>
                    <ToggleSwitch 
                      enabled={vatEnabled} 
                      onChange={() => setVatEnabled(!vatEnabled)}
                      size="small"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Subscription & Billing (with Danger Zone) */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('subscription')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Subscription & Billing</h2>
                    <p className="text-xs text-muted-foreground">Manage your plan, payment methods, and account</p>
                  </div>
                </div>
                {expandedSections.subscription ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {expandedSections.subscription && (
                <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  {loadingSubscription ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : subscription ? (
                    <>
                      {/* Plan Overview */}
                      <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Current Plan</p>
                            <p className="text-lg font-bold text-foreground capitalize">
                              {subscription.plan === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="text-lg font-bold text-primary">
                              £{subscription.price}/{subscription.plan === 'annual' ? 'yr' : 'mo'}
                            </p>
                          </div>
                        </div>

                        {/* 14-Day Cooling Period Notice */}
                        {coolingDaysLeft && coolingDaysLeft > 0 && (
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <p className="text-xs text-amber-600">
                                <span className="font-bold">14-Day Cooling Period:</span> You have {coolingDaysLeft} days remaining to cancel for a full refund.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-2 h-2 rounded-full ${
                            subscription.status === 'active' ? 'bg-green-500' :
                            subscription.status === 'past_due' ? 'bg-red-500' :
                            subscription.status === 'canceled' ? 'bg-gray-500' : 'bg-yellow-500'
                          }`}></div>
                          <span className="text-xs capitalize text-foreground">{subscription.status}</span>
                          {subscription.cancel_at_period_end && (
                            <span className="text-xs bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                              Cancels at period end
                            </span>
                          )}
                        </div>

                        {/* Billing Dates */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-muted/30 rounded-lg p-2">
                            <p className="text-muted-foreground">Current Period Start</p>
                            <p className="font-medium text-foreground">{formatDate(subscription.current_period_start)}</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-2">
                            <p className="text-muted-foreground">Current Period End</p>
                            <p className="font-medium text-foreground">{formatDate(subscription.current_period_end)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Method */}
                      {subscription.payment_method && (
                        <div className="bg-muted/30 border border-border rounded-lg p-3">
                          <p className="text-xs font-medium text-foreground mb-2">Payment Method</p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center text-white text-xs font-bold">
                              {subscription.payment_method.brand === 'visa' ? 'VISA' : 
                               subscription.payment_method.brand === 'mastercard' ? 'MC' : 'CARD'}
                            </div>
                            <div>
                              <p className="text-sm text-foreground">•••• {subscription.payment_method.last4}</p>
                              <p className="text-xs text-muted-foreground">
                                Expires {subscription.payment_method.exp_month}/{subscription.payment_method.exp_year}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={handleOpenCustomerPortal}
                          className="flex-1 bg-primary/10 text-primary border border-primary/20 py-2 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" />
                          Update Payment Method
                        </button>
                        <button
                          onClick={() => {
                            if (invoices.length > 0 && invoices[0].hosted_url) {
                              window.open(invoices[0].hosted_url, '_blank');
                            } else if (subscription?.id) {
                              handleOpenCustomerPortal();
                            }
                          }}
                          className="flex-1 bg-muted hover:bg-accent text-foreground py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          <Receipt className="w-3 h-3" />
                          View Invoices
                        </button>
                      </div>

                      {/* Cancel/Reactivate */}
                      {!subscription.cancel_at_period_end ? (
                        !showCancelConfirm ? (
                          <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="w-full bg-destructive/10 text-destructive border border-destructive/20 py-2 rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors"
                          >
                            Cancel Subscription
                          </button>
                        ) : (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                            <p className="text-xs text-destructive mb-2">
                              {coolingDaysLeft && coolingDaysLeft > 0 
                                ? `Are you sure? Since you're within the 14-day cooling period, you'll receive a full refund.`
                                : 'Are you sure? Your subscription will continue until the end of the billing period.'}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 bg-muted hover:bg-accent text-foreground py-1.5 rounded text-xs font-medium"
                              >
                                No, Keep It
                              </button>
                              <button
                                onClick={handleCancelSubscription}
                                disabled={cancelling}
                                className="flex-1 bg-destructive text-destructive-foreground py-1.5 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
                              >
                                {cancelling ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Yes, Cancel'}
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <button
                          onClick={handleReactivateSubscription}
                          disabled={cancelling}
                          className="w-full bg-primary/10 text-primary border border-primary/20 py-2 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {cancelling ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Reactivate Subscription'}
                        </button>
                      )}

                      {/* Recent Invoices */}
                      {invoices.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-foreground mb-2">Recent Invoices</p>
                          <div className="space-y-2">
                            {invoices.slice(0, 3).map((invoice) => (
                              <div key={invoice.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                                <div>
                                  <p className="text-xs font-medium text-foreground">Invoice #{invoice.number}</p>
                                  <p className="text-[10px] text-muted-foreground">{formatDate(invoice.date)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-foreground">
                                    £{invoice.amount}
                                  </span>
                                  {invoice.pdf_url && (
                                    <a
                                      href={invoice.pdf_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      <Download className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Account Deletion Section - 14 Day Countdown */}
                      <div className="mt-6 pt-4 border-t border-destructive/20">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">Delete Account</h3>
                            <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                          </div>
                        </div>

                        {subscription?.deletion_scheduled ? (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Clock className="w-5 h-5 text-destructive" />
                              <div>
                                <p className="text-sm font-bold text-destructive">Deletion Scheduled</p>
                                <p className="text-xs text-destructive/80">
                                  Your account will be permanently deleted in {subscription.days_until_deletion} days.
                                </p>
                              </div>
                            </div>
                            
                            <div className="bg-destructive/20 rounded-lg p-3 mb-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs text-destructive">Days until deletion</span>
                                <span className="text-sm font-bold text-destructive">{subscription.days_until_deletion} days</span>
                              </div>
                              <div className="w-full bg-destructive/30 rounded-full h-2">
                                <div 
                                  className="bg-destructive h-2 rounded-full" 
                                  style={{ width: `${((14 - (subscription.days_until_deletion || 0)) / 14) * 100}%` }}
                                ></div>
                              </div>
                            </div>

                            <button
                              onClick={handleCancelDeletion}
                              disabled={deleting}
                              className="w-full bg-destructive text-destructive-foreground py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
                            >
                              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cancel Deletion Request'}
                            </button>
                          </div>
                        ) : (
                          !showDeleteConfirm ? (
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              className="w-full bg-destructive/10 text-destructive border border-destructive/20 py-2 rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors"
                            >
                              Request Account Deletion
                            </button>
                          ) : (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <Clock className="w-5 h-5 text-destructive" />
                                <div>
                                  <p className="text-sm font-bold text-destructive">14-Day Cooling Period</p>
                                  <p className="text-xs text-destructive/80">
                                    Your account will be permanently deleted in 14 days. You can cancel this request anytime.
                                  </p>
                                </div>
                              </div>
                              
                              <div className="bg-destructive/20 rounded-lg p-3 mb-3">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-destructive">Days until deletion</span>
                                  <span className="text-sm font-bold text-destructive">14 days</span>
                                </div>
                                <div className="w-full bg-destructive/30 rounded-full h-2">
                                  <div 
                                    className="bg-destructive h-2 rounded-full" 
                                    style={{ width: '0%' }}
                                  ></div>
                                </div>
                              </div>

                              <ul className="text-xs text-destructive/80 mb-3 list-disc list-inside space-y-1">
                                <li>All your business settings and staff members</li>
                                <li>All transactions, customers, and inventory data</li>
                                <li>Your subscription will be cancelled (with refund if applicable)</li>
                                <li>Your account and all associated data</li>
                              </ul>
                              
                              <p className="text-xs text-destructive mb-3 font-bold">
                                This action cannot be undone after 14 days!
                              </p>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setShowDeleteConfirm(false)}
                                  className="flex-1 bg-muted hover:bg-accent text-foreground py-2 rounded text-xs font-medium"
                                  disabled={deleting}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleScheduleDeletion}
                                  disabled={deleting}
                                  className="flex-1 bg-destructive text-destructive-foreground py-2 rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
                                >
                                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Schedule Deletion'}
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No active subscription</p>
                      <Link
                        href="/pay"
                        className="inline-block mt-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-medium"
                      >
                        Purchase License
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Receipt Customization */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('receipt')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Receipt Customization</h2>
                    <p className="text-xs text-muted-foreground">Customize how your receipts look</p>
                  </div>
                </div>
                {expandedSections.receipt ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {expandedSections.receipt && (
                <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-foreground">Receipt Information</h3>
                      
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Business Name on Receipt</label>
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                          placeholder="Your Business"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Address</label>
                        <textarea
                          value={businessAddress}
                          onChange={(e) => setBusinessAddress(e.target.value)}
                          rows={2}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none"
                          placeholder="123 Main St, London, UK"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Phone</label>
                        <input
                          type="tel"
                          value={businessPhone}
                          onChange={(e) => setBusinessPhone(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                          placeholder="+44 20 1234 5678"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Email</label>
                        <input
                          type="email"
                          value={businessEmail}
                          onChange={(e) => setBusinessEmail(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                          placeholder="info@mysalon.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-medium text-foreground">Receipt Design</h3>
                      
                      <div className="opacity-50">
                        <label className="block text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Image className="w-3 h-3" />
                          Logo URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={receiptLogoUrl}
                          onChange={(e) => setReceiptLogoUrl(e.target.value)}
                          placeholder="Logo field disabled - uses main business logo"
                          disabled
                          className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Receipt will use your main business logo from Business Settings
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Tax/VAT Number</label>
                        <input
                          type="text"
                          value={taxNumber}
                          onChange={(e) => setTaxNumber(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                          placeholder="GB123456789"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Website</label>
                        <input
                          type="url"
                          value={businessWebsite}
                          onChange={(e) => setBusinessWebsite(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                          placeholder="www.yourshop.com"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Receipt Message</label>
                        <textarea
                          value={receiptFooter}
                          onChange={(e) => setReceiptFooter(e.target.value)}
                          rows={2}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground resize-none"
                          placeholder="Thank you for your business!"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Refund Days (Optional)</label>
                        <input
                          type="number"
                          value={refundDays}
                          onChange={(e) => setRefundDays(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                          placeholder="e.g., 30"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Receipt Preview */}
                  <div className="mt-4 bg-muted/30 rounded-lg p-4 border border-border">
                    <h3 className="text-xs font-medium text-foreground mb-3 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Receipt Preview
                    </h3>
                    
                    <div className="bg-white text-black p-4 rounded-lg max-w-xs mx-auto font-mono text-xs">
                      {/* Use business logo from Business Settings */}
                      {businessLogoUrl ? (
                        <img
                          src={businessLogoUrl}
                          alt="Logo"
                          className="max-w-[80px] h-auto mx-auto mb-2"
                          onError={(e) => e.currentTarget.style.display = 'none'}
                        />
                      ) : (
                        <div className="w-[80px] h-[30px] bg-gradient-to-r from-primary to-primary/80 rounded mx-auto mb-2 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">LOGO</span>
                        </div>
                      )}
                      
                      <div className="text-center font-bold mb-1">
                        {businessName || shopName || "Your Business"}
                      </div>
                      
                      {businessAddress && (
                        <div className="text-center mb-1 whitespace-pre-line text-[10px]">{businessAddress}</div>
                      )}
                      
                      {businessPhone && <div className="text-center text-[10px]">{businessPhone}</div>}
                      {businessEmail && <div className="text-center text-[10px]">{businessEmail}</div>}
                      {businessWebsite && <div className="text-center text-[10px]">{businessWebsite}</div>}
                      {taxNumber && <div className="text-center text-[10px] mb-1">Tax No: {taxNumber}</div>}
                      
                      <div className="border-t border-dashed border-gray-400 my-2"></div>
                      
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-[10px]">
                          <span>✂️ Haircut</span>
                          <span>£25.00</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span>🧴 Shampoo</span>
                          <span>£8.99</span>
                        </div>
                      </div>
                      
                      <div className="border-t-2 border-gray-800 pt-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold">TOTAL:</span>
                          <span className="font-bold">£33.99</span>
                        </div>
                      </div>
                      
                      <div className="text-center mt-2 text-[10px]">
                        {receiptFooter}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Staff Members */}
            <div className="bg-card border border-border rounded-xl p-4">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('staff')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Staff Members</h2>
                    <p className="text-xs text-muted-foreground">{staff.length} team members</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.staff ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {expandedSections.staff && (
                <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                  <button
                    onClick={openAddStaffModal}
                    className="w-full bg-primary/10 text-primary border border-primary/20 py-2 rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Staff Member
                  </button>

                  {staff.length === 0 ? (
                    <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed border-border">
                      <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No staff members yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {staff.map((member) => (
                        <div
                          key={member.id}
                          className="bg-background border border-border rounded-lg p-3 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-foreground">{member.name}</p>
                                {member.email && (
                                  <p className="text-[10px] text-muted-foreground">{member.email}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditStaffModal(member)}
                                className="p-1 text-muted-foreground hover:text-foreground"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteStaffMember(member.id)}
                                className="p-1 text-muted-foreground hover:text-destructive"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                              member.role === "owner" ? "bg-emerald-100 text-emerald-800" :
                              member.role === "manager" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {member.role}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between pt-1 border-t border-border">
                            <span className="text-[10px] flex items-center gap-1">
                              {member.pin ? (
                                <>
                                  <Lock className="w-3 h-3 text-emerald-500" />
                                  <span className="text-emerald-500">PIN Set</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">No PIN</span>
                                </>
                              )}
                            </span>
                            <button
                              onClick={() => openPinChangeModal(member)}
                              className="text-[10px] text-primary hover:text-primary/80"
                            >
                              {member.pin ? "Change" : "Set PIN"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-3 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={saveAllSettings}
            disabled={saving}
            className="w-fit mx-auto bg-primary hover:opacity-90 text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
              </h3>
              <button onClick={() => { setShowStaffModal(false); resetModalStates(); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <input
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Staff member name"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Required for PIN verification</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role *</label>
                <select
                  value={staffRole}
                  onChange={(e) => {
                    const newRole = e.target.value as "staff" | "manager" | "owner";
                    setStaffRole(newRole);
                    // Apply role preset when role changes
                    applyRolePreset(newRole);
                  }}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  {isOwner() && <option value="owner">Owner</option>}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {staffRole === "staff" 
                    ? "Staff members have core POS access only"
                    : staffRole === "manager"
                    ? "Managers have POS + management access"
                    : "Owners have full access to all features"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Permissions</label>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {/* Core POS Operations */}
                  <div className="mb-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-foreground mb-2">Core POS Operations</p>
                    {Object.entries({
                      access_pos: "Access Point of Sale",
                      manage_transactions: "Process Sales & Returns",
                      manage_customers: "Manage Customers",
                      access_display: "Access Customer Display",
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staffPermissions[key as keyof typeof staffPermissions]}
                          onChange={(e) => setStaffPermissions(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                          disabled={staffRole === "staff"} // Core permissions locked for staff
                          className="rounded text-primary focus:ring-primary disabled:opacity-50"
                        />
                        <div>
                          <span className="text-sm text-foreground">{label}</span>
                          {staffRole === "staff" && (
                            <p className="text-xs text-muted-foreground">Required for staff role</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {/* Management Operations */}
                  <div className="mb-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-foreground mb-2">Management Operations</p>
                    {Object.entries({
                      manage_inventory: "Manage Inventory",
                      view_reports: "View Reports & Analytics",
                      manage_hardware: "Manage Hardware (Printers)",
                      manage_card_terminal: "Manage Card Terminal",
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staffPermissions[key as keyof typeof staffPermissions]}
                          onChange={(e) => setStaffPermissions(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                          disabled={staffRole === "staff"} // Disabled for staff role
                          className="rounded text-primary focus:ring-primary disabled:opacity-50"
                        />
                        <span className="text-sm text-foreground">{label}</span>
                      </label>
                    ))}
                  </div>
                  
                  {/* Administrative Operations */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs font-medium text-foreground mb-2">Administrative Operations</p>
                    {Object.entries({
                      manage_settings: "Manage Business Settings",
                      manage_staff: "Manage Staff Members",
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={staffPermissions[key as keyof typeof staffPermissions]}
                          onChange={(e) => setStaffPermissions(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                          disabled={staffRole === "staff" || (staffRole === "manager" && !isOwner())}
                          className="rounded text-primary focus:ring-primary disabled:opacity-50"
                        />
                        <span className="text-sm text-foreground">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">PIN (Optional)</label>
                <input
                  type="password"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="4-6 digit PIN"
                  maxLength={6}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {staffPin && staffPin.length >= 4 && (
                  <div className="mt-3 space-y-2">
                    {!codeSent ? (
                      <button
                        onClick={sendVerificationCode}
                        className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
                      >
                        Send Verification Code to Email
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button
                          onClick={sendVerificationCode}
                          className="w-full text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          Resend Code
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowStaffModal(false); resetModalStates(); }}
                className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={saveStaffMember}
                disabled={verifying}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {verifying ? "Saving..." : editingStaff ? "Save Changes" : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Change Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Change PIN</h3>
              <button onClick={() => { setShowPinModal(false); resetModalStates(); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-primary">
                  Changing PIN for: <strong>{pinChangeStaff?.name}</strong>
                </p>
                {staffEmail && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Verification code will be sent to: {staffEmail}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">New PIN</label>
                <input
                  type="password"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="4-6 digit PIN"
                  maxLength={6}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              {staffPin && staffPin.length >= 4 && (
                <>
                  {!codeSent ? (
                    <button
                      onClick={sendVerificationCode}
                      className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Send Verification Code
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Verification Code</label>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <button
                        onClick={sendVerificationCode}
                        className="w-full text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Resend Code
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPinModal(false); resetModalStates(); }}
                className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={verifyAndSavePin}
                disabled={!codeSent || !verificationCode || verifying || staffPin.length < 4}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {verifying ? "Saving..." : "Save PIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


