// app/dashboard/transactions/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { processCardPayment } from "@/lib/cardPaymentProcessor";
import ReceiptPrint, { ReceiptData as ReceiptPrintData } from "@/components/receipts/ReceiptPrint";
import { logAuditAction } from "@/lib/auditLogger";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import {
  ArrowLeft,
  Search,
  Calendar,
  User,
  CreditCard,
  DollarSign,
  RotateCcw,
  Printer,
  Filter,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Barcode,
  ChevronDown,
  ChevronUp,
  Receipt,
  Coffee,
  Package,
  RefreshCw,
  Plus,
  Minus,
  X
} from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: number;
  created_at: string;
  customer_id: number | null;
  customer_name: string | null;
  staff_name: string | null;
  subtotal: number;
  vat: number;
  total: number;
  payment_method: string;
  payment_details: any;
  balance_deducted: number;
  notes: string | null;
  products: any[];
  services?: any[];
  service_fee?: number;
  service_type_id?: number | null;
  return_status: 'none' | 'partial' | 'full';
  returned_amount: number;
  returned_at: string | null;
}

interface Return {
  id: number;
  transaction_id: number;
  created_at: string;
  items: any[];
  total_refunded: number;
  refund_method: string;
  reason: string;
  processed_by: string;
  card_refund_id: string | null;
  original_transaction: Transaction;
  restore_inventory: boolean;
  staff?: {
    name: string;
  };
}

type DateFilter = '7days' | '30days' | '90days' | 'all';
type StatusFilter = 'all' | 'completed' | 'returned' | 'partial';

// Helper functions
const formatDate = (dateString: string, includeTime: boolean = true) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    if (includeTime) {
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const getSafeNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const getTransactionIdDisplay = (id: number): string => {
  return `#${id}`;
};

// Hardware Helper Functions
const openCashDrawer = async () => {
  try {
    console.log('📂 Opening cash drawer...');
    
    if ('usb' in navigator) {
      try {
        const device = await navigator.usb.requestDevice({
          filters: [
            { vendorId: 0x04B8 }, // Epson
            { vendorId: 0x0416 }, // Citizen
            { vendorId: 0x15A9 }, // Star Micronics
          ]
        });
        
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        
        const cashDrawerCommand = new Uint8Array([27, 112, 0, 50, 250]);
        await device.transferOut(1, cashDrawerCommand);
        await device.close();
        
        console.log('✅ Cash drawer opened via USB');
        return true;
      } catch (usbError) {
        console.warn('USB cash drawer failed:', usbError);
      }
    }
    
    alert('💰 Please open cash drawer manually');
    return false;
    
  } catch (error) {
    console.error('Cash drawer error:', error);
    return false;
  }
};

export default function Transactions() {
  const userId = useUserId();
  const { staff: currentStaff } = useStaffAuth();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filteredReturns, setFilteredReturns] = useState<Return[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [returnSearchQuery, setReturnSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // UI State
  const [expandedTransaction, setExpandedTransaction] = useState<number | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showReturnsHistory, setShowReturnsHistory] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [processingReturn, setProcessingReturn] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  
  // Return form
  const [returnItems, setReturnItems] = useState<{[key: string]: number}>({});
  const [returnReason, setReturnReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<'original' | 'balance' | 'cash'>('original');
  const [restoreInventory, setRestoreInventory] = useState(true);
  
  // Receipt
  const [receiptData, setReceiptData] = useState<ReceiptPrintData | null>(null);
  const [showReceiptPrint, setShowReceiptPrint] = useState(false);
  
  // Card terminal
  const [cardTerminalSettings, setCardTerminalSettings] = useState<any>(null);

  useEffect(() => {
    if (userId) {
      loadData();
      loadCardTerminalSettings();
    }
  }, [userId]);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchQuery, dateFilter, statusFilter, startDate, endDate]);

  // Filter returns when search changes
  useEffect(() => {
    if (!returns.length) {
      setFilteredReturns([]);
      return;
    }

    if (returnSearchQuery.trim()) {
      const query = returnSearchQuery.toLowerCase();
      const filtered = returns.filter(r => 
        r.id.toString().includes(query) ||
        r.transaction_id.toString().includes(query) ||
        r.reason?.toLowerCase().includes(query) ||
        r.processed_by?.toLowerCase().includes(query) ||
        r.refund_method.toLowerCase().includes(query)
      );
      setFilteredReturns(filtered);
    } else {
      setFilteredReturns(returns);
    }
  }, [returnSearchQuery, returns]);

  // Barcode scanner for receipts
  const handleBarcodeScan = useCallback((barcode: string) => {
    console.log('Scanned barcode:', barcode);
    setLastScannedBarcode(barcode);
    
    const transaction = transactions.find(t => t.id.toString() === barcode);
    if (transaction) {
      setExpandedTransaction(transaction.id);
      setTimeout(() => {
        document.getElementById(`transaction-${transaction.id}`)?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
      setTimeout(() => setLastScannedBarcode(null), 3000);
    } else {
      alert(`Transaction #${barcode} not found`);
    }
  }, [transactions]);

  const { isScanning } = useBarcodeScanner({
    enabled: true,
    onScan: handleBarcodeScan,
    playSoundOnScan: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load transactions
      const { data: transactionsData, error: transError } = await supabase
        .from("transactions")
        .select(`
          *,
          customers:customer_id (name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (transError) throw transError;

      const formattedTransactions = (transactionsData || []).map(t => ({
        ...t,
        customer_name: t.customers?.name || null,
        return_status: (t.returned_amount || 0) > 0 
          ? ((t.returned_amount || 0) >= t.total ? 'full' : 'partial')
          : 'none',
        returned_amount: t.returned_amount || 0
      }));

      setTransactions(formattedTransactions);

      // Load returns history with staff names
      const { data: returnsData, error: returnsError } = await supabase
        .from("transaction_returns")
        .select(`
          *,
          transactions:transaction_id (*),
          staff:staff_id (name)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!returnsError && returnsData) {
        const formattedReturns = returnsData.map(r => ({
          ...r,
          original_transaction: r.transactions,
          processed_by: r.staff?.name || 'System',
          staff_name: r.staff?.name
        }));
        setReturns(formattedReturns);
        setFilteredReturns(formattedReturns);
      }

    } catch (error: any) {
      console.error("Error loading data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCardTerminalSettings = async () => {
    const { data } = await supabase
      .from("card_terminal_settings")
      .select("enabled, provider")
      .eq("user_id", userId)
      .single();

    if (data) {
      setCardTerminalSettings(data);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    const now = new Date();
    const filterDate = new Date();
    
    switch (dateFilter) {
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        filterDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        filterDate.setFullYear(2000);
        break;
    }

    if (dateFilter !== 'all') {
      filtered = filtered.filter(t => new Date(t.created_at) >= filterDate);
    }

    if (startDate) {
      filtered = filtered.filter(t => new Date(t.created_at) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(t => new Date(t.created_at) <= new Date(endDate + 'T23:59:59'));
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') {
        filtered = filtered.filter(t => t.return_status === 'none');
      } else if (statusFilter === 'returned') {
        filtered = filtered.filter(t => t.return_status === 'full');
      } else if (statusFilter === 'partial') {
        filtered = filtered.filter(t => t.return_status === 'partial');
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.id.toString().includes(query) ||
        t.customer_name?.toLowerCase().includes(query) ||
        t.staff_name?.toLowerCase().includes(query) ||
        t.notes?.toLowerCase().includes(query) ||
        t.products?.some(p => p.name?.toLowerCase().includes(query))
      );
    }

    setFilteredTransactions(filtered);
  };

  const initiateReturn = (transaction: Transaction) => {
    if (transaction.return_status === 'full') {
      alert("This transaction has already been fully returned");
      return;
    }

    setSelectedTransaction(transaction);
    
    const initialItems: {[key: string]: number} = {};
    transaction.products?.forEach((product: any) => {
      const productId = product.id?.toString() || `product-${Date.now()}-${Math.random()}`;
      initialItems[productId] = 0;
    });
    
    setReturnItems(initialItems);
    setReturnReason("");
    setRefundMethod('original');
    setRestoreInventory(true);
    setShowReturnModal(true);
  };

  const processReturn = async () => {
    if (!selectedTransaction || !currentStaff) return;

    const itemsToReturn = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const product = selectedTransaction.products.find(p => p.id?.toString() === productId);
        return {
          product_id: parseInt(productId),
          product_name: product?.name,
          quantity: qty,
          price: product?.price || 0,
          total: (product?.price || 0) * qty
        };
      });
    
    if (itemsToReturn.length === 0) {
      alert("Please select items to return");
      return;
    }

    if (!returnReason.trim()) {
      alert("Please provide a reason for return");
      return;
    }

    setProcessingReturn(true);

    try {
      const refundAmount = itemsToReturn.reduce((sum, item) => sum + item.total, 0);
      const vatAmount = selectedTransaction.vat > 0 
        ? (refundAmount / selectedTransaction.subtotal) * selectedTransaction.vat 
        : 0;
      const totalRefund = refundAmount + vatAmount;

      let cardRefundId = null;

      if (refundMethod === 'original' && 
          selectedTransaction.payment_method === 'card' && 
          cardTerminalSettings?.enabled) {
        
        if (!confirm(`Process card refund of £${totalRefund.toFixed(2)}?\n\nThis will refund to the original card used.`)) {
          setProcessingReturn(false);
          return;
        }

        alert(`Processing card refund of £${totalRefund.toFixed(2)}...`);
        cardRefundId = `refund_${Date.now()}`;
        alert(`✅ Card refund processed successfully!\n\nRefund ID: ${cardRefundId}`);
      }

      if (refundMethod === 'cash') {
        await openCashDrawer();
      }

      const returnData = {
        user_id: userId,
        transaction_id: selectedTransaction.id,
        staff_id: currentStaff.id,
        items: itemsToReturn,
        total_refunded: totalRefund,
        refund_method: refundMethod,
        reason: returnReason,
        processed_by: currentStaff.name,
        card_refund_id: cardRefundId,
        restore_inventory: restoreInventory,
        created_at: new Date().toISOString()
      };

      const { error: returnError } = await supabase
        .from("transaction_returns")
        .insert(returnData);

      if (returnError) throw returnError;

      const newReturnedAmount = (selectedTransaction.returned_amount || 0) + totalRefund;
      const isFullReturn = Math.abs(newReturnedAmount - selectedTransaction.total) < 0.01;

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          returned_amount: newReturnedAmount,
          returned_at: new Date().toISOString()
        })
        .eq("id", selectedTransaction.id);

      if (updateError) throw updateError;

      if (refundMethod === 'balance' && selectedTransaction.customer_id) {
        const { data: customer } = await supabase
          .from("customers")
          .select("balance")
          .eq("id", selectedTransaction.customer_id)
          .single();

        if (customer) {
          const newBalance = (customer.balance || 0) + totalRefund;
          
          await supabase
            .from("customers")
            .update({ balance: newBalance })
            .eq("id", selectedTransaction.customer_id);

          await supabase.from("customer_balance_history").insert({
            user_id: userId,
            customer_id: selectedTransaction.customer_id,
            amount: totalRefund,
            previous_balance: customer.balance,
            new_balance: newBalance,
            note: `Return for transaction #${selectedTransaction.id} - ${returnReason}`,
            transaction_id: selectedTransaction.id
          });
        }
      }

      if (restoreInventory) {
        for (const item of itemsToReturn) {
          const product = selectedTransaction.products.find(p => p.id === item.product_id);
          if (product && product.track_inventory) {
            const { data: productData } = await supabase
              .from("products")
              .select("stock_quantity")
              .eq("id", item.product_id)
              .single();

            if (productData) {
              await supabase
                .from("products")
                .update({ 
                  stock_quantity: productData.stock_quantity + item.quantity 
                })
                .eq("id", item.product_id);
            }
          }
        }
      }

      await logAuditAction({
        action: "RETURN_PROCESSED",
        entityType: "transaction",
        entityId: selectedTransaction.id.toString(),
        newValues: {
          transaction_id: selectedTransaction.id,
          items: itemsToReturn,
          total_refunded: totalRefund,
          method: refundMethod,
          reason: returnReason,
          restore_inventory: restoreInventory
        },
        staffId: currentStaff?.id,
      });

      alert(`✅ Return processed successfully!\n\nRefunded: £${totalRefund.toFixed(2)}\nMethod: ${refundMethod}\n\n${restoreInventory ? 'Inventory has been restored.' : 'Inventory not restored.'}`);

      setShowReturnModal(false);
      loadData();

    } catch (error: any) {
      console.error("Return processing error:", error);
      alert("❌ Error processing return: " + error.message);
    } finally {
      setProcessingReturn(false);
    }
  };

  const reprintReceipt = async (transaction: Transaction) => {
    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      const serviceInfo = transaction.services && transaction.services.length > 0 
        ? transaction.services[0] 
        : transaction.service_type_id 
        ? { name: 'Service', fee: transaction.service_fee || 0 }
        : null;

      const receiptData: ReceiptPrintData = {
        id: String(transaction.id),
        createdAt: transaction.created_at,
        subtotal: getSafeNumber(transaction.subtotal),
        vat: getSafeNumber(transaction.vat),
        total: getSafeNumber(transaction.total),
        paymentMethod: transaction.payment_method as any,
        products: (transaction.products || []).map(p => ({
          id: p.id?.toString() || Math.random().toString(),
          name: p.name || 'Product',
          price: getSafeNumber(p.price),
          quantity: getSafeNumber(p.quantity) || 1,
          discount: getSafeNumber(p.discount) || 0,
          total: (getSafeNumber(p.price) * (getSafeNumber(p.quantity) || 1)) - (getSafeNumber(p.discount) || 0),
          sku: p.sku,
          barcode: p.barcode
        })),
        customer: transaction.customer_name ? {
          id: transaction.customer_id?.toString() || '',
          name: transaction.customer_name,
          balance: 0
        } : undefined,
        businessInfo: {
          name: settings?.business_name || "Your Business",
          address: settings?.business_address,
          phone: settings?.business_phone,
          email: settings?.business_email,
          taxNumber: settings?.tax_number,
          logoUrl: settings?.business_logo_url || settings?.receipt_logo_url
        },
        receiptSettings: {
          fontSize: settings?.receipt_font_size || 12,
          footer: settings?.receipt_footer || "Thank you for your business!",
          showBarcode: settings?.show_barcode_on_receipt !== false,
          barcodeType: (settings?.barcode_type?.toUpperCase() || 'CODE128') as any,
          showTaxBreakdown: settings?.show_tax_breakdown !== false
        },
        balanceDeducted: getSafeNumber(transaction.balance_deducted),
        paymentDetails: transaction.payment_details || {},
        staffName: transaction.staff_name || undefined,
        notes: transaction.notes || undefined,
        serviceName: serviceInfo?.name,
        serviceFee: serviceInfo?.fee
      };

      setReceiptData(receiptData);
      setShowReceiptPrint(true);
    } catch (error) {
      console.error("Error generating receipt:", error);
      alert("Error generating receipt");
    }
  };

  const calculateReturnTotal = () => {
    if (!selectedTransaction) return 0;
    
    const itemsTotal = Object.entries(returnItems)
      .filter(([_, qty]) => qty > 0)
      .reduce((sum, [productId, qty]) => {
        const product = selectedTransaction.products.find(p => p.id?.toString() === productId);
        if (product) {
          return sum + (product.price * qty);
        }
        return sum;
      }, 0);

    const vatAmount = selectedTransaction.vat > 0 
      ? (itemsTotal / selectedTransaction.subtotal) * selectedTransaction.vat 
      : 0;
    
    return itemsTotal + vatAmount;
  };

  const getPaymentMethodBadge = (method: string) => {
    const badges: any = {
      cash: { icon: DollarSign, color: 'emerald', label: 'Cash' },
      card: { icon: CreditCard, color: 'blue', label: 'Card' },
      balance: { icon: User, color: 'purple', label: 'Balance' },
      split: { icon: DollarSign, color: 'orange', label: 'Split' }
    };

    const badge = badges[method] || badges.cash;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-${badge.color}-500/10 text-${badge.color}-600 border border-${badge.color}-500/20`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getReturnStatusBadge = (status: string) => {
    const badges: any = {
      none: { icon: CheckCircle, color: 'primary', label: 'Completed' },
      partial: { icon: AlertCircle, color: 'orange', label: 'Partial Return' },
      full: { icon: XCircle, color: 'destructive', label: 'Returned' }
    };

    const badge = badges[status] || badges.none;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
        status === 'none' ? 'bg-primary/10 text-primary border border-primary/20' :
        status === 'partial' ? 'bg-orange-500/10 text-orange-600 border border-orange-500/20' :
        'bg-destructive/10 text-destructive border border-destructive/20'
      }`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error Loading Transactions</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions & Returns</h1>
          <p className="text-muted-foreground mt-2">
            View sales history and process returns with hardware integration
            {isScanning && (
              <span className="ml-3 inline-flex items-center gap-2 text-primary">
                <Barcode className="w-4 h-4 animate-pulse" />
                Scanner Active
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowReturnsHistory(!showReturnsHistory)}
            className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Returns History ({returns.length})
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Transaction ID, customer, staff, products..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Period
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="w-full px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Transactions</option>
              <option value="completed">Completed</option>
              <option value="partial">Partial Returns</option>
              <option value="returned">Fully Returned</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filteredTransactions.length} of {transactions.length} transactions</span>
          {startDate || endDate ? (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-primary hover:underline"
            >
              Clear date range
            </button>
          ) : null}
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">No Transactions Found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search criteria' : 'No transactions in this period'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => {
            const serviceInfo = transaction.services && transaction.services.length > 0 
              ? transaction.services[0] 
              : transaction.service_type_id 
              ? { name: 'Service', fee: transaction.service_fee || 0 }
              : null;

            return (
              <div
                key={transaction.id}
                id={`transaction-${transaction.id}`}
                className={`bg-card border rounded-xl transition-all ${
                  lastScannedBarcode === transaction.id.toString()
                    ? 'border-primary shadow-lg shadow-primary/20'
                    : 'border-border'
                }`}
              >
                {/* Transaction Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedTransaction(
                    expandedTransaction === transaction.id ? null : transaction.id
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-lg font-bold text-foreground">
                            {getTransactionIdDisplay(transaction.id)}
                          </span>
                          {getReturnStatusBadge(transaction.return_status)}
                          {getPaymentMethodBadge(transaction.payment_method)}
                          {serviceInfo && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                              <Coffee className="w-3 h-3" />
                              {serviceInfo.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(transaction.created_at, true)}
                          </span>
                          {transaction.customer_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {transaction.customer_name}
                            </span>
                          )}
                          {transaction.staff_name && (
                            <span className="text-xs">
                              Staff: {transaction.staff_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">
                          £{getSafeNumber(transaction.total).toFixed(2)}
                        </p>
                        {getSafeNumber(transaction.returned_amount) > 0 && (
                          <p className="text-sm text-destructive">
                            -£{getSafeNumber(transaction.returned_amount).toFixed(2)} returned
                          </p>
                        )}
                      </div>
                      {expandedTransaction === transaction.id ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTransaction === transaction.id && (
                  <div className="border-t border-border p-4">
                    {/* Products */}
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-foreground mb-3">Items Purchased</h4>
                      <div className="space-y-2">
                        {transaction.products?.map((product: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                £{getSafeNumber(product.price).toFixed(2)} × {getSafeNumber(product.quantity)}
                                {getSafeNumber(product.discount) > 0 && (
                                  <span className="text-primary ml-2">
                                    (-£{getSafeNumber(product.discount).toFixed(2)} discount)
                                  </span>
                                )}
                              </p>
                            </div>
                            <p className="font-bold text-foreground">
                              £{((getSafeNumber(product.price) * getSafeNumber(product.quantity)) - getSafeNumber(product.discount)).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Service Info */}
                    {serviceInfo && (
                      <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Coffee className="w-4 h-4 text-primary" />
                            <span className="font-medium text-foreground">{serviceInfo.name}</span>
                          </div>
                          <span className="text-primary font-bold">+£{getSafeNumber(serviceInfo.fee).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Totals */}
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium text-foreground">£{getSafeNumber(transaction.subtotal).toFixed(2)}</span>
                        </div>
                        {getSafeNumber(transaction.vat) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">VAT (20%)</span>
                            <span className="font-medium text-foreground">£{getSafeNumber(transaction.vat).toFixed(2)}</span>
                          </div>
                        )}
                        {getSafeNumber(transaction.balance_deducted) > 0 && (
                          <div className="flex justify-between text-purple-600">
                            <span>Balance Used</span>
                            <span className="font-medium">£{getSafeNumber(transaction.balance_deducted).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-border">
                          <span className="font-bold text-foreground">Total</span>
                          <span className="font-bold text-foreground text-lg">£{getSafeNumber(transaction.total).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {transaction.notes && (
                      <div className="mb-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">Note:</span> {transaction.notes}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => reprintReceipt(transaction)}
                        className="flex-1 px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Print Receipt
                      </button>
                      {transaction.return_status !== 'full' && (
                        <button
                          onClick={() => initiateReturn(transaction)}
                          className="flex-1 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors flex items-center justify-center gap-2 border border-primary/20"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Process Return
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Return Modal */}
      {showReturnModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Process Return</h2>
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Transaction</p>
                <p className="text-lg font-bold text-foreground">{getTransactionIdDisplay(selectedTransaction.id)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedTransaction.created_at, true)}
                </p>
                {selectedTransaction.customer_name && (
                  <p className="text-sm text-foreground mt-2">
                    Customer: {selectedTransaction.customer_name}
                  </p>
                )}
              </div>

              {/* Select Items */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground mb-3">Select Items to Return</h3>
                <div className="space-y-3">
                  {selectedTransaction.products?.map((product: any) => {
                    const productId = product.id?.toString() || `product-${Date.now()}-${Math.random()}`;
                    const availableQty = getSafeNumber(product.quantity) - (product.returned_quantity || 0);
                    
                    return (
                      <div key={productId} className="p-4 bg-background rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{product.name}</p>
                            <p className="text-sm text-muted-foreground">
                              £{getSafeNumber(product.price).toFixed(2)} each • Sold: {getSafeNumber(product.quantity)}
                              {product.returned_quantity > 0 && (
                                <span className="text-orange-500 ml-2">
                                  (Previously returned: {product.returned_quantity})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-muted-foreground">Quantity to return:</label>
                          <input
                            type="number"
                            min="0"
                            max={availableQty}
                            value={returnItems[productId] || 0}
                            onChange={(e) => {
                              const value = Math.min(parseInt(e.target.value) || 0, availableQty);
                              setReturnItems({
                                ...returnItems,
                                [productId]: value
                              });
                            }}
                            className="w-24 px-3 py-2 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <button
                            onClick={() => setReturnItems({
                              ...returnItems,
                              [productId]: availableQty
                            })}
                            className="text-xs text-primary hover:underline"
                          >
                            Return All
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Return Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason for Return *
                </label>
                <textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g., Defective product, Customer changed mind, Wrong item..."
                  rows={3}
                  className="w-full px-4 py-3 bg-background border border-border text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Restore Inventory Option */}
              <div className="mb-6">
                <label className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={restoreInventory}
                    onChange={(e) => setRestoreInventory(e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Restore items to inventory</p>
                    <p className="text-sm text-muted-foreground">
                      Return items will be added back to stock
                    </p>
                  </div>
                </label>
              </div>

              {/* Refund Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Refund Method
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <input
                      type="radio"
                      name="refundMethod"
                      value="original"
                      checked={refundMethod === 'original'}
                      onChange={(e) => setRefundMethod(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Original Payment Method</p>
                      <p className="text-sm text-muted-foreground">
                        Refund to {selectedTransaction.payment_method}
                        {selectedTransaction.payment_method === 'card' && cardTerminalSettings?.enabled && 
                          ` via ${cardTerminalSettings.provider}`}
                      </p>
                    </div>
                  </label>

                  {selectedTransaction.customer_id && (
                    <label className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                      <input
                        type="radio"
                        name="refundMethod"
                        value="balance"
                        checked={refundMethod === 'balance'}
                        onChange={(e) => setRefundMethod(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Customer Balance</p>
                        <p className="text-sm text-muted-foreground">
                          Add to {selectedTransaction.customer_name}'s account balance
                        </p>
                      </div>
                    </label>
                  )}

                  <label className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-primary/50 transition-colors">
                    <input
                      type="radio"
                      name="refundMethod"
                      value="cash"
                      checked={refundMethod === 'cash'}
                      onChange={(e) => setRefundMethod(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Cash Refund</p>
                      <p className="text-sm text-muted-foreground">
                        Refund in cash from register (opens cash drawer)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Refund Total */}
              <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-medium">Total Refund Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    £{calculateReturnTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReturnModal(false)}
                  disabled={processingReturn}
                  className="flex-1 px-4 py-3 bg-muted hover:bg-accent text-foreground rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processReturn}
                  disabled={processingReturn}
                  className="flex-1 px-4 py-3 bg-primary hover:opacity-90 text-primary-foreground rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processingReturn ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5" />
                      Process Return
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Returns History Modal - FIXED with search and staff names */}
      {showReturnsHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Returns History</h2>
                  <p className="text-muted-foreground mt-1">{filteredReturns.length} returns found</p>
                </div>
                <button
                  onClick={() => setShowReturnsHistory(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Search Returns */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={returnSearchQuery}
                    onChange={(e) => setReturnSearchQuery(e.target.value)}
                    placeholder="Search returns by ID, transaction ID, reason, staff..."
                    className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {filteredReturns.length === 0 ? (
                <div className="text-center py-12">
                  <RotateCcw className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {returnSearchQuery ? 'No returns match your search' : 'No returns processed yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {filteredReturns.map((returnItem) => (
                    <div key={returnItem.id} className="p-4 bg-background rounded-lg border border-border hover:border-primary/30 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-foreground">
                              Return #{returnItem.id}
                            </span>
                            <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                              TXN {getTransactionIdDisplay(returnItem.transaction_id)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              returnItem.refund_method === 'card' ? 'bg-blue-500/10 text-blue-600' :
                              returnItem.refund_method === 'cash' ? 'bg-emerald-500/10 text-emerald-600' :
                              'bg-purple-500/10 text-purple-600'
                            } border`}>
                              {returnItem.refund_method}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(returnItem.created_at, true)}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-destructive">
                          -£{getSafeNumber(returnItem.total_refunded).toFixed(2)}
                        </p>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground mb-1">Items Returned:</p>
                        <div className="space-y-1">
                          {returnItem.items?.map((item: any, index: number) => (
                            <p key={index} className="text-sm text-foreground">
                              {item.product_name} × {item.quantity} = £{getSafeNumber(item.total).toFixed(2)}
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <p className="text-muted-foreground">Processed By</p>
                          <p className="font-medium text-foreground">{returnItem.processed_by || returnItem.staff_name || 'System'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Inventory Restored</p>
                          <p className={`font-medium ${returnItem.restore_inventory ? 'text-primary' : 'text-muted-foreground'}`}>
                            {returnItem.restore_inventory ? 'Yes' : 'No'}
                          </p>
                        </div>
                      </div>

                      {returnItem.reason && (
                        <div className="mb-3 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Reason:</p>
                          <p className="text-sm text-foreground">{returnItem.reason}</p>
                        </div>
                      )}

                      {returnItem.card_refund_id && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Card Refund ID: {returnItem.card_refund_id}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Print */}
      {showReceiptPrint && receiptData && (
        <ReceiptPrint
          data={receiptData}
          onClose={() => setShowReceiptPrint(false)}
        />
      )}

    </div>
  );
}
