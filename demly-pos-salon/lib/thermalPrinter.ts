// lib/thermalPrinter.ts
/**
 * Thermal Printer Service - Direct ESC/POS Communication
 * Supports Epson TM-T20, TM-T88, TM-m30 via USB or Network
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
  connectionType: 'usb' | 'network';
  ipAddress?: string; // For network printers
  port?: number; // Default 9100 for network
  encoding?: 'GB18030' | 'UTF-8';
  autoCut?: boolean;
  openDrawer?: boolean;
}

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

const COMMANDS = {
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
  BARCODE: (data: string) => GS + 'k' + '\x04' + data + '\x00', // CODE128
};

/**
 * USB Thermal Printer (Web USB API)
 */
export class USBThermalPrinter {
  private device: USBDevice | null = null;
  private width: number = 80;

  async connect(): Promise<boolean> {
    try {
      console.log('🔌 Requesting USB printer...');

      // Check if Web USB is supported
      if (!navigator.usb) {
        alert('Web USB is not supported in this browser. Please use Chrome or Edge.');
        return false;
      }

      // Request Epson printer via Web USB API
      this.device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x0416 }, // Citizen
          { vendorId: 0x0fe6 }, // Generic
        ]
      });

      console.log('✅ Printer selected:', this.device.productName);

      // Open device
      await this.device.open();
      console.log('✅ Device opened');

      // Select configuration
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
        console.log('✅ Configuration selected');
      }

      // Claim interface
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
        console.log('✅ Printer disconnected');
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
      
      // Generate ESC/POS commands
      const commands = this.generateCommands(data, settings);
      
      // Convert to Uint8Array
      const encoder = new TextEncoder();
      const buffer = encoder.encode(commands);

      // Send to printer (endpoint 1 is typical for Epson)
      await this.device.transferOut(1, buffer);

      console.log('✅ Receipt printed successfully');
      return true;

    } catch (error: any) {
      console.error('❌ Print error:', error);
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
      console.log('✅ Cash drawer opened');
      return true;
    } catch (error: any) {
      console.error('❌ Cash drawer error:', error);
      return false;
    }
  }

  private generateCommands(data: ThermalReceiptData, settings: PrinterSettings): string {
    const lineWidth = this.width === 58 ? 32 : 48;
    let output = '';

    // Initialize printer
    output += COMMANDS.INIT;

    // Header - Shop Name
    output += COMMANDS.ALIGN_CENTER;
    output += COMMANDS.DOUBLE_SIZE_ON;
    output += (data.shopName || 'YOUR BUSINESS').substring(0, lineWidth - 4) + COMMANDS.LINE_FEED;
    output += COMMANDS.NORMAL_SIZE;

    if (data.shopAddress) {
      output += data.shopAddress + COMMANDS.LINE_FEED;
    }
    if (data.shopPhone) {
      output += 'Tel: ' + data.shopPhone + COMMANDS.LINE_FEED;
    }
    if (data.shopEmail) {
      output += data.shopEmail + COMMANDS.LINE_FEED;
    }
    if (data.taxNumber) {
      output += 'VAT: ' + data.taxNumber + COMMANDS.LINE_FEED;
    }

    // Separator
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

    if (data.staffName) {
      output += `Staff: ${data.staffName}${COMMANDS.LINE_FEED}`;
    }
    if (data.customerName) {
      output += `Customer: ${data.customerName}${COMMANDS.LINE_FEED}`;
    }

    output += '-'.repeat(lineWidth) + COMMANDS.LINE_FEED;

    // Items Header
    output += this.formatItemLine('Item', 'Qty', 'Price', 'Total', lineWidth) + COMMANDS.LINE_FEED;

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
      
      if (item.sku) {
        output += `  SKU: ${item.sku}${COMMANDS.LINE_FEED}`;
      }
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

    // Customer Balance
    if (data.customerBalance !== undefined && data.customerBalance > 0) {
      output += this.formatLine('Balance Used:', `£${data.customerBalance.toFixed(2)}`, lineWidth) + COMMANDS.LINE_FEED;
    }

    // Notes
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

    // Add some line feeds before cutting
    output += COMMANDS.LINE_FEEDS(3);

    // Cut paper (if enabled)
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
    // Reserve space for qty (3 chars), price (7 chars), total (7 chars) = 17 chars + spaces
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

      // Generate ESC/POS commands
      const usbPrinter = new USBThermalPrinter();
      const commands = (usbPrinter as any).generateCommands(data, settings);

      // Send to network printer via your backend API
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

      console.log('✅ Receipt printed via network');
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

      console.log('✅ Cash drawer opened via network');
      return true;

    } catch (error: any) {
      console.error('❌ Network cash drawer error:', error);
      return false;
    }
  }
}

/**
 * Printer Manager - Handles both USB and Network printers
 */
export class ThermalPrinterManager {
  private usbPrinter: USBThermalPrinter | null = null;
  private networkPrinter: NetworkThermalPrinter | null = null;
  private settings: PrinterSettings | null = null;

  async initialize(settings: PrinterSettings): Promise<boolean> {
    this.settings = settings;

    if (settings.connectionType === 'usb') {
      this.usbPrinter = new USBThermalPrinter();
      const connected = await this.usbPrinter.connect();
      if (!connected) {
        this.usbPrinter = null;
      }
      return connected;
    } else if (settings.connectionType === 'network') {
      if (!settings.ipAddress) {
        alert('Network printer IP address is required');
        return false;
      }
      this.networkPrinter = new NetworkThermalPrinter(
        settings.ipAddress,
        settings.port || 9100
      );
      return true;
    }

    return false;
  }

  async print(data: ThermalReceiptData): Promise<boolean> {
    if (!this.settings) {
      console.error('❌ Printer not initialized');
      return false;
    }

    if (this.settings.connectionType === 'usb' && this.usbPrinter) {
      return await this.usbPrinter.print(data, this.settings);
    } else if (this.settings.connectionType === 'network' && this.networkPrinter) {
      return await this.networkPrinter.print(data, this.settings);
    }

    return false;
  }

  async openCashDrawer(): Promise<boolean> {
    if (this.settings?.connectionType === 'usb' && this.usbPrinter) {
      return await this.usbPrinter.openCashDrawer();
    } else if (this.settings?.connectionType === 'network' && this.networkPrinter) {
      return await this.networkPrinter.openCashDrawer();
    }
    return false;
  }

  async disconnect(): Promise<void> {
    if (this.usbPrinter) {
      await this.usbPrinter.disconnect();
      this.usbPrinter = null;
    }
    this.networkPrinter = null;
    this.settings = null;
  }

  isConnected(): boolean {
    return this.usbPrinter !== null || this.networkPrinter !== null;
  }

  getConnectionType(): string | null {
    return this.settings?.connectionType || null;
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