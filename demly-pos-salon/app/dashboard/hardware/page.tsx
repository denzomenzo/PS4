// app/dashboard/hardware/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { 
  ArrowLeft, 
  Printer, 
  Barcode, 
  DollarSign, 
  Check, 
  Loader2, 
  AlertCircle, 
  Monitor, 
  Wifi, 
  Usb, 
  PowerOff, 
  RefreshCw, 
  X,
  Bluetooth,
  Radio,
  Zap,
  Globe,
  Save,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import Link from "next/link";
import { getThermalPrinterManager } from "@/lib/thermalPrinter";

export default function Hardware() {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<any[]>([]);
  const [showDiscovery, setShowDiscovery] = useState(false);

  // Printer settings
  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [printerConnectionType, setPrinterConnectionType] = useState<'usb' | 'network' | 'wifi' | 'bluetooth'>('usb');
  const [printerIpAddress, setPrinterIpAddress] = useState('');
  const [printerPort, setPrinterPort] = useState(9100);
  const [printerName, setPrinterName] = useState("");
  const [printerWidth, setPrinterWidth] = useState(80);
  const [autoPrint, setAutoPrint] = useState(true);
  const [autoCutPaper, setAutoCutPaper] = useState(true);
  const [receiptHeader, setReceiptHeader] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("Thank you for your business!");
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerTesting, setPrinterTesting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ type: string; name?: string; ip?: string } | null>(null);

  // Cash drawer
  const [cashDrawerEnabled, setCashDrawerEnabled] = useState(false);

  // Barcode scanner
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [scannerSound, setScannerSound] = useState(true);

  // Customer display
  const [customerDisplayEnabled, setCustomerDisplayEnabled] = useState(false);
  const [displaySyncChannel, setDisplaySyncChannel] = useState("customer-display");

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState({
    printer: true,
    cashDrawer: false,
    scanner: false,
    display: false,
    tips: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Load settings on mount and when userId changes
  useEffect(() => {
    if (userId) {
      loadSettings();
    }
  }, [userId]);

  // Check printer connection status
  useEffect(() => {
    const checkPrinterConnection = async () => {
      const manager = getThermalPrinterManager();
      const connected = manager.isConnected();
      setPrinterConnected(connected);
      
      if (connected) {
        const info = manager.getDeviceInfo();
        setDeviceInfo(info);
      } else {
        setDeviceInfo(null);
      }
    };
    
    if (printerEnabled) {
      checkPrinterConnection();
    } else {
      setPrinterConnected(false);
      setDeviceInfo(null);
    }
  }, [printerEnabled]);

  const loadSettings = async () => {
    if (!userId) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("hardware_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        console.log('Loaded settings:', data);
        
        // Customer display
        setCustomerDisplayEnabled(data.customer_display_enabled || false);
        setDisplaySyncChannel(data.display_sync_channel || "customer-display");
        
        // Printer settings
        setPrinterEnabled(data.printer_enabled || false);
        setPrinterConnectionType(data.printer_connection_type || 'usb');
        setPrinterIpAddress(data.printer_ip_address || '');
        setPrinterPort(data.printer_port || 9100);
        setPrinterName(data.printer_name || "");
        setPrinterWidth(data.printer_width || 80);
        setAutoPrint(data.auto_print_receipt !== false);
        setAutoCutPaper(data.auto_cut_paper !== false);
        setReceiptHeader(data.receipt_header || "");
        setReceiptFooter(data.receipt_footer || "Thank you for your business!");
        
        // Cash drawer
        setCashDrawerEnabled(data.cash_drawer_enabled || false);
        
        // Scanner
        setScannerEnabled(data.barcode_scanner_enabled !== false);
        setScannerSound(data.scanner_sound_enabled !== false);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!userId) return;
    
    setSaving(true);
    
    try {
      const settings = {
        user_id: userId,
        printer_enabled: printerEnabled,
        printer_connection_type: printerConnectionType,
        printer_ip_address: (printerConnectionType === 'network' || printerConnectionType === 'wifi') ? printerIpAddress : null,
        printer_port: (printerConnectionType === 'network' || printerConnectionType === 'wifi') ? printerPort : null,
        printer_name: printerName || null,
        printer_width: printerWidth,
        auto_print_receipt: autoPrint,
        auto_cut_paper: autoCutPaper,
        receipt_header: receiptHeader || null,
        receipt_footer: receiptFooter || 'Thank you for your business!',
        cash_drawer_enabled: cashDrawerEnabled,
        barcode_scanner_enabled: scannerEnabled,
        scanner_sound_enabled: scannerSound,
        customer_display_enabled: customerDisplayEnabled,
        display_sync_channel: displaySyncChannel,
        updated_at: new Date().toISOString()
      };

      console.log('Saving settings:', settings);

      // First check if record exists
      const { data: existing } = await supabase
        .from("hardware_settings")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      let error;
      
      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("hardware_settings")
          .update(settings)
          .eq("user_id", userId);
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("hardware_settings")
          .insert([settings]);
        error = insertError;
      }

      if (error) throw error;
      
      alert("✅ Hardware settings saved!");
      
      // Reload settings to confirm
      await loadSettings();
      
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert("❌ Error saving settings: " + (error.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const connectPrinter = async () => {
    if (!printerEnabled) return;
    
    try {
      const manager = getThermalPrinterManager();

      const success = await manager.initialize({
        width: printerWidth as 58 | 80,
        connectionType: printerConnectionType,
        ipAddress: (printerConnectionType === 'network' || printerConnectionType === 'wifi') ? printerIpAddress : undefined,
        port: (printerConnectionType === 'network' || printerConnectionType === 'wifi') ? printerPort : undefined,
        autoCut: autoCutPaper,
        openDrawer: cashDrawerEnabled,
      });

      if (success) {
        setPrinterConnected(true);
        const info = manager.getDeviceInfo();
        setDeviceInfo(info);
        
        let message = `✅ ${printerConnectionType === 'usb' ? 'USB' : 
                        printerConnectionType === 'bluetooth' ? 'Bluetooth' :
                        printerConnectionType === 'wifi' ? 'WiFi' : 'Network'} printer connected successfully!`;
        
        if (info?.name) {
          message += `\n\nDevice: ${info.name}`;
        }
        if (info?.ip) {
          message += `\nIP: ${info.ip}`;
        }
        
        alert(message);
      }
    } catch (error: any) {
      console.error("Printer connection error:", error);
      alert(`❌ Failed to connect printer: ${error.message}`);
    }
  };

  const disconnectPrinter = async () => {
    const manager = getThermalPrinterManager();
    await manager.disconnect();
    setPrinterConnected(false);
    setDeviceInfo(null);
    alert("🔌 Printer disconnected");
  };

  const discoverPrinters = async () => {
    setDiscovering(true);
    setShowDiscovery(true);
    
    try {
      const manager = getThermalPrinterManager();
      const printers = await manager.discoverWiFiPrinters();
      setDiscoveredPrinters(printers);
      
      if (printers.length === 0) {
        alert('No printers found on network. Make sure:\n1. Printer is powered on\n2. Printer is connected to same network\n3. Printer has ESC/POS enabled');
      }
    } catch (error: any) {
      console.error("Discovery error:", error);
      alert(`Discovery failed: ${error.message}`);
    } finally {
      setDiscovering(false);
    }
  };

  const selectDiscoveredPrinter = (printer: any) => {
    setPrinterIpAddress(printer.ipAddress);
    setPrinterPort(printer.port || 9100);
    setPrinterName(printer.name);
    setShowDiscovery(false);
    alert(`✅ Selected ${printer.name} (${printer.ipAddress})`);
  };

  const testPrint = async () => {
    if (!printerConnected) {
      alert("⚠️ Please connect printer first");
      return;
    }

    setPrinterTesting(true);
    
    try {
      const manager = getThermalPrinterManager();

      // Get business settings for test receipt
      const { data: settings } = await supabase
        .from("settings")
        .select("business_name, business_address, business_phone, business_email, tax_number")
        .eq("user_id", userId)
        .maybeSingle();

      const success = await manager.print({
        shopName: settings?.business_name || 'Test Business',
        shopAddress: settings?.business_address,
        shopPhone: settings?.business_phone,
        shopEmail: settings?.business_email,
        taxNumber: settings?.tax_number,
        transactionId: 'TEST-' + Date.now().toString().slice(-6),
        date: new Date(),
        items: [
          { 
            name: 'Test Product 1', 
            quantity: 2, 
            price: 5.99, 
            total: 11.98,
            sku: 'TEST-001'
          },
          { 
            name: 'Test Product 2', 
            quantity: 1, 
            price: 3.50, 
            total: 3.50,
            sku: 'TEST-002'
          }
        ],
        subtotal: 15.48,
        vat: 3.10,
        total: 18.58,
        paymentMethod: 'cash',
        staffName: 'Test Staff',
        footer: receiptFooter || 'Thank you for your business!'
      });

      if (success) {
        alert('✅ Test receipt printed successfully!');
        
        // Test cash drawer if enabled
        if (cashDrawerEnabled) {
          const drawerSuccess = await manager.openCashDrawer();
          if (drawerSuccess) {
            alert('💰 Cash drawer opened!');
          }
        }
      }
    } catch (error: any) {
      console.error("Test print error:", error);
      alert(`❌ Test print failed: ${error.message}`);
    } finally {
      setPrinterTesting(false);
    }
  };

  // Toggle component with better visibility
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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Hardware Settings</h1>
              <p className="text-sm text-muted-foreground">Configure POS hardware devices</p>
            </div>
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          <div className="space-y-3">
            
            {/* Receipt Printer - Compact */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('printer')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Printer className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Receipt Printer</h2>
                    <p className="text-xs text-muted-foreground">
                      {printerEnabled ? 'Enabled' : 'Disabled'} • {printerConnectionType}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.printer ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                  <ToggleSwitch 
                    enabled={printerEnabled} 
                    onChange={() => setPrinterEnabled(!printerEnabled)}
                    size="small"
                  />
                </div>
              </div>

              {expandedSections.printer && printerEnabled && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  {/* Connection Status - Small */}
                  {printerConnected && deviceInfo && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-600 font-medium">Connected</span>
                      </div>
                      <div className="text-muted-foreground">
                        {deviceInfo.type} {deviceInfo.name && `• ${deviceInfo.name}`}
                      </div>
                    </div>
                  )}

                  {/* Connection Type - Compact Grid */}
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      onClick={() => setPrinterConnectionType('usb')}
                      className={`p-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center ${
                        printerConnectionType === 'usb'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-accent'
                      }`}
                    >
                      <Usb className="w-3 h-3 mb-0.5" />
                      USB
                    </button>
                    <button
                      onClick={() => setPrinterConnectionType('wifi')}
                      className={`p-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center ${
                        printerConnectionType === 'wifi'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-accent'
                      }`}
                    >
                      <Wifi className="w-3 h-3 mb-0.5" />
                      WiFi
                    </button>
                    <button
                      onClick={() => setPrinterConnectionType('network')}
                      className={`p-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center ${
                        printerConnectionType === 'network'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-accent'
                      }`}
                    >
                      <Globe className="w-3 h-3 mb-0.5" />
                      LAN
                    </button>
                    <button
                      onClick={() => setPrinterConnectionType('bluetooth')}
                      className={`p-2 rounded-lg text-xs font-medium transition-all flex flex-col items-center ${
                        printerConnectionType === 'bluetooth'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-accent'
                      }`}
                    >
                      <Bluetooth className="w-3 h-3 mb-0.5" />
                      BT
                    </button>
                  </div>

                  {/* IP/Network Input - Compact */}
                  {(printerConnectionType === 'network' || printerConnectionType === 'wifi') && (
                    <div className="flex gap-2">
                      <input
                        value={printerIpAddress}
                        onChange={(e) => setPrinterIpAddress(e.target.value)}
                        placeholder="192.168.1.100"
                        className="flex-1 bg-background border border-border text-foreground p-2 rounded-lg text-xs"
                      />
                      <button
                        onClick={discoverPrinters}
                        disabled={discovering}
                        className="px-2 py-2 bg-muted hover:bg-accent rounded-lg text-xs flex items-center gap-1"
                      >
                        {discovering ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Radio className="w-3 h-3" />
                        )}
                        <span className="hidden sm:inline">Find</span>
                      </button>
                    </div>
                  )}

                  {/* Paper Width - Compact */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPrinterWidth(58)}
                      className={`p-2 rounded-lg text-xs font-medium ${
                        printerWidth === 58
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-accent'
                      }`}
                    >
                      58mm
                    </button>
                    <button
                      onClick={() => setPrinterWidth(80)}
                      className={`p-2 rounded-lg text-xs font-medium ${
                        printerWidth === 80
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground hover:bg-accent'
                      }`}
                    >
                      80mm
                    </button>
                  </div>

                  {/* Auto Options - Compact */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Auto-Cut</span>
                    <ToggleSwitch 
                      enabled={autoCutPaper} 
                      onChange={() => setAutoCutPaper(!autoCutPaper)}
                      size="small"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Auto-Print</span>
                    <ToggleSwitch 
                      enabled={autoPrint} 
                      onChange={() => setAutoPrint(!autoPrint)}
                      size="small"
                    />
                  </div>

                  {/* Connect/Test Buttons - Compact */}
                  <div className="flex gap-2">
                    {!printerConnected ? (
                      <button
                        onClick={connectPrinter}
                        className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        Connect
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={disconnectPrinter}
                          className="flex-1 bg-red-500/10 text-red-600 border border-red-500/20 py-2 rounded-lg text-xs font-medium"
                        >
                          Disconnect
                        </button>
                        <button
                          onClick={testPrint}
                          disabled={printerTesting}
                          className="flex-1 bg-primary/10 text-primary border border-primary/20 py-2 rounded-lg text-xs font-medium"
                        >
                          {printerTesting ? '...' : 'Test'}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Receipt Header - Hidden by default, can be added if needed */}
                  {(receiptHeader || receiptFooter !== "Thank you for your business!") && (
                    <div className="text-xs text-muted-foreground">
                      {receiptHeader && <p>Header: {receiptHeader}</p>}
                      {receiptFooter && <p>Footer: {receiptFooter}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cash Drawer - Compact */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('cashDrawer')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Cash Drawer</h2>
                    <p className="text-xs text-muted-foreground">
                      {cashDrawerEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.cashDrawer ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                  <ToggleSwitch 
                    enabled={cashDrawerEnabled} 
                    onChange={() => setCashDrawerEnabled(!cashDrawerEnabled)}
                    size="small"
                  />
                </div>
              </div>

              {expandedSections.cashDrawer && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    Opens automatically for cash payments when printer is connected.
                  </p>
                </div>
              )}
            </div>

            {/* Barcode Scanner - Compact */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('scanner')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Barcode className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Barcode Scanner</h2>
                    <p className="text-xs text-muted-foreground">
                      {scannerEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.scanner ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                  <ToggleSwitch 
                    enabled={scannerEnabled} 
                    onChange={() => setScannerEnabled(!scannerEnabled)}
                    size="small"
                  />
                </div>
              </div>

              {expandedSections.scanner && scannerEnabled && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground">Scan Sound</span>
                    <ToggleSwitch 
                      enabled={scannerSound} 
                      onChange={() => setScannerSound(!scannerSound)}
                      size="small"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Customer Display - Compact */}
            <div className="bg-card border border-border rounded-lg p-3">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleSection('display')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Customer Display</h2>
                    <p className="text-xs text-muted-foreground">
                      {customerDisplayEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedSections.display ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                  <ToggleSwitch 
                    enabled={customerDisplayEnabled} 
                    onChange={() => setCustomerDisplayEnabled(!customerDisplayEnabled)}
                    size="small"
                  />
                </div>
              </div>

              {expandedSections.display && customerDisplayEnabled && (
                <div className="mt-3 pt-3 border-t border-border">
                  <code className="block bg-muted text-foreground p-2 rounded text-xs font-mono break-all">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/dashboard/display
                  </code>
                </div>
              )}
            </div>

            {/* Tips - Compact */}
            <div 
              className="bg-primary/5 border border-primary/20 rounded-lg p-3 cursor-pointer"
              onClick={() => toggleSection('tips')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">Setup Tips</span>
                </div>
                {expandedSections.tips ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              {expandedSections.tips && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <p>• USB: Chrome/Edge only</p>
                  <p>• WiFi/LAN: Static IP + port 9100</p>
                  <p>• Bluetooth: Pairing mode first</p>
                  <p>• Test before enabling auto-print</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compact Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-3 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-primary hover:opacity-90 text-primary-foreground py-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
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
    </div>
  );
}
