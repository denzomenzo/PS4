// components/POS.tsx - ENHANCED VERSION
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { logAuditAction } from "@/lib/auditLogger";
import { Trash2, Loader2, Search, ShoppingCart, CreditCard, Plus, Minus, Layers, X, Printer, Tag, DollarSign, Package } from "lucide-react";

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

export default function POS() {
  const userId = useUserId();
  const { staff: currentStaff, hasPermission } = useStaffAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
      name: "Transaction 1",
      cart: [],
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
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  
  // Receipt settings from settings table
  const [receiptSettings, setReceiptSettings] = useState<any>(null);
  
  // Modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showMiscModal, setShowMiscModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [miscProductName, setMiscProductName] = useState("");
  const [miscProductPrice, setMiscProductPrice] = useState("");
  
  // Payment modal states
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [printReceiptOption, setPrintReceiptOption] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Recent transactions
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const activeTransaction = transactions.find(t => t.id === activeTransactionId);
  const cart = activeTransaction?.cart || [];
  const customerId = activeTransaction?.customerId || "";

  const setCart = (newCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setTransactions(prev => prev.map(t => 
      t.id === activeTransactionId 
        ? { ...t, cart: typeof newCart === 'function' ? newCart(t.cart) : newCart }
        : t
    ));
  };

  const setCustomerId = (id: string) => {
    setTransactions(prev => prev.map(t => 
      t.id === activeTransactionId ? { ...t, customerId: id } : t
    ));
  };

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

  useEffect(() => {
    if (userId && currentStaff) {
      loadData();
      loadTransactionsFromStorage();
    }
  }, [userId, currentStaff]);

  // Load transactions from localStorage on mount
  const loadTransactionsFromStorage = () => {
    if (!currentStaff) return;
    
    const storageKey = `pos_transactions_${currentStaff.id}`;
    const savedData = localStorage.getItem(storageKey);
    
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setTransactions(parsed.transactions);
        setActiveTransactionId(parsed.activeTransactionId);
      } catch (error) {
        console.error("Error loading transactions:", error);
      }
    }
  };

  // Save transactions to localStorage whenever they change
  useEffect(() => {
    if (!currentStaff) return;
    
    const storageKey = `pos_transactions_${currentStaff.id}`;
    const dataToSave = {
      transactions,
      activeTransactionId
    };
    
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));
  }, [transactions, activeTransactionId, currentStaff]);

  const subtotal = cart.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    const itemDiscount = item.discount || 0;
    return sum + (itemTotal - itemDiscount);
  }, 0);
  const vat = vatEnabled ? subtotal * 0.2 : 0;
  const grandTotal = subtotal + vat;

  // Broadcast cart updates to customer display
  useEffect(() => {
    if (!hardwareSettings?.customer_display_enabled) return;
    
    const channelName = hardwareSettings.display_sync_channel || 'customer-display';
    const channel = supabase.channel(channelName);
    
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.send({
          type: 'broadcast',
          event: 'cart-update',
          payload: {
            cart: cart,
            total: subtotal,
            vat: vat,
            grandTotal: grandTotal,
            transactionName: activeTransaction?.name || "Transaction 1",
            transactionId: activeTransactionId,
          }
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cart, subtotal, vat, grandTotal, activeTransactionId, activeTransaction, hardwareSettings]);

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

  const loadData = async () => {
    setLoading(true);
    
    const { data: settingsData } = await supabase
      .from("settings")
      .select("vat_enabled, business_name, business_address, business_phone, business_email, business_website, tax_number, receipt_logo_url, receipt_footer, refund_days, show_tax_breakdown, receipt_font_size, barcode_type")
      .eq("user_id", userId)
      .single();
    
    if (settingsData?.vat_enabled !== undefined) {
      setVatEnabled(settingsData.vat_enabled);
    }
    
    // Store receipt settings
    if (settingsData) {
      setReceiptSettings(settingsData);
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

    const { data: customersData } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", userId)
      .order("name");
    
    if (customersData) setCustomers(customersData);

    // Load recent transactions
    const { data: transactionsData } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (transactionsData) setRecentTransactions(transactionsData);

    setLoading(false);
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

    const itemTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountAmount = discountType === "percentage" 
      ? (itemTotal * value) / 100 
      : value;

    // Apply discount proportionally to all items
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

  const printReceipt = () => { {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }

    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    const fontSize = receiptSettings?.receipt_font_size || 12;
    const businessName = receiptSettings?.business_name || "Your Business";
    const businessAddress = receiptSettings?.business_address || "";
    const businessPhone = receiptSettings?.business_phone || "";
    const businessEmail = receiptSettings?.business_email || "";
    const businessWebsite = receiptSettings?.business_website || "";
    const taxNumber = receiptSettings?.tax_number || "";
    const receiptLogoUrl = receiptSettings?.receipt_logo_url || "";
    const receiptFooter = receiptSettings?.receipt_footer || "Thank you for your business!";
    const refundDays = receiptSettings?.refund_days || null;
    const showTaxBreakdown = receiptSettings?.show_tax_breakdown !== false;

    const selectedCustomer = customers.find(c => c.id.toString() === customerId);

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt (No Payment)</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            padding: 20px; 
            max-width: 300px; 
            margin: 0 auto;
            font-size: ${fontSize}px;
          }
          h1 { 
            text-align: center; 
            font-size: ${fontSize + 6}px; 
            margin-bottom: 10px;
            font-weight: bold;
          }
          .logo {
            text-align: center;
            margin-bottom: 10px;
          }
          .logo img {
            max-width: 150px;
            height: auto;
          }
          .line { 
            border-bottom: 1px dashed #000; 
            margin: 10px 0; 
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0;
            font-size: ${fontSize - 1}px;
          }
          .totals { 
            margin-top: 10px; 
            font-weight: bold; 
          }
          .total-line { 
            display: flex; 
            justify-content: space-between; 
            margin: 3px 0; 
          }
          .text-center { 
            text-align: center; 
          }
          .small { 
            font-size: ${fontSize - 2}px; 
          }
          .tiny { 
            font-size: ${fontSize - 3}px; 
          }
        </style>
      </head>
      <body>
        ${receiptLogoUrl ? `<div class="logo"><img src="${receiptLogoUrl}" alt="Logo" /></div>` : ''}
        
        <h1>${businessName}</h1>
        <div class="text-center small">
          ${businessAddress ? `<div style="white-space: pre-line; margin-bottom: 3px;">${businessAddress}</div>` : ''}
          ${businessPhone ? `<div>${businessPhone}</div>` : ''}
          ${businessEmail ? `<div>${businessEmail}</div>` : ''}
          ${businessWebsite ? `<div>${businessWebsite}</div>` : ''}
          ${taxNumber ? `<div style="margin-top: 5px;">Tax No: ${taxNumber}</div>` : ''}
        </div>
        
        <div class="line"></div>
        
        <div class="small">
          <div><strong>Receipt #${Date.now().toString().slice(-8)}</strong></div>
          <div>${new Date().toLocaleString('en-GB')}</div>
          ${selectedCustomer ? `<div>Customer: ${selectedCustomer.name}</div>` : ''}
        </div>
        
        <div class="line"></div>
        
        ${cart.map(item => `
          <div class="item">
            <span>${item.name} x${item.quantity}</span>
            <span><strong>£${((item.price * item.quantity) - (item.discount || 0)).toFixed(2)}</strong></span>
          </div>
          ${item.discount && item.discount > 0 ? `
            <div class="item tiny" style="color: #666;">
              <span style="padding-left: 10px;">Discount</span>
              <span>-£${item.discount.toFixed(2)}</span>
            </div>
          ` : ''}
        `).join('')}
        
        <div class="line"></div>
        
        <div class="totals">
          <div class="total-line small">
            <span>Subtotal:</span>
            <span>£${subtotal.toFixed(2)}</span>
          </div>
          ${vatEnabled && showTaxBreakdown ? `
            <div class="total-line small">
              <span>VAT (20%):</span>
              <span>£${vat.toFixed(2)}</span>
            </div>
            <div class="total-line tiny" style="color: #666;">
              <span style="padding-left: 10px;">Net: £${(subtotal / 1.2).toFixed(2)}</span>
              <span>Tax: £${(subtotal * 0.2 / 1.2).toFixed(2)}</span>
            </div>
          ` : vatEnabled ? `
            <div class="total-line small">
              <span>VAT (20%):</span>
              <span>£${vat.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-line" style="font-size: ${fontSize + 2}px; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px;">
            <span>TOTAL:</span>
            <span>£${grandTotal.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="line"></div>
        
        ${refundDays ? `
          <div class="text-center tiny" style="margin: 10px 0;">
            Returns accepted within ${refundDays} days
          </div>
        ` : ''}
        
        <div class="text-center small" style="margin-top: 10px;">
          ${receiptFooter}
        </div>
        
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  const printPaidReceiptFromTransaction = (transaction: any) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    const fontSize = receiptSettings?.receipt_font_size || 12;
    const businessName = receiptSettings?.business_name || "Your Business";
    const businessAddress = receiptSettings?.business_address || "";
    const businessPhone = receiptSettings?.business_phone || "";
    const businessEmail = receiptSettings?.business_email || "";
    const businessWebsite = receiptSettings?.business_website || "";
    const taxNumber = receiptSettings?.tax_number || "";
    const receiptLogoUrl = receiptSettings?.receipt_logo_url || "";
    const receiptFooter = receiptSettings?.receipt_footer || "Thank you for your business!";
    const refundDays = receiptSettings?.refund_days || null;
    const showTaxBreakdown = receiptSettings?.show_tax_breakdown !== false;
    const barcodeType = receiptSettings?.barcode_type || "code128";

    const customer = customers.find(c => c.id === transaction.customer_id);
    const items = transaction.products || [];

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${transaction.id}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            padding: 20px; 
            max-width: 300px; 
            margin: 0 auto;
            font-size: ${fontSize}px;
          }
          h1 { 
            text-align: center; 
            font-size: ${fontSize + 6}px; 
            margin-bottom: 10px;
            font-weight: bold;
          }
          .logo {
            text-align: center;
            margin-bottom: 10px;
          }
          .logo img {
            max-width: 150px;
            height: auto;
          }
          .line { 
            border-bottom: 1px dashed #000; 
            margin: 10px 0; 
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0;
            font-size: ${fontSize - 1}px;
          }
          .totals { 
            margin-top: 10px; 
            font-weight: bold; 
          }
          .total-line { 
            display: flex; 
            justify-content: space-between; 
            margin: 3px 0; 
          }
          .text-center { 
            text-align: center; 
          }
          .small { 
            font-size: ${fontSize - 2}px; 
          }
          .tiny { 
            font-size: ${fontSize - 3}px; 
          }
          .barcode-container {
            text-align: center;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        ${receiptLogoUrl ? `<div class="logo"><img src="${receiptLogoUrl}" alt="Logo" /></div>` : ''}
        
        <h1>${businessName}</h1>
        <div class="text-center small">
          ${businessAddress ? `<div style="white-space: pre-line; margin-bottom: 3px;">${businessAddress}</div>` : ''}
          ${businessPhone ? `<div>${businessPhone}</div>` : ''}
          ${businessEmail ? `<div>${businessEmail}</div>` : ''}
          ${businessWebsite ? `<div>${businessWebsite}</div>` : ''}
          ${taxNumber ? `<div style="margin-top: 5px;">Tax No: ${taxNumber}</div>` : ''}
        </div>
        
        <div class="line"></div>
        
        <div class="small">
          <div><strong>Receipt #${transaction.id}</strong></div>
          <div>${new Date(transaction.created_at).toLocaleString('en-GB')}</div>
          ${customer ? `<div>Customer: ${customer.name}</div>` : ''}
          <div><strong>Paid via: ${(transaction.payment_method || 'cash').toUpperCase()}</strong></div>
        </div>
        
        <div class="line"></div>
        
        ${items.map((item: any) => `
          <div class="item">
            <span>${item.name} x${item.quantity}</span>
            <span><strong>£${item.total.toFixed(2)}</strong></span>
          </div>
          ${item.discount && item.discount > 0 ? `
            <div class="item tiny" style="color: #666;">
              <span style="padding-left: 10px;">Discount</span>
              <span>-£${item.discount.toFixed(2)}</span>
            </div>
          ` : ''}
        `).join('')}
        
        <div class="line"></div>
        
        <div class="totals">
          <div class="total-line small">
            <span>Subtotal:</span>
            <span>£${transaction.subtotal.toFixed(2)}</span>
          </div>
          ${transaction.vat > 0 && showTaxBreakdown ? `
            <div class="total-line small">
              <span>VAT (20%):</span>
              <span>£${transaction.vat.toFixed(2)}</span>
            </div>
            <div class="total-line tiny" style="color: #666;">
              <span style="padding-left: 10px;">Net: £${(transaction.subtotal / 1.2).toFixed(2)}</span>
              <span>Tax: £${(transaction.subtotal * 0.2 / 1.2).toFixed(2)}</span>
            </div>
          ` : transaction.vat > 0 ? `
            <div class="total-line small">
              <span>VAT (20%):</span>
              <span>£${transaction.vat.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-line" style="font-size: ${fontSize + 2}px; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px;">
            <span>PAID:</span>
            <span>£${transaction.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="line"></div>
        
        ${refundDays ? `
          <div class="text-center tiny" style="margin: 10px 0;">
            Returns accepted within ${refundDays} days
          </div>
        ` : ''}
        
        <div class="text-center small" style="margin-top: 10px;">
          ${receiptFooter}
        </div>

        ${barcodeType === "qr" ? `
          <div class="barcode-container">
            <svg viewBox="0 0 100 100" width="100" height="100">
              <rect x="0" y="0" width="20" height="20" fill="black"/>
              <rect x="0" y="30" width="10" height="10" fill="black"/>
              <rect x="20" y="30" width="10" height="10" fill="black"/>
              <rect x="40" y="0" width="20" height="20" fill="black"/>
              <rect x="70" y="0" width="30" height="30" fill="black"/>
              <rect x="0" y="50" width="30" height="10" fill="black"/>
              <rect x="40" y="40" width="20" height="20" fill="black"/>
              <rect x="70" y="40" width="10" height="20" fill="black"/>
              <rect x="0" y="70" width="20" height="30" fill="black"/>
              <rect x="30" y="70" width="10" height="30" fill="black"/>
              <rect x="50" y="70" width="20" height="10" fill="black"/>
              <rect x="80" y="70" width="20" height="30" fill="black"/>
            </svg>
          </div>
        ` : `
          <div class="barcode-container">
            <svg width="200" height="50">
              <rect x="0" y="0" width="4" height="40" fill="black"/>
              <rect x="6" y="0" width="2" height="40" fill="black"/>
              <rect x="10" y="0" width="4" height="40" fill="black"/>
              <rect x="16" y="0" width="2" height="40" fill="black"/>
              <rect x="20" y="0" width="6" height="40" fill="black"/>
              <rect x="28" y="0" width="2" height="40" fill="black"/>
              <rect x="32" y="0" width="4" height="40" fill="black"/>
              <rect x="38" y="0" width="2" height="40" fill="black"/>
              <rect x="42" y="0" width="2" height="40" fill="black"/>
              <rect x="46" y="0" width="6" height="40" fill="black"/>
              <rect x="54" y="0" width="2" height="40" fill="black"/>
              <rect x="58" y="0" width="4" height="40" fill="black"/>
              <rect x="64" y="0" width="2" height="40" fill="black"/>
              <rect x="68" y="0" width="4" height="40" fill="black"/>
              <rect x="74" y="0" width="6" height="40" fill="black"/>
              <rect x="82" y="0" width="2" height="40" fill="black"/>
              <rect x="86" y="0" width="4" height="40" fill="black"/>
              <rect x="92" y="0" width="2" height="40" fill="black"/>
              <rect x="96" y="0" width="2" height="40" fill="black"/>
              <rect x="100" y="0" width="4" height="40" fill="black"/>
              <rect x="106" y="0" width="2" height="40" fill="black"/>
              <rect x="110" y="0" width="6" height="40" fill="black"/>
              <rect x="118" y="0" width="2" height="40" fill="black"/>
              <rect x="122" y="0" width="4" height="40" fill="black"/>
              <rect x="128" y="0" width="2" height="40" fill="black"/>
              <rect x="132" y="0" width="2" height="40" fill="black"/>
              <rect x="136" y="0" width="6" height="40" fill="black"/>
              <rect x="144" y="0" width="2" height="40" fill="black"/>
              <rect x="148" y="0" width="4" height="40" fill="black"/>
              <rect x="154" y="0" width="2" height="40" fill="black"/>
              <rect x="158" y="0" width="4" height="40" fill="black"/>
              <rect x="164" y="0" width="6" height="40" fill="black"/>
              <rect x="172" y="0" width="2" height="40" fill="black"/>
              <rect x="176" y="0" width="4" height="40" fill="black"/>
              <rect x="182" y="0" width="2" height="40" fill="black"/>
              <rect x="186" y="0" width="2" height="40" fill="black"/>
              <rect x="190" y="0" width="4" height="40" fill="black"/>
              <rect x="196" y="0" width="2" height="40" fill="black"/>
            </svg>
          </div>
        `}
        
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
  };

  const printPaidReceipt = (transactionId: number, method: string) => {
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) return;

    const fontSize = receiptSettings?.receipt_font_size || 12;
    const businessName = receiptSettings?.business_name || "Your Business";
    const businessAddress = receiptSettings?.business_address || "";
    const businessPhone = receiptSettings?.business_phone || "";
    const businessEmail = receiptSettings?.business_email || "";
    const businessWebsite = receiptSettings?.business_website || "";
    const taxNumber = receiptSettings?.tax_number || "";
    const receiptLogoUrl = receiptSettings?.receipt_logo_url || "";
    const receiptFooter = receiptSettings?.receipt_footer || "Thank you for your business!";
    const refundDays = receiptSettings?.refund_days || null;
    const showTaxBreakdown = receiptSettings?.show_tax_breakdown !== false;
    const barcodeType = receiptSettings?.barcode_type || "code128";

    const selectedCustomer = customers.find(c => c.id.toString() === customerId);

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${transactionId}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            padding: 20px; 
            max-width: 300px; 
            margin: 0 auto;
            font-size: ${fontSize}px;
          }
          h1 { 
            text-align: center; 
            font-size: ${fontSize + 6}px; 
            margin-bottom: 10px;
            font-weight: bold;
          }
          .logo {
            text-align: center;
            margin-bottom: 10px;
          }
          .logo img {
            max-width: 150px;
            height: auto;
          }
          .line { 
            border-bottom: 1px dashed #000; 
            margin: 10px 0; 
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0;
            font-size: ${fontSize - 1}px;
          }
          .totals { 
            margin-top: 10px; 
            font-weight: bold; 
          }
          .total-line { 
            display: flex; 
            justify-between; 
            margin: 3px 0; 
          }
          .text-center { 
            text-align: center; 
          }
          .small { 
            font-size: ${fontSize - 2}px; 
          }
          .tiny { 
            font-size: ${fontSize - 3}px; 
          }
          .barcode-container {
            text-align: center;
            margin-top: 15px;
          }
        </style>
      </head>
      <body>
        ${receiptLogoUrl ? `<div class="logo"><img src="${receiptLogoUrl}" alt="Logo" /></div>` : ''}
        
        <h1>${businessName}</h1>
        <div class="text-center small">
          ${businessAddress ? `<div style="white-space: pre-line; margin-bottom: 3px;">${businessAddress}</div>` : ''}
          ${businessPhone ? `<div>${businessPhone}</div>` : ''}
          ${businessEmail ? `<div>${businessEmail}</div>` : ''}
          ${businessWebsite ? `<div>${businessWebsite}</div>` : ''}
          ${taxNumber ? `<div style="margin-top: 5px;">Tax No: ${taxNumber}</div>` : ''}
        </div>
        
        <div class="line"></div>
        
        <div class="small">
          <div><strong>Receipt #${transactionId}</strong></div>
          <div>${new Date().toLocaleString('en-GB')}</div>
          ${selectedCustomer ? `<div>Customer: ${selectedCustomer.name}</div>` : ''}
          <div><strong>Paid via: ${method.toUpperCase()}</strong></div>
        </div>
        
        <div class="line"></div>
        
        ${cart.map(item => `
          <div class="item">
            <span>${item.name} x${item.quantity}</span>
            <span><strong>£${((item.price * item.quantity) - (item.discount || 0)).toFixed(2)}</strong></span>
          </div>
          ${item.discount && item.discount > 0 ? `
            <div class="item tiny" style="color: #666;">
              <span style="padding-left: 10px;">Discount</span>
              <span>-£${item.discount.toFixed(2)}</span>
            </div>
          ` : ''}
        `).join('')}
        
        <div class="line"></div>
        
        <div class="totals">
          <div class="total-line small">
            <span>Subtotal:</span>
            <span>£${subtotal.toFixed(2)}</span>
          </div>
          ${vatEnabled && showTaxBreakdown ? `
            <div class="total-line small">
              <span>VAT (20%):</span>
              <span>£${vat.toFixed(2)}</span>
            </div>
            <div class="total-line tiny" style="color: #666;">
              <span style="padding-left: 10px;">Net: £${(subtotal / 1.2).toFixed(2)}</span>
              <span>Tax: £${(subtotal * 0.2 / 1.2).toFixed(2)}</span>
            </div>
          ` : vatEnabled ? `
            <div class="total-line small">
              <span>VAT (20%):</span>
              <span>£${vat.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="total-line" style="font-size: ${fontSize + 2}px; border-top: 2px solid #000; padding-top: 5px; margin-top: 5px;">
            <span>PAID:</span>
            <span>£${grandTotal.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="line"></div>
        
        ${refundDays ? `
          <div class="text-center tiny" style="margin: 10px 0;">
            Returns accepted within ${refundDays} days
          </div>
        ` : ''}
        
        <div class="text-center small" style="margin-top: 10px;">
          ${receiptFooter}
        </div>

        ${barcodeType === "qr" ? `
          <div class="barcode-container">
            <svg viewBox="0 0 100 100" width="100" height="100">
              <rect x="0" y="0" width="20" height="20" fill="black"/>
              <rect x="0" y="30" width="10" height="10" fill="black"/>
              <rect x="20" y="30" width="10" height="10" fill="black"/>
              <rect x="40" y="0" width="20" height="20" fill="black"/>
              <rect x="70" y="0" width="30" height="30" fill="black"/>
              <rect x="0" y="50" width="30" height="10" fill="black"/>
              <rect x="40" y="40" width="20" height="20" fill="black"/>
              <rect x="70" y="40" width="10" height="20" fill="black"/>
              <rect x="0" y="70" width="20" height="30" fill="black"/>
              <rect x="30" y="70" width="10" height="30" fill="black"/>
              <rect x="50" y="70" width="20" height="10" fill="black"/>
              <rect x="80" y="70" width="20" height="30" fill="black"/>
            </svg>
          </div>
        ` : `
          <div class="barcode-container">
            <svg width="200" height="50">
              <rect x="0" y="0" width="4" height="40" fill="black"/>
              <rect x="6" y="0" width="2" height="40" fill="black"/>
              <rect x="10" y="0" width="4" height="40" fill="black"/>
              <rect x="16" y="0" width="2" height="40" fill="black"/>
              <rect x="20" y="0" width="6" height="40" fill="black"/>
              <rect x="28" y="0" width="2" height="40" fill="black"/>
              <rect x="32" y="0" width="4" height="40" fill="black"/>
              <rect x="38" y="0" width="2" height="40" fill="black"/>
              <rect x="42" y="0" width="2" height="40" fill="black"/>
              <rect x="46" y="0" width="6" height="40" fill="black"/>
              <rect x="54" y="0" width="2" height="40" fill="black"/>
              <rect x="58" y="0" width="4" height="40" fill="black"/>
              <rect x="64" y="0" width="2" height="40" fill="black"/>
              <rect x="68" y="0" width="4" height="40" fill="black"/>
              <rect x="74" y="0" width="6" height="40" fill="black"/>
              <rect x="82" y="0" width="2" height="40" fill="black"/>
              <rect x="86" y="0" width="4" height="40" fill="black"/>
              <rect x="92" y="0" width="2" height="40" fill="black"/>
              <rect x="96" y="0" width="2" height="40" fill="black"/>
              <rect x="100" y="0" width="4" height="40" fill="black"/>
              <rect x="106" y="0" width="2" height="40" fill="black"/>
              <rect x="110" y="0" width="6" height="40" fill="black"/>
              <rect x="118" y="0" width="2" height="40" fill="black"/>
              <rect x="122" y="0" width="4" height="40" fill="black"/>
              <rect x="128" y="0" width="2" height="40" fill="black"/>
              <rect x="132" y="0" width="2" height="40" fill="black"/>
              <rect x="136" y="0" width="6" height="40" fill="black"/>
              <rect x="144" y="0" width="2" height="40" fill="black"/>
              <rect x="148" y="0" width="4" height="40" fill="black"/>
              <rect x="154" y="0" width="2" height="40" fill="black"/>
              <rect x="158" y="0" width="4" height="40" fill="black"/>
              <rect x="164" y="0" width="6" height="40" fill="black"/>
              <rect x="172" y="0" width="2" height="40" fill="black"/>
              <rect x="176" y="0" width="4" height="40" fill="black"/>
              <rect x="182" y="0" width="2" height="40" fill="black"/>
              <rect x="186" y="0" width="2" height="40" fill="black"/>
              <rect x="190" y="0" width="4" height="40" fill="black"/>
              <rect x="196" y="0" width="2" height="40" fill="black"/>
            </svg>
          </div>
        `}
        
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
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

  const checkout = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    
    // Open payment modal instead of directly charging
    setPaymentMethod("cash");
    setEmailReceipt(false);
    setPrintReceiptOption(false);
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    setProcessingPayment(true);
    
    try {
      let paymentSuccess = false;
      let paymentDetails: any = { method: paymentMethod };

      // Handle different payment methods
      if (paymentMethod === "cash") {
        // Cash payment - just needs confirmation
        paymentSuccess = true;
        
        // Open cash drawer if enabled
        if (hardwareSettings?.cash_drawer_enabled) {
          console.log("Opening cash drawer...");
        }
      } else if (paymentMethod === "card") {
        // Card payment - check if terminal is configured
        const { data: cardSettings } = await supabase
          .from("card_terminal_settings")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (!cardSettings || !cardSettings.enabled) {
          alert("⚠️ Card terminal not configured. Please set up in Settings > Card Terminal");
          setProcessingPayment(false);
          return;
        }

        // Simulate card payment (implement actual card terminal integration)
        alert("💳 Processing card payment...\n\nIn production, this would connect to your card terminal.");
        paymentSuccess = confirm("Simulate successful card payment?");
        paymentDetails.cardTerminal = cardSettings.provider;
      }

      if (!paymentSuccess) {
        setProcessingPayment(false);
        return;
      }

      // Record transaction
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
            discount: item.discount || 0,
            total: (item.price * item.quantity) - (item.discount || 0),
          })),
          subtotal: subtotal,
          vat: vat,
          total: grandTotal,
          payment_method: paymentMethod,
          payment_details: paymentDetails,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

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

      // Log the transaction
      await logAuditAction({
        action: "TRANSACTION_COMPLETED",
        entityType: "transaction",
        entityId: transaction.id.toString(),
        newValues: {
          total: grandTotal,
          items: cart.length,
          customer_id: customerId,
          payment_method: paymentMethod,
        },
        staffId: currentStaff?.id,
      });

      // Print receipt if requested
      if (printReceiptOption) {
        printPaidReceiptFromTransaction(transaction);
      }

      // Email receipt if requested
      if (emailReceipt && customerId) {
        const customer = customers.find(c => c.id.toString() === customerId);
        if (customer?.email) {
          console.log(`Sending receipt to ${customer.email}`);
        }
      }

      alert(`✅ £${grandTotal.toFixed(2)} paid successfully via ${paymentMethod}!`);
      
      setShowPaymentModal(false);
      
      // Clear cart
      setTransactions(prev => prev.map(t => 
        t.id === activeTransactionId 
          ? { ...t, cart: [], customerId: "" }
          : t
      ));
      
      // Clear display
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
      
      loadData();
      
    } catch (error: any) {
      console.error("Payment error:", error);
      alert("❌ Error processing payment: " + (error.message || "Unknown error"));
    } finally {
      setProcessingPayment(false);
    }
  };

  if (!userId || !currentStaff) return null;

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
    <div className="h-screen flex bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      <div className="flex-1 flex flex-col p-6">
        
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

        {/* Last Scanned Product Banner */}
        {lastScannedProduct && (
          <div className="mb-6 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            {lastScannedProduct.image_url && (
              <img 
                src={lastScannedProduct.image_url} 
                alt={lastScannedProduct.name}
                className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500/50"
              />
            )}
            <div className="flex-1">
              <p className="text-sm text-emerald-400 font-semibold">✓ Scanned</p>
              <p className="text-white font-bold">{lastScannedProduct.name}</p>
            </div>
            <p className="text-2xl font-black text-emerald-400">£{lastScannedProduct.price.toFixed(2)}</p>
          </div>
        )}

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
                  className="group relative bg-slate-800/40 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-4 hover:border-emerald-500/50 hover:bg-slate-800/60 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700/50"
                >
                  {product.image_url ? (
                    <div className="relative w-full aspect-square mb-3 rounded-xl overflow-hidden bg-slate-700/30">
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
                    <div className="w-full aspect-square mb-3 rounded-xl bg-slate-700/30 flex items-center justify-center text-3xl">
                      📦
                    </div>
                  )}
                  <p className="font-bold text-white text-sm mb-2 line-clamp-2 leading-tight">
                    {product.name}
                  </p>
                  <p className="text-xl font-black text-transparent bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text">
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

      <div className="w-[500px] bg-slate-900/50 backdrop-blur-xl border-l border-slate-800/50 flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/50 bg-gradient-to-r from-emerald-500/10 to-green-500/10 flex-shrink-0">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
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
                    <h3 className="font-bold text-white text-base truncate">{item.name}</h3>
                    <p className="text-sm text-slate-400 font-medium">£{item.price.toFixed(2)} each</p>
                    {item.discount && item.discount > 0 && (
                      <p className="text-xs text-emerald-400 font-semibold">-£{item.discount.toFixed(2)} discount</p>
                    )}
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
                    £{((item.price * item.quantity) - (item.discount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-800/50 bg-slate-900/50 space-y-4 flex-shrink-0">
          
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
              <span className="text-2xl font-black text-white">Total</span>
              <span className="text-4xl font-black text-transparent bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text">
                £{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowDiscountModal(true)}
              disabled={cart.length === 0}
              className="bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 border border-slate-700/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Tag className="w-5 h-5" />
              Discount
            </button>
            
            <button
              onClick={() => setShowMiscModal(true)}
              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              Misc Item
            </button>

            <button
              onClick={printReceipt}
              disabled={cart.length === 0}
              className="bg-slate-800/50 hover:bg-slate-800 disabled:opacity-50 border border-slate-700/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>

            <button
              onClick={() => setShowTransactionsModal(true)}
              className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <DollarSign className="w-5 h-5" />
              Recent
            </button>
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
                PAY £{grandTotal.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Apply Discount</h2>
              <button onClick={() => setShowDiscountModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-lg mb-3 font-medium text-white">Discount Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setDiscountType("percentage")}
                    className={`py-3 rounded-xl font-bold border-2 transition-all ${
                      discountType === "percentage"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                    }`}
                  >
                    Percentage %
                  </button>
                  <button
                    onClick={() => setDiscountType("fixed")}
                    className={`py-3 rounded-xl font-bold border-2 transition-all ${
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
                <label className="block text-lg mb-2 font-medium text-white">
                  {discountType === "percentage" ? "Discount %" : "Discount Amount £"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "10" : "5.00"}
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-4 rounded-xl text-2xl text-center font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
              </div>

              {discountValue && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex justify-between text-sm mb-2 text-slate-300">
                    <span>Current Total:</span>
                    <span className="font-bold">£{(cart.reduce((s, i) => s + i.price * i.quantity, 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-emerald-400">Discount:</span>
                    <span className="text-emerald-400 font-bold">
                      -£{(discountType === "percentage" 
                        ? (cart.reduce((s, i) => s + i.price * i.quantity, 0) * parseFloat(discountValue || "0")) / 100
                        : parseFloat(discountValue || "0")
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold transition-all text-white"
              >
                Cancel
              </button>
              <button
                onClick={applyDiscount}
                disabled={!discountValue || parseFloat(discountValue) <= 0}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-700 py-4 rounded-xl text-lg font-bold transition-all shadow-xl disabled:opacity-50 text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Misc Product Modal */}
      {showMiscModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Add Misc Item</h2>
              <button onClick={() => setShowMiscModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-lg mb-2 font-medium text-white">Product Name</label>
                <input
                  type="text"
                  value={miscProductName}
                  onChange={(e) => setMiscProductName(e.target.value)}
                  placeholder="Enter product name"
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-4 rounded-xl text-lg focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium text-white">Price £</label>
                <input
                  type="number"
                  step="0.01"
                  value={miscProductPrice}
                  onChange={(e) => setMiscProductPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-4 rounded-xl text-2xl text-center font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowMiscModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold transition-all text-white"
              >
                Cancel
              </button>
              <button
                onClick={addMiscProduct}
                disabled={!miscProductName.trim() || !miscProductPrice}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-700 py-4 rounded-xl text-lg font-bold transition-all shadow-xl disabled:opacity-50 text-white"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
            {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-xl w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Complete Payment</h2>
              <button 
                onClick={() => setShowPaymentModal(false)} 
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-2xl p-6 mb-6">
              <p className="text-slate-300 text-lg mb-2">Total Amount</p>
              <p className="text-5xl font-black text-emerald-400">£{grandTotal.toFixed(2)}</p>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-4 mb-6">
              <label className="block text-lg font-medium text-white mb-3">Payment Method</label>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-4 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${
                    paymentMethod === "cash"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50"
                  }`}
                >
                  <div className="text-3xl mb-2">💵</div>
                  <span>Cash</span>
                </button>

                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`p-4 rounded-xl font-bold border-2 transition-all flex flex-col items-center ${
                    paymentMethod === "card"
                      ? "bg-blue-500/20 border-blue-500 text-blue-400"
                      : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50"
                  }`}
                >
                  <div className="text-3xl mb-2">💳</div>
                  <span>Card</span>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailReceipt}
                  onChange={(e) => setEmailReceipt(e.target.checked)}
                  disabled={!customerId || !customers.find(c => c.id.toString() === customerId)?.email}
                  className="w-5 h-5 accent-cyan-500"
                />
                <span className="text-white flex-1">Email Receipt</span>
                {(!customerId || !customers.find(c => c.id.toString() === customerId)?.email) && (
                  <span className="text-xs text-slate-500">No email</span>
                )}
              </label>

              <label className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={printReceiptOption}
                  onChange={(e) => setPrintReceiptOption(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500"
                />
                <span className="text-white">Print Receipt</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold transition-all text-white"
              >
                Cancel
              </button>
              <button
                onClick={processPayment}
                disabled={processingPayment || cart.length === 0}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-700 py-4 rounded-xl text-lg font-bold transition-all shadow-xl disabled:opacity-50 text-white flex items-center justify-center gap-2"
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
      )}

      {/* Recent Transactions Modal */}
      {showTransactionsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-4xl w-full border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-white">Recent Transactions</h2>
              <button onClick={() => setShowTransactionsModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-3">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-20 h-20 mx-auto mb-4 text-slate-700" />
                  <p className="text-xl text-slate-500 font-semibold">No recent transactions</p>
                </div>
              ) : (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="bg-slate-800/40 backdrop-blur-lg rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-white text-lg">Transaction #{transaction.id}</p>
                        <p className="text-sm text-slate-400">
                          {new Date(transaction.created_at).toLocaleString('en-GB')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-400">£{transaction.total?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-slate-400 capitalize">{transaction.payment_method || 'cash'}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-300">
                          {transaction.products?.length || 0} items
                        </span>
                        {transaction.customer_id && (
                          <span className="text-xs bg-slate-700/50 px-2 py-1 rounded-full text-slate-300">
                            Customer: {customers.find(c => c.id === transaction.customer_id)?.name || 'N/A'}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => printPaidReceiptFromTransaction(transaction)}
                        className="bg-slate-700/50 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Re-print
                      </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }
