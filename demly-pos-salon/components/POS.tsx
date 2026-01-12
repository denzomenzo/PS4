// components/POS.tsx - OPTIMIZED VERSION
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { logAuditAction } from "@/lib/auditLogger";
import ReceiptPrint from "@/components/receipts/ReceiptPrint";
import { 
  Trash2, Loader2, Search, ShoppingCart, CreditCard, Plus, 
  Minus, Layers, X, Printer, Tag, DollarSign, Package, 
  Wallet, RefreshCw, History, ZoomOut,
  Calculator, Edit
} from "lucide-react";

// Types
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
}

interface SplitPayment {
  cash: number;
  card: number;
  balance: number;
  remaining: number;
}


interface ReceiptData {
  id: string | number;
  createdAt: string;
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: string;
  products: any[];
  customer?: {
    id: number | string;
    name: string;
    phone?: string;
    email?: string;
    balance?: number;
  };
  businessInfo?: any;
  receiptSettings?: any;
  balanceDeducted?: number;
  paymentDetails?: any;
  staffName?: string;
  notes?: string;
}

// Helper functions
const getSafeNumber = (value: any): number => {
  if (value == null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const getBalance = (balance: any): number => getSafeNumber(balance);

// Custom hooks
const useLocalStorageTransactions = (currentStaff: any) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTransactionId, setActiveTransactionId] = useState<string>("");

  const getStorageKey = useCallback(() => `pos_transactions_${currentStaff?.id || 'default'}`, [currentStaff]);

  useEffect(() => {
    if (!currentStaff) return;
    
    const storageKey = getStorageKey();
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.transactions?.length > 0) {
          setTransactions(parsed.transactions);
          setActiveTransactionId(parsed.activeTransactionId || parsed.transactions[0].id);
        } else {
          createDefaultTransaction();
        }
      } catch {
        createDefaultTransaction();
      }
    } else {
      createDefaultTransaction();
    }
  }, [currentStaff, getStorageKey]);

  const createDefaultTransaction = () => {
    const defaultTransaction = {
      id: "1",
      name: "Transaction 1",
      cart: [],
      customerId: "",
      createdAt: Date.now()
    };
    setTransactions([defaultTransaction]);
    setActiveTransactionId("1");
  };

  useEffect(() => {
    if (!currentStaff || transactions.length === 0) return;
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify({
      transactions,
      activeTransactionId,
      lastUpdated: Date.now()
    }));
  }, [transactions, activeTransactionId, currentStaff, getStorageKey]);

  return { transactions, setTransactions, activeTransactionId, setActiveTransactionId };
};

// Modal components
const DiscountModal = ({ 
  show, 
  onClose, 
  discountType, 
  setDiscountType, 
  discountValue, 
  setDiscountValue, 
  onApply,
  cartTotal 
}: any) => {
  if (!show) return null;
  
  const discountAmount = discountType === "percentage" 
    ? (cartTotal * parseFloat(discountValue || "0")) / 100
    : parseFloat(discountValue || "0");

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border border-slate-700/50 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Apply Discount</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-base mb-2 font-medium text-white">Discount Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDiscountType("percentage")}
                className={`py-3 rounded-lg font-bold border-2 transition-all ${
                  discountType === "percentage"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                }`}
              >
                Percentage %
              </button>
              <button
                onClick={() => setDiscountType("fixed")}
                className={`py-3 rounded-lg font-bold border-2 transition-all ${
                  discountType === "fixed"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                }`}
              >
                Fixed £
              </button>
            </div>
          </div>

          <div>
            <label className="block text-base mb-2 font-medium text-white">
              {discountType === "percentage" ? "Discount %" : "Discount Amount £"}
            </label>
            <input
              type="number"
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percentage" ? "10" : "5.00"}
              className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-lg text-xl text-center font-bold focus:outline-none focus:border-emerald-500/50"
              autoFocus
            />
          </div>

          {discountValue && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="flex justify-between text-xs mb-1.5 text-slate-300">
                <span>Current Total:</span>
                <span className="font-bold">£{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-emerald-400">Discount:</span>
                <span className="text-emerald-400 font-bold">
                  -£{discountAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg text-base font-bold text-white"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={!discountValue || parseFloat(discountValue) <= 0}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-700 py-3 rounded-lg text-base font-bold shadow-xl disabled:opacity-50 text-white"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

const MiscModal = ({ show, onClose, name, setName, price, setPrice, onAdd }: any) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border border-slate-700/50 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Add Misc Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-base mb-2 font-medium text-white">Product Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-lg text-base focus:outline-none focus:border-emerald-500/50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-base mb-2 font-medium text-white">Price £</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-lg text-xl text-center font-bold focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg text-base font-bold text-white"
          >
            Cancel
          </button>
          <button
            onClick={onAdd}
            disabled={!name.trim() || !price}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-700 py-3 rounded-lg text-base font-bold shadow-xl disabled:opacity-50 text-white"
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
};

const NumpadModal = ({ show, onClose, amount, onNumpadClick }: any) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full border border-slate-700/50 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Enter Custom Amount</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
          <p className="text-sm text-slate-400 mb-1">Custom Amount</p>
          <p className="text-3xl font-bold text-white text-right">
            £{amount || '0.00'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((value) => (
            <button
              key={value}
              onClick={() => onNumpadClick(value)}
              className={`h-14 rounded-lg font-bold text-xl transition-all ${
                value === 'backspace'
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                  : 'bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/50'
              }`}
            >
              {value === 'backspace' ? '⌫' : value}
            </button>
          ))}
          <button
            onClick={() => onNumpadClick('clear')}
            className="h-14 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg font-bold text-xl transition-all"
          >
            Clear
          </button>
          <button
            onClick={() => onNumpadClick('total')}
            className="h-14 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-xl transition-all"
          >
            Total
          </button>
          <button
            onClick={onClose}
            className="h-14 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xl transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// Main POS Component
export default function POS() {
  const userId = useUserId();
  const { staff: currentStaff } = useStaffAuth();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [hardwareSettings, setHardwareSettings] = useState<any>(null);
  const [receiptSettings, setReceiptSettings] = useState<any>(null);
  const [allowNegativeBalance, setAllowNegativeBalance] = useState(false);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [showZoomWarning, setShowZoomWarning] = useState(false);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  
  // Modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showMiscModal, setShowMiscModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showNumpadModal, setShowNumpadModal] = useState(false);
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  const [showTransactionMenu, setShowTransactionMenu] = useState(false);
  
  // Form states
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [miscProductName, setMiscProductName] = useState("");
  const [miscProductPrice, setMiscProductPrice] = useState("");
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "balance" | "split">("cash");
  const [printReceiptOption, setPrintReceiptOption] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [useBalanceForPayment, setUseBalanceForPayment] = useState(false);
  const [transactionNotes, setTransactionNotes] = useState("");
  const [customAmount, setCustomAmount] = useState<string>("");
  
  // Split payment
  const [splitPayment, setSplitPayment] = useState<SplitPayment>({
    cash: 0,
    card: 0,
    balance: 0,
    remaining: 0
  });
  
  // Receipt
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptPrint, setShowReceiptPrint] = useState(false);
  
  // Transactions
  const { 
    transactions, 
    setTransactions, 
    activeTransactionId, 
    setActiveTransactionId 
  } = useLocalStorageTransactions(currentStaff);
  
  // Computed values
  const activeTransaction = transactions.find(t => t.id === activeTransactionId);
  const cart = activeTransaction?.cart || [];
  const customerId = activeTransaction?.customerId || "";
  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id.toString() === customerId), 
    [customers, customerId]
  );
  
  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0), 
    [cart]
  );
  
  const subtotal = useMemo(() => 
    cart.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const itemDiscount = item.discount || 0;
      return sum + (itemTotal - itemDiscount);
    }, 0), 
    [cart]
  );
  
  const vat = vatEnabled ? subtotal * 0.2 : 0;
  const grandTotal = subtotal + vat;
  const customerBalance = selectedCustomer ? getBalance(selectedCustomer.balance) : 0;

  // Effects
  useEffect(() => {
    const checkZoomLevel = () => {
      const zoomLevel = window.outerWidth / window.innerWidth;
      if (zoomLevel < 0.9) {
        setShowZoomWarning(true);
      }
    };
    
    checkZoomLevel();
    window.addEventListener('resize', checkZoomLevel);
    return () => window.removeEventListener('resize', checkZoomLevel);
  }, []);

  useEffect(() => {
    if (userId && currentStaff) loadData();
  }, [userId, currentStaff]);

  useEffect(() => {
    if (searchQuery.trim()) {
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
  }, [searchQuery, products]);

  // Barcode scanner
  const handleBarcodeScan = useCallback((barcode: string) => {
    const product = products.find((p) => p.barcode === barcode || p.sku === barcode);
    if (product) {
      addToCart(product);
      setLastScannedProduct(product);
      setTimeout(() => setLastScannedProduct(null), 3000);
    }
  }, [products]);

  const { isScanning } = useBarcodeScanner({
    enabled: hardwareSettings?.barcode_scanner_enabled !== false,
    onScan: handleBarcodeScan,
    playSoundOnScan: hardwareSettings?.scanner_sound_enabled !== false,
  });

  // Data loading
  const loadData = async () => {
    setLoading(true);
    try {
      // Load settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .single();
      
      if (settingsData) {
        setVatEnabled(settingsData.vat_enabled !== false);
        setReceiptSettings(settingsData);
        setAllowNegativeBalance(settingsData.allow_negative_balance || false);
      }

      // Load hardware settings
      const { data: hardwareData } = await supabase
        .from("hardware_settings")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (hardwareData) setHardwareSettings(hardwareData);

      // Load products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("name");
      if (productsData) {
        setProducts(productsData);
        setFilteredProducts(productsData);
      }

      // Load customers
      const { data: customersData } = await supabase
        .from("customers")
        .select("id, name, phone, email, balance")
        .eq("user_id", userId)
        .order("name");
      if (customersData) {
        setCustomers(customersData.map(c => ({
          ...c,
          balance: getBalance(c.balance)
        })));
      }

      // Load recent transactions
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (transactionsData) setRecentTransactions(transactionsData);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cart operations
  const setCart = (newCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setTransactions(prev => prev.map(t => 
      t.id === activeTransactionId 
        ? { 
            ...t, 
            cart: typeof newCart === 'function' ? newCart(t.cart) : newCart,
            lastUpdated: Date.now()
          }
        : t
    ));
  };

  const setCustomerId = (id: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === activeTransactionId ? { ...t, customerId: id, lastUpdated: Date.now() } : t
    ));
  };

  const addToCart = (product: Product) => {
    if (product.track_inventory && product.stock_quantity <= 0) {
      alert(`${product.name} is out of stock`);
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id && !item.isMisc);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      if (product.track_inventory && newQuantity > product.stock_quantity) {
        alert(`Only ${product.stock_quantity} of ${product.name} available`);
        return;
      }
      setCart(cart.map((item) => 
        item.id === product.id && !item.isMisc ? { ...item, quantity: newQuantity } : item
      ));
    } else {
      setCart([...cart, { ...product, cartId: `${product.id}-${Date.now()}`, quantity: 1 }]);
    }
  };

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

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter((item) => item.cartId !== cartId));
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
    
    setCart(cart.map((item) => (item.cartId === cartId ? { ...item, quantity: newQuantity } : item)));
  };

  // Transaction management
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
    setShowTransactionMenu(false);
  };

  const switchTransaction = (id: string) => {
    setActiveTransactionId(id);
    setShowTransactionMenu(false);
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
    
    if (!confirm("Clear this transaction? All items will be removed.")) return;
    
    setCart([]);
    setCustomerId("");
  };

  const noSale = async () => {
    if (!confirm("Open cash drawer without recording a sale?")) return;

    try {
      await logAuditAction({
        action: "NO_SALE",
        entityType: "transaction",
        entityId: "no-sale",
        newValues: { reason: "No Sale - Cash Drawer Opened" },
        staffId: currentStaff?.id,
      });
      alert("✅ Cash drawer opened (No Sale)");
    } catch (error) {
      console.error("No sale error:", error);
    }
  };

  const checkout = () => {
    if (cart.length === 0) return alert("Cart is empty");
    
    setPaymentMethod("cash");
    setPrintReceiptOption(false);
    setUseBalanceForPayment(false);
    setTransactionNotes("");
    setCustomAmount(grandTotal.toFixed(2));
    setShowPaymentModal(true);
  };

  // Payment processing
  const processPayment = async () => {
    if (cart.length === 0) return;
    
    setProcessingPayment(true);
    
    try {
      let paymentSuccess = false;
      let paymentDetails: any = { 
        method: paymentMethod,
        notes: transactionNotes.trim() || null
      };
      let balanceDeducted = 0;
      let remainingBalance = selectedCustomer?.balance || 0;
      let finalPaymentMethod: "cash" | "card" | "balance" | "split" = paymentMethod;
      const amountToPay = parseFloat(customAmount) || grandTotal;

      // Payment method logic
      if (paymentMethod === "cash") {
        paymentSuccess = true;
        if (hardwareSettings?.cash_drawer_enabled) {
          console.log("Opening cash drawer...");
        }
      } else if (paymentMethod === "card") {
        const { data: cardSettings } = await supabase
          .from("card_terminal_settings")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (!cardSettings?.enabled) {
          alert("⚠️ Card terminal not configured. Please set up in Settings > Card Terminal");
          setProcessingPayment(false);
          return;
        }

        alert("💳 Processing card payment...");
        paymentSuccess = confirm("Simulate successful card payment?");
        paymentDetails.cardTerminal = cardSettings.provider;
      } else if (paymentMethod === "balance") {
        if (!selectedCustomer) {
          alert("Please select a customer to use balance");
          setProcessingPayment(false);
          return;
        }
        
        if (useBalanceForPayment) {
          if (selectedCustomer.balance < amountToPay && !allowNegativeBalance) {
            alert(`Insufficient balance. Customer balance: £${selectedCustomer.balance.toFixed(2)}`);
            setProcessingPayment(false);
            return;
          }
          
          balanceDeducted = Math.min(amountToPay, selectedCustomer.balance);
          remainingBalance = selectedCustomer.balance - amountToPay;
          
          if (balanceDeducted < amountToPay) {
            const remaining = amountToPay - balanceDeducted;
            const confirmMsg = `Customer balance: £${selectedCustomer.balance.toFixed(2)}\n` +
                             `Using balance: £${balanceDeducted.toFixed(2)}\n` +
                             `Remaining to pay: £${remaining.toFixed(2)}\n` +
                             `New balance will be: £${remainingBalance.toFixed(2)}\n\n` +
                             `Do you want to continue?`;
            
            if (!confirm(confirmMsg)) {
              setProcessingPayment(false);
              return;
            }
            
            const remainingMethod = prompt(
              `Remaining amount: £${remaining.toFixed(2)}\n` +
              `How would you like to pay the remaining amount?\n` +
              `Enter 'cash' or 'card':`
            );
            
            if (remainingMethod === 'cash' || remainingMethod === 'card') {
              finalPaymentMethod = "split";
              paymentDetails.split_payment = {
                balance_used: balanceDeducted,
                remaining_amount: remaining,
                remaining_method: remainingMethod
              };
            } else {
              alert("Invalid payment method. Transaction cancelled.");
              setProcessingPayment(false);
              return;
            }
          }
        }
        paymentSuccess = true;
      } else if (paymentMethod === "split") {
        const totalSplit = splitPayment.cash + splitPayment.card + splitPayment.balance;
        
        if (Math.abs(totalSplit - grandTotal) > 0.01) {
          alert(`Split payments total £${totalSplit.toFixed(2)} but total is £${grandTotal.toFixed(2)}`);
          setProcessingPayment(false);
          return;
        }
        
        paymentSuccess = true;
        balanceDeducted = splitPayment.balance;
        
        if (selectedCustomer) {
          remainingBalance = selectedCustomer.balance - splitPayment.balance;
          if (remainingBalance < 0 && !allowNegativeBalance) {
            alert("Customer would go into negative balance. Transaction cancelled.");
            setProcessingPayment(false);
            return;
          }
        }
        
        paymentDetails.split_payment = {
          cash: splitPayment.cash,
          card: splitPayment.card,
          balance: splitPayment.balance
        };
      }

      if (!paymentSuccess) {
        setProcessingPayment(false);
        return;
      }

      // Save transaction
      const transactionData: any = {
        user_id: userId,
        staff_id: currentStaff?.id || null,
        customer_id: customerId ? parseInt(customerId) : null,
        products: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          icon: item.icon,
          quantity: item.quantity,
          discount: item.discount || 0,
          total: (item.price * item.quantity) - (item.discount || 0),
        })),
        subtotal: subtotal,
        vat: vat,
        total: grandTotal,
        payment_method: finalPaymentMethod,
        payment_details: paymentDetails,
        balance_deducted: balanceDeducted,
        notes: transactionNotes.trim() || null,
        services: []
      };

      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update customer balance
      if (balanceDeducted > 0 && selectedCustomer) {
        await supabase
          .from("customers")
          .update({ balance: remainingBalance })
          .eq("id", selectedCustomer.id);
        
        await supabase.from("customer_balance_history").insert({
          user_id: userId,
          customer_id: selectedCustomer.id,
          amount: -balanceDeducted,
          previous_balance: selectedCustomer.balance,
          new_balance: remainingBalance,
          note: `POS Transaction #${transaction.id}${transactionNotes ? ` - ${transactionNotes}` : ''}`,
          transaction_id: transaction.id,
        });

        setCustomers(customers.map(c => 
          c.id === selectedCustomer.id 
            ? { ...c, balance: remainingBalance }
            : c
        ));
      }

      // Update stock
      const stockUpdates = cart
        .filter(item => item.track_inventory && !item.isMisc)
        .map(item => ({
          id: item.id,
          newStock: item.stock_quantity - item.quantity
        }));

      for (const update of stockUpdates) {
        await supabase
          .from("products")
          .update({ stock_quantity: update.newStock })
          .eq("id", update.id);
      }

      // Audit log
      await logAuditAction({
        action: "TRANSACTION_COMPLETED",
        entityType: "transaction",
        entityId: transaction.id.toString(),
        newValues: {
          total: grandTotal,
          items: cart.length,
          customer_id: customerId,
          payment_method: finalPaymentMethod,
          balance_deducted: balanceDeducted,
          notes: transactionNotes
        },
        staffId: currentStaff?.id,
      });

      // Print receipt if requested
      if (printReceiptOption) {
  const receiptData: ReceiptData = {
    id: transaction.id,
    createdAt: new Date().toISOString(),
    subtotal: subtotal,
    vat: vat,
    total: grandTotal,
    paymentMethod: finalPaymentMethod,
    products: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      discount: item.discount || 0,
      total: (item.price * item.quantity) - (item.discount || 0)
    })),
    customer: selectedCustomer ? {
      id: selectedCustomer.id,
      name: selectedCustomer.name,
      phone: selectedCustomer.phone || undefined, // Convert null to undefined
      email: selectedCustomer.email || undefined, // Convert null to undefined
      balance: selectedCustomer.balance
    } : undefined,
    businessInfo: {
      name: receiptSettings?.business_name || "Your Business",
      address: receiptSettings?.business_address,
      phone: receiptSettings?.business_phone,
      email: receiptSettings?.business_email,
      taxNumber: receiptSettings?.tax_number,
      logoUrl: receiptSettings?.receipt_logo_url
    },
    receiptSettings: {
      fontSize: receiptSettings?.receipt_font_size || 12,
      footer: receiptSettings?.receipt_footer || "Thank you for your business!",
      showBarcode: receiptSettings?.show_barcode_on_receipt !== false,
      barcodeType: receiptSettings?.barcode_type || 'CODE128',
      showTaxBreakdown: receiptSettings?.show_tax_breakdown !== false
    },
    balanceDeducted: balanceDeducted,
    paymentDetails: paymentDetails,
    staffName: currentStaff?.name,
    notes: transactionNotes
  };
  
  setReceiptData(receiptData);
  setShowReceiptPrint(true);
}


      alert(`✅ £${grandTotal.toFixed(2)} paid successfully via ${finalPaymentMethod}!`);
      
      // Reset
      setShowPaymentModal(false);
      setShowSplitPaymentModal(false);
      setCart([]);
      setCustomerId("");
      setTransactionNotes("");
      setSplitPayment({ cash: 0, card: 0, balance: 0, remaining: grandTotal });
      
      // Update recent transactions
      const { data: newTransactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (newTransactions) setRecentTransactions(newTransactions);
      
    } catch (error: any) {
      console.error("Payment error:", error);
      alert("❌ Error processing payment: " + (error.message || "Unknown error"));
    } finally {
      setProcessingPayment(false);
    }
  };

  // Print receipt preview
 const printReceipt = () => {
  if (cart.length === 0) {
    alert("Cart is empty");
    return;
  }

  const receiptData: ReceiptData = {
    id: "PREVIEW-" + Date.now(),
    createdAt: new Date().toISOString(),
    subtotal: subtotal,
    vat: vat,
    total: grandTotal,
    paymentMethod: "preview",
    products: cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      discount: item.discount || 0,
      total: (item.price * item.quantity) - (item.discount || 0)
    })),
    customer: selectedCustomer ? {
      id: selectedCustomer.id,
      name: selectedCustomer.name,
      phone: selectedCustomer.phone || undefined, // Convert null to undefined
      email: selectedCustomer.email || undefined, // Convert null to undefined
      balance: selectedCustomer.balance
    } : undefined,
    businessInfo: {
      name: receiptSettings?.business_name || "Your Business",
      address: receiptSettings?.business_address,
      phone: receiptSettings?.business_phone,
      email: receiptSettings?.business_email,
      taxNumber: receiptSettings?.tax_number,
      logoUrl: receiptSettings?.receipt_logo_url
    },
    receiptSettings: {
      fontSize: receiptSettings?.receipt_font_size || 12,
      footer: receiptSettings?.receipt_footer || "Thank you for your business!",
      showBarcode: receiptSettings?.show_barcode_on_receipt !== false,
      barcodeType: receiptSettings?.barcode_type || 'CODE128',
      showTaxBreakdown: receiptSettings?.show_tax_breakdown !== false
    },
    staffName: currentStaff?.name,
    notes: transactionNotes
  };
  
  setReceiptData(receiptData);
  setShowReceiptPrint(true);
};

  // Split payment functions
  const handleSplitPaymentChange = (method: keyof SplitPayment, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSplitPayment(prev => {
      const newSplit = { ...prev, [method]: numValue };
      const total = newSplit.cash + newSplit.card + newSplit.balance;
      newSplit.remaining = Math.max(0, grandTotal - total);
      return newSplit;
    });
  };

  const applySplitPayment = () => {
    const total = splitPayment.cash + splitPayment.card + splitPayment.balance;
    
    if (Math.abs(total - grandTotal) > 0.01) {
      alert(`Split payments total £${total.toFixed(2)} but total is £${grandTotal.toFixed(2)}`);
      return;
    }

    setPaymentMethod("split");
    setShowSplitPaymentModal(false);
    setShowPaymentModal(true);
  };

  // Numpad functions
  const handleNumpadClick = (value: string) => {
    if (value === 'clear') {
      setCustomAmount('');
    } else if (value === 'backspace') {
      setCustomAmount(prev => prev.slice(0, -1));
    } else if (value === '.') {
      if (!customAmount.includes('.')) {
        setCustomAmount(prev => prev + '.');
      }
    } else if (value === 'total') {
      setCustomAmount(grandTotal.toFixed(2));
      setShowNumpadModal(false);
    } else {
      setCustomAmount(prev => prev + value);
    }
  };

  // Loading states
  if (!userId || !currentStaff) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading POS...</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden">
      {/* Receipt Print Component */}
      {showReceiptPrint && receiptData && (
        <ReceiptPrint 
          data={receiptData} 
          onClose={() => {
            setShowReceiptPrint(false);
            setReceiptData(null);
          }}
        />
      )}

      {/* Zoom Warning */}
      {showZoomWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-amber-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-amber-700/50 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <ZoomOut className="w-12 h-12 text-amber-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">Zoom Level Warning</h2>
                <p className="text-amber-300 mt-1">For optimal experience, reset zoom to 100%</p>
              </div>
            </div>
            <button
              onClick={() => setShowZoomWarning(false)}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 py-4 rounded-xl text-lg font-bold text-white shadow-xl"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col p-6 min-w-0">
        {/* Search Bar */}
        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, SKU, or barcode..."
              className="w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 pl-12 pr-6 py-4 rounded-2xl text-base text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 shadow-xl transition-all"
            />
            {isScanning && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                Scanner Active
              </div>
            )}
          </div>
        </div>

        {/* Last Scanned Product Banner */}
        {lastScannedProduct && (
          <div className="mb-4 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 flex-shrink-0">
            {lastScannedProduct.image_url && (
              <img 
                src={lastScannedProduct.image_url} 
                alt={lastScannedProduct.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500/50"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-400 font-semibold">✓ Scanned</p>
              <p className="text-white font-bold text-base truncate">{lastScannedProduct.name}</p>
            </div>
            <p className="text-2xl font-black text-emerald-400">£{lastScannedProduct.price.toFixed(2)}</p>
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto bg-slate-900/30 backdrop-blur-xl rounded-2xl p-4 border border-slate-800/50 shadow-2xl min-h-0">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ShoppingCart className="w-24 h-24 mx-auto mb-4 text-slate-700" />
                <p className="text-xl text-slate-500 font-semibold">No products found</p>
                <p className="text-slate-600 text-sm mt-2">Try a different search term</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.track_inventory && product.stock_quantity <= 0}
                  className="group relative bg-slate-800/40 backdrop-blur-lg border border-slate-700/50 rounded-xl p-3 hover:border-emerald-500/50 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700/50"
                >
                  {product.image_url ? (
                    <div className="relative w-full aspect-square mb-3 rounded-lg overflow-hidden bg-slate-700/30">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                      />
                    </div>
                  ) : product.icon ? (
                    <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform duration-200">
                      {product.icon}
                    </span>
                  ) : (
                    <div className="w-full aspect-square mb-3 rounded-lg bg-slate-700/30 flex items-center justify-center text-3xl">
                      📦
                    </div>
                  )}
                  <p className="font-bold text-white text-sm mb-2 line-clamp-2 leading-tight">
                    {product.name}
                  </p>
                  <p className="text-lg font-black text-transparent bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text">
                    £{product.price.toFixed(2)}</p>
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

      {/* Right Side - Cart & Checkout */}
      <div className="w-[500px] bg-slate-900/50 backdrop-blur-xl border-l border-slate-800/50 flex flex-col shadow-2xl overflow-hidden">
        {/* Transaction Header */}
        <div className="p-4 border-b border-slate-800/50 bg-gradient-to-r from-emerald-500/10 to-green-500/10 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{activeTransaction?.name}</h2>
                <p className="text-slate-400 text-xs font-medium">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items • Staff: {currentStaff.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTransactionMenu(!showTransactionMenu)}
              className="relative p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-emerald-500/50 rounded-lg transition-all"
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
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-3 space-y-2">
              {transactions.map((trans) => (
                <div
                  key={trans.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
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
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-md transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addNewTransaction}
                className="w-full p-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 border border-emerald-500/30 rounded-lg text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ShoppingCart className="w-16 h-16 mx-auto mb-3 text-slate-700" />
                <p className="text-lg text-slate-500 font-semibold">Cart is empty</p>
                <p className="text-slate-600 text-sm mt-1">Add products to get started</p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartId} className="bg-slate-800/40 backdrop-blur-lg rounded-xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all shadow-lg">
                <div className="flex items-start gap-3 mb-3">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover border-2 border-slate-700/50" />
                  ) : item.icon ? (
                    <span className="text-3xl">{item.icon}</span>
                  ) : (
                    <div className="w-16 h-16 bg-slate-700/50 rounded-lg flex items-center justify-center text-2xl">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm truncate">{item.name}</h3>
                    <p className="text-sm text-slate-400 font-medium">£{item.price.toFixed(2)} each</p>
                    {item.discount && item.discount > 0 && (
                      <p className="text-xs text-emerald-400 font-semibold">-£{item.discount.toFixed(2)} discount</p>
                    )}
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.cartId)} 
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-slate-900/50 rounded-lg p-1">
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity - 1)} 
                      className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-md font-bold text-white transition-all flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-white text-base">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity + 1)} 
                      className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-md font-bold text-white transition-all flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xl font-black text-transparent bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text">
                    £{((item.price * item.quantity) - (item.discount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Panel */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 space-y-4 flex-shrink-0">
          
          {/* Customer Selection */}
          <div className="flex gap-2">
            <select 
              value={customerId} 
              onChange={(e) => setCustomerId(e.target.value)} 
              className="flex-1 bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 text-white p-3 rounded-lg font-medium text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            >
              <option value="">Select Customer (Optional)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance > 0 ? `(£${c.balance.toFixed(2)} bal)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Balance Display */}
          {selectedCustomer && (
            <div className={`rounded-lg p-3 border ${
              customerBalance >= grandTotal 
                ? "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-slate-800/40 border-slate-700/50"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium text-sm">{selectedCustomer.name}'s Balance:</span>
                </div>
                <span className="text-xl font-black text-emerald-400">£{customerBalance.toFixed(2)}</span>
              </div>
              {customerBalance >= grandTotal && (
                <p className="text-xs text-emerald-300 mt-1">
                  ✓ Sufficient balance for full payment
                </p>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2 bg-slate-800/40 backdrop-blur-lg rounded-xl p-4 border border-slate-700/50">
            <div className="flex justify-between text-slate-300 text-base">
              <span className="font-medium">Subtotal</span>
              <span className="font-bold">£{subtotal.toFixed(2)}</span>
            </div>
            {vatEnabled && (
              <div className="flex justify-between text-slate-300 text-base">
                <span className="font-medium">VAT (20%)</span>
                <span className="font-bold">£{vat.toFixed(2)}</span>
              </div>
            )}
            <div className="h-px bg-slate-700/50 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-xl font-black text-white">Total</span>
              <span className="text-3xl font-black text-transparent bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text">
                £{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowDiscountModal(true)}
              disabled={cart.length === 0}
              className="bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 border border-slate-700/50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <Tag className="w-4 h-4" />
              Discount
            </button>
            
            <button
              onClick={() => setShowMiscModal(true)}
              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <Package className="w-4 h-4" />
              Misc Item
            </button>

            <button
              onClick={printReceipt}
              disabled={cart.length === 0}
              className="bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 border border-slate-700/50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <button
              onClick={() => setShowTransactionsModal(true)}
              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <History className="w-4 h-4" />
              Recent
            </button>

            <button
              onClick={clearActiveTransaction}
              disabled={cart.length === 0}
              className="bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 border border-slate-700/50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Clear
            </button>

            <button
              onClick={noSale}
              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <DollarSign className="w-4 h-4" />
              No Sale
            </button>
          </div>

          {/* Split Payment Button */}
          <button
            onClick={() => setShowSplitPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-bold py-3 rounded-lg transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            Split Payment
          </button>

          {/* Checkout Button */}
          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-black text-lg py-5 rounded-xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            PAY £{grandTotal.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Modals */}
      <DiscountModal
        show={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountValue={discountValue}
        setDiscountValue={setDiscountValue}
        onApply={applyDiscount}
        cartTotal={cartTotal}
      />

      <MiscModal
        show={showMiscModal}
        onClose={() => setShowMiscModal(false)}
        name={miscProductName}
        setName={setMiscProductName}
        price={miscProductPrice}
        setPrice={setMiscProductPrice}
        onAdd={addMiscProduct}
      />

      <NumpadModal
        show={showNumpadModal}
        onClose={() => setShowNumpadModal(false)}
        amount={customAmount}
        onNumpadClick={handleNumpadClick}
      />

      {/* Split Payment Modal */}
      {showSplitPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Split Payment</h2>
              <button onClick={() => setShowSplitPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-xl p-4 mb-4">
                <p className="text-slate-300 text-base mb-1">Total Amount</p>
                <p className="text-4xl font-black text-emerald-400">£{grandTotal.toFixed(2)}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-base font-medium text-white mb-2">Cash £</label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitPayment.cash || ''}
                    onChange={(e) => handleSplitPaymentChange('cash', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-lg text-lg focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-base font-medium text-white mb-2">Card £</label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitPayment.card || ''}
                    onChange={(e) => handleSplitPaymentChange('card', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-lg text-lg focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {selectedCustomer && (
                  <div>
                    <label className="block text-base font-medium text-white mb-2">Balance £</label>
                    <input
                      type="number"
                      step="0.01"
                      value={splitPayment.balance || ''}
                      onChange={(e) => handleSplitPaymentChange('balance', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-lg text-lg focus:outline-none focus:border-emerald-500/50"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Available: £{customerBalance.toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex justify-between text-white">
                    <span className="font-medium">Remaining:</span>
                    <span className={`text-xl font-bold ${splitPayment.remaining === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      £{splitPayment.remaining.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {splitPayment.remaining === 0 ? '✓ Payment fully allocated' : 'Enter remaining amount'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSplitPaymentModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg text-base font-bold text-white"
              >
                Cancel
              </button>
              <button
                onClick={applySplitPayment}
                disabled={splitPayment.remaining > 0.01}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-slate-700 disabled:to-slate-700 py-3 rounded-lg text-base font-bold shadow-xl disabled:opacity-50 text-white"
              >
                Confirm Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-xl w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Complete Payment</h2>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-slate-300 text-base mb-1">Total Amount</p>
                  <p className="text-4xl font-black text-emerald-400">£{grandTotal.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setShowNumpadModal(true)}
                  className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg"
                >
                  <Edit className="w-5 h-5 text-emerald-400" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Custom amount: £{customAmount || grandTotal.toFixed(2)}
              </p>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-base font-medium text-white mb-2">Transaction Notes</label>
              <textarea
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder="Add any notes about this transaction..."
                rows={2}
                className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-3 rounded-lg text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>

            {/* Customer Balance Options */}
            {selectedCustomer && customerBalance > 0 && (
              <div className="mb-4 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBalanceForPayment}
                    onChange={(e) => setUseBalanceForPayment(e.target.checked)}
                    className="w-5 h-5 accent-emerald-500"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium text-base">Use Customer Balance</span>
                    <div className="flex justify-between text-sm text-slate-300 mt-1">
                      <span>Available Balance: £{customerBalance.toFixed(2)}</span>
                      <span className={`font-bold ${
                        customerBalance >= grandTotal ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {customerBalance >= grandTotal ? 'Full payment' : 'Partial payment'}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="space-y-3 mb-4">
              <label className="block text-base font-medium text-white mb-2">Payment Method</label>
              
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-lg font-bold border-2 transition-all flex flex-col items-center ${
                    paymentMethod === "cash"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                  }`}
                >
                  <div className="text-2xl mb-1">💵</div>
                  <span className="text-sm">Cash</span>
                </button>

                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-lg font-bold border-2 transition-all flex flex-col items-center ${
                    paymentMethod === "card"
                      ? "bg-blue-500/20 border-blue-500 text-blue-400"
                      : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                  }`}
                >
                  <div className="text-2xl mb-1">💳</div>
                  <span className="text-sm">Card</span>
                </button>

                {selectedCustomer && (
                  <button
                    onClick={() => setPaymentMethod("balance")}
                    className={`p-3 rounded-lg font-bold border-2 transition-all flex flex-col items-center ${
                      paymentMethod === "balance"
                        ? "bg-purple-500/20 border-purple-500 text-purple-400"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                    }`}
                  >
                    <div className="text-2xl mb-1">💰</div>
                    <span className="text-sm">Balance</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowSplitPaymentModal(true);
                  }}
                  className="p-3 rounded-lg font-bold border-2 border-slate-700/50 bg-slate-800/50 text-slate-400 flex flex-col items-center"
                >
                  <div className="text-2xl mb-1">📊</div>
                  <span className="text-sm">Split</span>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={printReceiptOption}
                  onChange={(e) => setPrintReceiptOption(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500"
                />
                <span className="text-white text-base">Print Receipt</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 rounded-lg text-base font-bold text-white"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={processingPayment}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-700 py-3 rounded-lg text-base font-bold text-white flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay £${(parseFloat(customAmount) || grandTotal).toFixed(2)}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions Modal */}
      {showTransactionsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-4xl w-full border border-slate-700/50 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>
              <button onClick={() => setShowTransactionsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-16 h-16 mx-auto mb-3 text-slate-700" />
                  <p className="text-lg text-slate-500 font-semibold">No recent transactions</p>
                </div>
              ) : (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="bg-slate-800/40 backdrop-blur-lg rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-bold text-white text-base">Transaction #{transaction.id}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(transaction.created_at).toLocaleString('en-GB')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-emerald-400">£{transaction.total?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-slate-400 capitalize">{transaction.payment_method || 'cash'}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300">
                          {transaction.products?.length || 0} items
                        </span>
                        {transaction.customer_id && (
                          <span className="text-xs bg-slate-700/50 px-2 py-1 rounded-full text-slate-300">
                            Customer: {customers.find(c => c.id === transaction.customer_id)?.name || 'N/A'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
  const receiptData: ReceiptData = {
    id: transaction.id,
    createdAt: transaction.created_at,
    subtotal: transaction.subtotal || 0,
    vat: transaction.vat || 0,
    total: transaction.total || 0,
    paymentMethod: transaction.payment_method || 'cash',
    products: transaction.products || [],
    customer: customers.find(c => c.id === transaction.customer_id) ? {
      id: customers.find(c => c.id === transaction.customer_id)!.id,
      name: customers.find(c => c.id === transaction.customer_id)!.name,
      phone: customers.find(c => c.id === transaction.customer_id)!.phone || undefined,
      email: customers.find(c => c.id === transaction.customer_id)!.email || undefined,
      balance: customers.find(c => c.id === transaction.customer_id)!.balance
    } : undefined,
    businessInfo: {
      name: receiptSettings?.business_name || "Your Business",
      address: receiptSettings?.business_address,
      phone: receiptSettings?.business_phone,
      email: receiptSettings?.business_email,
      taxNumber: receiptSettings?.tax_number,
      logoUrl: receiptSettings?.receipt_logo_url
    },
    receiptSettings: {
      fontSize: receiptSettings?.receipt_font_size || 12,
      footer: receiptSettings?.receipt_footer || "Thank you for your business!",
      showBarcode: receiptSettings?.show_barcode_on_receipt !== false,
      barcodeType: receiptSettings?.barcode_type || 'CODE128',
      showTaxBreakdown: receiptSettings?.show_tax_breakdown !== false
    },
    balanceDeducted: transaction.balance_deducted,
    paymentDetails: transaction.payment_details,
    staffName: currentStaff?.name,
    notes: transaction.notes
  };
  setReceiptData(receiptData);
  setShowReceiptPrint(true);
}}

                        className="bg-slate-700/50 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 text-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Re-print
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

