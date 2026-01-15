// /components/receipts/ReceiptPrint.tsx
import React, { useEffect, useRef } from 'react';

export interface ReceiptData {
  id: number | string;
  created_at?: string;
  createdAt: string;
  subtotal: number;
  vat?: number;
  total: number;
  discountAmount?: number;
  finalAmount?: number;
  payment_method?: string;
  paymentMethod: string;
  payment_status?: string;
  paymentStatus?: string;
  notes?: string;
  products?: any[];
  items?: any[];
  cart?: any[];
  customer_id?: number;
  customer?: {
  id: number | string; // Accept both
  name: string;
  phone?: string;
  email?: string;
  balance?: number;
};
  businessInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    taxNumber?: string;
    logoUrl?: string;
  };
  receiptSettings?: {
    fontSize?: number;
    footer?: string;
    showBarcode?: boolean;
    barcodeType?: string;
    showTaxBreakdown?: boolean;
  };
  balance_deducted?: number;
  balanceDeducted?: number;
  payment_details?: any;
  paymentDetails?: any;
  staff_name?: string;
  staffName?: string;
}

export interface ReceiptProduct {
  id: number;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
}

interface ReceiptPrintProps {
  data: ReceiptData;
  onClose?: () => void;
}

export default function ReceiptPrint({ data, onClose }: ReceiptPrintProps) {
  const barcodeRef = useRef<HTMLCanvasElement>(null);

  // Normalize data from different sources
const normalizedData = {
  id: data.id || 'N/A',
  createdAt: data.created_at || data.createdAt || new Date().toISOString(),
  subtotal: data.subtotal || 0,
  vat: data.vat || 0,
  total: data.total || 0,
  discountAmount: data.discountAmount || 0,
  paymentMethod: data.payment_method || data.paymentMethod || 'cash',
  paymentStatus: data.payment_status || data.paymentStatus || 'completed',
  notes: data.notes,
  products: normalizeProducts(data),
  customer: data.customer || null,
  
  businessInfo: data.businessInfo || {
    name: 'Your Business',
    address: '',
    phone: '',
    email: '',
    taxNumber: '',
    logoUrl: ''
  },
  receiptSettings: {
    fontSize: data.receiptSettings?.fontSize || 12,
    footer: data.receiptSettings?.footer || 'Thank you for your business!',
    showBarcode: data.receiptSettings?.showBarcode !== false,
    barcodeType: data.receiptSettings?.barcodeType || 'CODE128',
    showTaxBreakdown: data.receiptSettings?.showTaxBreakdown !== false
  },
  balanceDeducted: data.balance_deducted || data.balanceDeducted || 0,
  paymentDetails: data.payment_details || data.paymentDetails || {},
  staffName: data.staff_name || data.staffName
};

  function normalizeProducts(receiptData: ReceiptData) {
    // Handle different product formats
    if (receiptData.products && Array.isArray(receiptData.products)) {
      return receiptData.products.map((item: any) => ({
        id: item.id || Math.random(),
        name: item.name || item.product_name || 'Product',
        price: item.price || item.unit_price || 0,
        quantity: item.quantity || 1,
        discount: item.discount || item.item_discount || 0,
        total: item.total || (item.price || 0) * (item.quantity || 1) - (item.discount || 0)
      }));
    }
    
    if (receiptData.items && Array.isArray(receiptData.items)) {
      return receiptData.items.map((item: any) => ({
        id: item.id || Math.random(),
        name: item.name || 'Product',
        price: item.price || 0,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        total: item.total || (item.price || 0) * (item.quantity || 1) - (item.discount || 0)
      }));
    }
    
    if (receiptData.cart && Array.isArray(receiptData.cart)) {
      return receiptData.cart.map((item: any) => ({
        id: item.id || Math.random(),
        name: item.name || 'Product',
        price: item.price || 0,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        total: (item.price || 0) * (item.quantity || 1) - (item.discount || 0)
      }));
    }
    
    return [];
  }



    // Load barcode script dynamically
    const loadBarcodeScript = () => {
      if (normalizedData.receiptSettings.showBarcode && !(window as any).JsBarcode) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
        // script.onload = printAndClose;
        script.onerror = () => {
          console.error('Failed to load barcode script');
         // printAndClose();
        };
        document.head.appendChild(script);
      } else {
     //   printAndClose();
      }
    };

    loadBarcodeScript();



  const generateBarcode = () => {
    if (typeof window !== 'undefined' && (window as any).JsBarcode && barcodeRef.current) {
      try {
        (window as any).JsBarcode(barcodeRef.current, `TXN${normalizedData.id}`, {
          format: normalizedData.receiptSettings.barcodeType,
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 12,
          textMargin: 5
        });
      } catch (error) {
        console.error('Barcode error:', error);
      }
    }
  };

  // Calculate derived values
  const calculatedSubtotal = normalizedData.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculatedDiscount = normalizedData.products.reduce((sum, item) => sum + (item.discount || 0), 0);
  const calculatedTotal = calculatedSubtotal - calculatedDiscount + (normalizedData.vat || 0);
  const displaySubtotal = normalizedData.subtotal > 0 ? normalizedData.subtotal : calculatedSubtotal;
  const displayTotal = normalizedData.total > 0 ? normalizedData.total : calculatedTotal;

  return (
    <div className="receipt-container">
      <style>{`
        @media print {
          @page { 
            margin: 0 !important; 
            size: auto;
          }
          body { 
            margin: 0.5cm !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        
        @media screen {
          body { 
            background: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .receipt-container {
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-radius: 4px;
          }
        }
        
        .receipt-container { 
          font-family: 'Courier New', Courier, monospace !important; 
          padding: 20px; 
          width: 80mm; 
          max-width: 80mm;
          margin: 0 auto; 
          font-size: ${normalizedData.receiptSettings.fontSize}px !important;
          line-height: 1.2 !important;
          color: #000 !important;
          background: white !important;
        }
        
        * {
          box-sizing: border-box;
        }
        
        .logo { 
          text-align: center; 
          margin-bottom: 10px; 
        }
        .logo img { 
          max-width: 100px; 
          max-height: 60px;
          height: auto;
        }
        
        h1 { 
          text-align: center; 
          font-size: ${normalizedData.receiptSettings.fontSize + 4}px !important; 
          margin: 5px 0 !important; 
          font-weight: bold !important; 
          text-transform: uppercase;
        }
        
        .business-info { 
          text-align: center; 
          font-size: ${normalizedData.receiptSettings.fontSize - 2}px !important; 
          margin-bottom: 10px !important; 
          line-height: 1.3 !important;
        }
        
        .line { 
          border-bottom: 1px dashed #000 !important; 
          margin: 8px 0 !important; 
        }
        
        .receipt-header {
          font-size: ${normalizedData.receiptSettings.fontSize - 2}px !important;
          margin-bottom: 8px !important;
        }
        
        .item { 
          display: flex !important; 
          justify-content: space-between !important; 
          margin: 4px 0 !important;
          font-size: ${normalizedData.receiptSettings.fontSize}px !important;
          width: 100% !important;
        }
        
        .item-name {
          flex: 1 !important;
          padding-right: 10px !important;
          word-break: break-word !important;
        }
        
        .item-price {
          white-space: nowrap !important;
          font-weight: bold !important;
          text-align: right !important;
          min-width: 60px !important;
        }
        
        .totals { 
          margin-top: 10px !important; 
          font-weight: bold !important; 
        }
        
        .total-line { 
          display: flex !important; 
          justify-content: space-between !important; 
          margin: 4px 0 !important;
          font-size: ${normalizedData.receiptSettings.fontSize}px !important;
        }
        
        .grand-total {
          font-size: ${normalizedData.receiptSettings.fontSize + 2}px !important;
          border-top: 2px solid #000 !important;
          padding-top: 6px !important;
          margin-top: 6px !important;
        }
        
        .payment-info {
          margin: 10px 0 !important;
          padding: 8px !important;
          background: #f5f5f5 !important;
          border: 1px solid #ddd !important;
          text-align: center !important;
          font-weight: bold !important;
          font-size: ${normalizedData.receiptSettings.fontSize}px !important;
        }
        
        .footer { 
          text-align: center !important; 
          margin-top: 15px !important; 
          font-size: ${normalizedData.receiptSettings.fontSize - 2}px !important;
          font-style: italic !important;
        }
        
        .barcode-container {
          text-align: center !important;
          margin: 15px 0 !important;
        }
        
        .balance-info {
          text-align: center !important;
          font-size: ${normalizedData.receiptSettings.fontSize - 2}px !important;
          margin: 8px 0 !important;
          padding: 5px !important;
          border: 1px dashed #ccc !important;
        }
        
        .notes {
          margin: 8px 0 !important;
          padding: 5px !important;
          font-style: italic !important;
          font-size: ${normalizedData.receiptSettings.fontSize - 2}px !important;
          color: #666 !important;
          word-break: break-word !important;
        }
        
        canvas {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
        }
      `}</style>

      {normalizedData.businessInfo.logoUrl && (
        <div className="logo">
          <img 
            src={normalizedData.businessInfo.logoUrl} 
            alt="Logo" 
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }} 
          />
        </div>
      )}
      
      <h1>{normalizedData.businessInfo.name}</h1>
      
      <div className="business-info">
        {normalizedData.businessInfo.address && <div>{normalizedData.businessInfo.address}</div>}
        {normalizedData.businessInfo.phone && <div>Tel: {normalizedData.businessInfo.phone}</div>}
        {normalizedData.businessInfo.email && <div>{normalizedData.businessInfo.email}</div>}
        {normalizedData.businessInfo.taxNumber && <div>Tax No: {normalizedData.businessInfo.taxNumber}</div>}
      </div>
      
      <div className="line"></div>
      
      <div className="receipt-header">
        <div><strong>Receipt #{normalizedData.id}</strong></div>
        <div>{new Date(normalizedData.createdAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</div>
        {normalizedData.customer && <div>Customer: {normalizedData.customer.name}</div>}
        {normalizedData.staffName && <div>Served by: {normalizedData.staffName}</div>}
        {normalizedData.notes && <div className="notes">Note: {normalizedData.notes}</div>}
      </div>
      
      <div className="line"></div>
      
      {normalizedData.products.length === 0 ? (
        <div className="item">
          <div className="item-name">No items</div>
        </div>
      ) : (
        normalizedData.products.map((item, index) => (
          <div key={item.id || index} className="item">
            <div className="item-name">
              <div>{item.name}</div>
              <div style={{ 
                fontSize: `${normalizedData.receiptSettings.fontSize - 3}px`, 
                color: '#666' 
              }}>
                {item.quantity} x £{item.price.toFixed(2)}
                {item.discount > 0 ? ` (-£${item.discount.toFixed(2)})` : ''}
              </div>
            </div>
            <div className="item-price">£{item.total.toFixed(2)}</div>
          </div>
        ))
      )}
      
      <div className="line"></div>
      
      <div className="totals">
        <div className="total-line">
          <span>Subtotal:</span>
          <span>£{displaySubtotal.toFixed(2)}</span>
        </div>
        
        {calculatedDiscount > 0 && (
          <div className="total-line" style={{ color: '#ff0000' }}>
            <span>Discount:</span>
            <span>-£{calculatedDiscount.toFixed(2)}</span>
          </div>
        )}
        
        {normalizedData.vat > 0 && (
          <>
            <div className="total-line">
              <span>VAT (20%):</span>
              <span>£{normalizedData.vat.toFixed(2)}</span>
            </div>
            {normalizedData.receiptSettings.showTaxBreakdown && (
              <div className="total-line" style={{ 
                fontSize: `${normalizedData.receiptSettings.fontSize - 3}px`, 
                color: '#666' 
              }}>
                <span>Net: £{(displaySubtotal - calculatedDiscount).toFixed(2)}</span>
                <span>Tax: £{normalizedData.vat.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
        
        <div className="total-line grand-total">
          <span>TOTAL:</span>
          <span>£{displayTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="payment-info">
        PAID VIA {normalizedData.paymentMethod.toUpperCase()}
        {normalizedData.paymentStatus && normalizedData.paymentStatus !== 'completed' && 
         ` (${normalizedData.paymentStatus.toUpperCase()})`}
        
        {normalizedData.paymentDetails?.split_payment && (
          <div style={{ 
            fontSize: `${normalizedData.receiptSettings.fontSize - 2}px`, 
            marginTop: '5px' 
          }}>
            Split: 
            {normalizedData.paymentDetails.split_payment.cash ? 
              ` Cash: £${normalizedData.paymentDetails.split_payment.cash.toFixed(2)} ` : ''}
            {normalizedData.paymentDetails.split_payment.card ? 
              ` Card: £${normalizedData.paymentDetails.split_payment.card.toFixed(2)} ` : ''}
            {normalizedData.paymentDetails.split_payment.balance ? 
              ` Balance: £${normalizedData.paymentDetails.split_payment.balance.toFixed(2)}` : ''}
          </div>
        )}
      </div>
      
      {normalizedData.balanceDeducted > 0 && normalizedData.customer && (
        <div className="balance-info">
          <div>Balance Used: £{normalizedData.balanceDeducted.toFixed(2)}</div>
          <div>Remaining Balance: £{(normalizedData.customer.balance || 0).toFixed(2)}</div>
        </div>
      )}
      
      {normalizedData.receiptSettings.showBarcode && (
        <div className="barcode-container">
          <canvas 
            id="barcodeCanvas" 
            ref={barcodeRef}
            style={{ display: 'block' }}
          ></canvas>
        </div>
      )}
      
      <div className="footer">
        <div style={{ fontWeight: 'bold', margin: '10px 0' }}>THANK YOU!</div>
        {normalizedData.receiptSettings.footer}
      </div>
    </div>
  );
}






