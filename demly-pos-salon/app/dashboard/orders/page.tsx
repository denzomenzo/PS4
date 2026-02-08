// app/dashboard/orders/page.tsx
"use client";

import { useState, useEffect } from "react";
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
  MoreVertical,
  ExternalLink,
  Download,
  Printer,
  MessageSquare,
  Phone,
  MapPin,
  User,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface Order {
  id: number;
  order_id: string;
  source: 'shopify' | 'deliveroo' | 'justeat' | 'pos';
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled';
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    total: number;
    notes?: string;
  }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string;
  created_at: string;
  updated_at: string;
  scheduled_time?: string;
  driver_info?: {
    name: string;
    phone: string;
    vehicle: string;
  };
}

export default function OrdersPage() {
  const userId = useUserId();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    preparing: 0,
    ready: 0,
    today: 0,
    total: 0
  });

  useEffect(() => {
    if (userId) {
      loadOrders();
    }
  }, [userId]);

  useEffect(() => {
    filterOrders();
    calculateStats();
  }, [orders, searchQuery, statusFilter, sourceFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from your orders table
      // For now, we'll simulate with some mock data
      const mockOrders: Order[] = [
        {
          id: 1,
          order_id: "ORD-1001",
          source: "shopify",
          status: "pending",
          customer_name: "John Smith",
          customer_phone: "+44 7700 900123",
          customer_address: "123 Main St, London SW1A 1AA",
          items: [
            { id: 1, name: "Margherita Pizza", quantity: 1, price: 12.99, total: 12.99 },
            { id: 2, name: "Garlic Bread", quantity: 2, price: 4.99, total: 9.98 }
          ],
          subtotal: 22.97,
          delivery_fee: 2.99,
          total: 25.96,
          notes: "Extra cheese on pizza",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          order_id: "ORD-1002",
          source: "deliveroo",
          status: "preparing",
          customer_name: "Sarah Johnson",
          customer_phone: "+44 7700 900456",
          customer_address: "456 Park Ave, London E1 6AN",
          items: [
            { id: 3, name: "Chicken Tikka Masala", quantity: 1, price: 14.99, total: 14.99 },
            { id: 4, name: "Pilau Rice", quantity: 1, price: 3.99, total: 3.99 },
            { id: 5, name: "Naan Bread", quantity: 2, price: 2.99, total: 5.98 }
          ],
          subtotal: 24.96,
          delivery_fee: 3.49,
          total: 28.45,
          notes: "Medium spice",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          driver_info: {
            name: "Mike Driver",
            phone: "+44 7700 900789",
            vehicle: "Toyota Prius"
          }
        },
        {
          id: 3,
          order_id: "ORD-1003",
          source: "justeat",
          status: "ready",
          customer_name: "David Wilson",
          customer_phone: "+44 7700 900321",
          customer_address: "789 High St, London N1 0AA",
          items: [
            { id: 6, name: "Burger & Chips", quantity: 1, price: 10.99, total: 10.99 },
            { id: 7, name: "Coca-Cola", quantity: 1, price: 2.49, total: 2.49 }
          ],
          subtotal: 13.48,
          delivery_fee: 2.99,
          total: 16.47,
          notes: "No onions",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 4,
          order_id: "ORD-1004",
          source: "pos",
          status: "completed",
          customer_name: "Walk-in Customer",
          customer_phone: "",
          customer_address: "",
          items: [
            { id: 8, name: "Coffee", quantity: 2, price: 3.50, total: 7.00 },
            { id: 9, name: "Croissant", quantity: 1, price: 2.99, total: 2.99 }
          ],
          subtotal: 9.99,
          delivery_fee: 0,
          total: 9.99,
          notes: "",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      setOrders(mockOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(order =>
        order.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone.includes(searchQuery) ||
        order.items.some(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
    const pending = orders.filter(o => o.status === 'pending').length;
    const preparing = orders.filter(o => o.status === 'preparing').length;
    const ready = orders.filter(o => o.status === 'ready').length;
    const todayOrders = orders.filter(o => o.created_at.startsWith(today)).length;

    setStats({
      pending,
      preparing,
      ready,
      today: todayOrders,
      total: orders.length
    });
  };

  const updateOrderStatus = async (orderId: number, newStatus: Order['status']) => {
    try {
      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));

      // In real app, update in database
      console.log(`Updating order ${orderId} to status: ${newStatus}`);
      
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
      case 'ready': return <ShoppingBag className="w-4 h-4" />;
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
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Manage online and in-person orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Today's Orders</p>
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
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
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
                placeholder="Search by order ID, customer name, or items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        )}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">No Orders Found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search criteria' : 'No orders available'}
            </p>
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
                      <h3 className="font-bold text-foreground">{order.order_id}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
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
                  <p className="text-sm text-muted-foreground">{order.items.length} items</p>
                </div>
              </div>

              {/* Order Details */}
              <div className="mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Customer Info */}
                  <div className="space-y-2">
                    {order.customer_name && (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                          {order.customer_phone && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {order.customer_phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {order.customer_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <p className="text-sm text-muted-foreground">{order.customer_address}</p>
                      </div>
                    )}
                  </div>

                  {/* Driver Info */}
                  {order.driver_info && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Delivery Driver</p>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-foreground">{order.driver_info.name}</p>
                          <p className="text-xs text-muted-foreground">{order.driver_info.vehicle}</p>
                          <p className="text-xs text-muted-foreground">{order.driver_info.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-2 mb-3">
                  <p className="text-sm font-medium text-foreground">Items:</p>
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background rounded-lg">
                      <div>
                        <p className="text-sm text-foreground">{item.name} × {item.quantity}</p>
                        {item.notes && (
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">£{item.total.toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Order Notes */}
                {order.notes && (
                  <div className="mb-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Notes:</span> {order.notes}
                    </p>
                  </div>
                )}
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

                {/* Additional Actions */}
                <div className="flex-1"></div>
                <button className="px-3 py-1.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors">
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button className="px-3 py-1.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors">
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}