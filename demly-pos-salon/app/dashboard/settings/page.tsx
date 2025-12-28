"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { Plus, Trash2, Edit2, Check, ArrowLeft, Users, Store, Loader2, X, FileText, Image, Save, Lock, Shield, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Staff {
  id: number;
  name: string;
  email?: string | null;
  pin?: string | null;
  role: "staff" | "manager" | "owner";
  permissions: {
    pos: boolean;
    inventory: boolean;
    reports: boolean;
    settings: boolean;
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
  const [receiptLogoUrl, setReceiptLogoUrl] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for your business!");

  // Staff
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [staffRole, setStaffRole] = useState<"staff" | "manager" | "owner">("staff");
  const [staffPermissions, setStaffPermissions] = useState({
    pos: true,
    inventory: false,
    reports: false,
    settings: false,
  });
  
  // PIN Change Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinChangeStaff, setPinChangeStaff] = useState<Staff | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (userId && currentStaff) {
      // Check permissions
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

    const { data: settingsData } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (settingsData) {
      setShopName(settingsData.shop_name || settingsData.business_name || "");
      setBusinessLogoUrl(settingsData.business_logo_url || "");
      setVatEnabled(settingsData.vat_enabled !== undefined ? settingsData.vat_enabled : true);
      setBusinessName(settingsData.business_name || settingsData.shop_name || "");
      setBusinessAddress(settingsData.business_address || "");
      setBusinessPhone(settingsData.business_phone || "");
      setBusinessEmail(settingsData.business_email || "");
      setReceiptLogoUrl(settingsData.receipt_logo_url || "");
      setReceiptFooter(settingsData.receipt_footer || "Thank you for your business!");
    }

    const { data: staffData } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    
    if (staffData) setStaff(staffData);

    setLoading(false);
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
            receipt_logo_url: receiptLogoUrl,
            receipt_footer: receiptFooter,
          },
          {
            onConflict: 'user_id',
            ignoreDuplicates: false
          }
        );

      if (error) {
        console.error("Error saving settings:", error);
        alert("❌ Error saving settings: " + error.message);
      } else {
        alert("✅ All settings saved successfully!");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("❌ An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const resetModalStates = () => {
    setStaffName("");
    setStaffEmail("");
    setStaffPin("");
    setStaffRole("staff");
    setStaffPermissions({
      pos: true,
      inventory: false,
      reports: false,
      settings: false,
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
    setStaffPin("");
    setStaffRole(member.role);
    setStaffPermissions(member.permissions || {
      pos: true,
      inventory: false,
      reports: false,
      settings: false,
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
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
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
        console.error("Error sending email:", functionError);
        alert("❌ Failed to send verification email. Please try again.");
        setCodeSent(false);
        setSentCode("");
        return;
      }

      setCodeSent(true);
      alert(`✅ Verification code sent to ${staffEmail}\n\nPlease check your email inbox (and spam folder).`);
    } catch (error) {
      console.error("Error sending verification code:", error);
      alert("❌ Failed to send verification email. Please check your connection and try again.");
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
      console.error("Error updating PIN:", error);
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
      if (editingStaff) {
        const updateData: any = {
          name: staffName.trim(),
          email: staffEmail.trim(),
          role: staffRole,
          permissions: staffPermissions,
        };
        
        if (staffPin && staffPin.length >= 4) {
          updateData.pin = staffPin;
        }
        
        const { error } = await supabase
          .from("staff")
          .update(updateData)
          .eq("id", editingStaff.id)
          .eq("user_id", userId);
        
        if (error) throw error;
      } else {
        const insertData: any = {
          user_id: userId,
          name: staffName.trim(),
          email: staffEmail.trim(),
          role: staffRole,
          permissions: staffPermissions,
        };
        
        if (staffPin && staffPin.length >= 4) {
          insertData.pin = staffPin;
        }
        
        const { error } = await supabase
          .from("staff")
          .insert(insertData);
        
        if (error) throw error;
      }

      setShowStaffModal(false);
      resetModalStates();
      loadData();
      alert("✅ Staff member saved successfully!");
    } catch (error: any) {
      console.error("Error saving staff:", error);
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
      console.error("Error deleting staff:", error);
      alert("Error deleting staff member: " + error.message);
    }
  };

  if (!userId || !currentStaff) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-8">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-12 max-w-md border border-red-500/30">
          <div className="text-center">
            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
            <h1 className="text-3xl font-black text-white mb-4">Access Denied</h1>
            <p className="text-slate-400 mb-6">
              Only managers and owners can access settings.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-slate-700 hover:bg-slate-600 px-8 py-4 rounded-xl font-bold transition-all"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
            Settings
          </h1>
          <Link href="/dashboard" className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
            Back to Dashboard
          </Link>
        </div>

        <div className="space-y-8">
          
          {/* Business Settings */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Store className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black">Business Settings</h2>
                <p className="text-slate-400">Configure your business information</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold mb-3 text-slate-300">Business Name (POS Display)</label>
                <input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Your Business Name"
                  className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-2xl text-xl placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                <p className="text-sm text-slate-400 mt-2">This name appears on the POS sidebar</p>
              </div>

              <div>
                <label className="block text-lg font-semibold mb-3 text-slate-300">
                  <div className="flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Business Logo (Optional)
                  </div>
                </label>
                <input
                  type="url"
                  value={businessLogoUrl}
                  onChange={(e) => setBusinessLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-2xl text-xl placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                <p className="text-sm text-slate-400 mt-2">Logo will display at the top of the POS sidebar</p>
                
                {businessLogoUrl && (
                  <div className="mt-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                    <p className="text-sm text-slate-400 mb-2">Logo Preview:</p>
                    <img
                      src={businessLogoUrl}
                      alt="Business logo preview"
                      className="max-w-[200px] max-h-[100px] object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-6 rounded-2xl hover:border-slate-600/50 transition-all">
                <div>
                  <h3 className="text-xl font-bold mb-1">VAT (20%)</h3>
                  <p className="text-slate-400">Add VAT to all transactions</p>
                </div>
                <button
                  onClick={() => setVatEnabled(!vatEnabled)}
                  className={`relative w-20 h-10 rounded-full transition-all shadow-lg ${
                    vatEnabled ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform flex items-center justify-center shadow-lg ${
                      vatEnabled ? 'translate-x-10' : 'translate-x-0'
                    }`}
                  >
                    {vatEnabled && <Check className="w-5 h-5 text-emerald-500" />}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Receipt Customization */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-3xl font-black">Receipt Customization</h2>
                <p className="text-slate-400">Customize how your receipts look</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">Receipt Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business Name on Receipt *
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="My Salon"
                  />
                  <p className="text-xs text-slate-400 mt-1">Separate from POS display name</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Address
                  </label>
                  <textarea
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="123 Main St, London, UK"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="+44 20 1234 5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="info@mysalon.com"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">Receipt Design</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Logo URL (Optional)
                    </div>
                  </label>
                  <input
                    type="url"
                    value={receiptLogoUrl}
                    onChange={(e) => setReceiptLogoUrl(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Enter a URL to display a logo on receipts
                  </p>
                </div>

                {receiptLogoUrl && (
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                    <p className="text-sm text-slate-400 mb-2">Logo Preview:</p>
                    <img
                      src={receiptLogoUrl}
                      alt="Logo preview"
                      className="max-w-[200px] max-h-[100px] object-contain mx-auto"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Receipt Footer Message
                  </label>
                  <textarea
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900/50 border border-slate-700/50 p-3 rounded-xl text-white focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    placeholder="Thank you for your business!"
                  />
                </div>
              </div>

            </div>

            {/* Receipt Preview */}
            <div className="bg-slate-900/30 rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Receipt Preview
              </h3>
              
              <div className="bg-white text-black p-6 rounded-lg max-w-[280px] mx-auto font-mono text-xs shadow-2xl">
                {receiptLogoUrl && (
                  <img
                    src={receiptLogoUrl}
                    alt="Logo"
                    className="max-w-[120px] h-auto mx-auto mb-3"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                
                <div className="text-center font-bold text-sm mb-2">
                  {businessName || shopName || "Your Business Name"}
                </div>
                
                {businessAddress && (
                  <div className="text-center text-[10px] mb-1 whitespace-pre-line">
                    {businessAddress}
                  </div>
                )}
                
                {businessPhone && (
                  <div className="text-center text-[10px] mb-1">{businessPhone}</div>
                )}
                
                {businessEmail && (
                  <div className="text-center text-[10px] mb-2">{businessEmail}</div>
                )}
                
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Receipt: #12345</span>
                </div>
                <div className="flex justify-between text-[10px] mb-2">
                  <span>{new Date().toLocaleDateString("en-GB")}</span>
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                
                <div className="space-y-1 mb-2">
                  <div className="flex justify-between text-[11px]">
                    <span>✂️ Haircut</span>
                    <span className="font-bold">£25.00</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>🧴 Shampoo</span>
                    <span className="font-bold">£8.99</span>
                  </div>
                </div>
                
                <div className="border-t-2 border-gray-800 pt-2 mb-1">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span>Subtotal:</span>
                    <span>£33.99</span>
                  </div>
                  {vatEnabled && (
                    <div className="flex justify-between text-[10px] mb-1">
                      <span>VAT (20%):</span>
                      <span>£6.80</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL:</span>
                    <span>£{vatEnabled ? '40.79' : '33.99'}</span>
                  </div>
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-2"></div>
                
                <div className="text-center text-[10px] mt-2 mb-3">
                  {receiptFooter}
                </div>

                {/* Barcode */}
                <div className="flex flex-col items-center mt-3">
                  <svg width="200" height="50" className="mx-auto">
                    <rect x="0" y="0" width="4" height="40" fill="black"/>
                    <rect x="6" y="0" width="2" height="40" fill="black"/>
                    <rect x="10" y="0" width="4" height="40" fill="black"/>
                    <rect x="16" y="0" width="2" height="40" fill="black"/>
                    <rect x="20" y="0" width="6" height="40" fill="black"/>
                    <rect x="28" y="0" width="2" height="40" fill="black"/>
                    <rect x="32" y="0" width="4" height="40" fill="black"/>
                    <rect x="38" y="0" width="2" height="40" fill="black"/>
                    <rect x="42" y="0" width="2" height="40" fill="black"/>
                    <rect x="46" y="0" width="6" height="40" fill="black"/>
                    <rect x="54" y="0" width="2" height="40" fill="black"/>
                    <rect x="58" y="0" width="4" height="40" fill="black"/>
                    <rect x="64" y="0" width="2" height="40" fill="black"/>
                    <rect x="68" y="0" width="4" height="40" fill="black"/>
                    <rect x="74" y="0" width="6" height="40" fill="black"/>
                    <rect x="82" y="0" width="2" height="40" fill="black"/>
                    <rect x="86" y="0" width="4" height="40" fill="black"/>
                    <rect x="92" y="0" width="2" height="40" fill="black"/>
                    <rect x="96" y="0" width="2" height="40" fill="black"/>
                    <rect x="100" y="0" width="4" height="40" fill="black"/>
                    <rect x="106" y="0" width="2" height="40" fill="black"/>
                    <rect x="110" y="0" width="6" height="40" fill="black"/>
                    <rect x="118" y="0" width="2" height="40" fill="black"/>
                    <rect x="122" y="0" width="4" height="40" fill="black"/>
                    <rect x="128" y="0" width="2" height="40" fill="black"/>
                    <rect x="132" y="0" width="2" height="40" fill="black"/>
                    <rect x="136" y="0" width="6" height="40" fill="black"/>
                    <rect x="144" y="0" width="2" height="40" fill="black"/>
                    <rect x="148" y="0" width="4" height="40" fill="black"/>
                    <rect x="154" y="0" width="2" height="40" fill="black"/>
                    <rect x="158" y="0" width="4" height="40" fill="black"/>
                    <rect x="164" y="0" width="6" height="40" fill="black"/>
                    <rect x="172" y="0" width="2" height="40" fill="black"/>
                    <rect x="176" y="0" width="4" height="40" fill="black"/>
                    <rect x="182" y="0" width="2" height="40" fill="black"/>
                    <rect x="186" y="0" width="2" height="40" fill="black"/>
                    <rect x="190" y="0" width="4" height="40" fill="black"/>
                    <rect x="196" y="0" width="2" height="40" fill="black"/>
                  </svg>
                  <div className="text-[9px] text-center mt-1 font-mono">
                    *12345*
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Members */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">Staff Members</h2>
                  <p className="text-slate-400">{staff.length} team members</p>
                </div>
              </div>
              <button
                onClick={openAddStaffModal}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40"
              >
                <Plus className="w-5 h-5" />
                Add Staff
              </button>
            </div>

            {staff.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/30 rounded-2xl border-2 border-dashed border-slate-700/50">
                <Users className="w-20 h-20 mx-auto mb-4 text-slate-600 opacity-30" />
                <p className="text-xl text-slate-400 mb-4">No staff members yet</p>
                <button
                  onClick={openAddStaffModal}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-3 rounded-xl font-bold transition-all shadow-lg"
                >
                  Add Your First Staff Member
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map((member) => (
                  <div
                    key={member.id}
                    className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-5 hover:border-purple-500/50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl font-black shadow-lg shadow-purple-500/20">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-lg font-bold block">{member.name}</span>
                          {member.email && (
                            <span className="text-xs text-slate-400">{member.email}</span>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              member.role === "owner" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                              member.role === "manager" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                              "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                            }`}>
                              {member.role.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditStaffModal(member)}
                          className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteStaffMember(member.id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="text-xs text-slate-400">Permissions:</div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(member.permissions || {}).map(([key, value]) => (
                          value && (
                            <span key={key} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs border border-cyan-500/20">
                              {key}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                      <span className="text-sm flex items-center gap-2">
                        {member.pin ? (
                          <>
                            <Lock className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400">PIN Set</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-500">No PIN</span>
                          </>
                        )}
                      </span>
                      <button
                        onClick={() => openPinChangeModal(member)}
                        className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                      >
                        {member.pin ? "Change PIN" : "Set PIN"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save All Button */}
          <div className="flex justify-end">
            <button
              onClick={saveAllSettings}
              disabled={saving || !shopName}
              className="px-12 py-5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 disabled:from-slate-700 disabled:to-slate-700 text-white font-black text-xl rounded-2xl transition-all shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {saving ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-6 h-6" />
                  Save All Settings
                </>
              )}
            </button>
          </div>

          {/* Quick Access */}
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              💡 Quick Access
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/dashboard/inventory"
                className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 hover:border-cyan-500/50 p-5 rounded-2xl transition-all group"
              >
                <h4 className="text-lg font-bold mb-1 group-hover:text-cyan-400 transition-colors">
                  Manage Inventory
                </h4>
                <p className="text-sm text-slate-400">Add products and services</p>
              </Link>
              <Link
                href="/dashboard/hardware"
                className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 hover:border-cyan-500/50 p-5 rounded-2xl transition-all group"
              >
                <h4 className="text-lg font-bold mb-1 group-hover:text-cyan-400 transition-colors">
                  Hardware Setup
                </h4>
                <p className="text-sm text-slate-400">Configure printers & scanners</p>
              </Link>
              {isOwner() && (
                <Link
                  href="/dashboard/settings/audit-logs"
                  className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 hover:border-cyan-500/50 p-5 rounded-2xl transition-all group"
                >
                  <h4 className="text-lg font-bold mb-1 group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Audit Logs
                  </h4>
                  <p className="text-sm text-slate-400">View security & activity logs</p>
                </Link>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">
                {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
              </h2>
              <button onClick={() => { setShowStaffModal(false); resetModalStates(); }} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-lg mb-2 font-medium">Name *</label>
                <input
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Staff member name"
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium">Email *</label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                <p className="text-xs text-slate-400 mt-1">Required for PIN verification</p>
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium">Role *</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as "staff" | "manager" | "owner")}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  {isOwner() && <option value="owner">Owner</option>}
                </select>
              </div>

              <div>
                <label className="block text-lg mb-3 font-medium">Permissions</label>
                <div className="space-y-2">
                  {Object.entries({
                    pos: "Point of Sale",
                    inventory: "Inventory Management",
                    reports: "Reports & Analytics",
                    settings: "Settings (Owner/Manager only)"
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={staffPermissions[key as keyof typeof staffPermissions]}
                        onChange={(e) => setStaffPermissions(prev => ({
                          ...prev,
                          [key]: e.target.checked
                        }))}
                        disabled={key === "settings" && staffRole === "staff"}
                        className="w-5 h-5 accent-cyan-500"
                      />
                      <span className="text-white">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium">PIN (Optional)</label>
                <input
                  type="password"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="4-6 digit PIN"
                  maxLength={6}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                {staffPin && staffPin.length >= 4 && (
                  <div className="mt-3 space-y-2">
                    {!codeSent ? (
                      <button
                        onClick={sendVerificationCode}
                        className="w-full bg-blue-500 hover:bg-blue-600 py-3 rounded-xl font-bold transition-all"
                      >
                        Send Verification Code
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="w-full bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl text-center text-2xl font-mono focus:outline-none focus:border-cyan-500/50"
                        />
                        <button
                          onClick={sendVerificationCode}
                          className="w-full text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          Resend Code
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => { setShowStaffModal(false); resetModalStates(); }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveStaffMember}
                disabled={verifying}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-700 disabled:to-slate-700 py-4 rounded-xl text-lg font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50"
              >
                {verifying ? "Saving..." : editingStaff ? "Save Changes" : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Change Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Change PIN</h2>
              <button onClick={() => { setShowPinModal(false); resetModalStates(); }} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-blue-400">
                  Changing PIN for: <strong>{pinChangeStaff?.name}</strong>
                </p>
                {staffEmail && (
                  <p className="text-xs text-slate-400 mt-1">
                    Verification code will be sent to: {staffEmail}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium">New PIN</label>
                <input
                  type="password"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="4-6 digit PIN"
                  maxLength={6}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  autoFocus
                />
              </div>

              {staffPin && staffPin.length >= 4 && (
                <>
                  {!codeSent ? (
                    <button
                      onClick={sendVerificationCode}
                      className="w-full bg-blue-500 hover:bg-blue-600 py-4 rounded-xl font-bold transition-all"
                    >
                      Send Verification Code
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm mb-2 font-medium">Verification Code</label>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-center text-2xl font-mono focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <button
                        onClick={sendVerificationCode}
                        className="w-full text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Resend Code
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => { setShowPinModal(false); resetModalStates(); }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={verifyAndSavePin}
                disabled={!codeSent || !verificationCode || verifying || staffPin.length < 4}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-slate-700 disabled:to-slate-700 py-4 rounded-xl text-lg font-bold transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50"
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
