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
  Save
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
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-6xl mx-auto p-6">
          
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
                <ToggleSwitch 
                  enabled={printerEnabled} 
                  onChange={() => setPrinterEnabled(!printerEnabled)}
                  label="Toggle printer"
                />
              </div>

              {printerEnabled && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/30">
                  {/* Connection Status */}
                  {printerConnected && deviceInfo && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-600 font-medium">Printer Connected</span>
                      </div>
                      <div className="text-xs text-right">
                        <div className="text-muted-foreground">{deviceInfo.type}</div>
                        {deviceInfo.name && <div className="text-foreground font-medium">{deviceInfo.name}</div>}
                        {deviceInfo.ip && <div className="text-muted-foreground">{deviceInfo.ip}</div>}
                      </div>
                    </div>
                  )}

                  {/* Printer Name */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Printer Name</label>
                    <input
                      value={printerName}
                      onChange={(e) => setPrinterName(e.target.value)}
                      placeholder="e.g. EPSON TM-T20"
                      className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Paper Width */}
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
                        58mm (2.25")
                      </button>
                      <button
                        onClick={() => setPrinterWidth(80)}
                        className={`p-3 rounded-lg font-medium transition-all ${
                          printerWidth === 80
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground hover:bg-accent'
                        }`}
                      >
                        80mm (3.125")
                      </button>
                    </div>
                  </div>

                  {/* Connection Type */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Connection Type</label>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <button
                        onClick={() => setPrinterConnectionType('usb')}
                        className={`p-3 rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
                          printerConnectionType === 'usb'
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                            : 'bg-muted text-foreground hover:bg-accent border border-border'
                        }`}
                      >
                        <Usb className="w-5 h-5" />
                        <span className="text-xs">USB</span>
                      </button>
                      
                      <button
                        onClick={() => setPrinterConnectionType('wifi')}
                        className={`p-3 rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
                          printerConnectionType === 'wifi'
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                            : 'bg-muted text-foreground hover:bg-accent border border-border'
                        }`}
                      >
                        <Wifi className="w-5 h-5" />
                        <span className="text-xs">WiFi</span>
                      </button>

                      <button
                        onClick={() => setPrinterConnectionType('network')}
                        className={`p-3 rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
                          printerConnectionType === 'network'
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                            : 'bg-muted text-foreground hover:bg-accent border border-border'
                        }`}
                      >
                        <Globe className="w-5 h-5" />
                        <span className="text-xs">Ethernet</span>
                      </button>

                      <button
                        onClick={() => setPrinterConnectionType('bluetooth')}
                        className={`p-3 rounded-lg font-medium transition-all flex flex-col items-center gap-1 ${
                          printerConnectionType === 'bluetooth'
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                            : 'bg-muted text-foreground hover:bg-accent border border-border'
                        }`}
                      >
                        <Bluetooth className="w-5 h-5" />
                        <span className="text-xs">Bluetooth</span>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {printerConnectionType === 'usb' && 'USB works in Chrome/Edge (WebUSB). Connect via USB cable.'}
                      {printerConnectionType === 'wifi' && 'WiFi printers need IP address. Use discovery to find printers.'}
                      {printerConnectionType === 'network' && 'Ethernet printers need static IP (port 9100).'}
                      {printerConnectionType === 'bluetooth' && 'Bluetooth works in Chrome/Edge. Ensure printer is in pairing mode.'}
                    </p>
                  </div>

                  {/* Network/WiFi Settings */}
                  {(printerConnectionType === 'network' || printerConnectionType === 'wifi') && (
                    <>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-foreground mb-1.5">Printer IP Address</label>
                          <input
                            value={printerIpAddress}
                            onChange={(e) => setPrinterIpAddress(e.target.value)}
                            placeholder="192.168.1.100"
                            className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={discoverPrinters}
                          disabled={discovering}
                          className="mt-7 px-3 py-3 bg-muted hover:bg-accent text-foreground rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                          {discovering ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Radio className="w-4 h-4" />
                          )}
                          <span className="text-sm">Discover</span>
                        </button>
                      </div>

                      {/* Discovery Results */}
                      {showDiscovery && discoveredPrinters.length > 0 && (
                        <div className="bg-muted/50 border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-foreground">Discovered Printers</h4>
                            <button
                              onClick={() => setShowDiscovery(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {discoveredPrinters.map((printer, index) => (
                              <button
                                key={index}
                                onClick={() => selectDiscoveredPrinter(printer)}
                                className="w-full p-2 bg-background hover:bg-accent border border-border rounded-lg flex items-center gap-3 transition-colors"
                              >
                                <Wifi className="w-4 h-4 text-primary" />
                                <div className="flex-1 text-left">
                                  <p className="text-sm font-medium text-foreground">{printer.name}</p>
                                  <p className="text-xs text-muted-foreground">{printer.ipAddress}:{printer.port}</p>
                                </div>
                                <Zap className="w-4 h-4 text-muted-foreground" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Port</label>
                        <input
                          type="number"
                          value={printerPort}
                          onChange={(e) => setPrinterPort(parseInt(e.target.value))}
                          className="w-full bg-background border border-border text-foreground p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Default: 9100 (ESC/POS network port)</p>
                      </div>
                    </>
                  )}

                  {/* Bluetooth Info */}
                  {printerConnectionType === 'bluetooth' && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Bluetooth className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-1">Bluetooth Setup</h4>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            <li>1. Ensure printer is powered on</li>
                            <li>2. Put printer in pairing mode</li>
                            <li>3. Click "Connect Printer" below</li>
                            <li>4. Select your printer from the list</li>
                            <li>5. Bluetooth range: ~10 meters</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auto-Cut Paper */}
                  <div className="flex items-center justify-between bg-muted/50 border border-border p-4 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Auto-Cut Paper</h3>
                      <p className="text-xs text-muted-foreground">Automatically cut paper after printing</p>
                    </div>
                    <ToggleSwitch 
                      enabled={autoCutPaper} 
                      onChange={() => setAutoCutPaper(!autoCutPaper)}
                      size="small"
                    />
                  </div>

                  {/* Auto-Print Receipts */}
                  <div className="flex items-center justify-between bg-muted/50 border border-border p-4 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Auto-Print Receipts</h3>
                      <p className="text-xs text-muted-foreground">Print after every transaction</p>
                    </div>
                    <ToggleSwitch 
                      enabled={autoPrint} 
                      onChange={() => setAutoPrint(!autoPrint)}
                      size="small"
                    />
                  </div>

                  {/* Connect/Disconnect Buttons */}
                  <div className="flex gap-3">
                    {!printerConnected ? (
                      <button
                        onClick={connectPrinter}
                        className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Connect {printerConnectionType === 'bluetooth' ? 'Bluetooth' : 
                                 printerConnectionType === 'wifi' ? 'WiFi' : 
                                 printerConnectionType === 'network' ? 'Network' : 'USB'} Printer
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={disconnectPrinter}
                          className="flex-1 bg-red-500/10 text-red-600 border border-red-500/20 py-3 rounded-lg font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                        >
                          <PowerOff className="w-4 h-4" />
                          Disconnect
                        </button>
                        <button
                          onClick={testPrint}
                          disabled={printerTesting}
                          className="flex-1 bg-primary/10 text-primary border border-primary/20 py-3 rounded-lg font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {printerTesting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Test Print
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Receipt Header */}
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

                  {/* Receipt Footer */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Receipt Footer (Optional)</label>
                    <textarea
                      value={receiptFooter}
                      onChange={(e) => setReceiptFooter(e.target.value)}
                      placeholder="Thank you for your business!"
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
                    {printerConnected && cashDrawerEnabled && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Connected via {deviceInfo?.type || 'printer'}
                      </p>
                    )}
                  </div>
                </div>
                <ToggleSwitch 
                  enabled={cashDrawerEnabled} 
                  onChange={() => setCashDrawerEnabled(!cashDrawerEnabled)}
                  label="Toggle cash drawer"
                />
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
                <ToggleSwitch 
                  enabled={scannerEnabled} 
                  onChange={() => setScannerEnabled(!scannerEnabled)}
                  label="Toggle scanner"
                />
              </div>

              {scannerEnabled && (
                <div className="flex items-center justify-between bg-muted/50 border border-border p-4 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Scan Sound</h3>
                    <p className="text-xs text-muted-foreground">Play beep on successful scan</p>
                  </div>
                  <ToggleSwitch 
                    enabled={scannerSound} 
                    onChange={() => setScannerSound(!scannerSound)}
                    size="small"
                  />
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
                <ToggleSwitch 
                  enabled={customerDisplayEnabled} 
                  onChange={() => setCustomerDisplayEnabled(!customerDisplayEnabled)}
                  label="Toggle customer display"
                />
              </div>

              {customerDisplayEnabled && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-sm text-primary font-medium mb-2">
                    Display URL: 
                  </p>
                  <code className="block bg-background border border-border text-foreground p-3 rounded text-xs font-mono break-all">
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
                      <span>USB printers require Chrome/Edge and WebUSB permission</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>WiFi/Ethernet printers need static IP address and port 9100 open</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Bluetooth printers must be in pairing mode before connecting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Barcode scanners work in HID keyboard emulation mode</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Cash drawer opens via printer's RJ11/RJ12 connection</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Test hardware with "Test Print" before enabling auto-print</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Save Button at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-4 px-4">
        <div className="max-w-6xl mx-auto">
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
                <Save className="w-6 h-6" />
                Save Hardware Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
