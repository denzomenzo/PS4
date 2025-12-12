"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { ArrowLeft, TrendingUp, DollarSign, ShoppingBag, Users, Calendar, Loader2, Printer } from "lucide-react";
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
  customers?: { name: string } | null;
  staff?: { name: string } | null;
}

export default function Reports() {
  const userId = useUserId();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  // Analytics state
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [averageTransaction, setAverageTransaction] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [dailySales, setDailySales] = useState<any[]>([]);

  // Business settings for receipts
  const [businessSettings, setBusinessSettings] = useState<any>(null);

  useEffect(() => {
    if (userId) {
      loadData();
      loadBusinessSettings();
    }
  }, [userId]);

  const loadBusinessSettings = async () => {
    const { data } = await supabase
      .from("settings")
      .select("business_name, business_address, business_phone, business_email, receipt_logo_url, receipt_footer")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      setBusinessSettings(data);
    }
  };

  const loadData = async () => {
    if (!userId) return;
    
    setLoading(true);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log("Fetching transactions for user:", userId);
    console.log("From date:", thirtyDaysAgo.toISOString());

    const { data: transactionsData, error } = await supabase
      .from("transactions")
      .select(`
        *,
        customers (name),
        staff (name)
      `)
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    console.log("Transactions loaded:", transactionsData);
    console.log("Error:", error);

    if (transactionsData) {
      setTransactions(transactionsData as any);
      calculateAnalytics(transactionsData as any);
    }

    setLoading(false);
  };

  const calculateAnalytics = (data: Transaction[]) => {
    const revenue = data.reduce((sum, t) => sum + t.total, 0);
    setTotalRevenue(revenue);

    setTotalTransactions(data.length);

    setAverageTransaction(data.length > 0 ? revenue / data.length : 0);

    const items = data.reduce((sum, t) => {
      return sum + t.products.reduce((pSum, p) => pSum + (p.quantity || 1), 0);
    }, 0);
    setTotalItems(items);

    const productMap = new Map();
    data.forEach(t => {
      t.products.forEach(p => {
        const existing = productMap.get(p.id) || { name: p.name, icon: p.icon, quantity: 0, revenue: 0 };
        existing.quantity += p.quantity || 1;
        existing.revenue += p.total || p.price;
        productMap.set(p.id, existing);
      });
    });

    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    setTopProducts(sortedProducts);

    const dailyMap = new Map();
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, 0);
    }

    data.forEach(t => {
      const dateStr = t.created_at.split('T')[0];
      if (dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, dailyMap.get(dateStr) + t.total);
      }
    });

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, total]) => ({ date, total }))
      .reverse();
    setDailySales(dailyData);
  };

  const printReceipt = async (transaction: Transaction) => {
    setPrinting(true);

    try {
      // Create receipt HTML
      const receiptHTML = generateReceiptHTML(transaction);
      
      // Create hidden iframe for printing
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Could not access iframe document");

      iframeDoc.open();
      iframeDoc.write(receiptHTML);
      iframeDoc.close();

      // Wait for content to load, then print
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(iframe);
            setPrinting(false);
          }, 1000);
        }, 100);
      };
    } catch (error) {
      console.error("Print error:", error);
      alert("Error printing receipt");
      setPrinting(false);
    }
  };

  const generateReceiptHTML = (transaction: Transaction) => {
    const businessName = businessSettings?.business_name || "Demly POS";
    const businessAddress = businessSettings?.business_address || "";
    const businessPhone = businessSettings?.business_phone || "";
    const businessEmail = businessSettings?.business_email || "";
    const receiptFooter = businessSettings?.receipt_footer || "Thank you for your business!";
    const logoUrl = businessSettings?.receipt_logo_url || "";

    const date = new Date(transaction.created_at);
    const formattedDate = date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt #${transaction.id}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            padding: 10px;
            width: 80mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 16px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .item { margin: 6px 0; }
          .total-section {
            margin-top: 10px;
            border-top: 2px solid #000;
            padding-top: 8px;
          }
          .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 10px;
          }
          .logo {
            max-width: 150px;
            height: auto;
            margin: 10px auto;
            display: block;
          }
        </style>
      </head>
      <body>
        ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="Logo" />` : ''}
        
        <div class="center bold large">${businessName}</div>
        
        ${businessAddress ? `<div class="center" style="margin-top: 5px;">${businessAddress}</div>` : ''}
        ${businessPhone ? `<div class="center">${businessPhone}</div>` : ''}
        ${businessEmail ? `<div class="center">${businessEmail}</div>` : ''}
        
        <div class="divider"></div>
        
        <div class="row">
          <span>Receipt: #${transaction.id}</span>
        </div>
        <div class="row">
          <span>${formattedDate} ${formattedTime}</span>
        </div>
        
        ${transaction.staff?.name ? `<div class="row"><span>Staff: ${transaction.staff.name}</span></div>` : ''}
        ${transaction.customers?.name ? `<div class="row"><span>Customer: ${transaction.customers.name}</span></div>` : ''}
        
        <div class="divider"></div>
        
        ${transaction.products.map(item => `
          <div class="item">
            <div class="row">
              <span>${item.icon || ''} ${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}</span>
              <span class="bold">£${(item.total || item.price * item.quantity).toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
        
        <div class="total-section">
          <div class="row">
            <span>Subtotal:</span>
            <span>£${transaction.subtotal.toFixed(2)}</span>
          </div>
          ${transaction.vat > 0 ? `
          <div class="row">
            <span>VAT (20%):</span>
            <span>£${transaction.vat.toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="row bold large" style="margin-top: 6px;">
            <span>TOTAL:</span>
            <span>£${transaction.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">${receiptFooter}</div>
        
        <div style="height: 20px;"></div>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  const maxDailySale = Math.max(...dailySales.map(d => d.total), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
              Reports
            </h1>
            <p className="text-xl text-slate-400 mt-2 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Past 30 Days Analytics
            </p>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
            Back to POS
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-8 shadow-2xl shadow-emerald-500/10">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-12 h-12 text-emerald-400" />
              <TrendingUp className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-slate-300 text-lg mb-2 font-medium">Total Revenue</p>
            <p className="text-5xl font-black text-emerald-400">£{totalRevenue.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-8 shadow-2xl shadow-cyan-500/10">
            <div className="flex items-center justify-between mb-4">
              <ShoppingBag className="w-12 h-12 text-cyan-400" />
              <TrendingUp className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-slate-300 text-lg mb-2 font-medium">Transactions</p>
            <p className="text-5xl font-black text-cyan-400">{totalTransactions}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-8 shadow-2xl shadow-purple-500/10">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-12 h-12 text-purple-400" />
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-slate-300 text-lg mb-2 font-medium">Average Sale</p>
            <p className="text-5xl font-black text-purple-400">£{averageTransaction.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl border border-orange-500/30 rounded-3xl p-8 shadow-2xl shadow-orange-500/10">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-12 h-12 text-orange-400" />
              <TrendingUp className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-slate-300 text-lg mb-2 font-medium">Items Sold</p>
            <p className="text-5xl font-black text-orange-400">{totalItems}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Daily Sales Chart */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-cyan-400" />
              Daily Sales (30 Days)
            </h2>
            
            <div className="space-y-3">
              {dailySales.map((day, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400 font-medium">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="font-bold text-emerald-400">£{day.total.toFixed(2)}</span>
                  </div>
                  <div className="h-3 bg-slate-900/50 rounded-full overflow-hidden border border-slate-700/30">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/20"
                      style={{ width: `${(day.total / maxDailySale) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-3xl font-black mb-8 flex items-center gap-3">
              <ShoppingBag className="w-8 h-8 text-purple-400" />
              Top Products
            </h2>

            {topProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No sales data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div
                    key={index}
                    className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-xl p-5 hover:border-purple-500/50 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-purple-500/20">
                        {index + 1}
                      </div>
                      {product.icon && <span className="text-3xl">{product.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{product.name}</p>
                        <p className="text-sm text-slate-400">
                          {product.quantity} sold
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-emerald-400">
                          £{product.revenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Recent Transactions */}
        <div className="mt-8 bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-cyan-400" />
            Recent Transactions
          </h2>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No transactions in the past 30 days</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left py-4 px-4 font-bold text-slate-300">ID</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Date & Time</th>
                    <th className="text-left py-4 px-4 font-bold text-slate-300">Items</th>
                    <th className="text-right py-4 px-4 font-bold text-slate-300">Total</th>
                    <th className="text-center py-4 px-4 font-bold text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((transaction) => (
                    <tr key={transaction.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-all">
                      <td className="py-4 px-4 font-mono font-bold">#{transaction.id}</td>
                      <td className="py-4 px-4 text-slate-400">
                        {new Date(transaction.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          {transaction.products.slice(0, 5).map((p, i) => (
                            <span key={i} className="text-xl" title={p.name}>{p.icon}</span>
                          ))}
                          {transaction.products.length > 5 && (
                            <span className="text-sm text-slate-400">+{transaction.products.length - 5}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-xl font-black text-emerald-400">
                          £{transaction.total.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => printReceipt(transaction)}
                          disabled={printing}
                          className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-all disabled:opacity-50"
                          title="Print Receipt"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
