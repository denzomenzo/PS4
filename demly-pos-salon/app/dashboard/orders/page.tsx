// app/dashboard/orders/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ShoppingBag,
  Truck,
  RefreshCw,
  ExternalLink,
  Download,
  Printer,
  MessageSquare,
  Phone,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Bell
} from "lucide-react";
import { syncShopifyOrders } from "@/lib/integrations/shopify";

interface Order {
  id: number;
  external_order_id: string;
  source: 'shopify' | 'deliveroo' | 'justeat' | 'pos';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled';
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    sku?: string;
    notes?: string;
  }>;
  subtotal: number;
  vat: number;
  delivery_fee: number;
  service_fee: number;
  tip: number;
  total: number;
  notes: string | null;
  scheduled_for: string | null;
  driver_info: any;
  metadata: any;
  external_created_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Integration {
  id: number;
  app_slug: string;
  app_name: string;
  status: string;
  settings: any;
}

export default function OrdersPage() {
  const userId = useUserId();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showNewOrders, setShowNewOrders] = useState<Order[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>("today");
  
  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    today: 0,
    total: 0
  });

  // Load data
  const loadData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // Load integrations
      const { data: integrationsData } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "connected");
      
      setIntegrations(integrationsData || []);

      // Load orders with date filter
      const now = new Date();
      const startDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'all':
          startDate.setFullYear(2000);
          break;
      }

      const { data: ordersData, error } = await supabase
        .from("external_orders")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(ordersData || []);

      // Check for new orders since last visit
      const lastVisit = localStorage.getItem('orders_last_visit');
      if (lastVisit) {
        const newOrders = (ordersData || []).filter(order => 
          new Date(order.created_at) > new Date(lastVisit)
        );
        if (newOrders.length > 0) {
          setShowNewOrders(newOrders);
        }
      }
      
      // Update last visit time
      localStorage.setItem('orders_last_visit', new Date().toISOString());

    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, dateFilter]);

  useEffect(() => {
    if (userId) {
      loadData();
      
      // Set up real-time subscription for new orders
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'external_orders',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('New order received:', payload.new);
            // Add new order to the list
            setOrders(prev => [payload.new as Order, ...prev]);
            
            // Show notification for new order
            const newOrder = payload.new as Order;
            setShowNewOrders(prev => [newOrder, ...prev]);
            
            // Play notification sound
            playNotificationSound();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId, loadData]);

  useEffect(() => {
    filterOrders();
    calculateStats();
  }, [orders, searchQuery, statusFilter, sourceFilter]);

  const filterOrders = () => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.external_order_id?.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.customer_phone?.toLowerCase().includes(query) ||
        order.customer_email?.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter(order => order.source === sourceFilter);
    }

    setFilteredOrders(filtered);
  };

  const calculateStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(o => o.created_at.startsWith(today));
    
    const stats = {
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      today: todayOrders.length,
      total: orders.length
    };

    setStats(stats);
  };

  const handleSync = async (appSlug: string) => {
    setSyncing(appSlug);
    try {
      const integration = integrations.find(i => i.app_slug === appSlug);
      
      if (!integration) {
        throw new Error('Integration not found');
      }

      switch (appSlug) {
        case 'shopify':
          await syncShopifyOrders(userId!, integration.settings);
          break;
        case 'deliveroo':
          // Implement Deliveroo sync
          console.log('Deliveroo sync would happen here');
          break;
        case 'justeat':
          // Implement Just Eat sync
          console.log('Just Eat sync would happen here');
          break;
      }

      // Reload data after sync
      await loadData();
      
      alert(`${integration.app_name} synced successfully!`);
    } catch (error: any) {
      console.error("Sync error:", error);
      alert(`Error syncing: ${error.message}`);
    } finally {
      setSyncing(null);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: Order['status']) => {
    try {
      // Update in database
      const { error } = await supabase
        .from("external_orders")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId)
        .eq("user_id", userId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));

      // Update integration if needed
      const order = orders.find(o => o.id === orderId);
      if (order && order.source !== 'pos') {
        const integration = integrations.find(i => i.app_slug === order.source);
        if (integration) {
          // This would call the integration's update status function
          console.log(`Updating ${order.source} order ${order.external_order_id} to ${newStatus}`);
        }
      }

    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'confirmed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'preparing': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'ready': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'delivered': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'preparing': return <AlertCircle className="w-4 h-4" />;
      case 'ready': return <Package className="w-4 h-4" />;
      case 'delivered': return <Truck className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'shopify': return <ShoppingBag className="w-4 h-4" />;
      case 'deliveroo': return <Truck className="w-4 h-4" />;
      case 'justeat': return <Truck className="w-4 h-4" />;
      case 'pos': return <ShoppingBag className="w-4 h-4" />;
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
      console.log('Notification sound error:', e);
    }
  };

  const exportOrders = () => {
    const headers = ["Order ID", "Source", "Status", "Customer", "Phone", "Email", "Items", "Subtotal", "VAT", "Delivery", "Total", "Created"];
    
    const rows = filteredOrders.map(order => [
      order.external_order_id,
      order.source,
      order.status,
      order.customer_name || "",
      order.customer_phone || "",
      order.customer_email || "",
      order.items.map(item => `${item.name} x${item.quantity}`).join(", "),
      `£${order.subtotal.toFixed(2)}`,
      `£${order.vat.toFixed(2)}`,
      `£${order.delivery_fee.toFixed(2)}`,
      `£${order.total.toFixed(2)}`,
      new Date(order.created_at).toLocaleString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* New Orders Notification */}
      {showNewOrders.length > 0 && (
        <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary animate-pulse" />
              <div>
                <p className="font-medium text-foreground">
                  {showNewOrders.length} new order{showNewOrders.length !== 1 ? 's' : ''} received!
                </p>
                <p className="text-sm text-muted-foreground">
                  {showNewOrders.map(o => `#${o.external_order_id}`).join(', ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNewOrders([])}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage online and in-person orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportOrders}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to POS
          </Link>
        </div>
      </div>

      {/* Integration Sync Buttons */}
      {integrations.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {integrations.map((integration) => (
              <button
                key={integration.id}
                onClick={() => handleSync(integration.app_slug)}
                disabled={syncing === integration.app_slug}
                className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {syncing === integration.app_slug ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing {integration.app_name}...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sync {integration.app_name}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today</p>
              <p className="text-2xl font-bold text-foreground">{stats.today}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Preparing</p>
              <p className="text-2xl font-bold text-foreground">{stats.preparing}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ready</p>
              <p className="text-2xl font-bold text-foreground">{stats.ready}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delivered</p>
              <p className="text-2xl font-bold text-foreground">{stats.delivered}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-700 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search orders by ID, customer, or items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              More Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Sources</option>
                <option value="pos">In-Store</option>
                <option value="shopify">Shopify</option>
                <option value="deliveroo">Deliveroo</option>
                <option value="justeat">Just Eat</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setSourceFilter("all");
                }}
                className="w-full bg-muted text-foreground py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">No Orders Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search criteria' : 'No orders available in this period'}
            </p>
            {integrations.length === 0 && (
              <Link
                href="/dashboard/apps"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Connect Integrations
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </Link>
            )}
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1">
                    {getSourceIcon(order.source)}
                    <span className="text-xs text-muted-foreground capitalize">{order.source}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-foreground">#{order.external_order_id}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      {order.scheduled_for && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(order.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {order.customer_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {order.customer_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">£{order.total.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Order Details */}
              <div className="mb-4">
                {/* Customer Info */}
                {(order.customer_name || order.customer_phone || order.customer_address) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {order.customer_name && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Customer</p>
                        <p className="text-foreground">{order.customer_name}</p>
                        {order.customer_email && (
                          <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                        )}
                      </div>
                    )}
                    {order.customer_phone && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Contact</p>
                        <p className="text-foreground flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {order.customer_phone}
                        </p>
                      </div>
                    )}
                    {order.customer_address && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-foreground mb-1">Address</p>
                        <p className="text-foreground flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {order.customer_address}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="mb-3">
                  <p className="text-sm font-medium text-foreground mb-2">Items:</p>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background rounded-lg">
                        <div>
                          <p className="text-sm text-foreground">{item.name} × {item.quantity}</p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">£{item.total.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">£{item.price.toFixed(2)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Notes */}
                {order.notes && (
                  <div className="mb-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Notes:</span> {order.notes}
                    </p>
                  </div>
                )}

                {/* Totals */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium text-foreground">£{order.subtotal.toFixed(2)}</span>
                    </div>
                    {order.vat > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT</span>
                        <span className="font-medium text-foreground">£{order.vat.toFixed(2)}</span>
                      </div>
                    )}
                    {order.delivery_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery</span>
                        <span className="font-medium text-foreground">£{order.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {order.service_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Fee</span>
                        <span className="font-medium text-foreground">£{order.service_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {order.tip > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tip</span>
                        <span className="font-medium text-foreground">£{order.tip.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="font-bold text-foreground text-lg">£{order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                {/* Status Update Buttons */}
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                    className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Confirm Order
                  </button>
                )}
                {order.status === 'confirmed' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    Mark as Ready
                  </button>
                )}
                {order.status === 'ready' && order.source !== 'pos' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    className="px-3 py-1.5 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Mark as Delivered
                  </button>
                )}
                {(order.status === 'delivered' || order.status === 'ready') && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    className="px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Complete Order
                  </button>
                )}
                
                {/* Cancel Button */}
                {['pending', 'confirmed', 'preparing'].includes(order.status) && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    className="px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Cancel Order
                  </button>
                )}

                <div className="flex-1"></div>
                <button className="px-3 py-1.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button className="px-3 py-1.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors">
                  <Printer className="w-4 h-4" />
                </button>
                {order.metadata?.order_url && (
                  <a
                    href={order.metadata.order_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
