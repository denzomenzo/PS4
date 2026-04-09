"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Camera, 
  X, 
  Check, 
  Package, 
  Loader2, 
  AlertCircle,
  Infinity,
  Box,
  ArrowLeft,
} from 'lucide-react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import Link from 'next/link';

interface ScannedProduct {
  name: string;
  barcode: string;
  quantity: number;
  infiniteStock: boolean;
  timestamp: number;
}

function ScanContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [sessionValid, setSessionValid] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [productName, setProductName] = useState('');
  const [productQuantity, setProductQuantity] = useState('1');
  const [productInfiniteStock, setProductInfiniteStock] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastBarcodeRef = useRef<string>('');

  // Check session validity
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setCheckingSession(false);
      return;
    }

    fetch(`/api/inventory/mobile-session?sessionId=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setSessionValid(true);
          loadProducts();
        } else {
          setError('Invalid or expired session');
        }
      })
      .catch(() => setError('Failed to validate session'))
      .finally(() => setCheckingSession(false));
  }, [sessionId]);

  const loadProducts = () => {
    if (!sessionId) return;
    
    fetch(`/api/inventory/mobile-session?sessionId=${sessionId}&action=products`)
      .then(res => res.json())
      .then(data => {
        if (data.products) {
          setProducts(data.products);
        }
      })
      .catch(console.error);
  };

  const startScanning = async () => {
    if (!videoRef.current) return;
    
    setError(null);
    
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const barcode = result.getText();
            if (lastBarcodeRef.current !== barcode) {
              lastBarcodeRef.current = barcode;
              handleBarcodeScanned(barcode);
            }
          }
        }
      );
      
      controlsRef.current = controls;
      setScanning(true);
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current = null;
    }
    setScanning(false);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setLastScanned(barcode);
    setProductName('');
    setProductQuantity('1');
    setProductInfiniteStock(false);
    setShowAddForm(true);
    
    // Stop scanning temporarily while adding product
    stopScanning();
  };

  const addProduct = async () => {
    if (!productName.trim() || !sessionId || !lastScanned) return;
    
    try {
      const res = await fetch(`/api/inventory/mobile-session?sessionId=${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName.trim(),
          barcode: lastScanned,
          quantity: parseInt(productQuantity) || 1,
          infiniteStock: productInfiniteStock
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setProducts(prev => [...prev, data.product]);
        setShowAddForm(false);
        setLastScanned(null);
        lastBarcodeRef.current = '';
        
        // Resume scanning
        setTimeout(() => startScanning(), 500);
      } else {
        const error = await res.json();
        setError(error.error || 'Failed to add product');
      }
    } catch (err) {
      setError('Failed to add product');
    }
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setLastScanned(null);
    lastBarcodeRef.current = '';
    startScanning();
  };

  const removeProduct = async (index: number) => {
    if (!sessionId) return;
    
    try {
      await fetch(`/api/inventory/mobile-session?sessionId=${sessionId}&index=${index}`, {
        method: 'DELETE'
      });
      
      setProducts(prev => prev.filter((_, i) => i !== index));
    } catch (err) {
      console.error('Failed to remove product:', err);
    }
  };

const submitAll = async () => {
  if (!sessionId || products.length === 0) return;
  
  setSubmitting(true);
  
  try {
    const res = await fetch('/api/inventory/bulk-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, products })
    });
    
    if (res.ok) {
      await fetch(`/api/inventory/mobile-session?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      window.location.href = '/dashboard/inventory?added=true';
    } else {
      const error = await res.json();
      setError(error.error || 'Failed to add products');
    }
  } catch (err) {
    setError('Failed to submit products');
  } finally {
    setSubmitting(false);
  }
};
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !sessionValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid Session</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory

</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/dashboard/inventory"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">Scan Products</h1>
          <div className="w-5" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Camera View */}
        <div className="relative bg-black rounded-xl overflow-hidden aspect-square mb-4">
          {!showAddForm ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
              />
              
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <button
                    onClick={startScanning}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Start Scanning
                  </button>
                </div>
              )}
              
              {scanning && (
                <>
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-2 border-primary/30 m-8 rounded-lg" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary animate-pulse" />
                  </div>
                  
                  <button
                    onClick={stopScanning}
                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
            </>
          ) : (
            /* Add Product Form */
            <div className="h-full bg-card p-6 flex flex-col">
              <h2 className="text-lg font-semibold text-foreground mb-4">Add Product</h2>
              
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Barcode
                  </label>
                  <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground font-mono">
                    {lastScanned || 'Scanning...'}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter product name"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={productQuantity}
                    onChange={(e) => setProductQuantity(e.target.value)}
                    min="1"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <label className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <input
                    type="checkbox"
                    checked={productInfiniteStock}
                    onChange={(e) => setProductInfiniteStock(e.target.checked)}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <span className="text-sm text-foreground font-medium flex items-center gap-2">
                    <Infinity className="w-4 h-4 text-purple-500" />
                    Infinite Stock
                  </span>
                </label>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={cancelAdd}
                  className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={addProduct}
                  disabled={!productName.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Add Product
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scanned Products List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Scanned Products ({products.length})
            </h2>
          </div>
          
          {products.length === 0 ? (
            <div className="p-8 text-center">
              <Box className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No products scanned yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Scan a barcode to start adding products
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {products.map((product, index) => (
                <div key={index} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{product.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="font-mono">{product.barcode}</span>
                      {product.infiniteStock ? (
                        <span className="flex items-center gap-1 text-purple-500">
                          <Infinity className="w-3 h-3" />
                          Infinite
                        </span>
                      ) : (
                        <span>Qty: {product.quantity}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeProduct(index)}
                    className="p-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {products.length > 0 && (
            <div className="p-4 border-t border-border">
              <button
                onClick={submitAll}
                disabled={submitting}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding to Inventory...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Add {products.length} Products to Inventory
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
