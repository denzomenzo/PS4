"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { Trash2, Loader2, Search, ShoppingCart, CreditCard, Plus, Minus, Layers, X, Lock, LogOut, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  price: number;
  icon: string;
  barcode?: string | null;
  sku?: string | null;
  track_inventory: boolean;
  stock_quantity: number;
  category?: string | null;
  image_url?: string | null;
}

interface Staff {
  id: number;
  name: string;
  pin: string;
  role: "staff" | "manager";
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
}

interface CartItem extends Product {
  cartId: string;
  quantity: number;
}

interface Transaction {
  id: string;
  name: string;
  cart: CartItem[];
  staffId: string;
  customerId: string;
  createdAt: number;
}

export default function POS() {
  const userId = useUserId();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [showPinModal, setShowPinModal] = useState(true);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  
  // Multi-transaction state
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      name: "Transaction 1",
      cart: [],
      staffId: "",
      customerId: "",
      createdAt: Date.now()
    }
  ]);
  const [activeTransactionId, setActiveTransactionId] = useState("1");
  
  const [vatEnabled, setVatEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [hardwareSettings, setHardwareSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTransactionMenu, setShowTransactionMenu] = useState(false);

  const activeTransaction = transactions.find(t => t.id === activeTransactionId);
  const cart = activeTransaction?.cart || [];
  const staffId = activeTransaction?.staffId || "";
  const customerId = activeTransaction?.customerId || "";

  const setCart = (newCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setTransactions(prev => prev.map(t => 
      t.id === activeTransactionId 
        ? { ...t, cart: typeof newCart === 'function' ? newCart(t.cart) : newCart }
        : t
    ));
  };

  const setStaffId = (id: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === activeTransactionId ? { ...t, staffId: id } : t
    ));
  };

  const setCustomerId = (id: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === activeTransactionId ? { ...t, customerId: id } : t
    ));
  };

  const handleBarcodeScan = useCallback((barcode: string) => {
    if (!isAuthenticated) return;
    const product = products.find((p) => p.barcode === barcode || p.sku === barcode);
    if (product) addToCart(product);
  }, [products, isAuthenticated]);

  const { isScanning } = useBarcodeScanner({
    enabled: isAuthenticated && hardwareSettings?.barcode_scanner_enabled !== false,
    onScan: handleBarcodeScan,
    playSoundOnScan: hardwareSettings?.scanner_sound_enabled !== false,
  });

  useEffect(() => {
    if (userId) loadData();
  }, [userId]);

  // Broadcast cart updates to customer display
useEffect(() => {
    if (!isAuthenticated || !hardwareSettings?.customer_display_enabled) return;
    
    const channel = supabase.channel(hardwareSettings.display_sync_channel || 'customer-display');
    
    // Broadcast current cart state
    const broadcastCart = async () => {
      await channel.send({
        type: 'broadcast',
        event: 'cart-update',
        payload: {
          cart: cart,
          total: total,
          vat: vat,
          grandTotal: grandTotal,
          transactionName: activeTransaction?.name,
          transactionId: activeTransactionId,
        }
      });
    };

    broadcastCart();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cart, total, vat, grandTotal, activeTransactionId, activeTransaction, isAuthenticated, hardwareSettings]);

  useEffect(() => {
    if (searchQuery.trim() && isAuthenticated) {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter((p) =>
          p.name.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    
    const { data: settingsData } = await supabase
      .from("settings")
      .select("vat_enabled")
      .eq("user_id", userId)
      .single();
    
    if (settingsData?.vat_enabled !== undefined) {
      setVatEnabled(settingsData.vat_enabled);
    }

    const { data: hardwareData } = await supabase
      .from("hardware_settings")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (hardwareData) setHardwareSettings(hardwareData);

    const { data: productsData } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    
    if (productsData) {
      setProducts(productsData);
      setFilteredProducts(productsData);
    }

    const { data: staffData } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    
    if (staffData) setStaff(staffData);

    const { data: customersData } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    
    if (customersData) setCustomers(customersData);

    setLoading(false);
  };

  const handlePinSubmit = () => {
    if (pinInput.length !== 4) {
      setPinError("PIN must be 4 digits");
      return;
    }

    const staffMember = staff.find(s => s.pin === pinInput);
    
    if (!staffMember) {
      setPinError("Invalid PIN. Please try again.");
      setPinInput("");
      return;
    }

    setCurrentStaff(staffMember);
    setIsAuthenticated(true);
    setShowPinModal(false);
    setPinError("");
    setPinInput("");
    
    // Set staff ID for transaction
    setStaffId(staffMember.id.toString());
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentStaff(null);
    setShowPinModal(true);
    setPinInput("");
    
    // Clear all transactions
    setTransactions([{
      id: "1",
      name: "Transaction 1",
      cart: [],
      staffId: "",
      customerId: "",
      createdAt: Date.now()
    }]);
    setActiveTransactionId("1");
  };

  const addToCart = (product: Product) => {
    if (!isAuthenticated) return;
    
    if (product.track_inventory && product.stock_quantity <= 0) {
      alert(`${product.name} is out of stock`);
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      
      if (product.track_inventory && newQuantity > product.stock_quantity) {
        alert(`Only ${product.stock_quantity} of ${product.name} available`);
        return;
      }
      
      setCart(cart.map((item) => 
        item.id === product.id ? { ...item, quantity: newQuantity } : item
      ));
    } else {
      setCart([...cart, { ...product, cartId: `${product.id}-${Date.now()}`, quantity: 1 }]);
    }
  };

  const removeFromCart = (cartId: string) => setCart(cart.filter((item) => item.cartId !== cartId));

  const updateQuantity = (cartId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartId);
    } else {
      const item = cart.find(i => i.cartId === cartId);
      if (item && item.track_inventory && newQuantity > item.stock_quantity) {
        alert(`Only ${item.stock_quantity} of ${item.name} available`);
        return;
      }
      setCart(cart.map((item) => (item.cartId === cartId ? { ...item, quantity: newQuantity } : item)));
    }
  };

  const addNewTransaction = () => {
    const newId = (Math.max(...transactions.map(t => parseInt(t.id))) + 1).toString();
    const newTransaction: Transaction = {
      id: newId,
      name: `Transaction ${newId}`,
      cart: [],
      staffId: currentStaff?.id.toString() || "",
      customerId: "",
      createdAt: Date.now()
    };
    setTransactions([...transactions, newTransaction]);
    setActiveTransactionId(newId);
    setShowTransactionMenu(false);
  };

  const switchTransaction = (id: string) => {
    setActiveTransactionId(id);
    setShowTransactionMenu(false);
  };

  const deleteTransaction = (id: string) => {
    if (transactions.length === 1) return;
    const filtered = transactions.filter(t => t.id !== id);
    setTransactions(filtered);
    if (activeTransactionId === id) {
      setActiveTransactionId(filtered[0].id);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vat = vatEnabled ? total * 0.2 : 0;
  const grandTotal = total + vat;

  const checkout = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    
    setCheckingOut(true);
    
    try {
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          staff_id: currentStaff?.id || null,
          customer_id: customerId ? parseInt(customerId) : null,
          services: [],
          products: cart.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            icon: item.icon,
            quantity: item.quantity,
            total: item.price * item.quantity,
          })),
          subtotal: total,
          vat: vat,
          total: grandTotal,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      const stockUpdates = cart
        .filter(item => item.track_inventory)
        .map(item => ({
          id: item.id,
          newStock: item.stock_quantity - item.quantity
        }));

      for (const update of stockUpdates) {
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_quantity: update.newStock })
          .eq("id", update.id);

        if (stockError) {
          console.error(`Failed to update stock for product ${update.id}:`, stockError);
        }
      }

      alert(`✅ £${grandTotal.toFixed(2)} charged successfully!`);
      
      setTransactions(prev => prev.map(t => 
        t.id === activeTransactionId 
          ? { ...t, cart: [], customerId: "" }
          : t
      ));
      
      loadData();
      
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert("❌ Error processing transaction: " + (error.message || "Unknown error"));
    } finally {
      setCheckingOut(false);
    }
  };

  if (!userId) return null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading POS...</p>
        </div>
      </div>
    );
  }

  // PIN Authentication Modal
  if (showPinModal || !isAuthenticated) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center p-6">
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-10 max-w-md w-full border border-slate-800/50 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-2">
              Staff Login
            </h1>
            <p className="text-slate-400 text-lg">Enter your 4-digit PIN to access POS</p>
          </div>

          {pinError && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 mb-6 text-center">
              {pinError}
            </div>
          )}

          <div className="mb-6">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setPinInput(value);
                setPinError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
              placeholder="••••"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-6 py-6 text-center text-4xl font-bold tracking-widest text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              autoFocus
            />
            <p className="text-center text-slate-500 text-sm mt-3">
              {staff.length === 0 ? "No staff members found. Please create staff in Settings." : `${staff.length} staff member${staff.length !== 1 ? 's' : ''} available`}
            </p>
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={pinInput.length !== 4}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-6 rounded-xl transition-all disabled:opacity-50 text-xl shadow-xl shadow-emerald-500/20"
          >
            Enter POS
          </button>

          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <Link
              href="/dashboard/settings"
              className="block text-center text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
            >
              <SettingsIcon className="w-4 h-4 inline mr-2" />
              Need to manage staff & PINs? Go to Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      
      {/* LEFT - Products */}
      <div className="flex-1 flex flex-col p-6">
        
        {/* Top Bar with Staff Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl px-6 py-3">
              <p className="text-sm text-slate-400">Logged in as</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-white">{currentStaff?.name}</p>
                {currentStaff?.role === "manager" && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                    MANAGER
                  </span>
                )}
              </div>
            </div>
            {currentStaff?.role === "manager" && (
              <Link
                href="/dashboard/settings"
                className="bg-slate-900/50 hover:bg-slate-800/50 backdrop-blur-xl border border-slate-800/50 hover:border-emerald-500/50 rounded-xl px-6 py-3 transition-all flex items-center gap-2"
              >
                <SettingsIcon className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-white">Settings</span>
              </Link>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 text-red-400 px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, SKU, or barcode..."
              className="w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 pl-14 pr-6 py-5 rounded-2xl text-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 shadow-xl transition-all"
            />
            {isScanning && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                Scanner Active
              </div>
            )}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto bg-slate-900/30 backdrop-blur-xl rounded-3xl p-6 border border-slate-800/50 shadow-2xl">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ShoppingCart className="w-24 h-24 mx-auto mb-6 text-slate-700" />
                <p className="text-2xl text-slate-500 font-semibold">No products found</p>
                <p className="text-slate-600 mt-2">Try a different search term</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.track_inventory && product.stock_quantity <= 0}
                  className="group relative bg-slate-800/40 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-5 hover:border-emerald-500/50 hover:bg-slate-800/60 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700/50"
                >
                  {product.icon && (
                    <span className="text-5xl block mb-3 group-hover:scale-110 transition-transform duration-200">
                      {product.icon}
                    </span>
                  )}
                  <p className="font-bold text-white text-sm mb-2 line-clamp-2 leading-tight">
                    {product.name}
                  </p>
                  <p className="text-2xl font-black text-transparent bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text">
                    £{product.price.toFixed(2)}
                  </p>
                  {product.track_inventory && (
                    <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block font-semibold ${
                      product.stock_quantity > 10 
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                        : product.stock_quantity > 0
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                      Stock: {product.stock_quantity}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT - Cart */}
      <div className="w-[500px] bg-slate-900/50 backdrop-blur-xl border-l border-slate-800/50 flex flex-col shadow-2xl">
        
        {/* Header with Transaction Switcher */}
        <div className="p-6 border-b border-slate-800/50 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl shadow-lg shadow-emerald-500/20">
                <ShoppingCart className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{activeTransaction?.name}</h2>
                <p className="text-slate-400 text-sm font-medium">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTransactionMenu(!showTransactionMenu)}
              className="relative p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 rounded-xl transition-all"
            >
              <Layers className="w-5 h-5 text-emerald-400" />
              {transactions.length > 1 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full text-xs font-bold flex items-center justify-center text-white">
                  {transactions.length}
                </span>
              )}
            </button>
          </div>

          {/* Transaction Menu */}
          {showTransactionMenu && (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-3 space-y-2">
              {transactions.map((trans) => (
                <div
                  key={trans.id}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                    trans.id === activeTransactionId
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-slate-900/30 border border-slate-700/30 hover:bg-slate-800/50"
                  }`}
                >
                  <button
                    onClick={() => switchTransaction(trans.id)}
                    className="flex-1 text-left"
                  >
                    <p className="font-bold text-white text-sm">{trans.name}</p>
                    <p className="text-xs text-slate-400">
                      {trans.cart.length} items • £{trans.cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                    </p>
                  </button>
                  {transactions.length > 1 && (
                    <button
                      onClick={() => deleteTransaction(trans.id)}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addNewTransaction}
                className="w-full p-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 border border-emerald-500/30 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ShoppingCart className="w-20 h-20 mx-auto mb-4 text-slate-700" />
                <p className="text-xl text-slate-500 font-semibold">Cart is empty</p>
                <p className="text-slate-600 text-sm mt-2">Add products to get started</p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartId} className="bg-slate-800/40 backdrop-blur-lg rounded-2xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all shadow-lg">
                <div className="flex items-start gap-3 mb-3">
               {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover border-2 border-slate-700/50" />
                ) : item.icon ? (
             <span className="text-3xl">{item.icon}</span>
            ) : (
                   <div className="w-16 h-16 bg-slate-700/50 rounded-xl flex items-center justify-center text-2xl">📦</div>
                     )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base truncate">
                      {item.name}
                    </h3>
                    <p className="text-sm text-slate-400 font-medium">
                      £{item.price.toFixed(2)} each
                    </p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.cartId)} 
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-slate-900/50 rounded-xl p-1">
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity - 1)} 
                      className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-white transition-all"
                    >
                      <Minus className="w-4 h-4 mx-auto" />
                    </button>
                    <span className="w-12 text-center font-bold text-white text-lg">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity + 1)} 
                      className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-white transition-all"
                    >
                      <Plus className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                  <span className="text-xl font-black text-transparent bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text">
                    £{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div className="p-6 border-t border-slate-800/50 bg-slate-900/50 space-y-4">
          
          {customers.length > 0 && (
            <select 
              value={customerId} 
              onChange={(e) => setCustomerId(e.target.value)} 
              className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 text-white p-4 rounded-xl font-medium focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            >
              <option value="">Select Customer (Optional)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <div className="space-y-3 bg-slate-800/40 backdrop-blur-lg rounded-2xl p-5 border border-slate-700/50">
            <div className="flex justify-between text-slate-300 text-base">
              <span className="font-medium">Subtotal</span>
              <span className="font-bold">£{total.toFixed(2)}</span>
            </div>
            {vatEnabled && (
              <div className="flex justify-between text-slate-300 text-base">
                <span className="font-medium">VAT (20%)</span>
                <span className="font-bold">£{vat.toFixed(2)}</span>
              </div>
            )}
            <div className="h-px bg-slate-700/50 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-black text-white">Total</span>
              <span className="text-4xl font-black text-transparent bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text">
                £{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={checkout}
            disabled={checkingOut || cart.length === 0}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-black text-xl py-6 rounded-2xl shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3"
          >
            {checkingOut ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-6 h-6" />
                Charge £{grandTotal.toFixed(2)}
                setTransactions(prev => prev.map(t => 
               t.id === activeTransactionId 
                ? { ...t, cart: [], customerId: "" }
                : t
              ));
                // Clear customer display
if (hardwareSettings?.customer_display_enabled) {
  const channel = supabase.channel(hardwareSettings.display_sync_channel || 'customer-display');
  await channel.send({
    type: 'broadcast',
    event: 'cart-update',
    payload: {
      cart: [],
      total: 0,
      vat: 0,
      grandTotal: 0,
      transactionName: activeTransaction?.name,
      transactionId: activeTransactionId,
    }
  });
  supabase.removeChannel(channel);
}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


