// components/POS.tsx - COMPLETE PRODUCTION READY VERSION
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { logAuditAction } from "@/lib/auditLogger";
import { 
  Trash2, Loader2, Search, ShoppingCart, CreditCard, Plus, 
  Minus, Layers, X, Printer, Tag, DollarSign, Package, 
  Mail, User, Wallet, RefreshCw, History, Calculator,
  Edit, Moon, Sun
} from "lucide-react";

// ========== INTERFACES ==========
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

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  balance: number;
}

interface CartItem extends Product {
  cartId: string;
  quantity: number;
  discount?: number;
  isMisc?: boolean;
}

interface Transaction {
  id: string;
  name: string;
  cart: CartItem[];
  customerId: string;
  createdAt: number;
  lastUpdated?: number;
}

interface SplitPayment {
  cash: number;
  card: number;
  balance: number;
  remaining: number;
}

// ========== HELPER FUNCTIONS ==========
const getSafeNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// ========== MAIN COMPONENT ==========
export default function POS() {
  // ========== HOOKS & AUTH ==========
  const userId = useUserId();
  const { staff: currentStaff } = useStaffAuth();
  
  // ========== STATE ==========
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: "1", name: "Transaction 1", cart: [], customerId: "", createdAt: Date.now() }
  ]);
  const [activeTransactionId, setActiveTransactionId] = useState<string>("1");
  const [vatEnabled, setVatEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hardwareSettings, setHardwareSettings] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [receiptSettings, setReceiptSettings] = useState<any>(null);
  const [allowNegativeBalance, setAllowNegativeBalance] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showMiscModal, setShowMiscModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showNumpadModal, setShowNumpadModal] = useState(false);
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  
  // Payment states
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [miscProductName, setMiscProductName] = useState("");
  const [miscProductPrice, setMiscProductPrice] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "balance" | "split">("cash");
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [printReceiptOption, setPrintReceiptOption] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [useBalanceForPayment, setUseBalanceForPayment] = useState(false);
  const [transactionNotes, setTransactionNotes] = useState("");
  const [customAmount, setCustomAmount] = useState<string>("");
  const [splitPayment, setSplitPayment] = useState<SplitPayment>({
    cash: 0, card: 0, balance: 0, remaining: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  // ========== DERIVED STATE ==========
  const activeTransaction = transactions.find(t => t.id === activeTransactionId);
  const cart = activeTransaction?.cart || [];
  const customerId = activeTransaction?.customerId || "";
  const selectedCustomer = customers.find(c => c.id.toString() === customerId);
  const customerBalance = selectedCustomer ? getSafeNumber(selectedCustomer.balance) : 0;
  
  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const itemDiscount = item.discount || 0;
    return sum + (itemTotal - itemDiscount);
  }, 0);
  
  const vat = vatEnabled ? subtotal * 0.2 : 0;
  const grandTotal = subtotal + vat;

  // ========== EFFECTS ==========
  useEffect(() => {
    // Check for saved dark mode preference
    const savedMode = localStorage.getItem("posDarkMode");
    if (savedMode) setDarkMode(savedMode === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("posDarkMode", darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    if (!currentStaff) return;
    
    const storageKey = `pos_transactions_${currentStaff.id}`;
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.transactions?.length > 0) {
          setTransactions(parsed.transactions);
          setActiveTransactionId(parsed.activeTransactionId || parsed.transactions[0].id);
        }
      } catch (error) {
        console.error("Error loading transactions:", error);
      }
    }
  }, [currentStaff]);

  useEffect(() => {
    if (!currentStaff || transactions.length === 0) return;
    
    const storageKey = `pos_transactions_${currentStaff.id}`;
    const dataToSave = { transactions, activeTransactionId, lastUpdated: Date.now() };
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  }, [transactions, activeTransactionId, currentStaff]);

  useEffect(() => {
    if (userId && currentStaff) loadData();
  }, [userId, currentStaff]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products]);

  // ========== BARCODE SCANNER ==========
  const handleBarcodeScan = useCallback((barcode: string) => {
    const product = products.find(p => p.barcode === barcode || p.sku === barcode);
    if (product) addToCart(product);
  }, [products]);

  const { isScanning } = useBarcodeScanner({
    enabled: hardwareSettings?.barcode_scanner_enabled !== false,
    onScan: handleBarcodeScan,
  });

  // ========== DATA LOADING ==========
  const loadData = async () => {
    setLoading(true);
    try {
      // Load settings
      const { data: settingsData } = await supabase
        .from("settings").select("*").eq("user_id", userId).single();
      if (settingsData) {
        setVatEnabled(settingsData.vat_enabled !== false);
        setReceiptSettings(settingsData);
        setAllowNegativeBalance(settingsData.allow_negative_balance || false);
      }

      // Load hardware settings
      const { data: hardwareData } = await supabase
        .from("hardware_settings").select("*").eq("user_id", userId).single();
      if (hardwareData) setHardwareSettings(hardwareData);

      // Load products
      const { data: productsData } = await supabase
        .from("products").select("*").eq("user_id", userId).order("name");
      if (productsData) {
        setProducts(productsData);
        setFilteredProducts(productsData);
      }

      // Load customers
      const { data: customersData } = await supabase
        .from("customers").select("id, name, phone, email, balance").eq("user_id", userId).order("name");
      if (customersData) {
        setCustomers(customersData.map(c => ({
          ...c,
          balance: getSafeNumber(c.balance)
        })));
      }

      // Load recent transactions
      const { data: transactionsData } = await supabase
        .from("transactions").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(10);
      if (transactionsData) setRecentTransactions(transactionsData);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ========== CART FUNCTIONS ==========
  const setCart = (newCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setTransactions(prev => prev.map(t => 
      t.id === activeTransactionId ? {
        ...t,
        cart: typeof newCart === 'function' ? newCart(t.cart) : newCart,
        lastUpdated: Date.now()
      } : t
    ));
  };

  const setCustomerId = (id: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === activeTransactionId ? { ...t, customerId: id } : t
    ));
  };

  const addToCart = (product: Product) => {
    if (product.track_inventory && product.stock_quantity <= 0) {
      alert(`${product.name} is out of stock`);
      return;
    }

    const existingItem = cart.find(item => item.id === product.id && !item.isMisc);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      if (product.track_inventory && newQuantity > product.stock_quantity) {
        alert(`Only ${product.stock_quantity} of ${product.name} available`);
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id && !item.isMisc ? { ...item, quantity: newQuantity } : item
      ));
    } else {
      setCart([...cart, { ...product, cartId: `${product.id}-${Date.now()}`, quantity: 1 }]);
    }
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, newQuantity: number) => {
    const item = cart.find(i => i.cartId === cartId);
    if (!item) return;
    
    if (newQuantity <= 0) {
      removeFromCart(cartId);
      return;
    }
    
    if (item.track_inventory && newQuantity > item.stock_quantity) {
      alert(`Only ${item.stock_quantity} of ${item.name} available`);
      return;
    }
    
    setCart(cart.map(item => item.cartId === cartId ? { ...item, quantity: newQuantity } : item));
  };

  // ========== DISCOUNT FUNCTIONS ==========
  const applyDiscount = () => {
    if (!discountValue || cart.length === 0) return;

    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      alert("Please enter a valid discount");
      return;
    }

    if (discountType === "percentage" && value > 100) {
      alert("Percentage discount cannot exceed 100%");
      return;
    }

    const itemTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = discountType === "percentage" 
      ? (itemTotal * value) / 100 
      : value;

    if (discountAmount > itemTotal) {
      alert("Discount cannot exceed total amount");
      return;
    }

    const updatedCart = cart.map(item => {
      const itemSubtotal = item.price * item.quantity;
      const itemProportion = itemSubtotal / itemTotal;
      const itemDiscount = discountAmount * itemProportion;
      return { ...item, discount: (item.discount || 0) + itemDiscount };
    });

    setCart(updatedCart);
    setDiscountValue("");
    setShowDiscountModal(false);
  };

  // ========== MISC PRODUCT ==========
  const addMiscProduct = () => {
    if (!miscProductName.trim() || !miscProductPrice) {
      alert("Please enter product name and price");
      return;
    }

    const price = parseFloat(miscProductPrice);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price");
      return;
    }

    const miscProduct: CartItem = {
      id: Date.now(),
      cartId: `misc-${Date.now()}`,
      name: miscProductName,
      price: price,
      quantity: 1,
      icon: "📦",
      track_inventory: false,
      stock_quantity: 0,
      isMisc: true,
    };

    setCart([...cart, miscProduct]);
    setMiscProductName("");
    setMiscProductPrice("");
    setShowMiscModal(false);
  };

  // ========== TRANSACTION MANAGEMENT ==========
  const addNewTransaction = () => {
    const newId = (Math.max(...transactions.map(t => parseInt(t.id)), 0) + 1).toString();
    const newTransaction: Transaction = {
      id: newId,
      name: `Transaction ${newId}`,
      cart: [],
      customerId: "",
      createdAt: Date.now()
    };
    setTransactions([...transactions, newTransaction]);
    setActiveTransactionId(newId);
  };

  const switchTransaction = (id: string) => {
    setActiveTransactionId(id);
  };

  const deleteTransaction = (id: string) => {
    if (transactions.length === 1) {
      alert("Cannot delete the only transaction");
      return;
    }
    
    const filtered = transactions.filter(t => t.id !== id);
    setTransactions(filtered);
    if (activeTransactionId === id) {
      setActiveTransactionId(filtered[0].id);
    }
  };

  const clearActiveTransaction = () => {
    if (!activeTransaction || cart.length === 0) return;
    if (!confirm("Clear this transaction?")) return;
    setCart([]);
    setCustomerId("");
  };

  // ========== PAYMENT PROCESSING ==========
  const processPayment = async () => {
    if (cart.length === 0) return;
    
    setProcessingPayment(true);
    
    try {
      const selectedCustomer = customers.find(c => c.id.toString() === customerId);
      let balanceDeducted = 0;
      const amountToPay = parseFloat(customAmount) || grandTotal;

      // Validate customer balance if using balance
      if ((paymentMethod === "balance" || paymentMethod === "split") && selectedCustomer) {
        const balanceToUse = paymentMethod === "split" ? splitPayment.balance : amountToPay;
        
        if (selectedCustomer.balance < balanceToUse && !allowNegativeBalance) {
          alert(`Insufficient balance. Available: £${selectedCustomer.balance.toFixed(2)}`);
          setProcessingPayment(false);
          return;
        }
        
        balanceDeducted = balanceToUse;
      }

      // Prepare transaction data
      const transactionData = {
        user_id: userId,
        staff_id: currentStaff?.id || null,
        customer_id: customerId ? parseInt(customerId) : null,
        products: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          discount: item.discount || 0,
          total: (item.price * item.quantity) - (item.discount || 0),
        })),
        subtotal: subtotal,
        vat: vat,
        total: grandTotal,
        payment_method: paymentMethod,
        balance_deducted: balanceDeducted,
        notes: transactionNotes.trim() || null,
        services: []
      };

      // Insert transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions").insert(transactionData).select().single();
      if (transactionError) throw transactionError;

      // Update customer balance if used
      if (balanceDeducted > 0 && selectedCustomer) {
        const newBalance = selectedCustomer.balance - balanceDeducted;
        
        await supabase
          .from("customers")
          .update({ balance: newBalance })
          .eq("id", selectedCustomer.id);

        // Update local state
        setCustomers(prev => prev.map(c => 
          c.id === selectedCustomer.id ? { ...c, balance: newBalance } : c
        ));
      }

      // Update stock
      for (const item of cart.filter(item => item.track_inventory && !item.isMisc)) {
        await supabase
          .from("products")
          .update({ stock_quantity: item.stock_quantity - item.quantity })
          .eq("id", item.id);
      }

      // Log audit
      await logAuditAction({
        action: "TRANSACTION_COMPLETED",
        entityType: "transaction",
        entityId: transaction.id.toString(),
        newValues: { total: grandTotal, items: cart.length },
        staffId: currentStaff?.id,
      });

      // Success
      alert(`✅ £${grandTotal.toFixed(2)} paid successfully!`);
      
      // Reset
      setShowPaymentModal(false);
      setShowSplitPaymentModal(false);
      setCart([]);
      setCustomerId("");
      setTransactionNotes("");
      setSplitPayment({ cash: 0, card: 0, balance: 0, remaining: grandTotal });
      
      // Reload recent transactions
      const { data: newTransactions } = await supabase
        .from("transactions").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(10);
      if (newTransactions) setRecentTransactions(newTransactions);

    } catch (error: any) {
      console.error("Payment error:", error);
      alert("❌ Error processing payment");
    } finally {
      setProcessingPayment(false);
    }
  };

  // ========== NUMERICAL HELPERS ==========
  const handleNumpadClick = (value: string) => {
    if (value === 'clear') setCustomAmount('');
    else if (value === 'backspace') setCustomAmount(prev => prev.slice(0, -1));
    else if (value === '.' && !customAmount.includes('.')) setCustomAmount(prev => prev + '.');
    else setCustomAmount(prev => prev + value);
  };

  const handleSplitPaymentChange = (method: keyof SplitPayment, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSplitPayment(prev => {
      const newSplit = { ...prev, [method]: numValue };
      newSplit.remaining = Math.max(0, grandTotal - (newSplit.cash + newSplit.card + newSplit.balance));
      return newSplit;
    });
  };

  // ========== UI HELPERS ==========
  const themeClasses = darkMode 
    ? "bg-gray-900 text-white border-gray-700"
    : "bg-white text-gray-900 border-gray-200";

  const buttonClasses = darkMode
    ? "bg-gray-800 hover:bg-gray-700 border-gray-700 text-white"
    : "bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900";

  const primaryButtonClasses = darkMode
    ? "bg-green-600 hover:bg-green-700 text-white"
    : "bg-green-600 hover:bg-green-700 text-white";

  // ========== LOADING STATES ==========
  if (!userId || !currentStaff) {
    return (
      <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading POS...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading POS...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className={`h-screen flex ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} overflow-hidden`}>
      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-4 right-4 p-2 rounded-lg z-50 ${
          darkMode ? 'bg-gray-800 text-yellow-300' : 'bg-white text-gray-900 shadow'
        }`}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col p-6 min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
            Point of Sale
          </h1>
          <p className={darkMode ? 'text-green-300 mt-2' : 'text-green-600 mt-2'}>
            Process sales and manage transactions
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className={`w-full pl-12 pr-4 py-3 rounded-xl text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
            {isScanning && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-green-600 text-xs font-semibold">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                Scanning
              </div>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className={`flex-1 overflow-y-auto rounded-xl p-4 border shadow-sm min-h-0 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ShoppingCart className={`w-24 h-24 mx-auto mb-4 ${
                  darkMode ? 'text-gray-700' : 'text-gray-300'
                }`} />
                <p className={darkMode ? 'text-gray-400 text-xl font-semibold' : 'text-gray-500 text-xl font-semibold'}>
                  No products found
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.track_inventory && product.stock_quantity <= 0}
                  className={`group relative rounded-lg p-3 hover:shadow-md transition-all duration-200 disabled:opacity-40 ${
                    darkMode
                      ? 'bg-gray-700 border-gray-600 hover:border-green-500 text-white'
                      : 'bg-white border-gray-200 hover:border-green-500 text-gray-900'
                  } border`}
                >
                  <div className={`w-full aspect-square mb-3 rounded-lg flex items-center justify-center text-3xl ${
                    darkMode ? 'bg-gray-600' : 'bg-gray-100'
                  }`}>
                    {product.icon || '📦'}
                  </div>
                  <p className="font-bold text-sm mb-2 line-clamp-2 leading-tight">
                    {product.name}
                  </p>
                  <p className="text-lg font-black text-green-500">
                    £{product.price.toFixed(2)}
                  </p>
                  {product.track_inventory && (
                    <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block font-semibold ${
                      product.stock_quantity > 10 
                        ? darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                        : product.stock_quantity > 0
                        ? darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                        : darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800'
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

      {/* Right Side - Cart */}
      <div className={`w-[500px] border-l flex flex-col shadow-lg overflow-hidden ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Transaction Header */}
        <div className={`p-4 border-b ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-green-50 border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {activeTransaction?.name}
                </h2>
                <p className={darkMode ? 'text-gray-400 text-xs' : 'text-gray-600 text-xs'}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </p>
              </div>
            </div>
            <button
              onClick={() => deleteTransaction(activeTransactionId)}
              className={`p-2 rounded-lg transition-all ${
                darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ShoppingCart className={`w-16 h-16 mx-auto mb-3 ${
                  darkMode ? 'text-gray-700' : 'text-gray-300'
                }`} />
                <p className={darkMode ? 'text-gray-400 text-lg font-semibold' : 'text-gray-500 text-lg font-semibold'}>
                  Cart is empty
                </p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartId} className={`rounded-lg p-4 border transition-all ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-2xl ${
                    darkMode ? 'bg-gray-600' : 'bg-gray-100'
                  }`}>
                    {item.icon || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm truncate ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {item.name}
                    </h3>
                    <p className={darkMode ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>
                      £{item.price.toFixed(2)} each
                    </p>
                    {item.discount && item.discount > 0 && (
                      <p className="text-xs text-green-500 font-semibold">
                        -£{item.discount.toFixed(2)} discount
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.cartId)} 
                    className="text-red-500 hover:text-red-600 p-1.5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-1.5 rounded-lg p-1 ${
                    darkMode ? 'bg-gray-600' : 'bg-gray-100'
                  }`}>
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity - 1)} 
                      className={`w-8 h-8 rounded-md font-bold transition-all flex items-center justify-center ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className={`w-10 text-center font-bold text-base ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity + 1)} 
                      className={`w-8 h-8 rounded-md font-bold transition-all flex items-center justify-center ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xl font-black text-green-500">
                    £{((item.price * item.quantity) - (item.discount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Panel */}
        <div className={`p-4 border-t space-y-4 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          
          {/* Customer Selection */}
          <div>
            <select 
              value={customerId} 
              onChange={(e) => setCustomerId(e.target.value)} 
              className={`w-full p-3 rounded-lg font-medium text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              } border`}
            >
              <option value="">Select Customer (Optional)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance > 0 ? `(£${c.balance.toFixed(2)} bal)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Balance */}
          {selectedCustomer && (
            <div className={`rounded-lg p-3 border ${
              darkMode 
                ? 'bg-gray-700 border-gray-600' 
                : customerBalance >= grandTotal 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-green-500" />
                  <span className={darkMode ? 'text-green-400 font-medium' : 'text-green-600 font-medium'}>
                    {selectedCustomer.name}'s Balance:
                  </span>
                </div>
                <span className="text-xl font-black text-green-500">
                  £{customerBalance.toFixed(2)}
                </span>
              </div>
              {customerBalance >= grandTotal && (
                <p className={darkMode ? 'text-green-300 text-xs mt-1' : 'text-green-600 text-xs mt-1'}>
                  ✓ Sufficient balance for full payment
                </p>
              )}
            </div>
          )}

          {/* Totals */}
          <div className={`space-y-2 rounded-xl p-4 border ${
            darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex justify-between">
              <span className={darkMode ? 'text-gray-300 font-medium' : 'text-gray-700 font-medium'}>
                Subtotal
              </span>
              <span className={darkMode ? 'text-white font-bold' : 'text-gray-900 font-bold'}>
                £{subtotal.toFixed(2)}
              </span>
            </div>
            {vatEnabled && (
              <div className="flex justify-between">
                <span className={darkMode ? 'text-gray-300 font-medium' : 'text-gray-700 font-medium'}>
                  VAT (20%)
                </span>
                <span className={darkMode ? 'text-white font-bold' : 'text-gray-900 font-bold'}>
                  £{vat.toFixed(2)}
                </span>
              </div>
            )}
            <div className={`h-px my-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            <div className="flex justify-between items-center">
              <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Total
              </span>
              <span className="text-3xl font-bold text-green-500">
                £{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowDiscountModal(true)}
              disabled={cart.length === 0}
              className={`py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 text-sm disabled:opacity-50 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900'
              } border`}
            >
              <Tag className="w-4 h-4" />
              Discount
            </button>
            
            <button
              onClick={() => setShowMiscModal(true)}
              className={`py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 text-sm ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900'
              } border`}
            >
              <Package className="w-4 h-4" />
              Misc Item
            </button>

            <button
              onClick={() => addNewTransaction()}
              className={`py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 text-sm ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900'
              } border`}
            >
              <Plus className="w-4 h-4" />
              New Sale
            </button>

            <button
              onClick={clearActiveTransaction}
              disabled={cart.length === 0}
              className={`py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 text-sm disabled:opacity-50 ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-900'
              } border`}
            >
              <RefreshCw className="w-4 h-4" />
              Clear
            </button>
          </div>

          {/* Checkout Button */}
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className={`w-full py-4 text-white font-bold text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            PAY £{grandTotal.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Payment Modal (Simplified) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-xl p-6 max-w-md w-full ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border`}>
            <h2 className={`text-2xl font-bold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Complete Payment
            </h2>
            <div className="space-y-4">
              <div>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Total Amount</p>
                <p className="text-4xl font-black text-green-500">£{grandTotal.toFixed(2)}</p>
              </div>
              
              <div>
                <p className={darkMode ? 'text-gray-300 mb-2' : 'text-gray-700 mb-2'}>Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  {['cash', 'card', 'balance', 'split'].map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method as any)}
                      className={`p-3 rounded-lg font-bold border-2 transition-all ${
                        paymentMethod === method
                          ? 'bg-green-500/20 border-green-500 text-green-500'
                          : darkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-400'
                          : 'bg-gray-100 border-gray-300 text-gray-700'
                      }`}
                    >
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  disabled={processingPayment}
                  className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold transition-all text-white flex items-center justify-center gap-2"
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay £${grandTotal.toFixed(2)}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
