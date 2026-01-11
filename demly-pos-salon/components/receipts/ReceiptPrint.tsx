// /components/receipts/ReceiptPrint.tsx
import React, { useEffect } from 'react';

export interface ReceiptData {
  id: number | string;
  createdAt: string;
  subtotal: number;
  vat: number;
  total: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  notes?: string;
  products?: ReceiptProduct[];
  customer?: {
    id: number;
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
    fontSize: number;
    footer: string;
    showBarcode: boolean;
    barcodeType: string;
    showTaxBreakdown: boolean;
  };
  balanceDeducted?: number;
  paymentDetails?: {
    split_payment?: {
      cash?: number;
      card?: number;
      balance?: number;
    };
  };
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
  const {
    id,
    createdAt,
    subtotal = 0,
    vat = 0,
    total = 0,
    discountAmount = 0,
    products = [],
    customer,
    businessInfo = {
      name: 'Your Business',
      address: '',
      phone: '',
      email: '',
      taxNumber: '',
      logoUrl: ''
    },
    receiptSettings = {
      fontSize: 12,
      footer: 'Thank you for your business!',
      showBarcode: true,
      barcodeType: 'CODE128',
      showTaxBreakdown: true
    },
    balanceDeducted = 0,
    paymentDetails,
    paymentMethod = 'cash',
    paymentStatus = 'completed',
    notes,
    staffName
  } = data;

  useEffect(() => {
    const printAndClose = () => {
      window.print();
      setTimeout(() => {
        if (onClose) onClose();
        window.close();
      }, 1000);
    };

    // Load barcode script dynamically
    const loadBarcodeScript = () => {
      if (receiptSettings.showBarcode && !(window as any).JsBarcode) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
        script.onload = printAndClose;
        document.head.appendChild(script);
      } else {
        setTimeout(printAndClose, 100);
      }
    };

    loadBarcodeScript();

    return () => {
      // Cleanup
      if (onClose) onClose();
    };
  }, [onClose, receiptSettings.showBarcode]);

  const generateBarcode = () => {
    if (typeof window !== 'undefined' && (window as any).JsBarcode && receiptSettings.showBarcode) {
      try {
        (window as any).JsBarcode("#barcodeCanvas", `TXN${id}`, {
          format: receiptSettings.barcodeType,
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

  return (
    <div className="receipt-container">
      <style>{`
        @media print {
          @page { margin: 0; }
          body { margin: 10mm; }
        }
        body { 
          font-family: 'Courier New', monospace; 
          padding: 20px; 
          max-width: 80mm; 
          margin: 0 auto; 
          font-size: ${receiptSettings.fontSize}px;
          line-height: 1.2;
        }
        .logo { text-align: center; margin-bottom: 10px; }
        .logo img { max-width: 100px; max-height: 60px; }
        h1 { 
          text-align: center; 
          font-size: ${receiptSettings.fontSize + 4}px; 
          margin: 5px 0; 
          font-weight: bold; 
          text-transform: uppercase;
        }
        .business-info { 
          text-align: center; 
          font-size: ${receiptSettings.fontSize - 2}px; 
          margin-bottom: 10px; 
          line-height: 1.3;
        }
        .line { 
          border-bottom: 1px dashed #000; 
          margin: 8px 0; 
        }
        .receipt-header {
          font-size: ${receiptSettings.fontSize - 2}px;
          margin-bottom: 8px;
        }
        .item { 
          display: flex; 
          justify-content: space-between; 
          margin: 4px 0;
          font-size: ${receiptSettings.fontSize}px;
        }
        .item-name {
          flex: 1;
          padding-right: 10px;
        }
        .item-price {
          white-space: nowrap;
          font-weight: bold;
        }
        .totals { 
          margin-top: 10px; 
          font-weight: bold; 
        }
        .total-line { 
          display: flex; 
          justify-content: space-between; 
          margin: 4px 0;
          font-size: ${receiptSettings.fontSize}px;
        }
        .grand-total {
          font-size: ${receiptSettings.fontSize + 2}px;
          border-top: 2px solid #000;
          padding-top: 6px;
          margin-top: 6px;
        }
        .payment-info {
          margin: 10px 0;
          padding: 8px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          text-align: center;
          font-weight: bold;
          font-size: ${receiptSettings.fontSize}px;
        }
        .footer { 
          text-align: center; 
          margin-top: 15px; 
          font-size: ${receiptSettings.fontSize - 2}px;
          font-style: italic;
        }
        .barcode-container {
          text-align: center;
          margin: 15px 0;
        }
        .balance-info {
          text-align: center;
          font-size: ${receiptSettings.fontSize - 2}px;
          margin: 8px 0;
          padding: 5px;
          border: 1px dashed #ccc;
        }
        .notes {
          margin: 8px 0;
          padding: 5px;
          font-style: italic;
          font-size: ${receiptSettings.fontSize - 2}px;
          color: #666;
        }
        canvas {
          max-width: 100%;
          height: auto;
        }
      `}</style>

      {businessInfo.logoUrl && (
        <div className="logo">
          <img src={businessInfo.logoUrl} alt="Logo" onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }} />
        </div>
      )}
      
      <h1>{businessInfo.name}</h1>
      
      <div className="business-info">
        {businessInfo.address && <div>{businessInfo.address}</div>}
        {businessInfo.phone && <div>Tel: {businessInfo.phone}</div>}
        {businessInfo.email && <div>{businessInfo.email}</div>}
        {businessInfo.taxNumber && <div>Tax No: {businessInfo.taxNumber}</div>}
      </div>
      
      <div className="line"></div>
      
      <div className="receipt-header">
        <div><strong>Receipt #{id}</strong></div>
        <div>{new Date(createdAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</div>
        {customer && <div>Customer: {customer.name}</div>}
        {staffName && <div>Served by: {staffName}</div>}
        {notes && <div className="notes">Note: {notes}</div>}
      </div>
      
      <div className="line"></div>
      
      {products.length === 0 ? (
        <div className="item">
          <div className="item-name">No items</div>
        </div>
      ) : (
        products.map((item) => (
          <div key={item.id} className="item">
            <div className="item-name">
              <div>{item.name}</div>
              <div style={{ fontSize: `${receiptSettings.fontSize - 3}px`, color: '#666' }}>
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
          <span>£{subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="total-line" style={{ color: '#ff0000' }}>
            <span>Discount:</span>
            <span>-£{discountAmount.toFixed(2)}</span>
          </div>
        )}
        {vat > 0 && (
          <>
            <div className="total-line">
              <span>VAT (20%):</span>
              <span>£{vat.toFixed(2)}</span>
            </div>
            {receiptSettings.showTaxBreakdown && (
              <div className="total-line" style={{ fontSize: `${receiptSettings.fontSize - 3}px`, color: '#666' }}>
                <span>Net: £{(subtotal - discountAmount).toFixed(2)}</span>
                <span>Tax: £{(vat / 1.2 * 0.2).toFixed(2)}</span>
              </div>
            )}
          </>
        )}
        <div className="total-line grand-total">
          <span>TOTAL:</span>
          <span>£{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="payment-info">
        PAID VIA {paymentMethod.toUpperCase()}
        {paymentStatus && paymentStatus !== 'completed' && ` (${paymentStatus.toUpperCase()})`}
        {paymentDetails?.split_payment && (
          <div style={{ fontSize: `${receiptSettings.fontSize - 2}px`, marginTop: '5px' }}>
            Split: 
            {paymentDetails.split_payment.cash ? ` Cash: £${paymentDetails.split_payment.cash.toFixed(2)} ` : ''}
            {paymentDetails.split_payment.card ? ` Card: £${paymentDetails.split_payment.card.toFixed(2)} ` : ''}
            {paymentDetails.split_payment.balance ? ` Balance: £${paymentDetails.split_payment.balance.toFixed(2)}` : ''}
          </div>
        )}
      </div>
      
      {balanceDeducted > 0 && customer && (
        <div className="balance-info">
          <div>Balance Used: £{balanceDeducted.toFixed(2)}</div>
          <div>Remaining Balance: £{(customer.balance || 0).toFixed(2)}</div>
        </div>
      )}
      
      {receiptSettings.showBarcode && (
        <div className="barcode-container">
          <canvas id="barcodeCanvas" ref={() => generateBarcode()}></canvas>
        </div>
      )}
      
      <div className="footer">
        <div style={{ fontWeight: 'bold', margin: '10px 0' }}>THANK YOU!</div>
        {receiptSettings.footer}
      </div>
    </div>
  );
}