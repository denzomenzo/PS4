"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { ArrowLeft, Printer, Barcode, DollarSign, Check, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function Hardware() {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);

  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [printerWidth, setPrinterWidth] = useState(80);
  const [autoPrint, setAutoPrint] = useState(true);
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");

  const [cashDrawerEnabled, setCashDrawerEnabled] = useState(false);

  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [scannerSound, setScannerSound] = useState(true);

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
    });

    if (error) {
      alert("Error saving settings");
    } else {
      alert("✅ Hardware settings saved!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading hardware settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
            Hardware
          </h1>
          <Link href="/" className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
            Back to POS
          </Link>
        </div>

        <div className="space-y-8">
          
          {/* Receipt Printer */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Printer className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">Receipt Printer</h2>
                  <p className="text-slate-400">Configure thermal printer settings</p>
                </div>
              </div>
              <button
                onClick={() => setPrinterEnabled(!printerEnabled)}
                className={`relative w-20 h-10 rounded-full transition-all shadow-lg ${
                  printerEnabled ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform flex items-center justify-center shadow-lg ${
                    printerEnabled ? 'translate-x-10' : 'translate-x-0'
                  }`}
                >
                  {printerEnabled && <Check className="w-5 h-5 text-emerald-500" />}
                </div>
              </button>
            </div>

            {printerEnabled && (
              <div className="space-y-5 pl-20">
                <div>
                  <label className="block text-lg font-semibold mb-2 text-slate-300">Printer Name</label>
                  <input
                    value={printerName}
                    onChange={(e) => setPrinterName(e.target.value)}
                    placeholder="e.g. EPSON TM-T20"
                    className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold mb-2 text-slate-300">Paper Width</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPrinterWidth(58)}
                      className={`p-4 rounded-xl font-bold transition-all ${
                        printerWidth === 58
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-900/50 border border-slate-700/50 hover:border-cyan-500/50'
                      }`}
                    >
                      58mm
                    </button>
                    <button
                      onClick={() => setPrinterWidth(80)}
                      className={`p-4 rounded-xl font-bold transition-all ${
                        printerWidth === 80
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-900/50 border border-slate-700/50 hover:border-cyan-500/50'
                      }`}
                    >
                      80mm
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-xl hover:border-slate-600/50 transition-all">
                  <div>
                    <h3 className="text-lg font-bold">Auto-Print Receipts</h3>
                    <p className="text-sm text-slate-400">Print after every transaction</p>
                  </div>
                  <button
                    onClick={() => setAutoPrint(!autoPrint)}
                    className={`relative w-16 h-8 rounded-full transition-all ${
                      autoPrint ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        autoPrint ? 'translate-x-8' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-lg font-semibold mb-2 text-slate-300">Receipt Header</label>
                  <textarea
                    value={receiptHeader}
                    onChange={(e) => setReceiptHeader(e.target.value)}
                    placeholder="Optional header text..."
                    rows={2}
                    className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-base focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold mb-2 text-slate-300">Receipt Footer</label>
                  <textarea
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="Optional footer text..."
                    rows={2}
                    className="w-full bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-base focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cash Drawer */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <DollarSign className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">Cash Drawer</h2>
                  <p className="text-slate-400">Open drawer automatically after payment</p>
                </div>
              </div>
              <button
                onClick={() => setCashDrawerEnabled(!cashDrawerEnabled)}
                className={`relative w-20 h-10 rounded-full transition-all shadow-lg ${
                  cashDrawerEnabled ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform flex items-center justify-center shadow-lg ${
                    cashDrawerEnabled ? 'translate-x-10' : 'translate-x-0'
                  }`}
                >
                  {cashDrawerEnabled && <Check className="w-5 h-5 text-emerald-500" />}
                </div>
              </button>
            </div>
          </div>

          {/* Barcode Scanner */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Barcode className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">Barcode Scanner</h2>
                  <p className="text-slate-400">USB or Bluetooth scanner support</p>
                </div>
              </div>
              <button
                onClick={() => setScannerEnabled(!scannerEnabled)}
                className={`relative w-20 h-10 rounded-full transition-all shadow-lg ${
                  scannerEnabled ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform flex items-center justify-center shadow-lg ${
                    scannerEnabled ? 'translate-x-10' : 'translate-x-0'
                  }`}
                >
                  {scannerEnabled && <Check className="w-5 h-5 text-emerald-500" />}
                </div>
              </button>
            </div>

            {scannerEnabled && (
              <div className="pl-20">
                <div className="flex items-center justify-between bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 p-5 rounded-xl hover:border-slate-600/50 transition-all">
                  <div>
                    <h3 className="text-lg font-bold">Scan Sound</h3>
                    <p className="text-sm text-slate-400">Play beep on successful scan</p>
                  </div>
                  <button
                    onClick={() => setScannerSound(!scannerSound)}
                    className={`relative w-16 h-8 rounded-full transition-all ${
                      scannerSound ? 'bg-emerald-500' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                        scannerSound ? 'translate-x-8' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/20 backdrop-blur-lg border border-blue-500/30 rounded-3xl p-6 shadow-lg">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold mb-2 text-blue-400">Hardware Setup Tips</h3>
                <ul className="space-y-2 text-slate-300">
                  <li>• Ensure your printer is connected via USB or network</li>
                  <li>• Barcode scanners work in HID keyboard emulation mode</li>
                  <li>• Cash drawer opens via printer RJ11/RJ12 connection</li>
                  <li>• Test hardware before enabling in production</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveSettings}
            className="w-full bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 py-6 rounded-3xl text-2xl font-bold transition-all shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            Save Hardware Settings
          </button>

        </div>
      </div>
    </div>
  );
}