// /app/dashboard/customers/page.tsx - COMPLETE FIXED VERSION
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { logAuditAction } from "@/lib/auditLogger";
import ReceiptPrint, { ReceiptData } from "@/components/receipts/ReceiptPrint";
import { 
  ArrowLeft, Plus, Search, Edit2, Trash2, X, Mail, Phone, 
  User, Loader2, Users, Wallet, TrendingUp, TrendingDown,
  Calendar, Printer, RefreshCw, FileText, DollarSign, 
  ChevronDown, Receipt, CreditCard, Clock, Eye
} from "lucide-react";
import Link from "next/link";

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
  transaction_items?: TransactionItem[];
}

interface TransactionItem {
  id: number;
  transaction_id: number;
  quantity: number;
  price_at_time: number;
  service?: {
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

interface CustomerStats {
  totalSpent: number;
  transactionCount: number;
  avgTransaction: number;
  lastPurchase: string | null;
  lastPurchaseAmount: number;
}

export default function Customers() {
  const userId = useUserId();
  const { staff: currentStaff } = useStaffAuth();
  
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
  
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [customerBalanceHistory, setCustomerBalanceHistory] = useState<BalanceTransaction[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsActiveTab, setDetailsActiveTab] = useState<'transactions' | 'balance'>('transactions');

  const [customerStats, setCustomerStats] = useState<Record<number, CustomerStats>>({});
  const [globalStats, setGlobalStats] = useState({
    totalBalance: 0,
    customersWithBalance: 0,
    customersWithNegativeBalance: 0,
    totalTransactions: 0
  });

  const [receiptSettings, setReceiptSettings] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formBalance, setFormBalance] = useState("0");

  const [balanceAction, setBalanceAction] = useState<"add" | "subtract">("add");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNote, setBalanceNote] = useState("");

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (userId) {
      loadCustomers();
      loadReceiptSettings();
    }
    return () => { isMounted.current = false; };
  }, [userId]);

  useEffect(() => {
    if (!isMounted.current) return;
    const query = searchQuery.toLowerCase();
    setFilteredCustomers(
      customers.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
      )
    );
  }, [searchQuery, customers]);

  const loadReceiptSettings = async () => {
    if (!userId) return;
    
    const { data: settings } = await supabase
      .from("settings")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (settings) setReceiptSettings(settings);
  };

  const getBalance = useCallback((balance: any): number => {
    const num = parseFloat(balance) || 0;
    return isNaN(num) ? 0 : num;
  }, []);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const loadCustomers = async () => {
    if (!userId || !isMounted.current) return;
    
    setLoading(true);
    try {
      // Load customers
      const { data: customersData, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", userId)
        .order("name");

      if (error) throw error;
      if (!customersData) return;

      const normalizedCustomers = customersData.map(c => ({
        ...c,
        balance: getBalance(c.balance)
      }));

      setCustomers(normalizedCustomers);
      setFilteredCustomers(normalizedCustomers);

      // Load all transactions for stats - FIXED QUERY
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select(`
          id,
          customer_id,
          total,
          final_amount,
          created_at,
          transaction_items (
            id,
            quantity,
            price_at_time,
            services (
              name,
              price
            )
          )
        `)
        .eq("user_id", userId)
        .in("customer_id", normalizedCustomers.map(c => c.id))
        .order("created_at", { ascending: false });

      // Calculate stats
      const stats: Record<number, CustomerStats> = {};
      const global = {
        totalBalance: 0,
        customersWithBalance: 0,
        customersWithNegativeBalance: 0,
        totalTransactions: 0
      };

      normalizedCustomers.forEach(customer => {
        const customerTrans = transactionsData?.filter(t => t.customer_id === customer.id) || [];
        const totalSpent = customerTrans.reduce((sum, t) => {
          // Calculate from transaction items if available
          if (t.transaction_items && t.transaction_items.length > 0) {
            return sum + t.transaction_items.reduce((itemSum: number, item: any) => {
              const price = item.price_at_time || (item.services?.[0]?.price || 0);
              return itemSum + (price * (item.quantity || 1));
            }, 0);
          }
          return sum + (t.total || t.final_amount || 0);
        }, 0);
        
        const transactionCount = customerTrans.length;
        
        stats[customer.id] = {
          totalSpent,
          transactionCount,
          avgTransaction: transactionCount > 0 ? totalSpent / transactionCount : 0,
          lastPurchase: customerTrans[0]?.created_at || null,
          lastPurchaseAmount: customerTrans[0]?.total || 0
        };

        global.totalBalance += customer.balance;
        if (customer.balance > 0) global.customersWithBalance++;
        if (customer.balance < 0) global.customersWithNegativeBalance++;
        global.totalTransactions += transactionCount;
      });

      setCustomerStats(stats);
      setGlobalStats(global);

    } catch (error) {
      console.error("Error loading customers:", error);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const loadCustomerDetails = async (customerId: number) => {
    if (!customerId || !userId) return;
    
    setDetailsLoading(true);
    try {
      // Load transactions with proper joins - FIXED QUERY
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select(`
          *,
          transaction_items (
            id,
            quantity,
            price_at_time,
            services (
              name,
              price
            )
          )
        `)
        .eq("customer_id", customerId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (transactionsData) {
        const transformed: Transaction[] = transactionsData.map(tx => {
          // Calculate from transaction items
          const items = tx.transaction_items || [];
          const subtotal = items.reduce((sum: number, item: any) => {
            const price = item.price_at_time || (item.services?.[0]?.price || 0);
            return sum + (price * (item.quantity || 1));
          }, 0);
          
          const total = tx.total || subtotal;
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
            transaction_items: tx.transaction_items
          };
        });

        setCustomerTransactions(transformed);
      }

      // Load balance history
      const { data: balanceData } = await supabase
        .from("customer_balance_history")
        .select("*")
        .eq("customer_id", customerId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setCustomerBalanceHistory(balanceData || []);

    } catch (error) {
      console.error("Error loading customer details:", error);
    } finally {
      if (isMounted.current) setDetailsLoading(false);
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
    setFormBalance(customer.balance.toString());
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
    loadCustomerDetails(customer.id);
  };

  const saveCustomer = async () => {
    if (!formName.trim() || !userId) {
      alert("Name is required");
      return;
    }

    try {
      const balanceValue = parseFloat(formBalance) || 0;

      if (editingCustomer) {
        // Log customer update
        await logAuditAction({
          action: "CUSTOMER_UPDATED",
          entityType: "customer",
          entityId: editingCustomer.id.toString(),
          oldValues: {
            name: editingCustomer.name,
            phone: editingCustomer.phone,
            email: editingCustomer.email,
            notes: editingCustomer.notes,
            balance: editingCustomer.balance
          },
          newValues: {
            name: formName,
            phone: formPhone,
            email: formEmail,
            notes: formNotes,
            balance: balanceValue
          },
          staffId: currentStaff?.id
        });

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

        if (balanceValue !== editingCustomer.balance) {
          await supabase.from("customer_balance_history").insert({
            user_id: userId,
            customer_id: editingCustomer.id,
            amount: balanceValue - editingCustomer.balance,
            previous_balance: editingCustomer.balance,
            new_balance: balanceValue,
            note: "Manual balance adjustment"
          });
        }
      } else {
        const { data: newCustomer, error } = await supabase
          .from("customers")
          .insert({
            user_id: userId,
            name: formName,
            phone: formPhone || null,
            email: formEmail || null,
            notes: formNotes || null,
            balance: balanceValue
          })
          .select()
          .single();

        if (error) throw error;
        
        // Log customer creation
        if (newCustomer) {
          await logAuditAction({
            action: "CUSTOMER_CREATED",
            entityType: "customer",
            entityId: newCustomer.id.toString(),
            staffId: currentStaff?.id
          });
        }
      }

      setShowModal(false);
      await loadCustomers();
      alert(`✅ Customer ${editingCustomer ? 'updated' : 'added'} successfully!`);
    } catch (error: any) {
      console.error("Error saving customer:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const adjustBalance = async () => {
    if (!balanceCustomer || !balanceAmount || !userId) {
      alert("Please enter an amount");
      return;
    }

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const currentBalance = balanceCustomer.balance;
    const adjustment = balanceAction === "add" ? amount : -amount;
    const newBalance = currentBalance + adjustment;

    try {
      // Log balance adjustment
      await logAuditAction({
        action: "CUSTOMER_BALANCE_ADJUSTED",
        entityType: "customer",
        entityId: balanceCustomer.id.toString(),
        oldValues: { balance: currentBalance },
        newValues: { 
          balance: newBalance,
          adjustment: adjustment,
          action: balanceAction,
          note: balanceNote
        },
        staffId: currentStaff?.id
      });

      const { error } = await supabase
        .from("customers")
        .update({ balance: newBalance })
        .eq("id", balanceCustomer.id);

      if (error) throw error;

      await supabase.from("customer_balance_history").insert({
        user_id: userId,
        customer_id: balanceCustomer.id,
        amount: adjustment,
        previous_balance: currentBalance,
        new_balance: newBalance,
        note: balanceNote || `${balanceAction === "add" ? "Added" : "Deducted"} balance`
      });

      const updatedCustomer = { ...balanceCustomer, balance: newBalance };
      setCustomers(prev => prev.map(c => c.id === balanceCustomer.id ? updatedCustomer : c));
      setFilteredCustomers(prev => prev.map(c => c.id === balanceCustomer.id ? updatedCustomer : c));
      setBalanceCustomer(updatedCustomer);

      setBalanceAmount("");
      setBalanceNote("");

      setGlobalStats(prev => ({
        ...prev,
        totalBalance: prev.totalBalance + adjustment
      }));

      await loadCustomers();
      alert(`✅ Balance ${balanceAction === "add" ? "added" : "deducted"}!`);
      setTimeout(() => setShowBalanceModal(false), 1000);

    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const deleteCustomer = async (id: number) => {
    if (!confirm("Delete this customer? This cannot be undone.")) return;

    try {
      const customerToDelete = customers.find(c => c.id === id);
      
      // Log customer deletion
      if (customerToDelete) {
        await logAuditAction({
          action: "CUSTOMER_DELETED",
          entityType: "customer",
          entityId: id.toString(),
          oldValues: customerToDelete,
          staffId: currentStaff?.id
        });
      }

      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setCustomers(prev => prev.filter(c => c.id !== id));
      setFilteredCustomers(prev => prev.filter(c => c.id !== id));
      
      await loadCustomers();
      alert("✅ Customer deleted!");
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const printTransactionReceipt = async (transaction: Transaction) => {
    if (!selectedCustomer || !receiptSettings) return;
    
    try {
      // Log receipt printing
      await logAuditAction({
        action: "RECEIPT_PRINTED",
        entityType: "transaction",
        entityId: transaction.id.toString(),
        newValues: { customer_id: selectedCustomer.id },
        staffId: currentStaff?.id
      });

      // Prepare receipt data
      const receiptData: ReceiptData = {
        id: transaction.id,
        createdAt: transaction.created_at,
        subtotal: transaction.subtotal,
        vat: transaction.vat,
        total: transaction.total,
        discountAmount: transaction.discount_amount,
        finalAmount: transaction.final_amount,
        paymentMethod: transaction.payment_method,
        paymentStatus: transaction.payment_status,
        notes: transaction.notes,
        customer: {
          id: selectedCustomer.id,
          name: selectedCustomer.name,
          phone: selectedCustomer.phone || undefined,
          email: selectedCustomer.email || undefined,
          balance: selectedCustomer.balance
        },
        businessInfo: {
          name: receiptSettings.business_name || receiptSettings.shop_name || "Your Business",
          address: receiptSettings.business_address,
          phone: receiptSettings.business_phone,
          email: receiptSettings.business_email,
          taxNumber: receiptSettings.tax_number,
          logoUrl: receiptSettings.receipt_logo_url
        },
        receiptSettings: {
          fontSize: receiptSettings.receipt_font_size || 12,
          footer: receiptSettings.receipt_footer || "Thank you for your business!",
          showBarcode: receiptSettings.show_barcode_on_receipt !== false,
          barcodeType: receiptSettings.barcode_type || "CODE128",
          showTaxBreakdown: receiptSettings.show_tax_breakdown !== false
        },
        products: transaction.transaction_items?.map((item: any) => ({
          id: item.id,
          name: item.services?.[0]?.name || 'Item',
          price: item.price_at_time || item.services?.[0]?.price || 0,
          quantity: item.quantity || 1,
          discount: 0,
          total: (item.price_at_time || item.services?.[0]?.price || 0) * (item.quantity || 1)
        })) || []
      };

      // Open receipt in new window
      const receiptWindow = window.open('', '_blank');
      if (!receiptWindow) {
        alert("Please allow pop-ups to print receipts");
        return;
      }

      receiptWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt #${receiptData.id}</title>
        </head>
        <body>
          <div id="receipt-root"></div>
          <script>
            const receiptData = ${JSON.stringify(receiptData)};
            
            // Simple receipt HTML (can be replaced with React component later)
            const receiptHTML = \`
              <div style="font-family: 'Courier New', monospace; padding: 20px; max-width: 80mm; margin: 0 auto; font-size: \${receiptData.receiptSettings?.fontSize || 12}px;">
                <div style="text-align: center; margin-bottom: 10px;">
                  <h1 style="font-size: \${(receiptData.receiptSettings?.fontSize || 12) + 4}px; margin: 5px 0;">\${receiptData.businessInfo?.name}</h1>
                  <div style="font-size: \${(receiptData.receiptSettings?.fontSize || 12) - 2}px;">
                    \${receiptData.businessInfo?.address ? '<div>' + receiptData.businessInfo.address + '</div>' : ''}
                    \${receiptData.businessInfo?.phone ? '<div>Tel: ' + receiptData.businessInfo.phone + '</div>' : ''}
                  </div>
                </div>
                <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
                <div>
                  <div><strong>Receipt #\${receiptData.id}</strong></div>
                  <div>\${new Date(receiptData.createdAt).toLocaleString('en-GB')}</div>
                  <div>Customer: \${receiptData.customer?.name}</div>
                </div>
                <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
                \${receiptData.products?.map(item => \`
                  <div style="display: flex; justify-content: space-between; margin: 4px 0;">
                    <div style="flex: 1;">
                      <div>\${item.name}</div>
                      <div style="font-size: \${(receiptData.receiptSettings?.fontSize || 12) - 3}px; color: #666;">
                        \${item.quantity} x £\${item.price.toFixed(2)}
                      </div>
                    </div>
                    <div style="font-weight: bold;">£\${item.total.toFixed(2)}</div>
                  </div>
                \`).join('') || '<div>No items</div>'}
                <div style="border-bottom: 1px dashed #000; margin: 8px 0;"></div>
                <div style="margin-top: 10px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>Subtotal:</span>
                    <span>£\${receiptData.subtotal.toFixed(2)}</span>
                  </div>
                  \${receiptData.vat > 0 ? \`
                    <div style="display: flex; justify-content: space-between;">
                      <span>VAT (20%):</span>
                      <span>£\${receiptData.vat.toFixed(2)}</span>
                    </div>
                  \` : ''}
                  <div style="display: flex; justify-content: space-between; font-size: \${(receiptData.receiptSettings?.fontSize || 12) + 2}px; margin-top: 6px; padding-top: 6px; border-top: 2px solid #000;">
                    <span>TOTAL:</span>
                    <span>£\${receiptData.total.toFixed(2)}</span>
                  </div>
                </div>
                <div style="text-align: center; margin-top: 15px; font-style: italic;">
                  \${receiptData.receiptSettings?.footer}
                </div>
              </div>
            \`;
            
            document.getElementById('receipt-root').innerHTML = receiptHTML;
            window.print();
            setTimeout(() => window.close(), 1000);
          </script>
        </body>
        </html>
      `);

      receiptWindow.document.close();

    } catch (error) {
      console.error("Error printing receipt:", error);
      alert("Error printing receipt");
    }
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
              {customers.length} total customers • {globalStats.totalTransactions} transactions
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
            <p className="text-5xl font-black text-emerald-400">{formatCurrency(globalStats.totalBalance)}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <p className="text-slate-300 font-bold">With Credit</p>
            </div>
            <p className="text-5xl font-black text-purple-400">{globalStats.customersWithBalance}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="w-8 h-8 text-orange-400" />
              <p className="text-slate-300 font-bold">With Debt</p>
            </div>
            <p className="text-5xl font-black text-orange-400">{globalStats.customersWithNegativeBalance}</p>
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
              const stats = customerStats[customer.id] || {
                totalSpent: 0,
                transactionCount: 0,
                avgTransaction: 0,
                lastPurchase: null,
                lastPurchaseAmount: 0
              };
              
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
                        <Eye className="w-4 h-4" />
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
                  <div className={`mt-4 pt-4 border-t ${getBalanceBgColor(customer.balance)} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-5 h-5" />
                        <span className="text-sm text-slate-400 font-medium">Current Balance</span>
                      </div>
                      <span className={`text-2xl font-black ${getBalanceColor(customer.balance)}`}>
                        {formatCurrency(customer.balance)}
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

                  {/* Quick Stats - ALIGNED */}
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-2 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 mb-1 whitespace-nowrap">Transactions</div>
                        <div className="font-bold text-white">{stats.transactionCount}</div>
                      </div>
                      <div className="text-center p-2 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 mb-1 whitespace-nowrap">Total Spent</div>
                        <div className="font-bold text-emerald-400">{formatCurrency(stats.totalSpent)}</div>
                      </div>
                      <div className="text-center p-2 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 mb-1 whitespace-nowrap">Avg. Transaction</div>
                        <div className="font-bold text-cyan-400">{formatCurrency(stats.avgTransaction)}</div>
                      </div>
                      <div className="text-center p-2 bg-slate-800/30 rounded-lg">
                        <div className="text-slate-400 mb-1 whitespace-nowrap">Last Purchase</div>
                        <div className="font-bold text-orange-400">
                          {stats.lastPurchase ? formatDate(stats.lastPurchase) : "Never"}
                          {stats.lastPurchaseAmount > 0 && (
                            <div className="text-xs mt-1">£{stats.lastPurchaseAmount.toFixed(2)}</div>
                          )}
                        </div>
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

            <div className={`bg-slate-800/50 rounded-xl p-5 mb-6 border ${getBalanceBgColor(balanceCustomer.balance)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white text-lg">{balanceCustomer.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Balance:</span>
                <span className={`text-3xl font-black ${getBalanceColor(balanceCustomer.balance)}`}>
                  {formatCurrency(balanceCustomer.balance)}
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
                    <span className="font-bold">{formatCurrency(balanceCustomer.balance)}</span>
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
                        balanceCustomer.balance + 
                        (balanceAction === "add" ? parseFloat(balanceAmount) : -parseFloat(balanceAmount))
                      )}`}>
                        {formatCurrency(
                          balanceCustomer.balance + 
                          (balanceAction === "add" ? parseFloat(balanceAmount) : -parseFloat(balanceAmount))
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
                <div className={`text-3xl font-black ${getBalanceColor(selectedCustomer.balance)}`}>
                  {formatCurrency(selectedCustomer.balance)}
                </div>
              </div>
              
              {selectedCustomer.notes && (
                <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-600/30">
                  <p className="text-slate-300">{selectedCustomer.notes}</p>
                </div>
              )}
              
              {/* Stats - ALIGNED */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2 min-h-[40px]">
                    <Receipt className="w-5 h-5 text-cyan-400" />
                    <span className="text-slate-400">Transactions</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {(customerStats[selectedCustomer.id]?.transactionCount || 0)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2 min-h-[40px]">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-400">Total Spent</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(customerStats[selectedCustomer.id]?.totalSpent || 0)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2 min-h-[40px]">
                    <CreditCard className="w-5 h-5 text-purple-400" />
                    <span className="text-slate-400">Avg. Transaction</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">
                    {formatCurrency(customerStats[selectedCustomer.id]?.avgTransaction || 0)}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2 min-h-[40px]">
                    <Clock className="w-5 h-5 text-orange-400" />
                    <span className="text-slate-400">Last Purchase</span>
                  </div>
                  <p className="text-lg text-orange-400">
                    {formatDate(customerStats[selectedCustomer.id]?.lastPurchase || null)}
                  </p>
                  {customerStats[selectedCustomer.id]?.lastPurchaseAmount > 0 && (
                    <p className="text-sm text-orange-300">
                      £{customerStats[selectedCustomer.id]?.lastPurchaseAmount.toFixed(2)}
                    </p>
                  )}
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
                    Transactions ({customerStats[selectedCustomer.id]?.transactionCount || 0})
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
                    Balance History ({customerBalanceHistory.length})
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
                {customerTransactions.length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                    <Receipt className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-400">No transactions yet</p>
                  </div>
                ) : (
                  customerTransactions.map((transaction) => (
                    <div key={transaction.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">Transaction #{transaction.id}</span>
                          </div>
                          <div className="text-sm text-slate-400">
                            {new Date(transaction.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-emerald-400">
                          {formatCurrency(transaction.total)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <div className="text-sm text-slate-400">Payment Method</div>
                          <div className="font-bold capitalize">{transaction.payment_method || 'cash'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Status</div>
                          <div className="font-bold text-cyan-400">{transaction.payment_status || 'completed'}</div>
                        </div>
                      </div>
                      
                      {transaction.transaction_items && transaction.transaction_items.length > 0 && (
                        <div className="border-t border-slate-700/50 pt-3">
                          <div className="text-sm text-slate-400 mb-2">Items:</div>
                          <div className="space-y-2">
                            {transaction.transaction_items.slice(0, 3).map((item: any) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span>{item.services?.[0]?.name || 'Item'} x{item.quantity || 1}</span>
                                <span>£{((item.price_at_time || item.services?.[0]?.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                              </div>
                            ))}
                            {transaction.transaction_items.length > 3 && (
                              <div className="text-slate-400 text-sm">+{transaction.transaction_items.length - 3} more items</div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => printTransactionReceipt(transaction)}
                          className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all text-sm flex items-center gap-2"
                        >
                          <Printer className="w-3 h-3" />
                          Print Receipt
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {customerBalanceHistory.length === 0 ? (
                  <div className="text-center py-8 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                    <Wallet className="w-12 h-12 mx-auto mb-4 text-slate-500" />
                    <p className="text-slate-400">No balance history</p>
                  </div>
                ) : (
                  customerBalanceHistory.map((history) => (
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
