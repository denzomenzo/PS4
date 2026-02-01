// app/dashboard/hardware/page.tsx - COMPLETE DARK THEME VERSION
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { ArrowLeft, Printer, Barcode, DollarSign, Check, Loader2, AlertCircle, Monitor } from "lucide-react";
import Link from "next/link";

export default function Hardware() {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [printerWidth, setPrinterWidth] = useState(80);
  const [autoPrint, setAutoPrint] = useState(true);
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");

  const [cashDrawerEnabled, setCashDrawerEnabled] = useState(false);

  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [scannerSound, setScannerSound] = useState(true);

  const [customerDisplayEnabled, setCustomerDisplayEnabled] = useState(false);
  const [displaySyncChannel, setDisplaySyncChannel] = useState("customer-display");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("hardware_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setCustomerDisplayEnabled(data.customer_display_enabled || false);
      setDisplaySyncChannel(data.display_sync_channel || "customer-display");
      setPrinterEnabled(data.printer_enabled || false);
      setPrinterName(data.printer_name || "");
      setPrinterWidth(data.printer_width || 80);
      setAutoPrint(data.auto_print_receipt !== false);
      setReceiptHeader(data.receipt_header || "");
      setReceiptFooter(data.receipt_footer || "");
      setCashDrawerEnabled(data.cash_drawer_enabled || false);
      setScannerEnabled(data.barcode_scanner_enabled !== false);
      setScannerSound(data.scanner_sound_enabled !== false);
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    
    try {
      const { error } = await supabase.from("hardware_settings").upsert({
        user_id: userId,
        printer_enabled: printerEnabled,
        printer_name: printerName,
        printer_width: printerWidth,
        auto_print_receipt: autoPrint,
        receipt_header: receiptHeader,
        receipt_footer: receiptFooter,
        cash_drawer_enabled: cashDrawerEnabled,
        barcode_scanner_enabled: scannerEnabled,
        scanner_sound_enabled: scannerSound,
        customer_display_enabled: customerDisplayEnabled,
        display_sync_channel: displaySyncChannel,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
      
      alert("✅ Hardware settings saved!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert("❌ Error saving settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Loading hardware settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hardware Settings</h1>
          <p className="text-muted-foreground mt-2">Configure POS hardware devices</p>
        </div>
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>

      <div className="space-y-6">
        
        {/* Receipt Printer */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Printer className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Receipt Printer</h2>
                <p className="text-muted-foreground text-sm">Configure thermal printer settings</p>
              </div>
            </div>
            <button
              onClick={() => setPrinterEnabled(!printerEnabled)}
              className={`relative w-16 h-8 rounded-full transition-all ${
                printerEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-background rounded-full transition-transform flex items-center justify-center ${
                  printerEnabled ? 'translate-x-8' : 'translate-x-0'
                }`}
              >
                {printerEnabled && <Check className="w-4 h-4 text-primary" />}
              </div>
            </button>
          </div>

          {printerEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Printer Name</label>
                <input
                  value={printerName}
                  onChange={(e) => setPrinterName(e.target.value)}
                  placeholder="e.g. EPSON TM-T20"
                  className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Paper Width</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrinterWidth(58)}
                    className={`p-3 rounded-lg font-medium transition-all ${
                      printerWidth === 58
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-accent'
                    }`}
                  >
                    58mm
                  </button>
                  <button
                    onClick={() => setPrinterWidth(80)}
                    className={`p-3 rounded-lg font-medium transition-all ${
                      printerWidth === 80
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-accent'
                    }`}
                  >
                    80mm
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between bg-muted/50 border border-border p-4 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Auto-Print Receipts</h3>
                  <p className="text-xs text-muted-foreground">Print after every transaction</p>
                </div>
                <button
                  onClick={() => setAutoPrint(!autoPrint)}
                  className={`relative w-14 h-7 rounded-full transition-all ${
                    autoPrint ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-background rounded-full transition-transform ${
                      autoPrint ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Receipt Header (Optional)</label>
                <textarea
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                  placeholder="Optional header text..."
                  rows={2}
                  className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Receipt Footer (Optional)</label>
                <textarea
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  placeholder="Optional footer text..."
                  rows={2}
                  className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Cash Drawer */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Cash Drawer</h2>
                <p className="text-muted-foreground text-sm">Open drawer automatically after cash payment</p>
              </div>
            </div>
            <button
              onClick={() => setCashDrawerEnabled(!cashDrawerEnabled)}
              className={`relative w-16 h-8 rounded-full transition-all ${
                cashDrawerEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-background rounded-full transition-transform flex items-center justify-center ${
                  cashDrawerEnabled ? 'translate-x-8' : 'translate-x-0'
                }`}
              >
                {cashDrawerEnabled && <Check className="w-4 h-4 text-primary" />}
              </div>
            </button>
          </div>
        </div>

        {/* Barcode Scanner */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Barcode className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Barcode Scanner</h2>
                <p className="text-muted-foreground text-sm">USB or Bluetooth scanner support</p>
              </div>
            </div>
            <button
              onClick={() => setScannerEnabled(!scannerEnabled)}
              className={`relative w-16 h-8 rounded-full transition-all ${
                scannerEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-background rounded-full transition-transform flex items-center justify-center ${
                  scannerEnabled ? 'translate-x-8' : 'translate-x-0'
                }`}
              >
                {scannerEnabled && <Check className="w-4 h-4 text-primary" />}
              </div>
            </button>
          </div>

          {scannerEnabled && (
            <div className="flex items-center justify-between bg-muted/50 border border-border p-4 rounded-lg">
              <div>
                <h3 className="text-sm font-medium text-foreground">Scan Sound</h3>
                <p className="text-xs text-muted-foreground">Play beep on successful scan</p>
              </div>
              <button
                onClick={() => setScannerSound(!scannerSound)}
                className={`relative w-14 h-7 rounded-full transition-all ${
                  scannerSound ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-background rounded-full transition-transform ${
                    scannerSound ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        {/* Customer Display */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Monitor className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Customer Display</h2>
                <p className="text-muted-foreground text-sm">Secondary screen for customers</p>
              </div>
            </div>
            <button
              onClick={() => setCustomerDisplayEnabled(!customerDisplayEnabled)}
              className={`relative w-16 h-8 rounded-full transition-all ${
                customerDisplayEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 bg-background rounded-full transition-transform flex items-center justify-center ${
                  customerDisplayEnabled ? 'translate-x-8' : 'translate-x-0'
                }`}
              >
                {customerDisplayEnabled && <Check className="w-4 h-4 text-primary" />}
              </div>
            </button>
          </div>

          {customerDisplayEnabled && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-primary font-medium mb-2">
                Display URL: 
              </p>
              <code className="block bg-background border border-border text-foreground p-3 rounded text-xs font-mono">
                {typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/display
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Open this URL on your customer-facing screen. It will automatically sync with your active transaction.
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-foreground mb-3">Hardware Setup Tips</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Ensure your printer is connected via USB or network</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Barcode scanners work in HID keyboard emulation mode</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Cash drawer opens via printer RJ11/RJ12 connection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Test hardware before enabling in production</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Customer display requires a second screen or tablet</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full bg-primary hover:opacity-90 text-primary-foreground py-4 rounded-xl text-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-6 h-6" />
              Save Hardware Settings
            </>
          )}
        </button>

      </div>
    </div>
  );
}
