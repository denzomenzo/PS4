// components/POS.tsx - UPDATED TO MATCH LAYOUT
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { logAuditAction } from "@/lib/auditLogger";
import ReceiptPrint, { ReceiptData as ReceiptPrintData } from "@/components/receipts/ReceiptPrint";
import { 
  Trash2, Loader2, Search, ShoppingCart, CreditCard, Plus, 
  Minus, Layers, X, Printer, Tag, DollarSign, Package, 
  Wallet, RefreshCw, History, ZoomOut,
  Calculator, Edit, Pencil, AlertCircle,
  User, Store, Receipt
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
  note?: string;
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
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  
  // Form states
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [miscProductName, setMiscProductName] = useState("");
  const [miscProductPrice, setMiscProductPrice] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemDiscount, setEditItemDiscount] = useState("");
  const [editItemNote, setEditItemNote] = useState("");
  
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
  const [receiptData, setReceiptData] = useState<ReceiptPrintData | null>(null);
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
      setCart([...cart, { 
        ...product, 
        cartId: `${product.id}-${Date.now()}`, 
        quantity: 1,
        discount: 0,
        note: ""
      }]);
    }
  };

  // Edit item functions
  const editItem = (item: CartItem) => {
    setEditingItem(item);
    setEditItemPrice(item.price.toString());
    setEditItemDiscount(item.discount?.toString() || "0");
    setEditItemNote(item.note || "");
    setShowEditItemModal(true);
  };

  const saveItemEdit = () => {
    if (!editingItem) return;
    
    const newPrice = parseFloat(editItemPrice);
    const newDiscount = parseFloat(editItemDiscount);
    
    if (isNaN(newPrice) || newPrice <= 0) {
      alert("Please enter a valid price");
      return;
    }
    
    if (isNaN(newDiscount) || newDiscount < 0) {
      alert("Please enter a valid discount");
      return;
    }
    
    if (newDiscount > newPrice * editingItem.quantity) {
      alert("Discount cannot exceed item total");
      return;
    }
    
    setCart(cart.map(item => 
      item.cartId === editingItem.cartId 
        ? { 
            ...item, 
            price: newPrice,
            discount: newDiscount,
            note: editItemNote.trim()
          }
        : item
    ));
    
    setShowEditItemModal(false);
    setEditingItem(null);
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
      discount: 0,
      note: ""
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
        
        setUseBalanceForPayment(true);
        
        if (selectedCustomer.balance < amountToPay && !allowNegativeBalance) {
          alert(`Insufficient balance. Customer balance: £${selectedCustomer.balance.toFixed(2)}`);
          setProcessingPayment(false);
          return;
        }
        
        balanceDeducted = amountToPay;
        remainingBalance = selectedCustomer.balance - amountToPay;
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
          note: item.note || null,
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

      if (balanceDeducted > 0 && selectedCustomer) {
        const { error: balanceError } = await supabase
          .from("customers")
          .update({ balance: remainingBalance })
          .eq("id", selectedCustomer.id);
        
        if (balanceError) throw balanceError;
        
        await supabase.from("customer_balance_history").insert({
          user_id: userId,
          customer_id: selectedCustomer.id,
          amount: -balanceDeducted,
          previous_balance: selectedCustomer.balance,
          new_balance: remainingBalance,
          note: `POS Transaction #${transaction.id}${transactionNotes ? ` - ${transactionNotes}` : ''}`,
          transaction_id: transaction.id,
        });

        setCustomers(prev => prev.map(c => 
          c.id === selectedCustomer.id 
            ? { ...c, balance: remainingBalance }
            : c
        ));
      }

      const stockUpdates = cart
        .filter(item => item.track_inventory && !item.isMisc)
        .map(item => ({
          id: item.id,
          newStock: item.stock_quantity - item.quantity
        }));

      for (const update of stockUpdates) {
        const { error: stockError } = await supabase
          .from("products")
          .update({ stock_quantity: update.newStock })
          .eq("id", update.id);
        
        if (stockError) throw stockError;
      }

      const { data: updatedProducts } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .order("name");
      
      if (updatedProducts) {
        setProducts(updatedProducts);
        setFilteredProducts(updatedProducts);
      }

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

if (printReceiptOption) {
  const receiptData: ReceiptPrintData = {
    id: transaction.id.toString(), // ✅ Convert to string
    createdAt: new Date().toISOString(),
    subtotal: subtotal,
    vat: vat,
    total: grandTotal,
    paymentMethod: finalPaymentMethod,
    products: cart.map(item => ({
      id: item.id.toString(), // ✅ Convert to string
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      discount: item.discount || 0,
      total: (item.price * item.quantity) - (item.discount || 0),
      sku: item.sku || undefined, // ✅ Add SKU
      barcode: item.barcode || undefined // ✅ Add barcode
    })),
    customer: selectedCustomer ? {
      id: selectedCustomer.id.toString(), // ✅ Convert to string
      name: selectedCustomer.name,
      phone: selectedCustomer.phone || undefined,
      email: selectedCustomer.email || undefined,
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
      barcodeType: (receiptSettings?.barcode_type?.toUpperCase() || 'CODE128') as 'CODE128' | 'CODE39' | 'EAN13' | 'UPC', // ✅ Convert to uppercase
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
      
      setShowPaymentModal(false);
      setShowSplitPaymentModal(false);
      setCart([]);
      setCustomerId("");
      setTransactionNotes("");
      setSplitPayment({ cash: 0, card: 0, balance: 0, remaining: grandTotal });
      
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

    const receiptData: ReceiptPrintData = {
      id: "PREVIEW-" + Date.now(),
      createdAt: new Date().toISOString(),
      subtotal: subtotal,
      vat: vat,
      total: grandTotal,
      paymentMethod: "cash",
      products: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        discount: item.discount || 0,
        total: (item.price * item.quantity) - (item.discount || 0)
      })),
      customer: selectedCustomer ? {
        id: selectedCustomer.id.toString(),
        name: selectedCustomer.name,
        phone: selectedCustomer.phone || undefined,
        email: selectedCustomer.email || undefined,
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
        barcodeType: receiptSettings?.barcode_type || 'code128', // FIXED: lowercase
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
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground text-xl font-semibold">Loading POS...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground text-xl font-semibold">Loading POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background overflow-hidden">
      {/* Receipt Print Component */}
      {showReceiptPrint && receiptData && (
        <div className="fixed inset-0 z-[9999] bg-white">
          <ReceiptPrint 
            data={receiptData} 
            onClose={() => {
              setShowReceiptPrint(false);
              setReceiptData(null);
            }}
          />
        </div>
      )}

      {/* Zoom Warning */}
      {showZoomWarning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-card/95 backdrop-blur-xl rounded-xl p-6 max-w-md w-full border border-border shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <ZoomOut className="w-10 h-10 text-amber-500" />
              <div>
                <h2 className="text-xl font-bold text-foreground">Zoom Level Warning</h2>
                <p className="text-muted-foreground mt-1">For optimal experience, reset zoom to 100%</p>
              </div>
            </div>
            <button
              onClick={() => setShowZoomWarning(false)}
              className="w-full bg-amber-500 text-amber-foreground py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* Left Side - Products */}
      <div className="flex-1 flex flex-col p-4 min-w-0">
        {/* Search Bar */}
        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, SKU, or barcode..."
              className="w-full bg-background border border-border pl-10 pr-4 py-3 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {isScanning && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-primary text-xs font-medium">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                Scanner Active
              </div>
            )}
          </div>
        </div>

        {/* Last Scanned Product Banner */}
        {lastScannedProduct && (
          <div className="mb-3 bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 flex-shrink-0">
            {lastScannedProduct.image_url && (
              <img 
                src={lastScannedProduct.image_url} 
                alt={lastScannedProduct.name}
                className="w-14 h-14 rounded-lg object-cover border-2 border-primary/30"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-medium">✓ Scanned</p>
              <p className="text-foreground font-semibold text-sm truncate">{lastScannedProduct.name}</p>
            </div>
            <p className="text-xl font-bold text-primary">£{lastScannedProduct.price.toFixed(2)}</p>
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border shadow-sm min-h-0">
          {filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ShoppingCart className="w-16 h-16 mx-auto mb-3 text-muted-foreground" />
                <p className="text-lg text-muted-foreground font-semibold">No products found</p>
                <p className="text-muted-foreground text-sm mt-1">Try a different search term</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.track_inventory && product.stock_quantity <= 0}
                  className="group relative bg-card border border-border rounded-lg p-2 hover:border-primary/50 hover:bg-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border"
                >
                  {product.image_url ? (
                    <div className="relative w-full aspect-square mb-2 rounded overflow-hidden bg-muted">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  ) : product.icon ? (
                    <span className="text-3xl block mb-2 group-hover:scale-105 transition-transform duration-200">
                      {product.icon}
                    </span>
                  ) : (
                    <div className="w-full aspect-square mb-2 rounded bg-muted flex items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                  <p className="font-medium text-foreground text-xs mb-1 line-clamp-2 leading-tight text-left">
                    {product.name}
                  </p>
                  <p className="text-sm font-bold text-primary">
                    £{product.price.toFixed(2)}
                  </p>
                  {product.track_inventory && (
                    <div className={`text-xs mt-1 px-1.5 py-0.5 rounded-full inline-block font-medium ${
                      product.stock_quantity > 10 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : product.stock_quantity > 0
                        ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
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
      <div className="w-[400px] bg-card border-l border-border flex flex-col shadow-lg overflow-hidden">
        {/* Transaction Header */}
        <div className="p-3 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg shadow-sm">
                <ShoppingCart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">{activeTransaction?.name}</h2>
                <p className="text-muted-foreground text-xs">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items • Staff: {currentStaff.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowTransactionMenu(!showTransactionMenu)}
              className="relative p-1.5 bg-muted hover:bg-accent border border-border hover:border-primary/30 rounded-md transition-all"
            >
              <Layers className="w-4 h-4 text-primary" />
              {transactions.length > 1 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] font-bold flex items-center justify-center text-primary-foreground">
                  {transactions.length}
                </span>
              )}
            </button>
          </div>

          {/* Transaction Menu */}
          {showTransactionMenu && (
            <div className="bg-card/95 backdrop-blur-sm rounded-lg border border-border p-2 space-y-1">
              {transactions.map((trans) => (
                <div
                  key={trans.id}
                  className={`flex items-center justify-between p-2 rounded transition-all ${
                    trans.id === activeTransactionId
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/50 border border-border hover:bg-accent"
                  }`}
                >
                  <button
                    onClick={() => switchTransaction(trans.id)}
                    className="flex-1 text-left"
                  >
                    <p className="font-medium text-foreground text-sm">{trans.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {trans.cart.length} items • £{trans.cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                    </p>
                  </button>
                  {transactions.length > 1 && (
                    <button
                      onClick={() => deleteTransaction(trans.id)}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addNewTransaction}
                className="w-full p-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded text-foreground font-medium text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Transaction
              </button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {cart.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground font-medium">Cart is empty</p>
                <p className="text-muted-foreground text-xs mt-0.5">Add products to get started</p>
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartId} className="bg-card/70 border border-border rounded-lg p-3 hover:border-muted-foreground/30 transition-all">
                <div className="flex items-start gap-2 mb-2">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded object-cover border border-border" />
                  ) : item.icon ? (
                    <span className="text-2xl">{item.icon}</span>
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xl">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm truncate">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">£{item.price.toFixed(2)} each</p>
                    
                    {/* Item Controls Row */}
                    <div className="flex items-center gap-1 mt-1">
                      <button 
                        onClick={() => editItem(item)}
                        className="px-1.5 py-0.5 bg-muted hover:bg-accent rounded text-xs text-muted-foreground hover:text-foreground transition-all flex items-center gap-0.5"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        Edit
                      </button>
                      
                      {item.discount && item.discount > 0 && (
                        <span className="px-1.5 py-0.5 bg-primary/10 rounded text-xs text-primary">
                          -£{item.discount.toFixed(2)}
                        </span>
                      )}
                      
                      {item.note && (
                        <span className="px-1.5 py-0.5 bg-blue-500/10 rounded text-xs text-blue-600 flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Note
                        </span>
                      )}
                    </div>
                    
                    {item.note && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{item.note}"</p>
                    )}
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.cartId)} 
                    className="text-destructive hover:text-destructive-foreground hover:bg-destructive/10 p-1 rounded transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-muted rounded p-0.5">
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity - 1)} 
                      className="w-7 h-7 bg-background hover:bg-accent rounded font-medium text-foreground transition-all flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-medium text-foreground text-sm">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(item.cartId, item.quantity + 1)} 
                      className="w-7 h-7 bg-background hover:bg-accent rounded font-medium text-foreground transition-all flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-base font-bold text-primary">
                    £{((item.price * item.quantity) - (item.discount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout Panel */}
        <div className="p-3 border-t border-border bg-card/50 space-y-3 flex-shrink-0">
          
          {/* Customer Selection */}
          <div className="flex gap-1.5">
            <select 
              value={customerId} 
              onChange={(e) => setCustomerId(e.target.value)} 
              className="flex-1 bg-background border border-border text-foreground p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
            <div className={`rounded-lg p-2 border ${
              customerBalance >= grandTotal 
                ? "bg-primary/5 border-primary/20" 
                : "bg-muted/50 border-border"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-primary font-medium text-xs">{selectedCustomer.name}'s Balance:</span>
                </div>
                <span className="text-base font-bold text-primary">£{customerBalance.toFixed(2)}</span>
              </div>
              {customerBalance >= grandTotal && (
                <p className="text-xs text-primary mt-0.5">
                  ✓ Sufficient balance for full payment
                </p>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1.5 bg-muted/30 rounded-lg p-3 border border-border">
            <div className="flex justify-between text-foreground text-sm">
              <span className="font-medium">Subtotal</span>
              <span className="font-medium">£{subtotal.toFixed(2)}</span>
            </div>
            {vatEnabled && (
              <div className="flex justify-between text-foreground text-sm">
                <span className="font-medium">VAT (20%)</span>
                <span className="font-medium">£{vat.toFixed(2)}</span>
              </div>
            )}
            <div className="h-px bg-border my-1"></div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">
                £{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setShowDiscountModal(true)}
              disabled={cart.length === 0}
              className="bg-muted hover:bg-accent disabled:opacity-50 border border-border text-foreground font-medium py-2 rounded text-xs transition-all flex items-center justify-center gap-1"
            >
              <Tag className="w-3.5 h-3.5" />
              Discount
            </button>
            
            <button
              onClick={() => setShowMiscModal(true)}
              className="bg-muted hover:bg-accent border border-border text-foreground font-medium py-2 rounded text-xs transition-all flex items-center justify-center gap-1"
            >
              <Package className="w-3.5 h-3.5" />
              Misc Item
            </button>

            <button
              onClick={printReceipt}
              disabled={cart.length === 0}
              className="bg-muted hover:bg-accent disabled:opacity-50 border border-border text-foreground font-medium py-2 rounded text-xs transition-all flex items-center justify-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            <button
              onClick={() => setShowTransactionsModal(true)}
              className="bg-muted hover:bg-accent border border-border text-foreground font-medium py-2 rounded text-xs transition-all flex items-center justify-center gap-1"
            >
              <History className="w-3.5 h-3.5" />
              Recent
            </button>

            <button
              onClick={clearActiveTransaction}
              disabled={cart.length === 0}
              className="bg-muted hover:bg-accent disabled:opacity-50 border border-border text-foreground font-medium py-2 rounded text-xs transition-all flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Clear
            </button>

            <button
              onClick={noSale}
              className="bg-muted hover:bg-accent border border-border text-foreground font-medium py-2 rounded text-xs transition-all flex items-center justify-center gap-1"
            >
              <DollarSign className="w-3.5 h-3.5" />
              No Sale
            </button>
          </div>

          {/* Split Payment Button */}
          <button
            onClick={() => setShowSplitPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-muted disabled:to-muted text-foreground font-medium py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm"
          >
            <Calculator className="w-3.5 h-3.5" />
            Split Payment
          </button>

          {/* Checkout Button */}
          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary disabled:from-muted disabled:to-muted text-primary-foreground font-bold py-3 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <CreditCard className="w-4 h-4" />
            PAY £{grandTotal.toFixed(2)}
          </button>
        </div>
      </div>

      {/* All Modals - Updated to match layout style */}
      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-4 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-foreground">Apply Discount</h2>
              <button onClick={() => setShowDiscountModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Discount Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setDiscountType("percentage")}
                    className={`py-2 rounded font-medium border transition-all text-sm ${
                      discountType === "percentage"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    Percentage %
                  </button>
                  <button
                    onClick={() => setDiscountType("fixed")}
                    className={`py-2 rounded font-medium border transition-all text-sm ${
                      discountType === "fixed"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    Fixed £
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {discountType === "percentage" ? "Discount %" : "Discount Amount £"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "10" : "5.00"}
                  className="w-full bg-background border border-border text-foreground p-2.5 rounded text-base text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>

              {discountValue && (
                <div className="bg-muted/50 rounded p-2.5 border border-border">
                  <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                    <span>Current Total:</span>
                    <span className="font-medium">£{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-primary">Discount:</span>
                    <span className="text-primary font-medium">
                      -£{(discountType === "percentage" 
                        ? (cartTotal * parseFloat(discountValue || "0")) / 100
                        : parseFloat(discountValue || "0")
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 bg-muted hover:bg-accent py-2.5 rounded font-medium text-foreground text-sm"
              >
                Cancel
              </button>
              <button
                onClick={applyDiscount}
                disabled={!discountValue || parseFloat(discountValue) <= 0}
                className="flex-1 bg-primary hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground py-2.5 rounded font-medium text-primary-foreground text-sm transition-opacity disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Misc Product Modal */}
      {showMiscModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-4 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-foreground">Add Misc Item</h2>
              <button onClick={() => setShowMiscModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Product Name</label>
                <input
                  type="text"
                  value={miscProductName}
                  onChange={(e) => setMiscProductName(e.target.value)}
                  placeholder="Enter product name"
                  className="w-full bg-background border border-border text-foreground p-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Price £</label>
                <input
                  type="number"
                  step="0.01"
                  value={miscProductPrice}
                  onChange={(e) => setMiscProductPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-border text-foreground p-2.5 rounded text-base text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowMiscModal(false)}
                className="flex-1 bg-muted hover:bg-accent py-2.5 rounded font-medium text-foreground text-sm"
              >
                Cancel
              </button>
              <button
                onClick={addMiscProduct}
                disabled={!miscProductName.trim() || !miscProductPrice}
                className="flex-1 bg-primary hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground py-2.5 rounded font-medium text-primary-foreground text-sm transition-opacity disabled:opacity-50"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-4 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-foreground">Edit Item: {editingItem.name}</h2>
              <button onClick={() => setShowEditItemModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Price £</label>
                <input
                  type="number"
                  step="0.01"
                  value={editItemPrice}
                  onChange={(e) => setEditItemPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-border text-foreground p-2.5 rounded text-base text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Discount £</label>
                <input
                  type="number"
                  step="0.01"
                  value={editItemDiscount}
                  onChange={(e) => setEditItemDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-background border border-border text-foreground p-2.5 rounded text-base text-center font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max discount: £{(editingItem.price * editingItem.quantity).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Note (Optional)</label>
                <textarea
                  value={editItemNote}
                  onChange={(e) => setEditItemNote(e.target.value)}
                  placeholder="Add a note for this item..."
                  rows={2}
                  className="w-full bg-background border border-border text-foreground p-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>

              <div className="bg-muted/50 rounded p-2.5 border border-border">
                <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                  <span>Quantity:</span>
                  <span className="font-medium">{editingItem.quantity}</span>
                </div>
                <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                  <span>Original Total:</span>
                  <span className="font-medium">£{(editingItem.price * editingItem.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-primary">New Discount:</span>
                  <span className="text-primary font-medium">-£{parseFloat(editItemDiscount || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1.5 pt-1.5 border-t border-border">
                  <span className="text-foreground font-medium">New Total:</span>
                  <span className="text-lg font-bold text-primary">
                    £{((parseFloat(editItemPrice || editingItem.price.toString()) * editingItem.quantity) - parseFloat(editItemDiscount || "0")).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowEditItemModal(false)}
                className="flex-1 bg-muted hover:bg-accent py-2.5 rounded font-medium text-foreground text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveItemEdit}
                disabled={parseFloat(editItemPrice) <= 0 || parseFloat(editItemDiscount) < 0}
                className="flex-1 bg-primary hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground py-2.5 rounded font-medium text-primary-foreground text-sm transition-opacity disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Numpad Modal */}
      {showNumpadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-card border border-border rounded-lg p-4 max-w-sm w-full shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-foreground">Enter Custom Amount</h2>
              <button onClick={() => setShowNumpadModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-background border border-border rounded p-3 mb-3">
              <p className="text-xs text-muted-foreground mb-1">Custom Amount</p>
              <p className="text-2xl font-bold text-foreground text-right">
                £{customAmount || '0.00'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((value) => (
                <button
                  key={value}
                  onClick={() => handleNumpadClick(value)}
                  className={`h-12 rounded font-medium transition-all text-sm ${
                    value === 'backspace'
                      ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20'
                      : 'bg-muted hover:bg-accent text-foreground border border-border'
                  }`}
                >
                  {value === 'backspace' ? '⌫' : value}
                </button>
              ))}
              <button
                onClick={() => handleNumpadClick('clear')}
                className="h-12 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 rounded font-medium text-sm transition-all"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  setCustomAmount(grandTotal.toFixed(2));
                  setShowNumpadModal(false);
                }}
                className="h-12 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded font-medium text-sm transition-all"
              >
                Total
              </button>
              <button
                onClick={() => setShowNumpadModal(false)}
                className="h-12 bg-muted hover:bg-accent text-foreground rounded font-medium text-sm transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Payment Modal */}
      {showSplitPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-4 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-foreground">Split Payment</h2>
              <button onClick={() => setShowSplitPaymentModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-primary/5 border border-primary/20 rounded p-3 mb-2">
                <p className="text-muted-foreground text-sm mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-primary">£{grandTotal.toFixed(2)}</p>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Cash £</label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitPayment.cash || ''}
                    onChange={(e) => handleSplitPaymentChange('cash', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-background border border-border text-foreground p-2.5 rounded text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Card £</label>
                  <input
                    type="number"
                    step="0.01"
                    value={splitPayment.card || ''}
                    onChange={(e) => handleSplitPaymentChange('card', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-background border border-border text-foreground p-2.5 rounded text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {selectedCustomer && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Balance £</label>
                    <input
                      type="number"
                      step="0.01"
                      value={splitPayment.balance || ''}
                      onChange={(e) => handleSplitPaymentChange('balance', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-background border border-border text-foreground p-2.5 rounded text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: £{customerBalance.toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="bg-muted/50 rounded p-2.5 border border-border">
                  <div className="flex justify-between text-foreground">
                    <span className="font-medium">Remaining:</span>
                    <span className={`text-lg font-bold ${splitPayment.remaining === 0 ? 'text-primary' : 'text-amber-600'}`}>
                      £{splitPayment.remaining.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {splitPayment.remaining === 0 ? '✓ Payment fully allocated' : 'Enter remaining amount'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowSplitPaymentModal(false)}
                className="flex-1 bg-muted hover:bg-accent py-2.5 rounded font-medium text-foreground text-sm"
              >
                Cancel
              </button>
              <button
                onClick={applySplitPayment}
                disabled={splitPayment.remaining > 0.01}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-muted disabled:to-muted py-2.5 rounded font-medium text-foreground text-sm shadow-sm disabled:opacity-50 transition-all"
              >
                Confirm Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-4 max-w-md w-full shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-foreground">Complete Payment</h2>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total */}
            <div className="bg-primary/5 border border-primary/20 rounded p-3 mb-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-primary">£{grandTotal.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => setShowNumpadModal(true)}
                  className="p-1.5 bg-muted hover:bg-accent rounded"
                >
                  <Edit className="w-4 h-4 text-primary" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Custom amount: £{customAmount || grandTotal.toFixed(2)}
              </p>
            </div>

            {/* Notes */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-foreground mb-1.5">Transaction Notes</label>
              <textarea
                value={transactionNotes}
                onChange={(e) => setTransactionNotes(e.target.value)}
                placeholder="Add any notes about this transaction..."
                rows={2}
                className="w-full bg-background border border-border text-foreground p-2.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            {/* Customer Balance */}
            {selectedCustomer && customerBalance > 0 && paymentMethod === "balance" && (
              <div className="mb-3 p-2.5 bg-primary/5 rounded border border-primary/20">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <div className="flex-1">
                    <span className="text-foreground font-medium text-sm">Using Customer Balance</span>
                    <div className="flex justify-between text-xs text-primary mt-1">
                      <span>Available Balance: £{customerBalance.toFixed(2)}</span>
                      <span className={`font-bold ${
                        customerBalance >= grandTotal ? 'text-primary' : 'text-amber-600'
                      }`}>
                        {customerBalance >= (parseFloat(customAmount) || grandTotal) ? 'Full payment' : 'Partial payment'}
                      </span>
                    </div>
                    {customerBalance < (parseFloat(customAmount) || grandTotal) && allowNegativeBalance && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Will go into negative balance: £{(customerBalance - (parseFloat(customAmount) || grandTotal)).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="space-y-2 mb-3">
              <label className="block text-sm font-medium text-foreground mb-1.5">Payment Method</label>
              
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-2 rounded font-medium border transition-all text-xs flex flex-col items-center ${
                    paymentMethod === "cash"
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <div className="text-lg mb-0.5">💵</div>
                  <span>Cash</span>
                </button>

                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-2 rounded font-medium border transition-all text-xs flex flex-col items-center ${
                    paymentMethod === "card"
                      ? "bg-blue-500/10 border-blue-500 text-blue-600"
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <div className="text-lg mb-0.5">💳</div>
                  <span>Card</span>
                </button>

                {selectedCustomer && (
                  <button
                    onClick={() => setPaymentMethod("balance")}
                    className={`p-2 rounded font-medium border transition-all text-xs flex flex-col items-center ${
                      paymentMethod === "balance"
                        ? "bg-purple-500/10 border-purple-500 text-purple-600"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <div className="text-lg mb-0.5">💰</div>
                    <span>Balance</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setShowSplitPaymentModal(true);
                  }}
                  className="p-2 rounded font-medium border border-border bg-muted text-muted-foreground flex flex-col items-center text-xs"
                >
                  <div className="text-lg mb-0.5">📊</div>
                  <span>Split</span>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-1.5 mb-3">
              <label className="flex items-center gap-2 p-2 bg-muted/50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={printReceiptOption}
                  onChange={(e) => setPrintReceiptOption(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-foreground text-sm">Print Receipt</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-muted hover:bg-accent py-2.5 rounded font-medium text-foreground text-sm"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={processingPayment}
                className="flex-1 bg-primary hover:opacity-90 disabled:bg-muted disabled:text-muted-foreground py-2.5 rounded font-medium text-primary-foreground text-sm flex items-center justify-center gap-1.5"
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-4 max-w-2xl w-full max-h-[70vh] flex flex-col shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
              <button onClick={() => setShowTransactionsModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-6">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">No recent transactions</p>
                </div>
              ) : (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="bg-card/70 border border-border rounded p-3 hover:border-muted-foreground/30 transition-all">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="font-medium text-foreground text-sm">Transaction #{transaction.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleString('en-GB')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">£{transaction.total?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-muted-foreground capitalize">{transaction.payment_method || 'cash'}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {transaction.products?.length || 0} items
                        </span>
                        {transaction.customer_id && (
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                            Customer: {customers.find(c => c.id === transaction.customer_id)?.name || 'N/A'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const receiptData: ReceiptPrintData = {
                            id: transaction.id,
                            createdAt: transaction.created_at,
                            subtotal: transaction.subtotal || 0,
                            vat: transaction.vat || 0,
                            total: transaction.total || 0,
                            paymentMethod: transaction.payment_method || 'cash',
                            products: transaction.products || [],
                            customer: customers.find(c => c.id.toString() === transaction.customer_id) ? {
                              id: customers.find(c => c.id === transaction.customer_id)!.id.toString(),
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
                              barcodeType: receiptSettings?.barcode_type || 'code128',
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
                        className="bg-muted hover:bg-accent text-foreground px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
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






