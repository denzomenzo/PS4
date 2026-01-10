// /app/dashboard/customers/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Mail, 
  Phone, 
  User, 
  Loader2, 
  Users, 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  ShoppingBag,
  CreditCard,
  Receipt,
  Printer,
  Clock,
  RefreshCw,
  FileText,
  DollarSign,
  ChevronDown,
  History,
  Tag,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

// Define all interfaces inline
interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  balance: number;
  created_at: string;
}

interface Transaction {
  id: number;
  customer_id: number;
  subtotal: number;
  vat: number;
  total: number;
  discount_amount: number;
  final_amount: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
  created_at: string;
  products?: TransactionProduct[];
  payment_details?: any;
  balance_deducted?: number;
  transaction_items?: TransactionItem[];
}

interface TransactionProduct {
  id: number;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  total: number;
}

interface TransactionItem {
  id: number;
  transaction_id: number;
  service_id?: number;
  product_id?: number;
  name: string;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
  services?: {
    name: string;
    price: number;
  };
}

interface BalanceTransaction {
  id: number;
  customer_id: number;
  amount: number;
  previous_balance: number;
  new_balance: number;
  note: string | null;
  created_at: string;
}

export default function Customers() {
  const userId = useUserId();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [balanceCustomer, setBalanceCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Customer details states
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [customerBalanceHistory, setCustomerBalanceHistory] = useState<BalanceTransaction[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsActiveTab, setDetailsActiveTab] = useState<'transactions' | 'balance'>('transactions');

  // Store customer stats locally for each customer
  const [customerTotalSpent, setCustomerTotalSpent] = useState<Record<number, number>>({});
  const [customerTransactionCounts, setCustomerTransactionCounts] = useState<Record<number, number>>({});

  // Helper function to ensure balance is always a number
  const getBalance = useCallback((balance: any): number => {
    if (balance === null || balance === undefined) return 0;
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    return isNaN(num) ? 0 : num;
  }, []);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formBalance, setFormBalance] = useState("0");

  // Balance adjustment
  const [balanceAction, setBalanceAction] = useState<"add" | "subtract">("add");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNote, setBalanceNote] = useState("");

  // Quick stats
  const [customerStats, setCustomerStats] = useState<{
    totalBalance: number;
    customersWithBalance: number;
    customersWithNegativeBalance: number;
    totalTransactions: number;
  }>({
    totalBalance: 0,
    customersWithBalance: 0,
    customersWithNegativeBalance: 0,
    totalTransactions: 0
  });

  useEffect(() => {
    if (userId) {
      loadCustomers();
    }
  }, [userId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredCustomers(
        customers.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            (c.phone && c.phone.toLowerCase().includes(query)) ||
            (c.email && c.email.toLowerCase().includes(query))
        )
      );
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No user found");
        setLoading(false);
        return;
      }

      // Load customers
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      
      if (customersError) {
        console.error("Error loading customers:", customersError);
        throw customersError;
      }

      if (customersData) {
        // Normalize balance to ensure it's always a number
        const normalizedData = customersData.map(customer => ({
          ...customer,
          balance: getBalance(customer.balance)
        }));
        setCustomers(normalizedData);
        setFilteredCustomers(normalizedData);

        // Pre-load transaction data for all customers
        await preloadCustomerTransactionData(normalizedData, user.id);

        // Calculate stats
        const totalBalance = normalizedData.reduce((sum, c) => sum + getBalance(c.balance), 0);
        const customersWithBalance = normalizedData.filter(c => getBalance(c.balance) > 0).length;
        const customersWithNegativeBalance = normalizedData.filter(c => getBalance(c.balance) < 0).length;

        // Get total transactions count from preloaded data
        const totalTransactions = Object.values(customerTransactionCounts).reduce((sum, count) => sum + count, 0);

        setCustomerStats({
          totalBalance,
          customersWithBalance,
          customersWithNegativeBalance,
          totalTransactions
        });
      }
    } catch (error) {
      console.error("Error loading customers:", error);
      alert("Error loading customers. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const preloadCustomerTransactionData = async (customers: Customer[], userId: string) => {
    try {
      // Load all transactions for these customers with items
      const { data: transactionsData, error } = await supabase
        .from("transactions")
        .select(`
          id,
          customer_id,
          total,
          subtotal,
          final_amount,
          discount_amount,
          vat,
          payment_method,
          payment_status,
          notes,
          created_at,
          transaction_items (
            id,
            transaction_id,
            quantity,
            price_at_time,
            services!inner (
              name,
              price
            )
          )
        `)
        .eq("user_id", userId)
        .in("customer_id", customers.map(c => c.id))
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error preloading transaction data:", error);
        return;
      }

      if (transactionsData) {
        // Calculate totals per customer
        const totals: Record<number, number> = {};
        const counts: Record<number, number> = {};

        transactionsData.forEach(transaction => {
          const customerId = transaction.customer_id;
          const amount = transaction.total || transaction.final_amount || transaction.subtotal || 0;
          
          if (!totals[customerId]) {
            totals[customerId] = 0;
            counts[customerId] = 0;
          }
          totals[customerId] += amount;
          counts[customerId] = (counts[customerId] || 0) + 1;
        });

        setCustomerTotalSpent(totals);
        setCustomerTransactionCounts(counts);

        // Store transaction data for quick access
        const transactionsByCustomer: Record<number, Transaction[]> = {};
        
        transactionsData.forEach(tx => {
          const customerId = tx.customer_id;
          
          if (!transactionsByCustomer[customerId]) {
            transactionsByCustomer[customerId] = [];
          }

          // Transform items to products
          const products: TransactionProduct[] = (tx.transaction_items || []).map((item: any) => {
            const price = item.price_at_time || item.services?.price || 0;
            const quantity = item.quantity || 0;
            const total = price * quantity;
            
            return {
              id: item.id,
              name: item.services?.name || 'Unknown Service',
              price: price,
              quantity: quantity,
              discount: 0,
              total: total
            };
          });

          const subtotal = products.reduce((sum, p) => sum + p.total, 0);
          const total = tx.total || tx.final_amount || subtotal;
          const vat = tx.vat || 0;

          transactionsByCustomer[customerId].push({
            id: tx.id,
            customer_id: tx.customer_id,
            subtotal: subtotal,
            vat: vat,
            total: total,
            discount_amount: tx.discount_amount || 0,
            final_amount: tx.final_amount || total,
            payment_method: tx.payment_method || 'cash',
            payment_status: tx.payment_status || 'completed',
            notes: tx.notes,
            created_at: tx.created_at,
            products: products,
            transaction_items: tx.transaction_items
          });
        });

        // Store in localStorage for quick access
        if (typeof window !== 'undefined') {
          localStorage.setItem('customerTransactions', JSON.stringify(transactionsByCustomer));
        }
      }
    } catch (error) {
      console.error("Error preloading transaction data:", error);
    }
  };

  const loadCustomerDetails = async (customerId: number) => {
    if (!customerId) return;
    
    setDetailsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("Loading details for customer:", customerId);

      // First check localStorage for cached data
      if (typeof window !== 'undefined') {
        const cachedData = localStorage.getItem('customerTransactions');
        if (cachedData) {
          const transactionsByCustomer = JSON.parse(cachedData);
          if (transactionsByCustomer[customerId]) {
            console.log("Using cached transaction data");
            setCustomerTransactions(transactionsByCustomer[customerId]);
          }
        }
      }

      // Always load fresh data but show cached first
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select(`
          *,
          transaction_items (
            id,
            transaction_id,
            quantity,
            price_at_time,
            services!inner (
              name,
              price
            )
          )
        `)
        .eq("customer_id", customerId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (transactionsError) {
        console.error("Error loading transactions:", transactionsError);
        // Don't set empty array if we have cached data
      } else if (transactionsData) {
        // Transform the data
        const transformedTransactions: Transaction[] = transactionsData.map(tx => {
          // Transform items to products
          const products: TransactionProduct[] = (tx.transaction_items || []).map((item: any) => {
            const price = item.price_at_time || item.services?.price || 0;
            const quantity = item.quantity || 0;
            const total = price * quantity;
            
            return {
              id: item.id,
              name: item.services?.name || 'Unknown Service',
              price: price,
              quantity: quantity,
              discount: 0,
              total: total
            };
          });

          const subtotal = products.reduce((sum, p) => sum + p.total, 0);
          const total = tx.total || tx.final_amount || subtotal;
          const vat = tx.vat || 0;

          return {
            id: tx.id,
            customer_id: tx.customer_id,
            subtotal: subtotal,
            vat: vat,
            total: total,
            discount_amount: tx.discount_amount || 0,
            final_amount: tx.final_amount || total,
            payment_method: tx.payment_method || 'cash',
            payment_status: tx.payment_status || 'completed',
            notes: tx.notes,
            created_at: tx.created_at,
            products: products,
            payment_details: tx.payment_details,
            balance_deducted: tx.balance_deducted,
            transaction_items: tx.transaction_items
          };
        });

        console.log("Loaded fresh transaction data:", transformedTransactions);
        setCustomerTransactions(transformedTransactions);
      }

      // Load balance history
      const { data: balanceData, error: balanceError } = await supabase
        .from("customer_balance_history")
        .select("*")
        .eq("customer_id", customerId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (balanceError) {
        console.error("Balance history error:", balanceError);
        setCustomerBalanceHistory([]);
      } else {
        console.log("Loaded balance history:", balanceData?.length || 0);
        setCustomerBalanceHistory(balanceData || []);
      }

    } catch (error) {
      console.error("Error loading customer details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormNotes("");
    setFormBalance("0");
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone || "");
    setFormEmail(customer.email || "");
    setFormNotes(customer.notes || "");
    setFormBalance(getBalance(customer.balance).toString());
    setShowModal(true);
  };

  const openBalanceModal = (customer: Customer) => {
    setBalanceCustomer(customer);
    setBalanceAction("add");
    setBalanceAmount("");
    setBalanceNote("");
    setShowBalanceModal(true);
  };

  const openDetailsModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    
    // Show immediately with cached data
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem('customerTransactions');
      if (cachedData) {
        const transactionsByCustomer = JSON.parse(cachedData);
        if (transactionsByCustomer[customer.id]) {
          setCustomerTransactions(transactionsByCustomer[customer.id]);
        }
      }
    }
    
    // Then load fresh data in background
    setTimeout(() => {
      loadCustomerDetails(customer.id);
    }, 100);
  };

  const saveCustomer = async () => {
    if (!formName.trim()) {
      alert("Name is required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Not authenticated");
        return;
      }

      const balanceValue = parseFloat(formBalance) || 0;

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update({
            name: formName,
            phone: formPhone || null,
            email: formEmail || null,
            notes: formNotes || null,
            balance: balanceValue
          })
          .eq("id", editingCustomer.id);

        if (error) throw error;

        // Log balance change if it changed
        if (balanceValue !== editingCustomer.balance) {
          await supabase.from("customer_balance_history").insert({
            user_id: user.id,
            customer_id: editingCustomer.id,
            amount: balanceValue - editingCustomer.balance,
            previous_balance: editingCustomer.balance,
            new_balance: balanceValue,
            note: "Manual balance adjustment"
          });
        }

        // Update local state
        setCustomers(prev => prev.map(c => 
          c.id === editingCustomer.id ? { 
            ...c, 
            name: formName,
            phone: formPhone || null,
            email: formEmail || null,
            notes: formNotes || null,
            balance: balanceValue
          } : c
        ));
      } else {
        const { error } = await supabase.from("customers").insert({
          user_id: user.id,
          name: formName,
          phone: formPhone || null,
          email: formEmail || null,
          notes: formNotes || null,
          balance: balanceValue
        });

        if (error) throw error;
      }

      setShowModal(false);
      await loadCustomers();
      alert(`✅ Customer ${editingCustomer ? 'updated' : 'added'} successfully!`);
    } catch (error: any) {
      console.error("Error saving customer:", error);
      alert(`Error saving customer: ${error.message}`);
    }
  };

  const adjustBalance = async () => {
    if (!balanceCustomer || !balanceAmount) {
      alert("Please enter an amount");
      return;
    }

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    // Ensure balance is a number, handling null/undefined
    const currentBalance = getBalance(balanceCustomer.balance);
    const adjustmentAmount = balanceAction === "add" ? amount : -amount;
    const newBalance = currentBalance + adjustmentAmount;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("customers")
        .update({ 
          balance: newBalance
        })
        .eq("id", balanceCustomer.id);

      if (updateError) throw updateError;

      // Log balance transaction
      await supabase.from("customer_balance_history").insert({
        user_id: user.id,
        customer_id: balanceCustomer.id,
        amount: adjustmentAmount,
        previous_balance: currentBalance,
        new_balance: newBalance,
        note: balanceNote || (balanceAction === "add" ? "Balance added" : "Balance deducted")
      });

      // Update the balanceCustomer state with the new balance
      const updatedCustomer = {
        ...balanceCustomer,
        balance: newBalance
      };
      setBalanceCustomer(updatedCustomer);

      // Update customers list
      setCustomers(prev => prev.map(c => 
        c.id === balanceCustomer.id ? updatedCustomer : c
      ));

      // Update filtered customers
      setFilteredCustomers(prev => prev.map(c => 
        c.id === balanceCustomer.id ? updatedCustomer : c
      ));

      // Update customer stats
      const updatedStats = { ...customerStats };
      updatedStats.totalBalance += adjustmentAmount;
      
      if (currentBalance <= 0 && newBalance > 0) {
        updatedStats.customersWithBalance += 1;
      } else if (currentBalance > 0 && newBalance <= 0) {
        updatedStats.customersWithBalance -= 1;
      }
      
      if (currentBalance >= 0 && newBalance < 0) {
        updatedStats.customersWithNegativeBalance += 1;
      } else if (currentBalance < 0 && newBalance >= 0) {
        updatedStats.customersWithNegativeBalance -= 1;
      }
      
      setCustomerStats(updatedStats);

      // Reset the form
      setBalanceAmount("");
      setBalanceNote("");

      alert(`✅ Balance ${balanceAction === "add" ? "added" : "deducted"} successfully!`);
      
      // Close modal after successful update
      setTimeout(() => setShowBalanceModal(false), 1000);
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error adjusting balance: ${error.message}`);
    }
  };

  const deleteCustomer = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);

      if (error) {
        throw error;
      }

      // Remove from local state
      setCustomers(prev => prev.filter(c => c.id !== id));
      setFilteredCustomers(prev => prev.filter(c => c.id !== id));
      
      alert("✅ Customer deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      alert(`Error deleting customer: ${error.message}`);
    }
  };

  // Print receipt for a transaction - Non-blocking version
  const printTransactionReceipt = async (transaction: Transaction) => {
    if (!selectedCustomer) return;
    
    try {
      // Show loading state
      const receiptButton = document.querySelector(`button[data-transaction-id="${transaction.id}"]`);
      if (receiptButton) {
        receiptButton.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>';
        receiptButton.setAttribute('disabled', 'true');
      }

      // Load receipt settings asynchronously
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: receiptSettings } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const fontSize = Math.min(Math.max(receiptSettings?.receipt_font_size || 12, 8), 16);
      const businessName = receiptSettings?.business_name || "Your Business";
      const businessAddress = receiptSettings?.business_address || "";
      const businessPhone = receiptSettings?.business_phone || "";
      const businessEmail = receiptSettings?.business_email || "";
      const taxNumber = receiptSettings?.tax_number || "";
      const receiptFooter = receiptSettings?.receipt_footer || "Thank you for your business!";
      const logoUrl = receiptSettings?.receipt_logo_url || "";
      const showBarcodeOnReceipt = receiptSettings?.show_barcode_on_receipt !== false;
      const barcodeType = receiptSettings?.barcode_type || "CODE128";

      // Use setTimeout to prevent UI freeze
      setTimeout(() => {
        const receiptWindow = window.open('', '_blank');
        if (!receiptWindow) {
          alert("Please allow pop-ups to print receipts");
          return;
        }

        // Calculate totals
        const subtotal = transaction.products?.reduce((sum, p) => sum + p.total, 0) || 0;
        const total = transaction.total || subtotal;
        const vat = transaction.vat || 0;

        const receiptHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Receipt #${transaction.id}</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
              @media print {
                @page { margin: 0; }
                body { margin: 10mm; }
              }
              body { 
                font-family: 'Courier New', monospace; 
                padding: 20px; 
                max-width: 80mm; 
                margin: 0 auto; 
                font-size: ${fontSize}px;
                line-height: 1.2;
              }
              .logo { text-align: center; margin-bottom: 10px; }
              .logo img { max-width: 100px; max-height: 60px; }
              h1 { 
                text-align: center; 
                font-size: ${fontSize + 4}px; 
                margin: 5px 0; 
                font-weight: bold; 
                text-transform: uppercase;
              }
              .business-info { 
                text-align: center; 
                font-size: ${fontSize - 2}px; 
                margin-bottom: 10px; 
                line-height: 1.3;
              }
              .line { 
                border-bottom: 1px dashed #000; 
                margin: 8px 0; 
              }
              .receipt-header {
                font-size: ${fontSize - 2}px;
                margin-bottom: 8px;
              }
              .item { 
                display: flex; 
                justify-content: space-between; 
                margin: 4px 0;
                font-size: ${fontSize}px;
              }
              .item-name {
                flex: 1;
                padding-right: 10px;
              }
              .item-price {
                white-space: nowrap;
                font-weight: bold;
              }
              .totals { 
                margin-top: 10px; 
                font-weight: bold; 
              }
              .total-line { 
                display: flex; 
                justify-content: space-between; 
                margin: 4px 0;
                font-size: ${fontSize}px;
              }
              .grand-total {
                font-size: ${fontSize + 2}px;
                border-top: 2px solid #000;
                padding-top: 6px;
                margin-top: 6px;
              }
              .payment-info {
                margin: 10px 0;
                padding: 8px;
                background: #f5f5f5;
                border: 1px solid #ddd;
                text-align: center;
                font-weight: bold;
                font-size: ${fontSize}px;
              }
              .footer { 
                text-align: center; 
                margin-top: 15px; 
                font-size: ${fontSize - 2}px;
                font-style: italic;
              }
              .barcode-container {
                text-align: center;
                margin: 15px 0;
              }
              .balance-info {
                text-align: center;
                font-size: ${fontSize - 2}px;
                margin: 8px 0;
                padding: 5px;
                border: 1px dashed #ccc;
              }
              .notes {
                margin: 8px 0;
                padding: 5px;
                font-style: italic;
                font-size: ${fontSize - 2}px;
                color: #666;
              }
              canvas {
                max-width: 100%;
                height: auto;
              }
            </style>
          </head>
          <body>
            ${logoUrl ? `<div class="logo"><img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" /></div>` : ''}
            
            <h1>${businessName}</h1>
            
            <div class="business-info">
              ${businessAddress ? `<div>${businessAddress}</div>` : ''}
              ${businessPhone ? `<div>Tel: ${businessPhone}</div>` : ''}
              ${businessEmail ? `<div>${businessEmail}</div>` : ''}
              ${taxNumber ? `<div>Tax No: ${taxNumber}</div>` : ''}
            </div>
            
            <div class="line"></div>
            
            <div class="receipt-header">
              <div><strong>Receipt #${transaction.id}</strong></div>
              <div>${new Date(transaction.created_at).toLocaleString('en-GB', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}</div>
              <div>Customer: ${selectedCustomer.name}</div>
              ${transaction.notes ? `<div class="notes">Note: ${transaction.notes}</div>` : ''}
            </div>
            
            <div class="line"></div>
            
            ${transaction.products?.map((item: TransactionProduct) => `
              <div class="item">
                <div class="item-name">
                  <div>${item.name}</div>
                  <div style="font-size: ${fontSize - 3}px; color: #666;">
                    ${item.quantity} x £${item.price.toFixed(2)}
                    ${item.discount > 0 ? ` (-£${item.discount.toFixed(2)})` : ''}
                  </div>
                </div>
                <div class="item-price">£${item.total.toFixed(2)}</div>
              </div>
            `).join('') || '<div>No items in this transaction</div>'}
            
            <div class="line"></div>
            
            <div class="totals">
              <div class="total-line">
                <span>Subtotal:</span>
                <span>£${subtotal.toFixed(2)}</span>
              </div>
              ${vat > 0 ? `
                <div class="total-line">
                  <span>VAT (20%):</span>
                  <span>£${vat.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-line grand-total">
                <span>TOTAL:</span>
                <span>£${total.toFixed(2)}</span>
              </div>
            </div>

            <div class="payment-info">
              PAID VIA ${(transaction.payment_method || 'CASH').toUpperCase()}
              ${transaction.payment_details?.split_payment ? `
                <div style="font-size: ${fontSize - 2}px; margin-top: 5px;">
                  Split: 
                  ${transaction.payment_details.split_payment.cash ? `Cash: £${transaction.payment_details.split_payment.cash.toFixed(2)} ` : ''}
                  ${transaction.payment_details.split_payment.card ? `Card: £${transaction.payment_details.split_payment.card.toFixed(2)} ` : ''}
                  ${transaction.payment_details.split_payment.balance ? `Balance: £${transaction.payment_details.split_payment.balance.toFixed(2)}` : ''}
                </div>
              ` : ''}
            </div>
            
            ${transaction.balance_deducted && transaction.balance_deducted > 0 && selectedCustomer ? `
              <div class="balance-info">
                <div>Balance Used: £${transaction.balance_deducted.toFixed(2)}</div>
                <div>Remaining Balance: £${(selectedCustomer.balance).toFixed(2)}</div>
              </div>
            ` : ''}
            
            ${showBarcodeOnReceipt ? `
              <div class="barcode-container">
                <canvas id="barcodeCanvas"></canvas>
              </div>
            ` : ''}
            
            <div class="footer">
              <div style="font-weight: bold; margin: 10px 0;">THANK YOU!</div>
              ${receiptFooter}
            </div>
            
            <script>
              window.onload = function() {
                ${showBarcodeOnReceipt ? `
                  try {
                    JsBarcode("#barcodeCanvas", "TXN${transaction.id}", {
                      format: "${barcodeType}",
                      width: 2,
                      height: 50,
                      displayValue: true,
                      fontSize: 12,
                      textMargin: 5
                    });
                  } catch (e) {
                    console.error("Barcode error:", e);
                    document.querySelector('.barcode-container').innerHTML = '<div>Transaction #${transaction.id}</div>';
                  }
                ` : ''}
                
                // Small delay to ensure barcode is rendered
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 500);
                }, 100);
              };
            </script>
          </body>
          </html>
        `;

        receiptWindow.document.write(receiptHTML);
        receiptWindow.document.close();
        
        // Reset button state
        if (receiptButton) {
          receiptButton.innerHTML = '<Printer className="w-3 h-3" /> Print';
          receiptButton.removeAttribute('disabled');
        }
      }, 100);
    } catch (error) {
      console.error("Error printing receipt:", error);
      alert("Error printing receipt");
      
      // Reset button state on error
      const receiptButton = document.querySelector(`button[data-transaction-id="${transaction.id}"]`);
      if (receiptButton) {
        receiptButton.innerHTML = '<Printer className="w-3 h-3" /> Print';
        receiptButton.removeAttribute('disabled');
      }
    }
  };

  // Calculate statistics for a specific customer
  const getCustomerStats = (customerId: number) => {
    const totalSpent = customerTotalSpent[customerId] || 0;
    const transactionCount = customerTransactionCounts[customerId] || 0;
    const avgTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0;
    
    // Get last purchase from cached data
    let lastPurchase = null;
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem('customerTransactions');
      if (cachedData) {
        const transactionsByCustomer = JSON.parse(cachedData);
        if (transactionsByCustomer[customerId] && transactionsByCustomer[customerId].length > 0) {
          lastPurchase = transactionsByCustomer[customerId][0].created_at;
        }
      }
    }
    
    return {
      totalSpent,
      avgTransaction,
      transactionCount,
      lastPurchase
    };
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-emerald-400";
    if (balance < 0) return "text-red-400";
    return "text-slate-400";
  };

  const getBalanceBgColor = (balance: number) => {
    if (balance > 0) return "bg-emerald-500/20 border-emerald-500/30";
    if (balance < 0) return "bg-red-500/20 border-red-500/30";
    return "bg-slate-500/20 border-slate-500/30";
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'failed': return 'bg-red-500/20 text-red-400';
      case 'refunded': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format currency consistently
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="w-full md:w-auto">
            <h1 className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
              Customers
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mt-2 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {customers.length} total customers • {customerStats.totalTransactions} transactions
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={loadCustomers}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <Link href="/dashboard" className="flex-1 md:flex-none flex items-center justify-center gap-2 text-lg text-slate-400 hover:text-white transition-colors px-4 py-3 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
              Back to POS
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-cyan-400" />
              <p className="text-slate-300 font-bold">Total Customers</p>
            </div>
            <p className="text-5xl font-black text-cyan-400">{customers.length}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-8 h-8 text-emerald-400" />
              <p className="text-slate-300 font-bold">Total Balance</p>
            </div>
            <p className="text-5xl font-black text-emerald-400">{formatCurrency(customerStats.totalBalance)}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <p className="text-slate-300 font-bold">With Credit</p>
            </div>
            <p className="text-5xl font-black text-purple-400">{customerStats.customersWithBalance}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-8 h-8 text-orange-400" />
              <p className="text-slate-300 font-bold">With Debt</p>
            </div>
            <p className="text-5xl font-black text-orange-400">{customerStats.customersWithNegativeBalance}</p>
          </div>
        </div>

        {/* Search & Add */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 pl-16 pr-4 py-5 rounded-2xl text-xl placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-xl"
            />
          </div>
          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 px-8 py-5 rounded-2xl font-bold text-xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/40"
          >
            <Plus className="w-6 h-6" />
            Add Customer
          </button>
        </div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-12 max-w-md mx-auto">
                <Users className="w-24 h-24 mx-auto mb-6 text-slate-600 opacity-30" />
                <p className="text-2xl text-slate-400 mb-2">
                  {searchQuery ? "No customers found" : "No customers yet"}
                </p>
                {!searchQuery && (
                  <>
                    <p className="text-slate-500 mb-6">Start building your customer base</p>
                    <button
                      onClick={openAddModal}
                      className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl"
                    >
                      Add Your First Customer
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            filteredCustomers.map((customer) => {
              const stats = getCustomerStats(customer.id);
              
              return (
                <div
                  key={customer.id}
                  className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 hover:border-cyan-500/50 transition-all group shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10"
                >
                  {/* Customer Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      onClick={() => openDetailsModal(customer)}
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shadow-cyan-500/20 hover:scale-105 transition-transform">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold truncate hover:text-cyan-300 transition-colors">
                          {customer.name}
                        </h3>
                        <p className="text-sm text-slate-400 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Joined {new Date(customer.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => openDetailsModal(customer)}
                        className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all"
                        title="View Details"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(customer)}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCustomer(customer.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm truncate">{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.notes && (
                      <div className="mt-2 p-3 bg-slate-700/30 rounded-xl border border-slate-600/30">
                        <p className="text-sm text-slate-300 line-clamp-2">{customer.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Balance Section */}
                  <div className={`mt-4 pt-4 border-t ${getBalanceBgColor(getBalance(customer.balance))} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" />
                        <span className="text-sm text-slate-400 font-medium">Current Balance</span>
                      </div>
                      <span className={`text-2xl font-black ${getBalanceColor(getBalance(customer.balance))}`}>
                        {formatCurrency(getBalance(customer.balance))}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openBalanceModal(customer)}
                        className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 border border-emerald-500/30 text-emerald-400 py-2 rounded-lg font-bold text-sm transition-all"
                      >
                        Adjust Balance
                      </button>
                      <button
                        onClick={() => openDetailsModal(customer)}
                        className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 text-cyan-400 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        <ChevronDown className="w-4 h-4" />
                        Details
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-2 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 mb-1">Transactions</div>
                        <div className="font-bold">{stats.transactionCount}</div>
                      </div>
                      <div className="text-center p-2 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 mb-1">Total Spent</div>
                        <div className="font-bold text-emerald-400">{formatCurrency(stats.totalSpent)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-lg mb-2 font-medium">Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Phone number"
                    type="tel"
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium">Initial Balance</label>
                <div className="relative">
                  <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    value={formBalance}
                    onChange={(e) => setFormBalance(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 pl-12 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <p className="text-sm text-slate-400 mt-2">
                  Positive = customer credit, Negative = customer owes
                </p>
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-4 rounded-xl text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomer}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 py-4 rounded-xl text-lg font-bold transition-all shadow-xl shadow-cyan-500/20"
              >
                {editingCustomer ? "Save Changes" : "Add Customer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Adjustment Modal */}
      {showBalanceModal && balanceCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Manage Balance</h2>
              <button onClick={() => setShowBalanceModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className={`bg-slate-800/50 rounded-xl p-5 mb-6 border ${getBalanceBgColor(getBalance(balanceCustomer.balance))}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white text-lg">{balanceCustomer.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Balance:</span>
                <span className={`text-3xl font-black ${getBalanceColor(getBalance(balanceCustomer.balance))}`}>
                  {formatCurrency(getBalance(balanceCustomer.balance))}
                </span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-lg mb-3 font-medium">Action</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBalanceAction("add")}
                    className={`py-3 rounded-xl font-bold border-2 transition-all ${
                      balanceAction === "add"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                    }`}
                  >
                    <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                    Add Balance
                  </button>
                  <button
                    onClick={() => setBalanceAction("subtract")}
                    className={`py-3 rounded-xl font-bold border-2 transition-all ${
                      balanceAction === "subtract"
                        ? "bg-red-500/20 border-red-500 text-red-400"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                    }`}
                  >
                    <TrendingDown className="w-5 h-5 mx-auto mb-1" />
                    Deduct Balance
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-lg mb-2 font-medium">Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-2xl text-center font-bold focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  autoFocus
                />
              </div>

              {balanceAmount && parseFloat(balanceAmount) > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Current Balance:</span>
                    <span className="font-bold">{formatCurrency(getBalance(balanceCustomer.balance))}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">
                      {balanceAction === "add" ? "Adding:" : "Deducting:"}
                    </span>
                    <span className={balanceAction === "add" ? "text-emerald-400" : "text-red-400"}>
                      {balanceAction === "add" ? "+" : "-"}{formatCurrency(parseFloat(balanceAmount))}
                    </span>
                  </div>
                  <div className="border-t border-slate-700/50 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-bold">New Balance:</span>
                      <span className={`text-xl font-black ${getBalanceColor(
                        getBalance(balanceCustomer.balance) + 
                        (balanceAction === "add" ? 1 : -1) * parseFloat(balanceAmount)
                      )}`}>
                        {formatCurrency(
                          getBalance(balanceCustomer.balance) + 
                          (balanceAction === "add" ? 1 : -1) * parseFloat(balanceAmount)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-lg mb-2 font-medium">Note (Optional)</label>
                <input
                  value={balanceNote}
                  onChange={(e) => setBalanceNote(e.target.value)}
                  placeholder="e.g., Prepayment, Refund, Purchase, etc."
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-base focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowBalanceModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={adjustBalance}
                disabled={!balanceAmount || parseFloat(balanceAmount) <= 0}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-700 py-4 rounded-xl text-lg font-bold transition-all shadow-xl disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-4xl w-full border border-slate-700/50 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Customer Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Customer Info */}
            <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shadow-cyan-500/20">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap gap-4 text-slate-400">
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {selectedCustomer.phone}
                      </div>
                    )}
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {selectedCustomer.email}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Joined {new Date(selectedCustomer.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={`text-3xl font-black ${getBalanceColor(getBalance(selectedCustomer.balance))}`}>
                  {formatCurrency(getBalance(selectedCustomer.balance))}
                </div>
              </div>
              
              {selectedCustomer.notes && (
                <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-600/30">
                  <p className="text-slate-300">{selectedCustomer.notes}</p>
                </div>
              )}
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Receipt className="w-5 h-5 text-cyan-400" />
                    <span className="text-slate-400">Transactions</span>
                  </div>
                  <p className="text-2xl font-bold">{getCustomerStats(selectedCustomer.id).transactionCount}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-400">Total Spent</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{formatCurrency(getCustomerStats(selectedCustomer.id).totalSpent)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    <span className="text-slate-400">Avg. Transaction</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(getCustomerStats(selectedCustomer.id).avgTransaction)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-orange-400" />
                    <span className="text-slate-400">Last Purchase</span>
                  </div>
                  <p className="text-lg">
                    {getCustomerStats(selectedCustomer.id).lastPurchase 
                      ? formatDate(getCustomerStats(selectedCustomer.id).lastPurchase!)
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="flex gap-2 border-b border-slate-700/50">
                <button
                  onClick={() => setDetailsActiveTab('transactions')}
                  className={`px-6 py-3 font-bold transition-all ${
                    detailsActiveTab === 'transactions' 
                      ? 'text-cyan-400 border-b-2 border-cyan-400' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Transactions ({getCustomerStats(selectedCustomer.id).transactionCount})
                  </div>
                </button>
                <button
                  onClick={() => setDetailsActiveTab('balance')}
                  className={`px-6 py-3 font-bold transition-all ${
                    detailsActiveTab === 'balance' 
                      ? 'text-emerald-400 border-b-2 border-emerald-400' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Balance History ({customerBalanceHistory.filter(b => b.customer_id === selectedCustomer.id).length})
                  </div>
                </button>
              </div>
            </div>

            {/* Content */}
            {detailsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
                <p className="text-slate-400">Loading details...</p>
              </div>
            ) : detailsActiveTab === 'transactions' ? (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {customerTransactions.filter(t => t.customer_id === selectedCustomer.id).length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                    <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-400">No transactions yet</p>
                  </div>
                ) : (
                  customerTransactions
                    .filter(t => t.customer_id === selectedCustomer.id)
                    .map((transaction) => (
                      <div key={transaction.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold">Transaction #{transaction.id}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${getPaymentStatusColor(transaction.payment_status)}`}>
                                {transaction.payment_status}
                              </span>
                            </div>
                            <div className="text-sm text-slate-400">
                              {new Date(transaction.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              data-transaction-id={transaction.id}
                              onClick={() => printTransactionReceipt(transaction)}
                              className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm flex items-center gap-2"
                            >
                              <Printer className="w-3 h-3" />
                              Print Receipt
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="text-sm text-slate-400">Payment Method</div>
                            <div className="font-bold capitalize">{transaction.payment_method || 'cash'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">Total Amount</div>
                            <div className="text-lg font-bold text-emerald-400">{formatCurrency(transaction.total)}</div>
                          </div>
                        </div>
                        
                        {transaction.products && transaction.products.length > 0 && (
                          <div className="border-t border-slate-700/50 pt-3">
                            <div className="text-sm text-slate-400 mb-2">Items:</div>
                            <div className="space-y-2">
                              {transaction.products.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span>{item.name} x{item.quantity}</span>
                                  <span>{formatCurrency(item.total)}</span>
                                </div>
                              ))}
                              {transaction.products.length > 3 && (
                                <div className="text-slate-400 text-sm">+{transaction.products.length - 3} more items</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {customerBalanceHistory.filter(b => b.customer_id === selectedCustomer.id).length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                    <Wallet className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-400">No balance history</p>
                  </div>
                ) : (
                  customerBalanceHistory
                    .filter(b => b.customer_id === selectedCustomer.id)
                    .map((history) => (
                      <div key={history.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${history.amount > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                              {history.amount > 0 ? (
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold">
                                {history.amount > 0 ? 'Balance Added' : 'Balance Deducted'}
                              </div>
                              <div className="text-sm text-slate-400">
                                {new Date(history.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className={`text-xl font-bold ${history.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {history.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(history.amount))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <div className="text-sm text-slate-400">Previous Balance</div>
                            <div>{formatCurrency(history.previous_balance)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-slate-400">New Balance</div>
                            <div className="font-bold">{formatCurrency(history.new_balance)}</div>
                          </div>
                        </div>
                        
                        {history.note && (
                          <div className="border-t border-slate-700/50 pt-3">
                            <div className="text-sm text-slate-400 mb-1">Note:</div>
                            <div className="text-slate-300">{history.note}</div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  openEditModal(selectedCustomer);
                }}
                className="flex-1 bg-blue-500/20 text-blue-400 py-3 rounded-xl font-bold hover:bg-blue-500/30 transition-all"
              >
                Edit Customer
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  openBalanceModal(selectedCustomer);
                }}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 py-3 rounded-xl font-bold transition-all"
              >
                Adjust Balance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
