// /components/receipts/ReceiptPrint.tsx - FIXED VERSION
import React, { useEffect, useRef } from 'react';

export interface ReceiptData {
  id: number | string;
  createdAt: string;
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: string;
  products: Array<{
    id: string | number;
    name: string;
    price: number;
    quantity: number;
    discount: number;
    total: number;
    sku?: string;
    barcode?: string;
  }>;
  customer?: {
    id: string | number;
    name: string;
    phone?: string;
    email?: string;
    balance?: number;
  };
  businessInfo: {
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
  balanceDeducted?: number;
  paymentDetails?: any;
  staffName?: string;
  notes?: string;
}

interface ReceiptPrintProps {
  data: ReceiptData;
  onClose?: () => void;
}

export default function ReceiptPrint({ data, onClose }: ReceiptPrintProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<HTMLCanvasElement>(null);

  // Thermal receipt style
  const receiptStyle = `
    @media print {
      @page {
        margin: 0;
        size: 80mm auto;
      }
      
      body, html {
        margin: 0 !important;
        padding: 0 !important;
        width: 80mm !important;
      }
      
      .no-print {
        display: none !important;
      }
      
      button {
        display: none !important;
      }
      
      * {
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
      
      .receipt-actions {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 20px;
      }
      
      .print-button {
        background: #10b981;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .close-button {
        background: #ef4444;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    }
    
    /* Receipt Container */
    .receipt-container {
      font-family: 'Courier New', Courier, monospace !important;
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 auto !important;
      font-size: ${data.receiptSettings?.fontSize || 13}px !important;
      line-height: 1.2 !important;
      color: #000 !important;
      background: white !important;
      padding: 10px !important;
    }
    
    /* Logo */
    .logo-container {
      text-align: center;
      margin-bottom: 8px;
    }
    
    .logo-container img {
      max-height: 40px;
      max-width: 100%;
      object-fit: contain;
    }
    
    /* Business Info */
    .business-name {
      text-align: center;
      font-weight: bold;
      font-size: ${(data.receiptSettings?.fontSize || 13) + 2}px;
      margin: 5px 0;
      text-transform: uppercase;
    }
    
    .business-details {
      text-align: center;
      font-size: ${(data.receiptSettings?.fontSize || 13) - 2}px;
      margin-bottom: 10px;
      line-height: 1.3;
    }
    
    /* Divider */
    .divider {
      border-bottom: 1px dashed #000;
      margin: 10px 0;
    }
    
    /* Receipt Header */
    .receipt-header {
      margin-bottom: 10px;
    }
    
    .receipt-header div {
      margin: 2px 0;
    }
    
    /* Items */
    .item-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
      font-size: ${data.receiptSettings?.fontSize || 13}px;
    }
    
    .item-name {
      flex: 1;
      padding-right: 10px;
      word-break: break-word;
    }
    
    .item-quantity {
      min-width: 20px;
      text-align: center;
    }
    
    .item-price {
      min-width: 60px;
      text-align: right;
      font-weight: bold;
    }
    
    /* Totals */
    .total-row {
      display: flex;
      justify-content: space-between;
      margin: 4px 0;
      font-size: ${data.receiptSettings?.fontSize || 13}px;
    }
    
    .grand-total {
      font-weight: bold;
      font-size: ${(data.receiptSettings?.fontSize || 13) + 2}px;
      border-top: 2px solid #000;
      padding-top: 8px;
      margin-top: 8px;
    }
    
    /* Payment Info */
    .payment-info {
      text-align: center;
      margin: 10px 0;
      padding: 8px;
      background: #f5f5f5;
      border: 1px dashed #ccc;
      font-weight: bold;
    }
    
    /* Footer */
    .receipt-footer {
      text-align: center;
      margin-top: 15px;
      font-size: ${(data.receiptSettings?.fontSize || 13) - 2}px;
      font-style: italic;
    }
    
    /* Barcode */
    .barcode-container {
      text-align: center;
      margin: 15px 0;
    }
    
    .barcode-container canvas {
      max-width: 100%;
      height: 40px;
    }
    
    /* Notes */
    .notes {
      margin: 10px 0;
      padding: 5px;
      font-style: italic;
      color: #666;
      border-top: 1px dashed #ccc;
      border-bottom: 1px dashed #ccc;
    }
  `;

  useEffect(() => {
    // Generate barcode if needed
    if (data.receiptSettings?.showBarcode && barcodeRef.current) {
      generateBarcode();
    }
    
    // Auto-print after a short delay
    const timer = setTimeout(() => {
      if (receiptRef.current) {
        window.print();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const generateBarcode = () => {
    if (typeof window !== 'undefined' && (window as any).JsBarcode && barcodeRef.current) {
      try {
        (window as any).JsBarcode(barcodeRef.current, `TXN${data.id}`, {
          format: data.receiptSettings?.barcodeType || 'CODE128',
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 10,
          textMargin: 5,
          margin: 0
        });
      } catch (error) {
        console.error('Barcode error:', error);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  // Calculate totals
  const calculatedSubtotal = data.products.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculatedDiscount = data.products.reduce((sum, item) => sum + (item.discount || 0), 0);
  const calculatedTotal = calculatedSubtotal - calculatedDiscount + (data.vat || 0);
  
  const displaySubtotal = data.subtotal > 0 ? data.subtotal : calculatedSubtotal;
  const displayVat = data.vat || 0;
  const displayTotal = data.total > 0 ? data.total : calculatedTotal;

  return (
    <>
      <style>{receiptStyle}</style>
      
      <div ref={receiptRef} className="receipt-container">
        {/* Logo */}
        {data.businessInfo.logoUrl && (
          <div className="logo-container">
            <img 
              src={data.businessInfo.logoUrl} 
              alt={data.businessInfo.name}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        {/* Business Name */}
        <div className="business-name">{data.businessInfo.name}</div>
        
        {/* Business Details */}
        <div className="business-details">
          {data.businessInfo.address && <div>{data.businessInfo.address}</div>}
          {data.businessInfo.phone && <div>Tel: {data.businessInfo.phone}</div>}
          {data.businessInfo.email && <div>{data.businessInfo.email}</div>}
          {data.businessInfo.taxNumber && <div>Tax No: {data.businessInfo.taxNumber}</div>}
        </div>
        
        <div className="divider"></div>
        
        {/* Receipt Header */}
        <div className="receipt-header">
          <div><strong>RECEIPT #{data.id}</strong></div>
          <div>Date: {new Date(data.createdAt).toLocaleDateString('en-GB')}</div>
          <div>Time: {new Date(data.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
          {data.customer && <div>Customer: {data.customer.name}</div>}
          {data.staffName && <div>Staff: {data.staffName}</div>}
        </div>
        
        <div className="divider"></div>
        
        {/* Items */}
        {data.products.map((item, index) => (
          <div key={item.id || index} className="item-row">
            <div className="item-name">
              {item.name}
              {item.discount > 0 && (
                <div style={{ fontSize: '10px', color: '#666' }}>
                  Discount: £{item.discount.toFixed(2)}
                </div>
              )}
            </div>
            <div className="item-quantity">{item.quantity}x</div>
            <div className="item-price">£{item.total.toFixed(2)}</div>
          </div>
        ))}
        
        <div className="divider"></div>
        
        {/* Totals */}
        <div className="total-row">
          <span>Subtotal:</span>
          <span>£{displaySubtotal.toFixed(2)}</span>
        </div>
        
        {calculatedDiscount > 0 && (
          <div className="total-row" style={{ color: '#dc2626' }}>
            <span>Discount:</span>
            <span>-£{calculatedDiscount.toFixed(2)}</span>
          </div>
        )}
        
        {displayVat > 0 && (
          <>
            <div className="total-row">
              <span>VAT:</span>
              <span>£{displayVat.toFixed(2)}</span>
            </div>
            {data.receiptSettings?.showTaxBreakdown && (
              <div className="total-row" style={{ fontSize: '11px', color: '#666' }}>
                <span>Net: £{(displaySubtotal - calculatedDiscount).toFixed(2)}</span>
                <span>Tax: £{displayVat.toFixed(2)}</span>
              </div>
            )}
          </>
        )}
        
        <div className="total-row grand-total">
          <span>TOTAL:</span>
          <span>£{displayTotal.toFixed(2)}</span>
        </div>
        
        <div className="divider"></div>
        
        {/* Payment Info */}
        <div className="payment-info">
          <div>PAID: {data.paymentMethod.toUpperCase()}</div>
          {data.balanceDeducted && data.balanceDeducted > 0 && (
            <div style={{ fontSize: '11px', marginTop: '5px' }}>
              Balance Used: £{data.balanceDeducted.toFixed(2)}
            </div>
          )}
        </div>
        
        {/* Notes */}
        {data.notes && (
          <div className="notes">
            Note: {data.notes}
          </div>
        )}
        
        {/* Barcode */}
        {data.receiptSettings?.showBarcode && (
          <div className="barcode-container">
            <canvas ref={barcodeRef}></canvas>
          </div>
        )}
        
        {/* Footer */}
        <div className="receipt-footer">
          <div style={{ margin: '10px 0', fontWeight: 'bold' }}>THANK YOU!</div>
          {data.receiptSettings?.footer || 'Thank you for your business!'}
          <div style={{ marginTop: '10px', fontSize: '10px' }}>
            {new Date().toLocaleDateString('en-GB')}
          </div>
        </div>
      </div>
      
      {/* Print/Close Buttons (visible only on screen) */}
      <div className="receipt-actions no-print">
        <button onClick={handlePrint} className="print-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Print Receipt
        </button>
        <button onClick={handleClose} className="close-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Close
        </button>
      </div>
    </>
  );
}
