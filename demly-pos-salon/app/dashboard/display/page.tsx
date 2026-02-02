"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { ShoppingCart, Check, Loader2, User, Store, Receipt, CreditCard } from 'lucide-react';

interface CartItem {
  id: number;
  cartId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  icon: string;
  image_url?: string | null;
  note?: string;
}

interface DisplayData {
  staffId: number;
  staffName: string;
  transactionId: string;
  transactionName: string;
  cart: CartItem[];
  subtotal: number;
  vat: number;
  grandTotal: number;
  customerId: string;
  customerName: string | null;
  timestamp: number;
}

export default function CustomerDisplay() {
  const { staff: currentStaff } = useStaffAuth();
  const [displayData, setDisplayData] = useState<DisplayData | null>(null);
  const [businessInfo, setBusinessInfo] = useState<{
    name: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
  }>({ name: "Demly POS" });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Load business settings
  useEffect(() => {
    const loadBusinessInfo = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: settings } = await supabase
          .from('settings')
          .select('business_name, shop_name, business_logo_url, business_address, business_phone')
          .eq('user_id', userData.user.id)
          .single();

        if (settings) {
          setBusinessInfo({
            name: settings.shop_name || settings.business_name || "Demly POS",
            logoUrl: settings.business_logo_url,
            address: settings.business_address,
            phone: settings.business_phone
          });
        }
      } catch (error) {
        console.error('Error loading business info:', error);
      }
    };

    loadBusinessInfo();
  }, []);

  // Listen for cart updates
  useEffect(() => {
    if (!currentStaff?.id) return;

    let channel: any;
    let timeoutId: NodeJS.Timeout;

    const setupRealtime = () => {
      // Clean up existing channel
      if (channel) {
        supabase.removeChannel(channel);
      }

      // Create new channel for this staff member
      channel = supabase.channel(`pos-display-${currentStaff.id}`, {
        config: {
          broadcast: { self: true }
        }
      })
        .on('broadcast', { event: 'cart-update' }, (payload: any) => {
          console.log('Received update:', payload.payload);
          
          if (payload.payload.clear) {
            setDisplayData(null);
          } else if (payload.payload.staffId === currentStaff.id) {
            setDisplayData(payload.payload);
            setLastUpdate(Date.now());
          }
          setConnectionStatus('connected');
        })
        .subscribe((status) => {
          console.log('Channel status:', status);
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('disconnected');
            // Try to reconnect after delay
            timeoutId = setTimeout(setupRealtime, 3000);
          }
        });

      // Also listen via BroadcastChannel for same-tab updates
      const broadcastChannel = new BroadcastChannel('pos-display');
      broadcastChannel.onmessage = (data: DisplayData | { clear: boolean }) => {
        console.log('Broadcast channel update:', data);
        if ('clear' in data) {
          if (data.clear) {
            setDisplayData(null);
          }
        } else if (data.staffId === currentStaff.id) {
          setDisplayData(data);
          setLastUpdate(Date.now());
        }
      };

      return () => {
        broadcastChannel.close();
        supabase.removeChannel(channel);
        clearTimeout(timeoutId);
      };
    };

    const cleanup = setupRealtime();
    setLoading(false);

    return cleanup;
  }, [currentStaff?.id]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Calculate item total with discount
  const calculateItemTotal = (item: CartItem) => {
    return (item.price * item.quantity) - item.discount;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground text-xl font-semibold">Loading Display...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-card p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          <div className="bg-card/80 backdrop-blur-lg border border-border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {businessInfo.logoUrl ? (
                  <img 
                    src={businessInfo.logoUrl} 
                    alt={businessInfo.name}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center">
                    <Store className="w-8 h-8 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-4xl font-bold text-foreground">{businessInfo.name}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    {businessInfo.address && (
                      <p className="text-sm text-muted-foreground">{businessInfo.address}</p>
                    )}
                    {businessInfo.phone && (
                      <p className="text-sm text-muted-foreground">• {businessInfo.phone}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Connection Status */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                    connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
                    'bg-destructive'
                  }`} />
                  <span className="text-sm text-muted-foreground">
                    {connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'connecting' ? 'Connecting...' :
                     'Disconnected'}
                  </span>
                </div>
                
                {/* Staff Info */}
                {currentStaff && (
                  <div className="bg-muted/50 rounded-lg px-4 py-2 border border-border">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{currentStaff.name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Transaction Card */}
        {displayData ? (
          <div className="space-y-6">
            {/* Transaction Header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl p-5 animate-in slide-in-from-top-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Receipt className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{displayData.transactionName}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-primary font-medium">
                        #{displayData.transactionId}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        • {displayData.cart.length} items
                        • Updated: {new Date(displayData.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                </div>
                
                {displayData.customerName && (
                  <div className="bg-muted/50 rounded-lg px-4 py-2 border border-border">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">{displayData.customerName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Your Items</h3>
                  <span className="ml-auto px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full">
                    {displayData.cart.length} items
                  </span>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {displayData.cart.map((item) => (
                    <div 
                      key={item.cartId}
                      className="bg-muted/30 border border-border rounded-lg p-4 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        {/* Item Image/Icon */}
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover border border-border"
                          />
                        ) : item.icon ? (
                          <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center text-2xl">
                            {item.icon}
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted border border-border flex items-center justify-center text-xl">
                            📦
                          </div>
                        )}
                        
                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-foreground text-lg">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(item.price)} × {item.quantity}
                              </p>
                              
                              {/* Discount Display */}
                              {item.discount > 0 && (
                                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                                  -{formatCurrency(item.discount)} discount
                                </div>
                              )}
                              
                              {/* Note Display */}
                              {item.note && (
                                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs font-medium rounded ml-2">
                                  <span className="text-[10px]">📝</span> {item.note}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <p className="text-xl font-bold text-primary">
                                {formatCurrency(calculateItemTotal(item))}
                              </p>
                              {item.discount > 0 && (
                                <p className="text-xs text-muted-foreground line-through">
                                  {formatCurrency(item.price * item.quantity)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Panel */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Order Summary</h3>
                </div>

                <div className="space-y-4">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center">
                    <span className="text-foreground font-medium">Subtotal</span>
                    <span className="text-lg font-semibold text-foreground">
                      {formatCurrency(displayData.subtotal)}
                    </span>
                  </div>

                  {/* VAT */}
                  {displayData.vat > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-foreground font-medium">VAT (20%)</span>
                      <span className="text-lg font-semibold text-foreground">
                        {formatCurrency(displayData.vat)}
                      </span>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-border my-4" />

                  {/* Grand Total */}
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-foreground">Total</span>
                    <span className="text-4xl font-bold text-primary">
                      {formatCurrency(displayData.grandTotal)}
                    </span>
                  </div>

                  {/* Payment Status */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-foreground">
                          Waiting for payment
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Your items are ready for checkout
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Please wait while your transaction is being processed
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {new Date(lastUpdate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
              </p>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-card/80 backdrop-blur-lg border-2 border-border rounded-xl p-12 text-center shadow-lg">
            <div className="max-w-md mx-auto">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 blur-2xl rounded-full" />
                <div className="relative w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center">
                  <Check className="w-16 h-16 text-primary" />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-foreground mb-3">Ready</h2>
              <p className="text-lg text-muted-foreground mb-8">
                {currentStaff ? (
                  `Waiting for ${currentStaff.name} to add items...`
                ) : (
                  "Waiting for staff login..."
                )}
              </p>
              
              <div className="bg-muted/30 border border-border rounded-lg p-4 inline-block">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-foreground">
                    Display connected • Staff: {currentStaff?.name || "Not logged in"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
