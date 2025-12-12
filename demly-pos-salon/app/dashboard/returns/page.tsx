"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { ArrowLeft, Search, RotateCcw, Check, X, Loader2, Receipt, AlertCircle } from "lucide-react";
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

interface Return {
  id: number;
  transaction_id: number;
  created_at: string;
  items: any[];
  refund_amount: number;
  reason: string;
  status: string;
}

export default function Returns() {
  const userId = useUserId();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ [key: number]: boolean }>({});
  const [returnReason, setReturnReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    if (!userId) return;
    
    setLoading(true);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log("Loading returns data for user:", userId);

    // Load transactions with joins
    const { data: transactionsData, error: transError } = await supabase
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
    console.log("Transaction error:", transError);

    if (transactionsData) setTransactions(transactionsData as any);

    // Load returns
    const { data: returnsData, error: returnError } = await supabase
      .from("returns")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    console.log("Returns loaded:", returnsData);
    console.log("Returns error:", returnError);

    if (returnsData) setReturns(returnsData as any);

    setLoading(false);
  };

  const openReturnModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setSelectedItems({});
    setReturnReason("");
    setShowReturnModal(true);
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const calculateRefundAmount = () => {
    if (!selectedTransaction) return 0;
    
    let refundSubtotal = 0;
    selectedTransaction.products.forEach((product, index) => {
      if (selectedItems[index]) {
        refundSubtotal += product.total || (product.price * product.quantity);
      }
    });

    const refundVat = refundSubtotal * 0.2;
    return refundSubtotal + refundVat;
  };

  const processReturn = async () => {
    if (!selectedTransaction) return;
    
    const selectedCount = Object.values(selectedItems).filter(Boolean).length;
    if (selectedCount === 0) {
      alert("Please select at least one item to return");
      return;
    }

    if (!returnReason.trim()) {
      alert("Please provide a reason for the return");
      return;
    }

    setProcessing(true);

    try {
      const returnItems = selectedTransaction.products
        .filter((_, index) => selectedItems[index])
        .map(product => ({
          id: product.id,
          name: product.name,
          quantity: product.quantity,
          price: product.price,
          icon: product.icon || "",
          total: product.total || (product.price * product.quantity)
        }));

      const refundAmount = calculateRefundAmount();

      console.log("Creating return:", {
        user_id: userId,
        transaction_id: selectedTransaction.id,
        items: returnItems,
        refund_amount: refundAmount,
        reason: returnReason,
        status: "completed"
      });

      const { data, error } = await supabase
        .from("returns")
        .insert({
          user_id: userId,
          transaction_id: selectedTransaction.id,
          items: returnItems,
          refund_amount: refundAmount,
          reason: returnReason,
          status: "completed"
        })
        .select()
        .single();

      if (error) {
        console.error("Return insert error:", error);
        throw error;
      }

      console.log("Return created:", data);

      // Update stock quantities for returned products
      for (const item of returnItems) {
        // Get current product stock
        const { data: productData } = await supabase
          .from("products")
          .select("stock_quantity, track_inventory")
          .eq("id", item.id)
          .single();

        if (productData && productData.track_inventory) {
          const newStock = productData.stock_quantity + item.quantity;
          
          const { error: stockError } = await supabase
            .from("products")
            .update({ stock_quantity: newStock })
            .eq("id", item.id);
          
          if (stockError) {
            console.error("Stock update error:", stockError);
          } else {
            console.log(`Updated stock for product ${item.id}: ${productData.stock_quantity} -> ${newStock}`);
          }
        }
      }

      alert(`✅ Return processed successfully!\nRefund amount: £${refundAmount.toFixed(2)}`);
      setShowReturnModal(false);
      loadData();
    } catch (error: any) {
      console.error("Return error:", error);
      alert("❌ Error processing return: " + (error.message || "Please try again"));
    } finally {
      setProcessing(false);
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.id.toString().includes(searchQuery)
  );

  if (!userId) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-xl text-slate-400">Loading returns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">
            Returns & Refunds
          </h1>
          <Link href="/" className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
            Back to POS
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <p className="text-slate-400 mb-2 font-medium">Total Returns</p>
            <p className="text-5xl font-black text-cyan-400">{returns.length}</p>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <p className="text-slate-400 mb-2 font-medium">Total Refunded</p>
            <p className="text-5xl font-black text-emerald-400">
              £{returns.reduce((sum, r) => sum + r.refund_amount, 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
            <p className="text-slate-400 mb-2 font-medium">Recent Transactions</p>
            <p className="text-5xl font-black text-purple-400">{transactions.length}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
            <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
              <Receipt className="w-8 h-8 text-cyan-400" />
              Recent Transactions (30 Days)
            </h2>

            <div className="relative mb-6">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by transaction ID..."
                className="w-full bg-slate-900/50 border border-slate-700/50 pl-14 pr-5 py-4 rounded-xl text-base text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Receipt className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No transactions found</p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-xl p-5 hover:border-cyan-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg">Transaction #{transaction.id}</p>
                        <p className="text-sm text-slate-400">
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-2xl font-black text-emerald-400">
                        £{transaction.total.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      {transaction.products.map((product, index) => (
                        <div key={index} className="text-2xl">{product.icon}</div>
                      ))}
                      <span className="text-sm text-slate-400">
                        {transaction.products.length} item{transaction.products.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <button
                      onClick={() => openReturnModal(transaction)}
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Initiate Return
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8">
            <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
              <RotateCcw className="w-8 h-8 text-emerald-400" />
              Returns History
            </h2>

            <div className="space-y-4 max-h-[680px] overflow-y-auto">
              {returns.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <RotateCcw className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No returns yet</p>
                </div>
              ) : (
                returns.map((returnItem) => (
                  <div
                    key={returnItem.id}
                    className="bg-slate-900/50 backdrop-blur-lg border border-emerald-700/30 rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg flex items-center gap-2">
                          <Check className="w-5 h-5 text-emerald-400" />
                          Return #{returnItem.id}
                        </p>
                        <p className="text-sm text-slate-400">
                          Original: Transaction #{returnItem.transaction_id}
                        </p>
                        <p className="text-sm text-slate-400">
                          {new Date(returnItem.created_at).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-2xl font-black text-emerald-400">
                        -£{returnItem.refund_amount.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-slate-400 mb-2">Items Returned:</p>
                      {returnItem.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm mb-1">
                          <span>{item.icon} {item.name} × {item.quantity}</span>
                          <span className="text-slate-400">£{item.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-400">
                        <span className="font-bold text-orange-400">Reason:</span> {returnItem.reason}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {showReturnModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-3xl w-full border border-slate-700/50 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Process Return</h2>
              <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Transaction ID</p>
                  <p className="text-xl font-bold">#{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-slate-400">Date</p>
                  <p className="text-xl font-bold">
                    {new Date(selectedTransaction.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Original Total</p>
                  <p className="text-xl font-bold text-emerald-400">
                    £{selectedTransaction.total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold mb-4">Select Items to Return</h3>
              <div className="space-y-3">
                {selectedTransaction.products.map((product, index) => (
                  <label
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedItems[index]
                        ? "bg-orange-500/20 border-orange-500"
                        : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedItems[index] || false}
                      onChange={() => toggleItemSelection(index)}
                      className="w-6 h-6 accent-orange-500"
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {product.icon && <span className="text-3xl">{product.icon}</span>}
                        <div>
                          <p className="font-bold text-lg">{product.name}</p>
                          <p className="text-sm text-slate-400">
                            Quantity: {product.quantity} × £{product.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <p className="text-2xl font-black text-emerald-400">
                        £{(product.total || product.price * product.quantity).toFixed(2)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-lg font-bold mb-3">Reason for Return</label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Please provide a reason..."
                rows={3}
                className="w-full bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-base focus:outline-none focus:border-orange-500 transition-all"
              />
            </div>

            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">Refund Amount</span>
                <span className="text-4xl font-black text-orange-400">
                  £{calculateRefundAmount().toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowReturnModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-xl text-lg font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={processReturn}
                disabled={processing || Object.values(selectedItems).filter(Boolean).length === 0}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 py-4 rounded-xl text-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-orange-500/20"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    Process Return
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
