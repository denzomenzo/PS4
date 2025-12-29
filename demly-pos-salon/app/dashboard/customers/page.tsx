"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { ArrowLeft, Plus, Search, Edit2, Trash2, X, Mail, Phone, User, Loader2, Users, Wallet, TrendingUp, TrendingDown } from "lucide-react";
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

export default function Customers() {
  const userId = useUserId();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [balanceCustomer, setBalanceCustomer] = useState<Customer | null>(null);

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

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredCustomers(
        customers.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.phone?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query)
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

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      
      if (error) {
        console.error("Error loading customers:", error);
      } else {
        if (data) {
          setCustomers(data);
          setFilteredCustomers(data);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
    
    setLoading(false);
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
    setFormBalance((customer.balance ?? 0).toString());
    setShowModal(true);
  };

  const openBalanceModal = (customer: Customer) => {
    setBalanceCustomer(customer);
    setBalanceAction("add");
    setBalanceAmount("");
    setBalanceNote("");
    setShowBalanceModal(true);
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

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update({
            name: formName,
            phone: formPhone || null,
            email: formEmail || null,
            notes: formNotes || null,
            balance: parseFloat(formBalance) || 0,
          })
          .eq("id", editingCustomer.id);

        if (error) {
          console.error("Error updating customer:", error);
          alert("Error updating customer: " + error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("customers").insert({
          user_id: user.id,
          name: formName,
          phone: formPhone || null,
          email: formEmail || null,
          notes: formNotes || null,
          balance: parseFloat(formBalance) || 0,
        });

        if (error) {
          console.error("Error adding customer:", error);
          alert("Error adding customer: " + error.message);
          return;
        }
      }

      setShowModal(false);
      loadCustomers();
    } catch (error) {
      console.error("Error:", error);
      alert("Error saving customer");
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
    const currentBalance = balanceCustomer.balance ?? 0;
    const newBalance = balanceAction === "add" 
      ? currentBalance + amount 
      : currentBalance - amount;

    try {
      const { error } = await supabase
        .from("customers")
        .update({ balance: newBalance })
        .eq("id", balanceCustomer.id);

      if (error) {
        console.error("Error updating balance:", error);
        alert("Error updating balance: " + error.message);
        return;
      }

      // Log balance transaction
      await supabase.from("customer_balance_history").insert({
        user_id: userId,
        customer_id: balanceCustomer.id,
        amount: balanceAction === "add" ? amount : -amount,
        previous_balance: currentBalance,
        new_balance: newBalance,
        note: balanceNote || null,
      });

      // Update the balanceCustomer state with the new balance
      setBalanceCustomer({
        ...balanceCustomer,
        balance: newBalance
      });

      // Reset the form
      setBalanceAmount("");
      setBalanceNote("");

      alert(`✅ Balance ${balanceAction === "add" ? "added" : "deducted"} successfully!`);
      
      // Reload customers to update the main list
      loadCustomers();
    } catch (error) {
      console.error("Error:", error);
      alert("Error adjusting balance");
    }
  };

  const deleteCustomer = async (id: number) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);

      if (error) {
        console.error("Error deleting customer:", error);
        alert("Error deleting customer: " + error.message);
        return;
      }

      loadCustomers();
    } catch (error) {
      console.error("Error:", error);
      alert("Error deleting customer");
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

  const totalBalance = customers.reduce((sum, c) => sum + (c.balance ?? 0), 0);
  const customersWithBalance = customers.filter(c => (c.balance ?? 0) > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-emerald-400">
              Customers
            </h1>
            <p className="text-xl text-slate-400 mt-2 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {customers.length} total customers
            </p>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xl text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
            Back to POS
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-cyan-400" />
              <p className="text-slate-300 font-bold">Total Customers</p>
            </div>
            <p className="text-5xl font-black text-cyan-400">{customers.length}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-8 h-8 text-emerald-400" />
              <p className="text-slate-300 font-bold">Total Balance</p>
            </div>
            <p className="text-5xl font-black text-emerald-400">£{totalBalance.toFixed(2)}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-purple-400" />
              <p className="text-slate-300 font-bold">With Balance</p>
            </div>
            <p className="text-5xl font-black text-purple-400">{customersWithBalance}</p>
          </div>
        </div>

        {/* Search & Add */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 pl-16 pr-6 py-5 rounded-2xl text-xl placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-xl"
            />
          </div>
          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 px-8 py-5 rounded-2xl font-bold text-xl transition-all flex items-center gap-3 shadow-2xl shadow-cyan-500/20 hover:shadow-cyan-500/40 whitespace-nowrap"
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
            filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 hover:border-cyan-500/50 transition-all group shadow-xl"
              >
                {/* Customer Avatar */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shadow-cyan-500/20">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEditModal(customer)}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteCustomer(customer.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Customer Info */}
                <h3 className="text-2xl font-bold mb-3">{customer.name}</h3>

                <div className="space-y-2 mb-4">
                  {customer.phone && (
                    <div className="flex items-center gap-3 text-slate-400">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-3 text-slate-400">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.notes && (
                    <div className="mt-3 p-3 bg-slate-700/30 rounded-xl border border-slate-600/30">
                      <p className="text-sm text-slate-300 line-clamp-2">{customer.notes}</p>
                    </div>
                  )}
                </div>

                {/* Balance Section */}
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm text-slate-400 font-medium">Balance</span>
                    </div>
                    <span className={`text-2xl font-black ${
                      (customer.balance ?? 0) > 0 ? "text-emerald-400" : "text-slate-500"
                    }`}>
                      £{(customer.balance ?? 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => openBalanceModal(customer)}
                    className="w-full bg-gradient-to-r from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 border border-emerald-500/30 text-emerald-400 py-2 rounded-xl font-bold text-sm transition-all"
                  >
                    Manage Balance
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500">
                    Added {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full border border-slate-700/50 shadow-2xl">
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
                <p className="text-sm text-slate-400 mt-2">Optional: Add prepaid balance for this customer</p>
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

            <div className="bg-slate-800/50 rounded-xl p-5 mb-6 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-white text-lg">{balanceCustomer.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current Balance:</span>
                <span className="text-3xl font-black text-emerald-400">
                  £{(balanceCustomer.balance ?? 0).toFixed(2)}
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
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-2xl text-center font-bold focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  autoFocus
                />
              </div>

              {balanceAmount && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">Current Balance:</span>
                    <span className="font-bold">£{(balanceCustomer.balance ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">
                      {balanceAction === "add" ? "Adding:" : "Deducting:"}
                    </span>
                    <span className={balanceAction === "add" ? "text-emerald-400" : "text-red-400"}>
                      {balanceAction === "add" ? "+" : "-"}£{parseFloat(balanceAmount || "0").toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-slate-700/50 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-bold">New Balance:</span>
                      <span className="text-xl font-black text-cyan-400">
                        £{(
                          (balanceCustomer.balance ?? 0) + 
                          (balanceAction === "add" ? 1 : -1) * parseFloat(balanceAmount || "0")
                        ).toFixed(2)}
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
                  placeholder="e.g., Prepayment, Refund, etc."
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
    </div>
  );
}







