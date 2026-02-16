// app/dashboard/reports/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { getThermalPrinterManager } from "@/lib/thermalPrinter";
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
  TrendingUp as TrendingUpIcon,
  FileText,
  Percent,
  Receipt
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
  service_fee?: number;
  service_type_id?: number | null;
  services?: any[];
}

interface DailySales {
  date: string;
  total: number;
  transactions: number;
  average: number;
  vat: number;
}

interface TopProduct {
  id: number;
  name: string;
  icon: string;
  quantity: number;
  revenue: number;
}

interface VatSummary {
  totalVat: number;
  vatRate: number;
  vatEnabled: boolean;
}

// Helper function to get safe number
const getSafeNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export default function Reports() {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  // Settings
  const [vatEnabled, setVatEnabled] = useState(true);
  const [businessSettings, setBusinessSettings] = useState<any>(null);

  // Hardware settings for thermal printing
  const [hardwareSettings, setHardwareSettings] = useState<any>(null);

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
  const [vatSummary, setVatSummary] = useState<VatSummary>({
    totalVat: 0,
    vatRate: 20,
    vatEnabled: true
  });

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Receipt
  const [receiptData, setReceiptData] = useState<ReceiptPrintData | null>(null);
  const [showReceiptPrint, setShowReceiptPrint] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Scrollable container refs
  const topProductsRef = useRef<HTMLDivElement>(null);
  const dailySalesRef = useRef<HTMLDivElement>(null);
  const transactionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      loadData();
      loadSettings();
    }
  }, [userId, dateRange]);

  useEffect(() => {
    applyFilters();
  }, [transactions, startDate, endDate]);

  const loadSettings = async () => {
    try {
      // Load business settings
      const { data: settingsData } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (settingsData) {
        setBusinessSettings(settingsData);
        setVatEnabled(settingsData.vat_enabled !== false);
        setVatSummary(prev => ({
          ...prev,
          vatEnabled: settingsData.vat_enabled !== false,
          vatRate: settingsData.vat_rate || 20
        }));
      }

      // Load hardware settings
      const { data: hardwareData } = await supabase
        .from("hardware_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (hardwareData) {
        setHardwareSettings(hardwareData);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

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

    // VAT calculation
    const vatTotal = data.reduce((sum, t) => sum + (t.vat || 0), 0);
    setVatSummary(prev => ({
      ...prev,
      totalVat: vatTotal
    }));

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
      .slice(0, 20);
    setTopProducts(sortedProducts);

    // Daily sales
    const dailyMap = new Map<string, DailySales>();
    const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, total: 0, transactions: 0, average: 0, vat: 0 });
    }

    data.forEach(t => {
      const dateStr = t.created_at.split('T')[0];
      if (dailyMap.has(dateStr)) {
        const day = dailyMap.get(dateStr)!;
        day.total += t.total;
        day.transactions += 1;
        day.vat += t.vat || 0;
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

  // ========== THERMAL PRINTER FUNCTIONS ==========
  const printThermalReceipt = async (receiptData: ReceiptPrintData) => {
    if (!hardwareSettings?.printer_enabled) {
      return false;
    }

    try {
      const manager = getThermalPrinterManager();

      if (!manager.isConnected()) {
        console.warn('Thermal printer not connected');
        return false;
      }

      // Prepare items for thermal printer
      const items = receiptData.products.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        sku: item.sku
      }));

      // Update printer settings
      await (manager as any).initialize({
        width: hardwareSettings.printer_width || 80,
        connectionType: manager.getConnectionType() || 'usb',
        autoCut: hardwareSettings.auto_cut_paper !== false
      });

      const success = await manager.print({
        shopName: receiptData.businessInfo?.name || 'Your Business',
        shopAddress: receiptData.businessInfo?.address,
        shopPhone: receiptData.businessInfo?.phone,
        shopEmail: receiptData.businessInfo?.email,
        taxNumber: receiptData.businessInfo?.taxNumber,
        transactionId: receiptData.id,
        date: new Date(receiptData.createdAt),
        items: items,
        subtotal: receiptData.subtotal,
        vat: receiptData.vat,
        total: receiptData.total,
        paymentMethod: receiptData.paymentMethod,
        staffName: receiptData.staffName,
        customerName: receiptData.customer?.name,
        customerBalance: receiptData.balanceDeducted,
        notes: receiptData.notes,
        footer: receiptData.receiptSettings?.footer || 'Thank you for your business!',
        serviceName: receiptData.serviceName,
        serviceFee: receiptData.serviceFee
      });

      return success;

    } catch (error) {
      console.error("Thermal print error:", error);
      return false;
    }
  };

  const printReceipt = async (transaction: Transaction) => {
    setPrinting(true);
    
    try {
      const { data: settings } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      // Get service info
      const serviceInfo = transaction.services && transaction.services.length > 0 
        ? transaction.services[0] 
        : transaction.service_type_id 
        ? { name: 'Service', fee: transaction.service_fee || 0 }
        : null;

      const receiptData: ReceiptPrintData = {
        id: transaction.id.toString(),
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
        balanceDeducted: getSafeNumber(transaction.balance_deducted),
        paymentDetails: transaction.payment_details,
        staffName: transaction.staff?.name || undefined,
        notes: transaction.notes || undefined,
        serviceName: serviceInfo?.name,
        serviceFee: serviceInfo?.fee
      };

      setReceiptData(receiptData);
      setShowReceiptPrint(true);
      
      // Try thermal printing if enabled
      if (hardwareSettings?.printer_enabled) {
        try {
          await printThermalReceipt(receiptData);
        } catch (printError) {
          console.warn('Thermal printing failed, showing preview:', printError);
        }
      }

    } catch (error) {
      console.error("Error generating receipt:", error);
      alert("Error generating receipt");
    } finally {
      setPrinting(false);
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const badges: any = {
      cash: { icon: DollarSign, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      card: { icon: DollarSign, color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      balance: { icon: Users, color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
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
    const headers = [
      "ID", "Date", "Time", "Customer", "Staff", "Subtotal", 
      "VAT", "Total", "Payment Method", "Service Fee", "Items", 
      "Return Status", "Return Amount", "Notes"
    ];
    
    const rows = filteredTransactions.map(t => {
      const serviceInfo = t.services && t.services.length > 0 ? t.services[0] : null;
      
      return [
        t.id,
        new Date(t.created_at).toLocaleDateString(),
        new Date(t.created_at).toLocaleTimeString(),
        t.customers?.name || "",
        t.staff?.name || "",
        (t.subtotal || 0).toFixed(2),
        (t.vat || 0).toFixed(2),
        (t.total || 0).toFixed(2),
        t.payment_method || "cash",
        (t.service_fee || 0).toFixed(2),
        t.products.map(p => `${p.name} (x${p.quantity || 1})`).join("; "),
        t.return_status || "none",
        (t.returned_amount || 0).toFixed(2),
        t.notes || ""
      ];
    });

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

  // Download VAT report for the last 30 days
  const downloadVATReport = () => {
    const last30DaysTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return transactionDate >= thirtyDaysAgo;
    });

    const totalRevenue = last30DaysTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const totalVAT = last30DaysTransactions.reduce((sum, t) => sum + (t.vat || 0), 0);
    const totalReturns = last30DaysTransactions.reduce((sum, t) => sum + (t.returned_amount || 0), 0);
    const netRevenue = totalRevenue - totalReturns;
    const transactionCount = last30DaysTransactions.length;

    // Group by day for daily breakdown
    const dailyBreakdown = last30DaysTransactions.reduce((acc: any, t) => {
      const date = new Date(t.created_at).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = {
          date,
          transactions: 0,
          revenue: 0,
          vat: 0,
          returns: 0
        };
      }
      acc[date].transactions++;
      acc[date].revenue += t.total || 0;
      acc[date].vat += t.vat || 0;
      acc[date].returns += t.returned_amount || 0;
      return acc;
    }, {});

    const dailyRows = Object.values(dailyBreakdown).map((day: any) => [
      day.date,
      day.transactions,
      `£${day.revenue.toFixed(2)}`,
      `£${day.vat.toFixed(2)}`,
      `£${day.returns.toFixed(2)}`,
      `£${(day.revenue - day.returns).toFixed(2)}`
    ]);

    const headers = [
      "VAT REPORT - LAST 30 DAYS",
      `Generated: ${new Date().toLocaleString()}`,
      `VAT Rate: ${vatSummary.vatRate}%`,
      "",
      "SUMMARY",
      `Total Transactions: ${transactionCount}`,
      `Gross Revenue: £${totalRevenue.toFixed(2)}`,
      `Total VAT Collected: £${totalVAT.toFixed(2)}`,
      `Total Returns: £${totalReturns.toFixed(2)}`,
      `Net Revenue (after returns): £${netRevenue.toFixed(2)}`,
      `VAT Payable: £${totalVAT.toFixed(2)}`,
      "",
      "DAILY BREAKDOWN",
      "Date,Transactions,Revenue,VAT,Returns,Net Revenue"
    ];

    const csvContent = [
      ...headers,
      ...dailyRows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vat-report-${new Date().toISOString().split("T")[0]}.csv`;
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
          {vatEnabled && (
            <button
              onClick={downloadVATReport}
              className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
            >
              <Percent className="w-4 h-4" />
              VAT Report (30 days)
            </button>
          )}
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

      {/* VAT Summary Card (if enabled) */}
      {vatEnabled && (
        <div className="mb-6 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Percent className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">VAT Summary ({vatSummary.vatRate}%)</h2>
                <p className="text-sm text-muted-foreground">Total VAT collected in this period</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-600">£{vatSummary.totalVat.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">VAT payable to HMRC</p>
            </div>
          </div>
        </div>
      )}

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
        
        {/* Daily Sales Chart - Scrollable */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Daily Sales</h2>
              <p className="text-sm text-muted-foreground">{dateRange === '7days' ? '7' : dateRange === '30days' ? '30' : '90'} day period</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Revenue</span>
              {vatEnabled && (
                <>
                  <div className="w-3 h-3 bg-purple-500 rounded-full ml-2"></div>
                  <span className="text-sm text-muted-foreground">VAT</span>
                </>
              )}
            </div>
          </div>

          <div 
            ref={dailySalesRef}
            className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/30"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--primary) var(--background)'
            }}
          >
            {dailySales.map((day, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{day.transactions} sales</span>
                    {vatEnabled && (
                      <span className="text-purple-500">VAT: £{day.vat.toFixed(2)}</span>
                    )}
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

        {/* Top Products - Scrollable */}
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
            <div 
              ref={topProductsRef}
              className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/30"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--primary) var(--background)'
              }}
            >
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

      {/* Recent Transactions - Scrollable */}
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
          <div 
            ref={transactionsRef}
            className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/30"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--primary) var(--background)'
            }}
          >
            <table className="w-full">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Transaction</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Date & Time</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Customer</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Payment</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-foreground">VAT</th>
                  <th className="text-right py-4 px-4 font-semibold text-foreground">Total</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => {
                  const serviceInfo = transaction.services && transaction.services.length > 0 
                    ? transaction.services[0] 
                    : transaction.service_type_id 
                    ? { name: 'Service', fee: transaction.service_fee || 0 }
                    : null;

                  return (
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
                        {serviceInfo && (
                          <span className="ml-2 text-xs text-primary">+{serviceInfo.name}</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {getReturnStatusBadge(transaction.return_status)}
                      </td>
                      <td className="py-4 px-4">
                        {vatEnabled ? (
                          <span className="text-purple-600 font-medium">£{(transaction.vat || 0).toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-foreground">
                          £{(transaction.total || 0).toFixed(2)}
                        </span>
                        {(transaction.returned_amount || 0) > 0 && (
                          <div className="text-xs text-destructive">
                            -£{(transaction.returned_amount || 0).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => printReceipt(transaction)}
                          disabled={printing}
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          title="Print Receipt"
                        >
                          {printing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Printer className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
