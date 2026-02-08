// app/dashboard/reports/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import ReceiptPrint, { ReceiptData as ReceiptPrintData } from "@/components/receipts/ReceiptPrint";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  Calendar,
  Loader2,
  Printer,
  BarChart3,
  TrendingDown,
  Clock,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  PieChart,
  TrendingUp as TrendingUpIcon
} from "lucide-react";
import Link from "next/link";

interface Transaction {
  id: number;
  created_at: string;
  total: number;
  subtotal: number;
  vat: number;
  products: any[];
  customer_id: number | null;
  staff_id: number | null;
  payment_method: string;
  payment_details: any;
  balance_deducted: number;
  notes: string | null;
  customers?: { name: string } | null;
  staff?: { name: string } | null;
  return_status: 'none' | 'partial' | 'full';
  returned_amount: number;
}

interface DailySales {
  date: string;
  total: number;
  transactions: number;
  average: number;
}

interface TopProduct {
  id: number;
  name: string;
  icon: string;
  quantity: number;
  revenue: number;
}

export default function Reports() {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  // Analytics
  const [dateRange, setDateRange] = useState<string>('30days');
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [averageTransaction, setAverageTransaction] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalReturns, setTotalReturns] = useState(0);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any>({});

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Receipt
  const [receiptData, setReceiptData] = useState<ReceiptPrintData | null>(null);
  const [showReceiptPrint, setShowReceiptPrint] = useState(false);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, dateRange]);

  useEffect(() => {
    applyFilters();
  }, [transactions, startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const date = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7days':
          startDate.setDate(date.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(date.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(date.getDate() - 90);
          break;
        case 'all':
          startDate.setFullYear(2000);
          break;
      }

      // Load transactions
      const { data: transactionsData, error: transError } = await supabase
        .from("transactions")
        .select(`
          *,
          customers:customer_id (name),
          staff:staff_id (name)
        `)
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (transError) throw transError;

      const formattedTransactions = (transactionsData || []).map(t => ({
        ...t,
        return_status: t.returned_amount > 0 
          ? (t.returned_amount >= t.total ? 'full' : 'partial')
          : 'none'
      }));

      setTransactions(formattedTransactions as any);
      setFilteredTransactions(formattedTransactions as any);
      
      // Calculate analytics
      calculateAnalytics(formattedTransactions as any);

    } catch (error) {
      console.error("Error loading reports:", error);
      setError("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (data: Transaction[]) => {
    // Revenue
    const revenue = data.reduce((sum, t) => sum + t.total, 0);
    setTotalRevenue(revenue);

    // Transactions
    setTotalTransactions(data.length);
    setAverageTransaction(data.length > 0 ? revenue / data.length : 0);

    // Items sold
    const items = data.reduce((sum, t) => {
      return sum + t.products.reduce((pSum, p) => pSum + (p.quantity || 1), 0);
    }, 0);
    setTotalItems(items);

    // Returns
    const returns = data.reduce((sum, t) => sum + (t.returned_amount || 0), 0);
    setTotalReturns(returns);

    // Top products
    const productMap = new Map<number, TopProduct>();
    data.forEach(t => {
      t.products.forEach(p => {
        if (!p.id) return;
        
        const existing = productMap.get(p.id) || { 
          id: p.id, 
          name: p.name, 
          icon: p.icon || "📦", 
          quantity: 0, 
          revenue: 0 
        };
        existing.quantity += p.quantity || 1;
        existing.revenue += (p.total || (p.price * p.quantity));
        productMap.set(p.id, existing);
      });
    });

    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    setTopProducts(sortedProducts);

    // Daily sales
    const dailyMap = new Map<string, DailySales>();
    const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, total: 0, transactions: 0, average: 0 });
    }

    data.forEach(t => {
      const dateStr = t.created_at.split('T')[0];
      if (dailyMap.has(dateStr)) {
        const day = dailyMap.get(dateStr)!;
        day.total += t.total;
        day.transactions += 1;
        dailyMap.set(dateStr, day);
      }
    });

    // Calculate averages
    dailyMap.forEach((day) => {
      day.average = day.transactions > 0 ? day.total / day.transactions : 0;
    });

    const dailyData = Array.from(dailyMap.entries())
      .map(([_, day]) => day)
      .reverse();
    setDailySales(dailyData);

    // Payment methods
    const paymentMap = new Map<string, number>();
    data.forEach(t => {
      const method = t.payment_method || 'cash';
      paymentMap.set(method, (paymentMap.get(method) || 0) + t.total);
    });
    setPaymentMethods(Object.fromEntries(paymentMap));
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Custom date range
    if (startDate) {
      filtered = filtered.filter(t => new Date(t.created_at) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(t => new Date(t.created_at) <= new Date(endDate + 'T23:59:59'));
    }

    setFilteredTransactions(filtered);
    calculateAnalytics(filtered);
  };

  const printReceipt = async (transaction: Transaction) => {
    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      const receiptData: ReceiptPrintData = {
        id: transaction.id.toString(),
        createdAt: transaction.created_at,
        subtotal: transaction.subtotal,
        vat: transaction.vat,
        total: transaction.total,
        paymentMethod: transaction.payment_method as any,
        products: transaction.products.map(p => ({
          id: p.id.toString(),
          name: p.name,
          price: p.price,
          quantity: p.quantity,
          discount: p.discount || 0,
          total: (p.price * p.quantity) - (p.discount || 0),
          sku: p.sku,
          barcode: p.barcode
        })),
        customer: transaction.customers ? {
          id: transaction.customer_id?.toString() || '',
          name: transaction.customers.name,
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
        balanceDeducted: transaction.balance_deducted,
        paymentDetails: transaction.payment_details,
        staffName: transaction.staff?.name || undefined,
        notes: transaction.notes || undefined
      };

      setReceiptData(receiptData);
      setShowReceiptPrint(true);
    } catch (error) {
      console.error("Error generating receipt:", error);
      alert("Error generating receipt");
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const badges: any = {
      cash: { icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      card: { icon: DollarSign, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      balance: { icon: User, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
      split: { icon: DollarSign, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' }
    };

    const badge = badges[method] || badges.cash;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${badge.color}`}>
        {method.charAt(0).toUpperCase() + method.slice(1)}
      </span>
    );
  };

  const getReturnStatusBadge = (status: string) => {
    const badges: any = {
      none: { icon: CheckCircle, color: 'bg-primary/10 text-primary border-primary/20', label: 'Completed' },
      partial: { icon: AlertCircle, color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', label: 'Partial Return' },
      full: { icon: XCircle, color: 'bg-destructive/10 text-destructive border-destructive/20', label: 'Returned' }
    };

    const badge = badges[status] || badges.none;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ["ID", "Date", "Time", "Customer", "Staff", "Subtotal", "VAT", "Total", "Payment Method", "Items", "Return Status", "Return Amount"];
    
    const rows = filteredTransactions.map(t => [
      t.id,
      new Date(t.created_at).toLocaleDateString(),
      new Date(t.created_at).toLocaleTimeString(),
      t.customers?.name || "",
      t.staff?.name || "",
      t.subtotal.toFixed(2),
      t.vat.toFixed(2),
      t.total.toFixed(2),
      t.payment_method,
      t.products.map(p => `${p.name} (x${p.quantity})`).join("; "),
      t.return_status,
      (t.returned_amount || 0).toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-8">
        <div className="bg-card/50 backdrop-blur-xl rounded-xl p-8 max-w-md border border-border">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Error Loading Reports</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxDailySale = Math.max(...dailySales.map(d => d.total), 1);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Track your sales performance and business metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">£{totalRevenue.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold text-foreground">{totalTransactions}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Sale</p>
              <p className="text-2xl font-bold text-foreground">£{averageTransaction.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <TrendingUpIcon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
              <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Returns</p>
              <p className="text-2xl font-bold text-foreground">£{totalReturns.toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Net Revenue</p>
              <p className="text-2xl font-bold text-foreground">£{(totalRevenue - totalReturns).toFixed(2)}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              Custom Date Range
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <button
              onClick={loadData}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Custom Date Range */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
              >
                Apply
              </button>
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  applyFilters();
                }}
                className="flex-1 bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Daily Sales Chart */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Daily Sales</h2>
              <p className="text-sm text-muted-foreground">{dateRange === '7days' ? '7' : dateRange === '30days' ? '30' : '90'} day period</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
          </div>

          <div className="space-y-4">
            {dailySales.map((day, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{day.transactions} sales</span>
                    <span className="font-bold text-emerald-500">£{day.total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${(day.total / maxDailySale) * 100}%` }}
                  ></div>
                </div>
                {day.average > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: £{day.average.toFixed(2)} per transaction
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Top Products</h2>
            <div className="text-sm text-muted-foreground">By revenue</div>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-3">No sales data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="bg-background border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-primary">{index + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {product.quantity} sold
                          </span>
                          <span className="text-xs text-emerald-500 font-medium">
                            £{product.revenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mt-6 bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
            <p className="text-sm text-muted-foreground">
              {filteredTransactions.length} transactions in current view
            </p>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-3">No transactions found</p>
            {transactions.length > 0 ? (
              <p className="text-sm text-muted-foreground mb-3">Try adjusting your filters</p>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Transaction</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Date & Time</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Customer</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Payment</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-right py-4 px-4 font-semibold text-foreground">Total</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.slice(0, 20).map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-4 font-medium text-foreground">#{transaction.id}</td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 px-4">
                      {transaction.customers?.name || (
                        <span className="text-muted-foreground">Walk-in</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {getPaymentMethodBadge(transaction.payment_method)}
                    </td>
                    <td className="py-4 px-4">
                      {getReturnStatusBadge(transaction.return_status)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="font-bold text-foreground">
                        £{transaction.total.toFixed(2)}
                      </span>
                      {transaction.returned_amount > 0 && (
                        <div className="text-xs text-destructive">
                          -£{transaction.returned_amount.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => printReceipt(transaction)}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        title="Print Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

