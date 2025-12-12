interface ReceiptData {
  shopName: string;
  transactionId: number;
  date: Date;
  items: {
    name: string;
    price: number;
    quantity?: number;
    icon?: string;
  }[];
  subtotal: number;
  vat: number;
  total: number;
  stylist?: string;
  customer?: string;
  paymentMethod?: string;
}

interface PrinterSettings {
  printerName?: string;
  width: number; // in mm (58 or 80 typical)
  autoOpen: boolean;
  header?: string;
  footer?: string;
}

/**
 * Print receipt using browser's print API
 * Works with thermal printers that have browser drivers installed
 */
export async function printReceipt(
  data: ReceiptData,
  settings: PrinterSettings = { width: 80, autoOpen: true }
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Create hidden iframe for printing
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error("Could not access iframe document");
      }

      // Generate receipt HTML
      const receiptHTML = generateReceiptHTML(data, settings);
      
      iframeDoc.open();
      iframeDoc.write(receiptHTML);
      iframeDoc.close();

      // Wait for content to load, then print
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          // Clean up after a delay
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve();
          }, 1000);
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      };
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Open cash drawer (sends pulse to printer)
 * Standard ESC/POS command: ESC p m t1 t2
 */
export async function openCashDrawer(printerName?: string): Promise<void> {
  // Cash drawer commands for ESC/POS printers
  const ESC = "\x1B";
  const commands = `${ESC}p\x00\x19\xFA`; // ESC p 0 25 250
  
  try {
    // This requires a direct connection to the printer
    // In a web environment, this typically needs a browser extension or native app
    console.log("Opening cash drawer...");
    
    // For browser-based solution, you'd need to:
    // 1. Use Web Serial API (for direct USB connection)
    // 2. Use a local server/electron app
    // 3. Use a browser extension
    
    // Placeholder for demonstration
    if ((window as any).electronAPI) {
      // If running in Electron
      await (window as any).electronAPI.openCashDrawer(commands);
    } else {
      console.warn("Cash drawer control requires Electron or browser extension");
    }
  } catch (error) {
    console.error("Failed to open cash drawer:", error);
    throw error;
  }
}

/**
 * Generate receipt HTML for printing
 */
function generateReceiptHTML(data: ReceiptData, settings: PrinterSettings): string {
  const { shopName, transactionId, date, items, subtotal, vat, total, stylist, customer } = data;
  
  const formattedDate = date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receipt #${transactionId}</title>
      <style>
        @page {
          size: ${settings.width}mm auto;
          margin: 0;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: ${settings.width === 58 ? '10px' : '12px'};
          line-height: 1.4;
          padding: 10px;
          width: ${settings.width}mm;
        }
        
        .center {
          text-align: center;
        }
        
        .bold {
          font-weight: bold;
        }
        
        .large {
          font-size: ${settings.width === 58 ? '14px' : '16px'};
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        
        .row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
        }
        
        .item {
          margin: 6px 0;
        }
        
        .total-section {
          margin-top: 10px;
          border-top: 2px solid #000;
          padding-top: 8px;
        }
        
        .footer {
          margin-top: 15px;
          text-align: center;
          font-size: ${settings.width === 58 ? '9px' : '10px'};
        }
      </style>
    </head>
    <body>
      <div class="center bold large">
        ${shopName}
      </div>
      
      ${settings.header ? `
      <div class="center" style="margin-top: 5px; white-space: pre-line;">
        ${settings.header}
      </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <div class="row">
        <span>Receipt: #${transactionId}</span>
      </div>
      <div class="row">
        <span>${formattedDate}</span>
      </div>
      
      ${stylist ? `<div class="row"><span>Stylist: ${stylist}</span></div>` : ''}
      ${customer ? `<div class="row"><span>Customer: ${customer}</span></div>` : ''}
      
      <div class="divider"></div>
      
      ${items.map(item => `
        <div class="item">
          <div class="row">
            <span>${item.icon || ''} ${item.name}${item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
            <span class="bold">£${item.price.toFixed(2)}</span>
          </div>
        </div>
      `).join('')}
      
      <div class="total-section">
        <div class="row">
          <span>Subtotal:</span>
          <span>£${subtotal.toFixed(2)}</span>
        </div>
        ${vat > 0 ? `
        <div class="row">
          <span>VAT (20%):</span>
          <span>£${vat.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="row bold large" style="margin-top: 6px;">
          <span>TOTAL:</span>
          <span>£${total.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="divider"></div>
      
      ${settings.footer ? `
      <div class="footer">
        ${settings.footer}
      </div>
      ` : ''}
      
      <div class="footer" style="margin-top: 10px;">
        Thank you for your visit!
      </div>
      
      <div style="height: 20px;"></div>
    </body>
    </html>
  `;
}

/**
 * Download receipt as PDF (alternative to printing)
 */
export async function downloadReceiptPDF(data: ReceiptData): Promise<void> {
  // Generate HTML
  const html = generateReceiptHTML(data, { width: 80, autoOpen: false });
  
  // Create blob and download
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${data.transactionId}-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Email receipt to customer
 */
export async function emailReceipt(
  data: ReceiptData,
  customerEmail: string
): Promise<void> {
  // This would integrate with your email service (SendGrid, Resend, etc.)
  console.log(`Emailing receipt to ${customerEmail}`);
  
  // TODO: Implement email sending
  // Example with fetch to your API:
  // await fetch('/api/email-receipt', {
  //   method: 'POST',
  //   body: JSON.stringify({ receipt: data, email: customerEmail })
  // });
}