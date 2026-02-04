// app/dashboard/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { Plus, Trash2, Edit2, Check, ArrowLeft, Users, Store, Loader2, X, FileText, Image, Save, Lock, Shield, AlertCircle, Mail } from "lucide-react";
import Link from "next/link";

interface Staff {
  id: number;
  name: string;
  email?: string | null;
  pin?: string | null;
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

  // Staff
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [staffRole, setStaffRole] = useState<"staff" | "manager" | "owner">("staff");
  const [staffPermissions, setStaffPermissions] = useState({
    // Core POS Operations - Default enabled for all roles
    access_pos: true,
    process_transactions: true,
    manage_customers: true,
    access_display: true,
    
    // Management Operations - Default disabled, enabled based on role
    manage_inventory: false,
    view_reports: false,
    manage_hardware: false,
    manage_card_terminal: false,
    
    // Administrative Operations - Default disabled, only for managers/owners
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

  // Username field for staff
  const [staffUsername, setStaffUsername] = useState("");

  // Function to apply role-based permission presets
  const applyRolePreset = (role: "staff" | "manager" | "owner") => {
    if (role === "staff") {
      setStaffPermissions({
        // Core POS Operations - Required for staff
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
      });
    } else if (role === "manager") {
      setStaffPermissions(prev => ({
        // Core POS Operations - Required for managers
        access_pos: true,
        process_transactions: true,
        manage_customers: true,
        access_display: true,
        
        // Management Operations - Enabled by default for managers
        manage_inventory: true,
        view_reports: true,
        manage_hardware: true,
        manage_card_terminal: true,
        
        // Administrative Operations - Keep existing or default to false
        manage_settings: prev.manage_settings,
        manage_staff: prev.manage_staff,
      }));
    } else if (role === "owner") {
      // Owners have everything enabled
      setStaffPermissions({
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
      });
    }
  };

  useEffect(() => {
    if (userId && currentStaff) {
      if (!isOwner() && !isManager()) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      loadData();
    }
  }, [userId, currentStaff]);

  const loadData = async () => {
    setLoading(true);

    try {
      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (settingsData) {
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
      }

      const { data: staffData } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", userId)
        .order("name");
      
      if (staffData) {
        // Normalize staff data with new permission structure
        const normalizedStaffData = staffData.map((member: any) => ({
          ...member,
          permissions: {
            // Core POS Operations
            access_pos: member.permissions?.access_pos !== false,
            process_transactions: member.permissions?.process_transactions !== false,
            manage_customers: member.permissions?.manage_customers !== false,
            access_display: member.permissions?.access_display !== false,
            
            // Management Operations
            manage_inventory: member.permissions?.manage_inventory || false,
            view_reports: member.permissions?.view_reports || false,
            manage_hardware: member.permissions?.manage_hardware || false,
            manage_card_terminal: member.permissions?.manage_card_terminal || false,
            
            // Administrative Operations
            manage_settings: member.permissions?.manage_settings || false,
            manage_staff: member.permissions?.manage_staff || false,
          },
        }));
        setStaff(normalizedStaffData);
      }

    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveAllSettings = async () => {
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
        alert("❌ Error saving settings: " + error.message);
      } else {
        alert("✅ All settings saved successfully!");
      }
    } catch (err) {
      alert("❌ An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const resetModalStates = () => {
    setStaffName("");
    setStaffEmail("");
    setStaffUsername("");
    setStaffPin("");
    setStaffRole("staff");
    setStaffPermissions({
      access_pos: true,
      process_transactions: true,
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
    resetModalStates();
    setShowStaffModal(true);
  };

  const openEditStaffModal = (member: Staff) => {
    setEditingStaff(member);
    setStaffName(member.name);
    setStaffEmail(member.email || "");
    setStaffUsername(member.email?.split('@')[0] || "");
    setStaffPin("");
    setStaffRole(member.role);
    
    // Apply the member's permissions
    setStaffPermissions({
      access_pos: member.permissions.access_pos !== false,
      process_transactions: member.permissions.process_transactions !== false,
      manage_customers: member.permissions.manage_customers !== false,
      access_display: member.permissions.access_display !== false,
      manage_inventory: member.permissions.manage_inventory || false,
      view_reports: member.permissions.view_reports || false,
      manage_hardware: member.permissions.manage_hardware || false,
      manage_card_terminal: member.permissions.manage_card_terminal || false,
      manage_settings: member.permissions.manage_settings || false,
      manage_staff: member.permissions.manage_staff || false,
    });
    
    setShowStaffModal(true);
  };

  const openPinChangeModal = (member: Staff) => {
    setPinChangeStaff(member);
    setStaffEmail(member.email || "");
    setStaffPin("");
    setVerificationCode("");
    setSentCode("");
    setCodeSent(false);
    setShowPinModal(true);
  };

  const sendVerificationCode = async () => {
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
        alert("❌ Failed to send verification email. Please try again.");
        setCodeSent(false);
        setSentCode("");
        return;
      }

      setCodeSent(true);
      alert(`✅ Verification code sent to ${staffEmail}`);
    } catch (error) {
      alert("❌ Failed to send verification email. Please check your connection.");
      setCodeSent(false);
      setSentCode("");
    }
  };

  const verifyAndSavePin = async () => {
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
      alert("❌ Error updating PIN: " + error.message);
    } finally {
      setVerifying(false);
    }
  };

  const saveStaffMember = async () => {
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
      const staffData: any = {
        user_id: userId,
        name: staffName.trim(),
        email: staffEmail.trim(),
        role: staffRole,
        permissions: staffPermissions,
      };
      
      if (staffPin && staffPin.length >= 4) {
        staffData.pin = staffPin;
      }
      
      if (editingStaff) {
        const { error } = await supabase
          .from("staff")
          .update(staffData)
          .eq("id", editingStaff.id)
          .eq("user_id", userId);
        
        if (error) throw error;
      } else {
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
      alert("Error saving staff member: " + error.message);
    }
  };

  const deleteStaffMember = async (id: number) => {
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
      alert("Error deleting staff member: " + error.message);
    }
  };

  if (!userId || !currentStaff) return null;

  if (loading) {
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
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your business configuration</p>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="space-y-6">
        {/* Business Settings */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Business Settings</h2>
              <p className="text-sm text-muted-foreground">Configure your business information</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Business Name (POS Display)</label>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Your Business Name"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">This name appears on the POS sidebar</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Image className="w-4 h-4" />
                Business Logo (Optional)
              </label>
              <input
                type="url"
                value={businessLogoUrl}
                onChange={(e) => setBusinessLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {businessLogoUrl && (
                <div className="mt-2 bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2">Logo Preview:</p>
                    <img
                      src={businessLogoUrl}
                      alt="Business logo preview"
                      className="max-w-[120px] max-h-[60px] object-contain"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-foreground">VAT (20%)</p>
                <p className="text-xs text-muted-foreground">Add VAT to all transactions</p>
              </div>
              <button
                onClick={() => setVatEnabled(!vatEnabled)}
                className={`relative w-12 h-6 rounded-full transition-all ${vatEnabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${vatEnabled ? 'translate-x-6' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Customization */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Receipt Customization</h2>
              <p className="text-sm text-muted-foreground">Customize how your receipts look</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Receipt Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Business Name on Receipt</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="My Salon"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                <textarea
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="123 Main St, London, UK"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+44 20 1234 5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="info@mysalon.com"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Receipt Design</h3>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={receiptLogoUrl}
                  onChange={(e) => setReceiptLogoUrl(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com/logo.png"
                />
              </div>

              {receiptLogoUrl && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Logo Preview:</p>
                  <img
                    src={receiptLogoUrl}
                    alt="Logo preview"
                    className="max-w-[100px] max-h-[50px] object-contain"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tax/VAT Number</label>
                <input
                  type="text"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="GB123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Website</label>
                <input
                  type="url"
                  value={businessWebsite}
                  onChange={(e) => setBusinessWebsite(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="www.yourshop.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Receipt Message</label>
                <textarea
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Thank you for your business!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Refund Days (Optional)</label>
                <input
                  type="number"
                  value={refundDays}
                  onChange={(e) => setRefundDays(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 30"
                />
              </div>
            </div>
          </div>

          {/* Receipt Preview */}
          <div className="mt-6 bg-muted/30 rounded-lg p-4 border border-border">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Receipt Preview
            </h3>
            
            <div className="bg-white text-black p-4 rounded-lg max-w-xs mx-auto font-mono text-xs">
              {receiptLogoUrl && (
                <img
                  src={receiptLogoUrl}
                  alt="Logo"
                  className="max-w-[80px] h-auto mx-auto mb-2"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              )}
              
              <div className="text-center font-bold mb-1">
                {businessName || shopName || "Your Business Name"}
              </div>
              
              {businessAddress && (
                <div className="text-center mb-1 whitespace-pre-line">{businessAddress}</div>
              )}
              
              {businessPhone && <div className="text-center">{businessPhone}</div>}
              {businessEmail && <div className="text-center">{businessEmail}</div>}
              {businessWebsite && <div className="text-center">{businessWebsite}</div>}
              {taxNumber && <div className="text-center mb-1">Tax No: {taxNumber}</div>}
              
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              
              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span>✂️ Haircut</span>
                  <span>£25.00</span>
                </div>
                <div className="flex justify-between">
                  <span>🧴 Shampoo</span>
                  <span>£8.99</span>
                </div>
              </div>
              
              <div className="border-t-2 border-gray-800 pt-2">
                <div className="flex justify-between text-sm">
                  <span>TOTAL:</span>
                  <span>£33.99</span>
                </div>
              </div>
              
              <div className="text-center mt-2 text-xs">
                {receiptFooter}
              </div>
            </div>
          </div>
        </div>

        {/* Staff Members */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Staff Members</h2>
                <p className="text-sm text-muted-foreground">{staff.length} team members</p>
              </div>
            </div>
            <button
              onClick={openAddStaffModal}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Staff
            </button>
          </div>

          {staff.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">No staff members yet</p>
              <button
                onClick={openAddStaffModal}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
              >
                Add Your First Staff Member
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="bg-background border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        {member.email && (
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.role === "owner" ? "bg-emerald-100 text-emerald-800" :
                          member.role === "manager" ? "bg-blue-100 text-blue-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {member.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditStaffModal(member)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteStaffMember(member.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {Object.entries({
                      access_pos: "POS Access",
                      process_transactions: "Transactions",
                      manage_customers: "Customers",
                      access_display: "Display",
                      manage_inventory: "Inventory",
                      view_reports: "Reports",
                      manage_hardware: "Hardware",
                      manage_card_terminal: "Card Terminal",
                      manage_settings: "Settings",
                      manage_staff: "Staff Management",
                    }).map(([key, label]) => {
                      const hasPerm = member.permissions[key as keyof typeof member.permissions];
                      if (hasPerm) {
                        return (
                          <span key={key} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                            {label}
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs flex items-center gap-1">
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
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      {member.pin ? "Change PIN" : "Set PIN"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveAllSettings}
            disabled={saving}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Settings
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
                
                <div className="space-y-2">
                  {/* Core POS Operations */}
                  <div className="mb-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-foreground mb-2">Core POS Operations</p>
                    {Object.entries({
                      access_pos: "Access Point of Sale",
                      process_transactions: "Process Sales & Returns",
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
