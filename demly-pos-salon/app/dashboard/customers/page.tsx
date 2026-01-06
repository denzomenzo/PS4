// /app/dashboard/customers/page.tsx
"use client";

import { useState, useEffect } from "react";
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
  ExternalLink,
  History,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

// Define all interfaces inline (REPLACING THE IMPORT)
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
  transaction_number?: string;
  customer_id: number;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: 'cash' | 'card' | 'balance' | 'mixed' | 'online' | 'other';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  items?: TransactionItem[];
}

interface TransactionItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  total_price: number;
}

interface BalanceTransaction {
  id: number;
  amount: number;
  previous_balance: number;
  new_balance: number;
  note: string | null;
  created_at: string;
}

export default function CustomerDetails() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'balance'>('transactions');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  // Edit form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formBalance, setFormBalance] = useState("0");

  // Balance adjustment
  const [balanceAction, setBalanceAction] = useState<"add" | "subtract">("add");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceNote, setBalanceNote] = useState("");

  useEffect(() => {
    if (customerId) {
      loadCustomerDetails();
    }
  }, [customerId]);

  const loadCustomerDetails = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load customer
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Load transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select(`
          *,
          items:transaction_items(*)
        `)
        .eq("customer_id", customerId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!transactionsError && transactionsData) {
        setTransactions(transactionsData as Transaction[]);
      }

      // Load balance history
      const { data: balanceData, error: balanceError } = await supabase
        .from("customer_balance_history")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (!balanceError && balanceData) {
        setBalanceHistory(balanceData);
      }

    } catch (error) {
      console.error("Error loading customer details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBalance = (balance: any): number => {
    if (balance === null || balance === undefined) return 0;
    const num = typeof balance === 'string' ? parseFloat(balance) : balance;
    return isNaN(num) ? 0 : num;
  };

  const printReceipt = async (transaction: Transaction) => {
    try {
      const receiptWindow = window.open('', '_blank');
      if (!receiptWindow) return;

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt #${transaction.id}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              max-width: 300px; 
              margin: 20px auto; 
              padding: 10px; 
              background: white;
              color: black;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .store-name { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
            .receipt-title { font-size: 18px; margin: 10px 0; font-weight: bold; }
            .transaction-info { margin: 10px 0; }
            .items { margin: 20px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 18px; margin-top: 20px; border-top: 1px solid #000; padding-top: 10px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
            .separator { border-top: 1px dashed #000; margin: 20px 0; }
            .customer-info { margin: 10px 0; }
            .bold { font-weight: bold; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">DEMLY POS</div>
            <div>Your Universal SaaS POS</div>
            <div class="receipt-title">RECEIPT #${transaction.transaction_number || transaction.id}</div>
            <div>${new Date(transaction.created_at).toLocaleString()}</div>
          </div>
          
          <div class="customer-info">
            <div><span class="bold">Customer:</span> ${customer?.name}</div>
            ${customer?.phone ? `<div><span class="bold">Phone:</span> ${customer.phone}</div>` : ''}
            ${customer?.email ? `<div><span class="bold">Email:</span> ${customer.email}</div>` : ''}
          </div>
          
          <div class="separator"></div>
          
          <div class="items">
            ${transaction.items?.map((item: any) => `
              <div class="item">
                <span>${item.name} x${item.quantity}</span>
                <span>£${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('') || '<div>No items in this transaction</div>'}
          </div>
          
          <div class="separator"></div>
          
          <div class="transaction-info">
            <div class="item">
              <span>Subtotal:</span>
              <span>£${transaction.total_amount?.toFixed(2) || '0.00'}</span>
            </div>
            ${transaction.discount_amount > 0 ? `
              <div class="item">
                <span>Discount:</span>
                <span>-£${transaction.discount_amount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="item total">
              <span class="bold">TOTAL:</span>
              <span class="bold">£${transaction.final_amount?.toFixed(2) || '0.00'}</span>
            </div>
            <div class="item">
              <span>Payment Method:</span>
              <span>${transaction.payment_method || 'N/A'} (${transaction.payment_status || 'N/A'})</span>
            </div>
          </div>
          
          <div class="footer">
            <div>Thank you for your business!</div>
            <div>Generated by Demly POS</div>
            <div>${new Date().toLocaleString()}</div>
          </div>
        </body>
        </html>
      `;

      receiptWindow.document.write(receiptHtml);
      receiptWindow.document.close();
      receiptWindow.focus();
      
      setTimeout(() => {
        receiptWindow.print();
        receiptWindow.close();
      }, 500);
    } catch (error) {
      console.error("Error printing receipt:", error);
      alert("Error printing receipt");
    }
  };

  const getTotalSpent = () => {
    return transactions.reduce((sum, t) => sum + (t.final_amount || 0), 0);
  };

  const getAverageTransaction = () => {
    return transactions.length > 0 ? getTotalSpent() / transactions.length : 0;
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

  const openEditModal = () => {
    if (!customer) return;
    setFormName(customer.name);
    setFormPhone(customer.phone || "");
    setFormEmail(customer.email || "");
    setFormNotes(customer.notes || "");
    setFormBalance(getBalance(customer.balance).toString());
    setShowEditModal(true);
  };

  const openBalanceModal = () => {
    setBalanceAction("add");
    setBalanceAmount("");
    setBalanceNote("");
    setShowBalanceModal(true);
  };

  const updateCustomer = async () => {
    if (!customer || !formName.trim()) {
      alert("Name is required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const balanceValue = parseFloat(formBalance) || 0;

      const { error } = await supabase
        .from("customers")
        .update({
          name: formName,
          phone: formPhone || null,
          email: formEmail || null,
          notes: formNotes || null,
          balance: balanceValue,
          updated_at: new Date().toISOString()
        })
        .eq("id", customer.id);

      if (error) throw error;

      // Log balance change if it changed
      if (balanceValue !== customer.balance) {
        await supabase.from("customer_balance_history").insert({
          user_id: user.id,
          customer_id: customer.id,
          amount: balanceValue - customer.balance,
          previous_balance: customer.balance,
          new_balance: balanceValue,
          note: "Manual balance adjustment from edit",
          created_at: new Date().toISOString()
        });
      }

      setShowEditModal(false);
      await loadCustomerDetails();
      alert("✅ Customer updated successfully!");
    } catch (error: any) {
      console.error("Error updating customer:", error);
      alert(`Error updating customer: ${error.message}`);
    }
  };

  const deleteCustomer = async () => {
    if (!customer || !confirm("Are you sure you want to delete this customer? This action cannot be undone.")) return;

    try {
      const { error } = await supabase.from("customers").delete().eq("id", customer.id);

      if (error) throw error;

      alert("✅ Customer deleted successfully!");
      router.push("/customers");
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      alert(`Error deleting customer: ${error.message}`);
    }
  };

  const adjustBalance = async () => {
    if (!customer || !balanceAmount) {
      alert("Please enter an amount");
      return;
    }

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    const currentBalance = getBalance(customer.balance);
    const adjustmentAmount = balanceAction === "add" ? amount : -amount;
    const newBalance = currentBalance + adjustmentAmount;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("customers")
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq("id", customer.id);

      if (updateError) throw updateError;

      // Log balance transaction
      await supabase.from("customer_balance_history").insert({
        user_id: user.id,
        customer_id: customer.id,
        amount: adjustmentAmount,
        previous_balance: currentBalance,
        new_balance: newBalance,
        note: balanceNote || (balanceAction === "add" ? "Balance added" : "Balance deducted"),
        created_at: new Date().toISOString()
      });

      // Update local state
      setCustomer({
        ...customer,
        balance: newBalance
      });

      // Reset form and reload
      setBalanceAmount("");
      setBalanceNote("");
      await loadCustomerDetails();
      
      alert(`✅ Balance ${balanceAction === "add" ? "added" : "deducted"} successfully!`);
      setShowBalanceModal(false);
    } catch (error: any) {
      console.error("Error:", error);
      alert(`Error adjusting balance: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Customer not found</p>
          <Link href="/customers" className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/customers" className="flex items-center gap-2 text-lg text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </Link>
            <div>
              <h1 className="text-3xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
                {customer.name}
              </h1>
              <p className="text-lg md:text-xl text-slate-400 mt-2">
                Customer Details & History
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={openEditModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-all"
            >
              <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
              Edit
            </button>
            <button
              onClick={deleteCustomer}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-all"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
              Delete
            </button>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl md:rounded-3xl p-6 md:p-8 mb-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column - Customer Info */}
            <div className="lg:col-span-2">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 mb-6">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center text-3xl md:text-4xl font-black shadow-lg shadow-cyan-500/20">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">{customer.name}</h2>
                  <p className="text-slate-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Member since {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 md:w-5 md:h-5 text-slate-400 flex-shrink-0" />
                    <span className="text-base md:text-lg">{customer.phone}</span>
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 md:w-5 md:h-5 text-slate-400 flex-shrink-0" />
                    <span className="text-base md:text-lg truncate">{customer.email}</span>
                  </div>
                )}
                {customer.notes && (
                  <div className="mt-4 p-3 md:p-4 bg-slate-800/50 rounded-xl border border-slate-600/30">
                    <p className="text-sm md:text-base text-slate-300">{customer.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Stats & Balance */}
            <div className="space-y-4 md:space-y-6">
              {/* Balance Card */}
              <div className={`${getBalanceBgColor(getBalance(customer.balance))} backdrop-blur-xl border rounded-xl md:rounded-2xl p-4 md:p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="w-6 h-6 md:w-8 md:h-8" />
                    <span className="text-lg md:text-2xl font-bold">Current Balance</span>
                  </div>
                  <span className={`text-3xl md:text-5xl font-black ${getBalanceColor(getBalance(customer.balance))}`}>
                    £{getBalance(customer.balance).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={openBalanceModal}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 py-2 md:py-3 rounded-lg font-bold text-sm md:text-base transition-all"
                  >
                    Adjust Balance
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
                    <span className="text-xs md:text-sm text-slate-400">Total Transactions</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold">{transactions.length}</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                    <span className="text-xs md:text-sm text-slate-400">Total Spent</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-emerald-400">£{getTotalSpent().toFixed(2)}</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
                    <span className="text-xs md:text-sm text-slate-400">Avg. Transaction</span>
                  </div>
                  <p className="text-xl md:text-2xl font-bold">£{getAverageTransaction().toFixed(2)}</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                    <span className="text-xs md:text-sm text-slate-400">Last Purchase</span>
                  </div>
                  <p className="text-sm md:text-base">
                    {transactions.length > 0 
                      ? new Date(transactions[0].created_at).toLocaleDateString()
                      : "Never"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-slate-700/50 overflow-x-auto">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 md:px-6 py-3 font-bold text-base md:text-lg transition-all whitespace-nowrap ${
                activeTab === 'transactions' 
                  ? 'text-cyan-400 border-b-2 border-cyan-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 md:w-5 md:h-5" />
                Recent Transactions ({transactions.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('balance')}
              className={`px-4 md:px-6 py-3 font-bold text-base md:text-lg transition-all whitespace-nowrap ${
                activeTab === 'balance' 
                  ? 'text-emerald-400 border-b-2 border-emerald-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 md:w-5 md:h-5" />
                Balance History ({balanceHistory.length})
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-2xl md:rounded-3xl">
                <Receipt className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-slate-500" />
                <p className="text-lg md:text-xl text-slate-400">No transactions yet</p>
                <p className="text-slate-500">Transactions will appear here once made</p>
              </div>
            ) : (
              transactions.map((transaction) => (
                <div key={transaction.id} className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl md:rounded-2xl p-4 md:p-6 hover:border-cyan-500/30 transition-all">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 md:gap-3 mb-2">
                        <Receipt className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
                        <span className="text-lg md:text-xl font-bold">Transaction #{transaction.transaction_number || transaction.id}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${getPaymentStatusColor(transaction.payment_status)}`}>
                          {transaction.payment_status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 md:gap-4 text-slate-400 text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 md:w-4 md:h-4" />
                          {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="capitalize">
                          {transaction.payment_method}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => printReceipt(transaction)}
                        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg md:rounded-xl hover:bg-cyan-500/30 transition-all"
                      >
                        <Printer className="w-3 h-3 md:w-4 md:h-4" />
                        Print Receipt
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                    <div className="bg-slate-800/50 rounded-lg md:rounded-xl p-3 md:p-4">
                      <p className="text-xs md:text-sm text-slate-400 mb-1">Payment Method</p>
                      <p className="text-base md:text-lg font-bold capitalize">{transaction.payment_method || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg md:rounded-xl p-3 md:p-4">
                      <p className="text-xs md:text-sm text-slate-400 mb-1">Items</p>
                      <p className="text-base md:text-lg font-bold">{transaction.items?.length || 0} items</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg md:rounded-xl p-3 md:p-4">
                      <p className="text-xs md:text-sm text-slate-400 mb-1">Total Amount</p>
                      <p className="text-xl md:text-2xl font-bold text-emerald-400">£{transaction.final_amount?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>

                  {transaction.items && transaction.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-2">Items purchased:</p>
                      <div className="space-y-2">
                        {transaction.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center py-2 px-3 bg-slate-800/30 rounded-lg">
                            <div className="flex-1">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-slate-400 text-sm ml-2">x{item.quantity}</span>
                            </div>
                            <span className="font-bold">£{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="space-y-4">
            {balanceHistory.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-2xl md:rounded-3xl">
                <Wallet className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-slate-500" />
                <p className="text-lg md:text-xl text-slate-400">No balance history</p>
                <p className="text-slate-500">Balance adjustments will appear here</p>
              </div>
            ) : (
              balanceHistory.map((history) => (
                <div key={history.id} className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-xl md:rounded-2xl p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${history.amount > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        {history.amount > 0 ? (
                          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-base md:text-lg">
                          {history.amount > 0 ? 'Balance Added' : 'Balance Deducted'}
                        </p>
                        <p className="text-sm text-slate-400">
                          {new Date(history.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className={`text-xl md:text-2xl font-bold ${history.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {history.amount > 0 ? '+' : ''}£{Math.abs(history.amount).toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="bg-slate-800/50 rounded-lg md:rounded-xl p-3 md:p-4">
                      <p className="text-xs md:text-sm text-slate-400 mb-1">Previous Balance</p>
                      <p className="text-base md:text-lg">£{history.previous_balance.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg md:rounded-xl p-3 md:p-4">
                      <p className="text-xs md:text-sm text-slate-400 mb-1">New Balance</p>
                      <p className="text-base md:text-lg font-bold">£{history.new_balance.toFixed(2)}</p>
                    </div>
                  </div>

                  {history.note && (
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-1">Note:</p>
                      <p className="text-slate-300 text-sm md:text-base">{history.note}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Edit Customer Modal */}
      {showEditModal && customer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-slate-700/50 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold">Edit Customer</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </div>

            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-base md:text-lg mb-2 font-medium">Name *</label>
                <div className="relative">
                  <User className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 pl-10 md:pl-12 pr-4 py-3 md:py-4 rounded-xl text-base md:text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-base md:text-lg mb-2 font-medium">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                  <input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Phone number"
                    type="tel"
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 pl-10 md:pl-12 pr-4 py-3 md:py-4 rounded-xl text-base md:text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base md:text-lg mb-2 font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                  <input
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 pl-10 md:pl-12 pr-4 py-3 md:py-4 rounded-xl text-base md:text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-base md:text-lg mb-2 font-medium">Balance</label>
                <div className="relative">
                  <Wallet className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                  <input
                    value={formBalance}
                    onChange={(e) => setFormBalance(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 pl-10 md:pl-12 pr-4 py-3 md:py-4 rounded-xl text-base md:text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
                <p className="text-xs md:text-sm text-slate-400 mt-2">
                  Positive = customer credit, Negative = customer owes
                </p>
              </div>

              <div>
                <label className="block text-base md:text-lg mb-2 font-medium">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full bg-slate-800/50 backdrop-blur-lg border border-slate-700/50 p-3 md:p-4 rounded-xl text-base md:text-lg focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 md:gap-4 mt-6 md:mt-8">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 md:py-4 rounded-xl text-base md:text-lg font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={updateCustomer}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 py-3 md:py-4 rounded-xl text-base md:text-lg font-bold transition-all shadow-xl shadow-cyan-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Adjustment Modal */}
      {showBalanceModal && customer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-700/50 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold">Adjust Balance</h2>
              <button onClick={() => setShowBalanceModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6 md:w-8 md:h-8" />
              </button>
            </div>

            <div className={`bg-slate-800/50 rounded-xl p-4 md:p-5 mb-6 border ${getBalanceBgColor(getBalance(customer.balance))}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white text-base md:text-lg">{customer.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Balance:</span>
                <span className={`text-2xl md:text-3xl font-black ${getBalanceColor(getBalance(customer.balance))}`}>
                  £{getBalance(customer.balance).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-base md:text-lg mb-3 font-medium">Action</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBalanceAction("add")}
                    className={`py-2 md:py-3 rounded-xl font-bold border-2 transition-all ${
                      balanceAction === "add"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                    Add Balance
                  </button>
                  <button
                    onClick={() => setBalanceAction("subtract")}
                    className={`py-2 md:py-3 rounded-xl font-bold border-2 transition-all ${
                      balanceAction === "subtract"
                        ? "bg-red-500/20 border-red-500 text-red-400"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                    Deduct Balance
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-base md:text-lg mb-2 font-medium">Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-3 md:p-4 rounded-xl text-xl md:text-2xl text-center font-bold focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  autoFocus
                />
              </div>

              {balanceAmount && parseFloat(balanceAmount) > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-3 md:p-4 border border-slate-700/50">
                  <div className="flex justify-between text-sm mb-1 md:mb-2">
                    <span className="text-slate-400">Current Balance:</span>
                    <span className="font-bold">£{getBalance(customer.balance).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1 md:mb-2">
                    <span className="text-slate-400">
                      {balanceAction === "add" ? "Adding:" : "Deducting:"}
                    </span>
                    <span className={balanceAction === "add" ? "text-emerald-400" : "text-red-400"}>
                      {balanceAction === "add" ? "+" : "-"}£{parseFloat(balanceAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-slate-700/50 pt-1 md:pt-2 mt-1 md:mt-2">
                    <div className="flex justify-between">
                      <span className="font-bold">New Balance:</span>
                      <span className={`text-lg md:text-xl font-black ${getBalanceColor(
                        getBalance(customer.balance) + 
                        (balanceAction === "add" ? 1 : -1) * parseFloat(balanceAmount)
                      )}`}>
                        £{(
                          getBalance(customer.balance) + 
                          (balanceAction === "add" ? 1 : -1) * parseFloat(balanceAmount)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-base md:text-lg mb-2 font-medium">Note (Optional)</label>
                <input
                  value={balanceNote}
                  onChange={(e) => setBalanceNote(e.target.value)}
                  placeholder="e.g., Prepayment, Refund, Purchase, etc."
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-3 md:p-4 rounded-xl text-sm md:text-base focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 md:gap-4 mt-6 md:mt-8">
              <button
                onClick={() => setShowBalanceModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-3 md:py-4 rounded-xl text-base md:text-lg font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={adjustBalance}
                disabled={!balanceAmount || parseFloat(balanceAmount) <= 0}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-slate-700 disabled:to-slate-700 py-3 md:py-4 rounded-xl text-base md:text-lg font-bold transition-all shadow-xl disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

