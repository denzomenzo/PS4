// components/receipts/ReceiptPrint.tsx
"use client";

import { useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import Barcode from 'react-barcode';

export interface ReceiptData {
  id: string;
  createdAt: string;
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'split' | 'balance';
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
    id: string;
    name: string;
    phone?: string;
    email?: string;
    balance?: number;
  };
  businessInfo?: {
    name?: string;
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
    barcodeType?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
    showTaxBreakdown?: boolean;
  };
  balanceDeducted?: number;
  paymentDetails?: any;
  staffName?: string;
  notes?: string;
}

interface ReceiptPrintProps {
  data: ReceiptData;
  onClose: () => void;
}

export default function ReceiptPrint({ data, onClose }: ReceiptPrintProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Receipt #${data.id}</title>
              <style>
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
                body {
                  font-family: 'Courier New', monospace;
                  width: 80mm;
                  margin: 0 auto;
                  padding: 10mm;
                  background: white;
                }
                
                .receipt {
                  width: 100%;
                }
                
                .logo-section {
                  text-align: center;
                  margin-bottom: 20px;
                }
                
                .logo {
                  max-width: 160px;
                  max-height: 80px;
                  margin: 0 auto 10px;
                  display: block;
                }
                
                .business-name {
                  font-size: 18px;
                  font-weight: bold;
                  margin-bottom: 8px;
                  text-transform: uppercase;
                }
                
                .business-info {
                  font-size: 11px;
                  line-height: 1.4;
                  margin-bottom: 15px;
                  text-align: center;
                }
                
                .divider {
                  border-top: 1px dashed #000;
                  margin: 15px 0;
                }
                
                .section-title {
                  font-size: 12px;
                  font-weight: bold;
                  margin: 15px 0 8px;
                  text-transform: uppercase;
                }
                
                .info-row {
                  font-size: 11px;
                  margin: 5px 0;
                  display: flex;
                  justify-content: space-between;
                }
                
                .items-table {
                  width: 100%;
                  margin: 15px 0;
                  font-size: 11px;
                }
                
                .items-header {
                  font-weight: bold;
                  border-bottom: 1px solid #000;
                  padding-bottom: 5px;
                  margin-bottom: 8px;
                  display: grid;
                  grid-template-columns: 2fr 1fr 1fr 1fr;
                  gap: 5px;
                }
                
                .item-row {
                  display: grid;
                  grid-template-columns: 2fr 1fr 1fr 1fr;
                  gap: 5px;
                  margin: 5px 0;
                  padding: 3px 0;
                }
                
                .item-name {
                  font-weight: bold;
                  word-wrap: break-word;
                }
                
                .item-sku {
                  font-size: 9px;
                  color: #666;
                  margin-top: 2px;
                }
                
                .text-right {
                  text-align: right;
                }
                
                .totals-section {
                  margin-top: 15px;
                  border-top: 1px solid #000;
                  padding-top: 10px;
                }
                
                .total-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 5px 0;
                  font-size: 11px;
                }
                
                .total-row.grand-total {
                  font-size: 14px;
                  font-weight: bold;
                  border-top: 2px solid #000;
                  border-bottom: 2px solid #000;
                  padding: 8px 0;
                  margin-top: 10px;
                }
                
                .payment-info {
                  margin: 15px 0;
                  font-size: 11px;
                  text-align: center;
                }
                
                .barcode-section {
                  text-align: center;
                  margin: 20px 0;
                }
                
                .footer {
                  text-align: center;
                  font-size: 10px;
                  margin-top: 20px;
                  padding-top: 15px;
                  border-top: 1px dashed #000;
                }
                
                @media print {
                  body {
                    width: 80mm;
                    padding: 5mm;
                  }
                  
                  @page {
                    size: 80mm auto;
                    margin: 0;
                  }
                }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Wait for images to load before printing
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-background z-[9999] overflow-auto">
      {/* Header Controls */}
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between shadow-sm z-10">
        <h2 className="text-lg font-bold text-foreground">Receipt Preview</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 font-medium"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 flex items-center gap-2 font-medium"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>

      {/* Receipt Preview */}
      <div className="flex justify-center p-8">
        <div className="bg-white shadow-2xl" style={{ width: '80mm', minHeight: '200mm' }}>
          <div ref={receiptRef} className="receipt p-4" style={{ fontFamily: "'Courier New', monospace" }}>
            
            {/* Logo and Business Info */}
            <div className="logo-section">
              {data.businessInfo?.logoUrl && (
                <img 
                  src={data.businessInfo.logoUrl} 
                  alt="Business Logo" 
                  className="logo"
                  style={{ maxWidth: '160px', maxHeight: '80px', margin: '0 auto 10px', display: 'block' }}
                />
              )}
              <div className="business-name" style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
                {data.businessInfo?.name || 'Your Business'}
              </div>
              {data.businessInfo && (
                <div className="business-info" style={{ fontSize: '11px', lineHeight: '1.4', marginBottom: '15px', textAlign: 'center' }}>
                  {data.businessInfo.address && <div>{data.businessInfo.address}</div>}
                  {data.businessInfo.phone && <div>Tel: {data.businessInfo.phone}</div>}
                  {data.businessInfo.email && <div>{data.businessInfo.email}</div>}
                  {data.businessInfo.taxNumber && <div>VAT: {data.businessInfo.taxNumber}</div>}
                </div>
              )}
            </div>

            <div className="divider" style={{ borderTop: '1px dashed #000', margin: '15px 0' }}></div>

            {/* Receipt Info */}
            <div style={{ fontSize: '11px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                <span>Receipt #:</span>
                <strong>{data.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                <span>Date:</span>
                <span>{formatDate(data.createdAt)}</span>
              </div>
              {data.staffName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                  <span>Staff:</span>
                  <span>{data.staffName}</span>
                </div>
              )}
              {data.customer && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                    <span>Customer:</span>
                    <span>{data.customer.name}</span>
                  </div>
                  {data.customer.phone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0' }}>
                      <span>Phone:</span>
                      <span>{data.customer.phone}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="divider" style={{ borderTop: '1px dashed #000', margin: '15px 0' }}></div>

            {/* Items Table */}
            <div className="section-title" style={{ fontSize: '12px', fontWeight: 'bold', margin: '15px 0 8px', textTransform: 'uppercase' }}>
              ITEMS
            </div>
            
            <div className="items-header" style={{ 
              fontWeight: 'bold', 
              borderBottom: '1px solid #000', 
              paddingBottom: '5px', 
              marginBottom: '8px',
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: '5px',
              fontSize: '11px'
            }}>
              <div>Item</div>
              <div className="text-right" style={{ textAlign: 'right' }}>Price</div>
              <div className="text-right" style={{ textAlign: 'right' }}>Qty</div>
              <div className="text-right" style={{ textAlign: 'right' }}>Total</div>
            </div>

            {data.products.map((item, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <div className="item-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: '5px',
                  margin: '5px 0',
                  padding: '3px 0',
                  fontSize: '11px'
                }}>
                  <div>
                    <div className="item-name" style={{ fontWeight: 'bold', wordWrap: 'break-word' }}>
                      {item.name}
                    </div>
                    {item.sku && (
                      <div className="item-sku" style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                        SKU: {item.sku}
                      </div>
                    )}
                  </div>
                  <div className="text-right" style={{ textAlign: 'right' }}>£{item.price.toFixed(2)}</div>
                  <div className="text-right" style={{ textAlign: 'right' }}>×{item.quantity}</div>
                  <div className="text-right" style={{ textAlign: 'right' }}>£{item.total.toFixed(2)}</div>
                </div>
              </div>
            ))}

            <div className="divider" style={{ borderTop: '1px dashed #000', margin: '15px 0' }}></div>

            {/* Totals */}
            <div className="totals-section" style={{ marginTop: '15px', borderTop: '1px solid #000', paddingTop: '10px' }}>
              <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0', fontSize: '11px' }}>
                <span>Subtotal:</span>
                <span>£{data.subtotal.toFixed(2)}</span>
              </div>
              
              {data.receiptSettings?.showTaxBreakdown !== false && data.vat > 0 && (
                <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0', fontSize: '11px' }}>
                  <span>VAT (20%):</span>
                  <span>£{data.vat.toFixed(2)}</span>
                </div>
              )}

              {data.balanceDeducted && data.balanceDeducted > 0 && (
                <div className="total-row" style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0', fontSize: '11px', color: '#059669' }}>
                  <span>Balance Used:</span>
                  <span>-£{data.balanceDeducted.toFixed(2)}</span>
                </div>
              )}

              <div className="total-row grand-total" style={{ 
                fontSize: '14px', 
                fontWeight: 'bold', 
                borderTop: '2px solid #000', 
                borderBottom: '2px solid #000', 
                padding: '8px 0', 
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>TOTAL:</span>
                <span>£{data.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="payment-info" style={{ margin: '15px 0', fontSize: '11px', textAlign: 'center' }}>
              <strong>Payment Method: </strong>
              <span style={{ textTransform: 'uppercase' }}>{data.paymentMethod}</span>
            </div>

            {/* Notes */}
            {data.notes && (
              <div style={{ margin: '15px 0', fontSize: '10px', padding: '8px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                <strong>Note:</strong> {data.notes}
              </div>
            )}

            {/* Barcode */}
            {data.receiptSettings?.showBarcode !== false && (
              <div className="barcode-section" style={{ textAlign: 'center', margin: '20px 0' }}>
                <Barcode 
                  value={String(data.id)}
                  format={data.receiptSettings?.barcodeType || 'CODE128'}
                  width={1.5}
                  height={40}
                  displayValue={true}
                  fontSize={12}
                  margin={10}
                />
              </div>
            )}

            {/* Footer */}
            <div className="footer" style={{ 
              textAlign: 'center', 
              fontSize: '10px', 
              marginTop: '20px', 
              paddingTop: '15px', 
              borderTop: '1px dashed #000' 
            }}>
              {data.receiptSettings?.footer || 'Thank you for your business!'}
              <div style={{ marginTop: '10px', fontSize: '9px', color: '#666' }}>
                {formatDate(data.createdAt)}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// proxy.ts (in project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CHANGE THIS LINE: Replace "middleware" with "proxy"
export function proxy(request: NextRequest) {  // ✅ Changed from "middleware"
  // CRITICAL: Never modify API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // For all other routes, continue normally
  return NextResponse.next();
}

// Apply proxy to all routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};