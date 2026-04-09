"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
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
  Plus,
  Minus,
  Hash
} from 'lucide-react';
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
  const router = useRouter();
  const sessionId = searchParams.get('session');
  
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [sessionValid, setSessionValid] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  
  const [productName, setProductName] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [productInfiniteStock, setProductInfiniteStock] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastBarcodeRef = useRef<string>('');
  const formRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setCheckingSession(false);
      return;
    }

    console.log('Checking session:', sessionId);

    fetch(`/api/inventory/mobile-session?sessionId=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        console.log('Session check response:', data);
        if (data.valid) {
          setSessionValid(true);
          loadProducts();
        } else {
          setError('Invalid or expired session. Please generate a new QR code.');
        }
      })
      .catch(err => {
        console.error('Session check error:', err);
        setError('Failed to validate session. Please try again.');
      })
      .finally(() => setCheckingSession(false));
  }, [sessionId]);

  // Auto-scroll to form when it appears
  useEffect(() => {
    if (showAddForm && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [showAddForm]);

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
  setCameraError(false);
  
  try {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();
    
    // Get available video devices
    const videoInputDevices = await reader.listVideoInputDevices();
    
    // Try to find back camera first
    let selectedDeviceId: string | undefined;
    
    // Look for back camera (environment facing)
    const backCamera = videoInputDevices.find(
      device => device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('environment')
    );
    
    if (backCamera) {
      selectedDeviceId = backCamera.deviceId;
    } else if (videoInputDevices.length > 0) {
      // Fallback to first available camera
      selectedDeviceId = videoInputDevices[0].deviceId;
    }
    
    console.log('Selected camera:', selectedDeviceId);
    
    const controls = await reader.decodeFromVideoDevice(
      selectedDeviceId,
      videoRef.current,
      (result, error) => {
        if (result) {
          const barcode = result.getText();
          if (lastBarcodeRef.current !== barcode) {
            lastBarcodeRef.current = barcode;
            handleBarcodeScanned(barcode);
          }
        }
        if (error && error.name !== 'NotFoundException') {
          console.error('Scan error:', error);
        }
      }
    );
    
    (window as any).__scannerControls = controls;
    setScanning(true);
  } catch (err) {
    console.error('Failed to start camera:', err);
    setCameraError(true);
    setError('Failed to access camera. Please ensure camera permissions are granted.');
    setScanning(false);
  }
};

  const stopScanning = () => {
    const controls = (window as any).__scannerControls;
    if (controls) {
      controls.stop();
      (window as any).__scannerControls = null;
    }
    setScanning(false);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setLastScanned(barcode);
    setProductName('');
    setProductQuantity(1);
    setProductInfiniteStock(false);
    setShowAddForm(true);
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
          quantity: productQuantity,
          infiniteStock: productInfiniteStock
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setProducts(prev => [...prev, data.product]);
        setShowAddForm(false);
        setLastScanned(null);
        lastBarcodeRef.current = '';
        
        // Scroll back to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => startScanning(), 300);
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

  const handleBack = () => {
    if (showAddForm) {
      // If showing form, cancel it and go back to camera
      cancelAdd();
    } else {
      // If on main screen, go back to inventory
      router.push('/dashboard/inventory');
    }
  };

  if (checkingSession) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validating session...</p>
        </div>
      </div>
    );
  }

  if (error && !sessionValid) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full text-center">
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
    <div ref={containerRef} className="fixed inset-0 bg-background flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground p-2 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">
            {showAddForm ? 'Add Product' : 'Scan Products'}
          </h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 pb-24">
          {/* Camera View - Only show when not in add form */}
          {!showAddForm && (
            <div className="relative bg-black rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '1/1' }}>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
              />
              
              {!scanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <button
                    onClick={startScanning}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium flex items-center gap-2 text-lg"
                  >
                    <Camera className="w-5 h-5" />
                    Start Camera
                  </button>
                </div>
              )}
              
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                    <p className="text-white mb-4">{error}</p>
                    <button
                      onClick={startScanning}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
              
              {scanning && (
                <>
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-2 border-primary/50 m-6 rounded-lg" />
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border border-primary/30 rounded-lg" />
                    </div>
                  </div>
                  
                  <button
                    onClick={stopScanning}
                    className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur-sm rounded-full text-white z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <p className="text-white text-sm bg-black/50 backdrop-blur-sm py-1 px-3 rounded-full inline-block">
                      Point camera at barcode
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Add Product Form */}
          {showAddForm && (
            <div ref={formRef} className="bg-card border border-border rounded-xl p-4 mb-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Barcode
                  </label>
                  <div className="bg-muted/50 border border-border rounded-lg px-3 py-3 text-foreground font-mono text-base break-all">
                    {lastScanned}
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
                    className="w-full bg-background border border-border rounded-lg px-3 py-3 text-foreground text-base focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter product name"
                    autoFocus
                  />
                </div>
                
                {!productInfiniteStock && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Quantity
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                        className="p-3 bg-muted rounded-lg hover:bg-accent active:bg-accent/70 touch-manipulation"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        value={productQuantity}
                        onChange={(e) => setProductQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-3 text-foreground text-base text-center focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setProductQuantity(productQuantity + 1)}
                        className="p-3 bg-muted rounded-lg hover:bg-accent active:bg-accent/70 touch-manipulation"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
                
                <label className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30 active:bg-purple-500/20 touch-manipulation">
                  <input
                    type="checkbox"
                    checked={productInfiniteStock}
                    onChange={(e) => setProductInfiniteStock(e.target.checked)}
                    className="w-5 h-5 accent-purple-500"
                  />
                  <span className="text-base text-foreground font-medium flex items-center gap-2">
                    <Infinity className="w-5 h-5 text-purple-500" />
                    Infinite Stock
                  </span>
                </label>
              </div>
              
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={cancelAdd}
                  className="flex-1 px-4 py-3 bg-muted text-foreground rounded-lg font-medium text-base hover:bg-accent active:bg-accent/70 touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addProduct}
                  disabled={!productName.trim()}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-base disabled:opacity-50 flex items-center justify-center gap-2 active:opacity-80 touch-manipulation"
                >
                  <Check className="w-5 h-5" />
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && sessionValid && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm flex-1">{error}</p>
              <button onClick={() => setError(null)} className="flex-shrink-0 touch-manipulation">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Scanned Products List */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-card">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5" />
                Scanned Products ({products.length})
              </h2>
            </div>
            
            {products.length === 0 ? (
              <div className="p-8 text-center">
                <Box className="w-16 h-16 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No products scanned yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scan a barcode to start
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {products.map((product, index) => (
                  <div key={index} className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground break-words">{product.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span className="font-mono text-xs break-all">{product.barcode}</span>
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
                      className="p-2 text-muted-foreground hover:text-destructive flex-shrink-0 touch-manipulation"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      {products.length > 0 && !showAddForm && (
        <div className="flex-shrink-0 p-4 bg-background border-t border-border">
          <button
            onClick={submitAll}
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground py-4 rounded-lg font-semibold text-lg hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Adding to Inventory...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Add {products.length} Product{products.length !== 1 ? 's' : ''} to Inventory
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
