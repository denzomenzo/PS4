// lib/thermalPrinter.ts
/**
 * UNIFIED THERMAL PRINTER SERVICE
 * Supports: USB, Network (Ethernet), WiFi, and Bluetooth
 * All-in-one solution - no external dependencies
 */

export interface ThermalReceiptData {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  shopEmail?: string;
  taxNumber?: string;
  transactionId: string;
  date: Date;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
    sku?: string;
  }[];
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: string;
  staffName?: string;
  customerName?: string;
  customerBalance?: number;
  notes?: string;
  footer?: string;
  serviceName?: string;
  serviceFee?: number;
}

export interface PrinterSettings {
  width: 58 | 80; // mm
  connectionType: 'usb' | 'network' | 'wifi' | 'bluetooth';
  ipAddress?: string; // For network/wifi printers
  port?: number; // Default 9100 for network
  encoding?: 'GB18030' | 'UTF-8';
  autoCut?: boolean;
  openDrawer?: boolean;
}

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

export const COMMANDS = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  DOUBLE_HEIGHT_ON: ESC + '!' + '\x10',
  DOUBLE_WIDTH_ON: ESC + '!' + '\x20',
  DOUBLE_SIZE_ON: ESC + '!' + '\x30',
  NORMAL_SIZE: ESC + '!' + '\x00',
  CUT_PAPER: GS + 'V' + '\x41' + '\x00',
  CASH_DRAWER: ESC + 'p' + '\x00' + '\x19' + '\xFA',
  LINE_FEED: '\n',
  LINE_FEEDS: (n: number) => ESC + 'd' + String.fromCharCode(n),
  BARCODE: (data: string) => GS + 'k' + '\x04' + data + '\x00',
};

/**
 * USB Thermal Printer (Web USB API)
 * Works with: Chrome, Edge
 */
export class USBThermalPrinter {
  private device: USBDevice | null = null;
  private width: number = 80;

  async connect(): Promise<boolean> {
    try {
      console.log('🔌 Requesting USB printer...');

      if (!navigator.usb) {
        alert('Web USB not supported. Use Chrome or Edge.');
        return false;
      }

      this.device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x0416 }, // Citizen
          { vendorId: 0x0fe6 }, // Generic
        ]
      });

      console.log('✅ Printer selected:', this.device.productName);

      await this.device.open();
      console.log('✅ Device opened');

      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
        console.log('✅ Configuration selected');
      }

      await this.device.claimInterface(0);
      console.log('✅ Interface claimed');

      return true;

    } catch (error: any) {
      console.error('❌ USB connection failed:', error);
      if (error.name === 'NotFoundError') {
        alert('No printer selected. Please try again.');
      } else if (error.name === 'SecurityError') {
        alert('USB access denied. Please allow USB access and try again.');
      } else {
        alert(`Printer connection failed: ${error.message}`);
      }
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await this.device.releaseInterface(0);
        await this.device.close();
        this.device = null;
        console.log('✅ USB printer disconnected');
      } catch (error) {
        console.error('❌ Disconnect error:', error);
      }
    }
  }

  async print(data: ThermalReceiptData, settings: PrinterSettings): Promise<boolean> {
    if (!this.device) {
      console.error('❌ No printer connected');
      return false;
    }

    try {
      this.width = settings.width;
      
      const commands = this.generateCommands(data, settings);
      const encoder = new TextEncoder();
      const buffer = encoder.encode(commands);

      await this.device.transferOut(1, buffer);

      console.log('✅ USB receipt printed');
      return true;

    } catch (error: any) {
      console.error('❌ USB print error:', error);
      alert(`Print failed: ${error.message}`);
      return false;
    }
  }

  async openCashDrawer(): Promise<boolean> {
    if (!this.device) {
      console.error('❌ No printer connected');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const command = encoder.encode(COMMANDS.CASH_DRAWER);
      await this.device.transferOut(1, command);
      console.log('✅ USB cash drawer opened');
      return true;
    } catch (error: any) {
      console.error('❌ Cash drawer error:', error);
      return false;
    }
  }

  private generateCommands(data: ThermalReceiptData, settings: PrinterSettings): string {
    const lineWidth = this.width === 58 ? 32 : 48;
    let output = '';

    // Initialize
    output += COMMANDS.INIT;

    // Header
    output += COMMANDS.ALIGN_CENTER;
    output += COMMANDS.DOUBLE_SIZE_ON;
    output += (data.shopName || 'YOUR BUSINESS').substring(0, lineWidth - 4) + COMMANDS.LINE_FEED;
    output += COMMANDS.NORMAL_SIZE;

    if (data.shopAddress) output += data.shopAddress + COMMANDS.LINE_FEED;
    if (data.shopPhone) output += 'Tel: ' + data.shopPhone + COMMANDS.LINE_FEED;
    if (data.shopEmail) output += data.shopEmail + COMMANDS.LINE_FEED;
    if (data.taxNumber) output += 'VAT: ' + data.taxNumber + COMMANDS.LINE_FEED;

    output += COMMANDS.LINE_FEED;
    output += '-'.repeat(lineWidth) + COMMANDS.LINE_FEED;

    // Transaction Info
    output += COMMANDS.ALIGN_LEFT;
    output += `Receipt: #${data.transactionId}${COMMANDS.LINE_FEED}`;
    output += `Date: ${data.date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}${COMMANDS.LINE_FEED}`;

    if (data.staffName) output += `Staff: ${data.staffName}${COMMANDS.LINE_FEED}`;
    if (data.customerName) output += `Customer: ${data.customerName}${COMMANDS.LINE_FEED}`;

    output += '-'.repeat(lineWidth) + COMMANDS.LINE_FEED;

    // Items
    data.items.forEach(item => {
      const nameLine = item.name.length > lineWidth - 20 
        ? item.name.substring(0, lineWidth - 23) + '...' 
        : item.name;
      
      output += this.formatItemLine(
        nameLine,
        item.quantity.toString(),
        `£${item.price.toFixed(2)}`,
        `£${item.total.toFixed(2)}`,
        lineWidth
      ) + COMMANDS.LINE_FEED;
      
      if (item.sku) output += `  SKU: ${item.sku}${COMMANDS.LINE_FEED}`;
    });

    // Service Fee
    if (data.serviceName && data.serviceFee && data.serviceFee > 0) {
      output += '-'.repeat(lineWidth) + COMMANDS.LINE_FEED;
      output += this.formatLine(data.serviceName, `£${data.serviceFee.toFixed(2)}`, lineWidth) + COMMANDS.LINE_FEED;
    }

    output += '-'.repeat(lineWidth) + COMMANDS.LINE_FEED;

    // Totals
    output += this.formatLine('Subtotal:', `£${data.subtotal.toFixed(2)}`, lineWidth) + COMMANDS.LINE_FEED;
    if (data.vat > 0) {
      output += this.formatLine('VAT (20%):', `£${data.vat.toFixed(2)}`, lineWidth) + COMMANDS.LINE_FEED;
    }

    output += COMMANDS.BOLD_ON;
    output += this.formatLine('TOTAL:', `£${data.total.toFixed(2)}`, lineWidth) + COMMANDS.LINE_FEED;
    output += COMMANDS.BOLD_OFF;

    output += COMMANDS.LINE_FEED;
    output += this.formatLine('Payment:', data.paymentMethod.toUpperCase(), lineWidth) + COMMANDS.LINE_FEED;

    if (data.customerBalance !== undefined && data.customerBalance > 0) {
      output += this.formatLine('Balance Used:', `£${data.customerBalance.toFixed(2)}`, lineWidth) + COMMANDS.LINE_FEED;
    }

    if (data.notes) {
      output += COMMANDS.LINE_FEED;
      output += `Note: ${data.notes}${COMMANDS.LINE_FEED}`;
    }

    // Footer
    output += '-'.repeat(lineWidth) + COMMANDS.LINE_FEED;
    output += COMMANDS.ALIGN_CENTER;
    output += COMMANDS.LINE_FEED;
    
    if (data.footer) {
      output += data.footer + COMMANDS.LINE_FEED;
    } else {
      output += 'Thank you for your business!' + COMMANDS.LINE_FEED;
    }

    output += COMMANDS.LINE_FEEDS(3);

    if (settings.autoCut !== false) {
      output += COMMANDS.CUT_PAPER;
    }

    return output;
  }

  private formatLine(left: string, right: string, width: number): string {
    const spaces = width - left.length - right.length;
    if (spaces < 1) {
      return left.substring(0, width - right.length - 1) + ' ' + right;
    }
    return left + ' '.repeat(spaces) + right;
  }

  private formatItemLine(name: string, qty: string, price: string, total: string, width: number): string {
    const nameWidth = width - 17;
    const namePart = name.length > nameWidth ? name.substring(0, nameWidth) : name.padEnd(nameWidth);
    const qtyPart = qty.padStart(3);
    const pricePart = price.padStart(6);
    const totalPart = total.padStart(7);
    return namePart + qtyPart + pricePart + totalPart;
  }
}

/**
 * Network Thermal Printer (TCP/IP)
 * Works with: WiFi and Wired Ethernet printers
 */
export class NetworkThermalPrinter {
  private ipAddress: string;
  private port: number;
  private width: number = 80;

  constructor(ipAddress: string, port: number = 9100) {
    this.ipAddress = ipAddress;
    this.port = port;
  }

  async print(data: ThermalReceiptData, settings: PrinterSettings): Promise<boolean> {
    try {
      this.width = settings.width;

      const usbPrinter = new USBThermalPrinter();
      const commands = (usbPrinter as any).generateCommands(data, settings);

      const response = await fetch('/api/print/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: this.ipAddress,
          port: this.port,
          data: commands,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Network print failed');
      }

      console.log('✅ Network receipt printed');
      return true;

    } catch (error: any) {
      console.error('❌ Network print error:', error);
      alert(`Network print failed: ${error.message}`);
      return false;
    }
  }

  async openCashDrawer(): Promise<boolean> {
    try {
      const response = await fetch('/api/print/network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: this.ipAddress,
          port: this.port,
          data: COMMANDS.CASH_DRAWER,
        })
      });

      if (!response.ok) {
        throw new Error('Cash drawer command failed');
      }

      console.log('✅ Network cash drawer opened');
      return true;

    } catch (error: any) {
      console.error('❌ Network drawer error:', error);
      return false;
    }
  }
}

/**
 * Bluetooth Thermal Printer (Web Bluetooth API)
 * Works with: Chrome, Edge, Opera
 */
export class BluetoothThermalPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private width: number = 80;

  private readonly PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
  private readonly EPSON_SERVICE_UUID = '00001101-0000-1000-8000-00805f9b34fb';
  private readonly DATA_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

  async connect(): Promise<boolean> {
    try {
      console.log('📱 Requesting Bluetooth printer...');

      if (!navigator.bluetooth) {
        alert('Bluetooth not supported. Use Chrome, Edge, or Opera.');
        return false;
      }

      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [this.PRINTER_SERVICE_UUID] },
          { services: [this.EPSON_SERVICE_UUID] },
          { namePrefix: 'TM-' },
          { namePrefix: 'EPSON' },
          { namePrefix: 'Star' },
          { namePrefix: 'TSP' },
        ],
        optionalServices: [this.PRINTER_SERVICE_UUID, this.EPSON_SERVICE_UUID]
      });

      console.log('✅ Bluetooth device selected:', this.device.name);

      const server = await this.device.gatt?.connect();
      if (!server) throw new Error('GATT connection failed');

      console.log('✅ Connected to GATT server');

      let service: BluetoothRemoteGATTService | null = null;
      
      try {
        service = await server.getPrimaryService(this.PRINTER_SERVICE_UUID);
      } catch {
        service = await server.getPrimaryService(this.EPSON_SERVICE_UUID);
      }

      if (!service) throw new Error('Printer service not found');

      this.characteristic = await service.getCharacteristic(this.DATA_CHARACTERISTIC_UUID);
      
      console.log('✅ Bluetooth printer connected');
      return true;

    } catch (error: any) {
      console.error('❌ Bluetooth error:', error);
      
      if (error.name === 'NotFoundError') {
        alert('No Bluetooth printer selected. Please try again.');
      } else {
        alert(`Bluetooth connection failed: ${error.message}\n\nMake sure:\n1. Printer is powered on\n2. Printer is in pairing mode\n3. Printer is within range`);
      }
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
      this.device = null;
      this.characteristic = null;
      console.log('✅ Bluetooth printer disconnected');
    }
  }

  async print(data: ThermalReceiptData, settings: PrinterSettings): Promise<boolean> {
    if (!this.characteristic) {
      console.error('❌ No Bluetooth printer connected');
      return false;
    }

    try {
      this.width = settings.width;

      const usbPrinter = new USBThermalPrinter();
      const commands = (usbPrinter as any).generateCommands(data, settings);

      const encoder = new TextEncoder();
      const buffer = encoder.encode(commands);

      // Bluetooth MTU limit: 512 bytes per chunk
      const chunkSize = 512;
      let offset = 0;

      while (offset < buffer.length) {
        const chunk = buffer.slice(offset, offset + chunkSize);
        await this.characteristic.writeValue(chunk);
        offset += chunkSize;

        if (offset < buffer.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log('✅ Bluetooth receipt printed');
      return true;

    } catch (error: any) {
      console.error('❌ Bluetooth print error:', error);
      alert(`Bluetooth print failed: ${error.message}`);
      return false;
    }
  }

  async openCashDrawer(): Promise<boolean> {
    if (!this.characteristic) {
      console.error('❌ No Bluetooth printer connected');
      return false;
    }

    try {
      const encoder = new TextEncoder();
      const command = encoder.encode(COMMANDS.CASH_DRAWER);
      await this.characteristic.writeValue(command);
      console.log('✅ Bluetooth cash drawer opened');
      return true;
    } catch (error: any) {
      console.error('❌ Bluetooth drawer error:', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.device?.gatt?.connected || false;
  }

  getDeviceName(): string | undefined {
    return this.device?.name;
  }
}

/**
 * WiFi Printer Discovery (Optional)
 * Discovers ESC/POS printers on local network
 */
export class WiFiPrinterDiscovery {
  private discoveredPrinters: Array<{
    name: string;
    ipAddress: string;
    port: number;
    manufacturer: string;
    model: string;
  }> = [];

  async discover(): Promise<typeof this.discoveredPrinters> {
    try {
      console.log('🔍 Discovering WiFi printers...');

      const response = await fetch('/api/printer/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Discovery failed');
      }

      const data = await response.json();
      this.discoveredPrinters = data.printers || [];

      console.log(`✅ Found ${this.discoveredPrinters.length} WiFi printers`);
      return this.discoveredPrinters;

    } catch (error: any) {
      console.error('❌ WiFi discovery error:', error);
      return [];
    }
  }

  getPrinters() {
    return this.discoveredPrinters;
  }
}

/**
 * UNIFIED Thermal Printer Manager
 * Handles ALL connection types: USB, Network, WiFi, Bluetooth
 */
export class ThermalPrinterManager {
  private usbPrinter: USBThermalPrinter | null = null;
  private networkPrinter: NetworkThermalPrinter | null = null;
  private bluetoothPrinter: BluetoothThermalPrinter | null = null;
  private wifiDiscovery: WiFiPrinterDiscovery = new WiFiPrinterDiscovery();
  private settings: PrinterSettings | null = null;

  /**
   * Discover WiFi printers on network (optional)
   */
  async discoverWiFiPrinters() {
    return await this.wifiDiscovery.discover();
  }

  /**
   * Initialize printer connection
   */
  async initialize(settings: PrinterSettings): Promise<boolean> {
    this.settings = settings;

    // USB Connection
    if (settings.connectionType === 'usb') {
      this.usbPrinter = new USBThermalPrinter();
      const connected = await this.usbPrinter.connect();
      if (!connected) {
        this.usbPrinter = null;
      }
      return connected;
    }

    // Network/WiFi Connection (same protocol, different label)
    if (settings.connectionType === 'network' || settings.connectionType === 'wifi') {
      if (!settings.ipAddress) {
        alert('Printer IP address is required');
        return false;
      }
      this.networkPrinter = new NetworkThermalPrinter(
        settings.ipAddress,
        settings.port || 9100
      );
      return true;
    }

    // Bluetooth Connection
    if (settings.connectionType === 'bluetooth') {
      this.bluetoothPrinter = new BluetoothThermalPrinter();
      const connected = await this.bluetoothPrinter.connect();
      if (!connected) {
        this.bluetoothPrinter = null;
      }
      return connected;
    }

    return false;
  }

  /**
   * Print receipt
   */
  async print(data: ThermalReceiptData): Promise<boolean> {
    if (!this.settings) {
      console.error('❌ Printer not initialized');
      return false;
    }

    if (this.usbPrinter) {
      return await this.usbPrinter.print(data, this.settings);
    }
    if (this.networkPrinter) {
      return await this.networkPrinter.print(data, this.settings);
    }
    if (this.bluetoothPrinter) {
      return await this.bluetoothPrinter.print(data, this.settings);
    }

    return false;
  }

  /**
   * Open cash drawer
   */
  async openCashDrawer(): Promise<boolean> {
    if (this.usbPrinter) {
      return await this.usbPrinter.openCashDrawer();
    }
    if (this.networkPrinter) {
      return await this.networkPrinter.openCashDrawer();
    }
    if (this.bluetoothPrinter) {
      return await this.bluetoothPrinter.openCashDrawer();
    }
    return false;
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    if (this.usbPrinter) {
      await this.usbPrinter.disconnect();
      this.usbPrinter = null;
    }
    if (this.bluetoothPrinter) {
      await this.bluetoothPrinter.disconnect();
      this.bluetoothPrinter = null;
    }
    this.networkPrinter = null;
    this.settings = null;
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    if (this.usbPrinter) return true;
    if (this.networkPrinter) return true;
    if (this.bluetoothPrinter?.isConnected()) return true;
    return false;
  }

  /**
   * Get connection type
   */
  getConnectionType(): string | null {
    return this.settings?.connectionType || null;
  }

  /**
   * Get connected device info
   */
  getDeviceInfo(): { type: string; name?: string; ip?: string } | null {
    if (!this.isConnected()) return null;

    if (this.bluetoothPrinter?.isConnected()) {
      return {
        type: 'Bluetooth',
        name: this.bluetoothPrinter.getDeviceName()
      };
    }

    if (this.networkPrinter) {
      return {
        type: this.settings?.connectionType === 'wifi' ? 'WiFi' : 'Network',
        ip: this.settings?.ipAddress
      };
    }

    if (this.usbPrinter) {
      return {
        type: 'USB'
      };
    }

    return null;
  }
}

// Singleton instance
let printerManager: ThermalPrinterManager | null = null;

export function getThermalPrinterManager(): ThermalPrinterManager {
  if (!printerManager) {
    printerManager = new ThermalPrinterManager();
  }
  return printerManager;
}

// For testing without printer
export class MockThermalPrinter {
  async print(data: ThermalReceiptData): Promise<boolean> {
    console.log('📝 MOCK PRINT - Receipt:', {
      transactionId: data.transactionId,
      total: data.total,
      items: data.items.length
    });
    return true;
  }

  async openCashDrawer(): Promise<boolean> {
    console.log('💰 MOCK - Cash drawer opened');
    return true;
  }
}
