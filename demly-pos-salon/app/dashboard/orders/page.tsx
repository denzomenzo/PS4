"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import {
  Package, Search, Filter, ChevronDown, Clock, Check,
  X, Loader2, ShoppingBag, Globe, Truck, RefreshCw,
  Eye, Printer, ArrowUpDown
} from "lucide-react";

interface Order {
  id: number;
  external_order_id: string;
  source: 'shopify' | 'website' | 'deliveroo' | 'justeat' | 'ubereats' | 'pos';
  status: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  items: any[];
  subtotal: number;
  vat: number;
  delivery_fee: number;
  service_fee: number;
  tip: number;
  total: number;
  notes: string | null;
  external_created_at: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

const SOURCE_CONFIG = {
  shopify: {
    name: 'Shopify',
    icon: ShoppingBag,
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    badgeColor: 'bg-green-500'
  },
  website: {
    name: 'Website',
    icon: Globe,
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    badgeColor: 'bg-blue-500'
  },
  deliveroo: {
    name: 'Deliveroo',
    icon: Truck,
    color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    badgeColor: 'bg-cyan-500'
  },
  justeat: {
    name: 'Just Eat',
    icon: Package,
    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    badgeColor: 'bg-orange-500'
  },
  ubereats: {
    name: 'Uber Eats',
    icon: Truck,
    color: 'bg-black/10 text-foreground border-border',
    badgeColor: 'bg-black'
  },
  pos: {
    name: 'In-Store',
    icon: Package,
    color: 'bg-primary/10 text-primary border-primary/20',
    badgeColor: 'bg-primary'
  }
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  preparing: { label: 'Preparing', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  ready: { label: 'Ready', color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  delivered: { label: 'Out for Delivery', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/10 text-destructive border-destructive/20' }
};

export default function OrdersPage() {
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<'date' | 'total'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // UI State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadOrders();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('external_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'external_orders',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, sourceFilter, statusFilter, sortBy, sortOrder]);

  const loadOrders = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('external_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Load orders error:', error);
    } else if (data) {
      setOrders(data);
    }

    setLoading(false);
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.external_order_id.toLowerCase().includes(query) ||
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_email?.toLowerCase().includes(query) ||
        order.customer_phone?.includes(query)
      );
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(order => order.source === sourceFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'total') {
        comparison = a.total - b.total;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    setUpdatingStatus(true);

    try {
      const { error } = await supabase
        .from('external_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

    } catch (error: any) {
      console.error('Update status error:', error);
      alert('Failed to update status: ' + error.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const syncOrders = async () => {
    setSyncing(true);

    try {
      // Sync Shopify
      const shopifyResponse = await fetch('/api/integrations/shopify/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const shopifyData = await shopifyResponse.json();

      if (shopifyData.success) {
        alert(`✅ Synced ${shopifyData.synced} orders`);
        loadOrders();
      } else {
        alert(`❌ Sync failed: ${shopifyData.error}`);
      }
    } catch (error: any) {
      alert('Sync error: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const getSourceConfig = (source: string) => {
    return SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG] || SOURCE_CONFIG.pos;
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || { label: status, color: 'bg-muted text-muted-foreground border-border' };
  };

  const sources = ['all', ...Object.keys(SOURCE_CONFIG).filter(s => 
    orders.some(o => o.source === s)
  )];

  const statuses = ['all', ...Object.keys(STATUS_CONFIG).filter(s =>
    orders.some(o => o.status === s)
  )];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
            {sourceFilter !== 'all' && ` from ${getSourceConfig(sourceFilter).name}`}
          </p>
        </div>
        <button
          onClick={syncOrders}
          disabled={syncing}
          className="bg-primary hover:opacity-90 text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sync Now
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, customer name, email, or phone..."
            className="w-full bg-card border border-border pl-10 pr-4 py-3 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-3">
          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Source:</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-card border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Sources</option>
              {sources.filter(s => s !== 'all').map(source => (
                <option key={source} value={source}>
                  {getSourceConfig(source).name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-card border border-border px-3 py-2 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              {statuses.filter(s => s !== 'all').map(status => (
                <option key={status} value={status}>
                  {getStatusConfig(status).label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground">Sort:</label>
            <button
              onClick={() => {
                if (sortBy === 'date') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('date');
                  setSortOrder('desc');
                }
              }}
              className="bg-card border border-border px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              Date
              {sortBy === 'date' && (
                <ArrowUpDown className="w-3 h-3" />
              )}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'total') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('total');
                  setSortOrder('desc');
                }
              }}
              className="bg-card border border-border px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent flex items-center gap-2"
            >
              Total
              {sortBy === 'total' && (
                <ArrowUpDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold text-foreground mb-2">No orders found</h3>
          <p className="text-muted-foreground">
            {searchQuery || sourceFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Orders from Shopify, your website, and delivery platforms will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const sourceConfig = getSourceConfig(order.source);
            const statusConfig = getStatusConfig(order.status);
            const SourceIcon = sourceConfig.icon;

            return (
              <div
                key={order.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Source Badge */}
                      <div className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 ${sourceConfig.color}`}>
                        <SourceIcon className="w-3 h-3" />
                        {sourceConfig.name}
                      </div>

                      {/* Order ID */}
                      <span className="font-mono text-sm font-bold text-foreground">
                        #{order.external_order_id}
                      </span>

                      {/* Status Badge */}
                      <div className={`px-2 py-1 rounded-lg border text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Customer</p>
                        <p className="text-foreground font-medium truncate">{order.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Items</p>
                        <p className="text-foreground font-medium">{order.items?.length || 0} items</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Total</p>
                        <p className="text-foreground font-bold">£{order.total.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Date</p>
                        <p className="text-foreground font-medium">
                          {new Date(order.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                      }}
                      className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  Order #{selectedOrder.external_order_id}
                </h2>
                <div className="flex items-center gap-2">
                  {(() => {
                    const sourceConfig = getSourceConfig(selectedOrder.source);
                    const SourceIcon = sourceConfig.icon;
                    return (
                      <div className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 ${sourceConfig.color}`}>
                        <SourceIcon className="w-3 h-3" />
                        {sourceConfig.name}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Status Update */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Order Status
                </label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                  disabled={updatingStatus}
                  className="w-full bg-background border border-border text-foreground p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  {Object.keys(STATUS_CONFIG).map(status => (
                    <option key={status} value={status}>
                      {STATUS_CONFIG[status].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Customer Information</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="ml-2 text-sm font-medium text-foreground">{selectedOrder.customer_name}</span>
                  </div>
                  {selectedOrder.customer_email && (
                    <div>
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="ml-2 text-sm font-medium text-foreground">{selectedOrder.customer_email}</span>
                    </div>
                  )}
                  {selectedOrder.customer_phone && (
                    <div>
                      <span className="text-sm text-muted-foreground">Phone:</span>
                      <span className="ml-2 text-sm font-medium text-foreground">{selectedOrder.customer_phone}</span>
                    </div>
                  )}
                  {selectedOrder.customer_address && (
                    <div>
                      <span className="text-sm text-muted-foreground">Address:</span>
                      <span className="ml-2 text-sm font-medium text-foreground">{selectedOrder.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Order Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {item.quantity} × £{item.price?.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-bold text-foreground">
                        £{item.total?.toFixed(2) || (item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Order Total</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium text-foreground">£{selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedOrder.vat > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">VAT:</span>
                      <span className="font-medium text-foreground">£{selectedOrder.vat.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.delivery_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery Fee:</span>
                      <span className="font-medium text-foreground">£{selectedOrder.delivery_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.service_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service Fee:</span>
                      <span className="font-medium text-foreground">£{selectedOrder.service_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.tip > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tip:</span>
                      <span className="font-medium text-foreground">£{selectedOrder.tip.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-foreground">Total:</span>
                    <span className="text-xl font-bold text-primary">£{selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="text-lg font-bold text-foreground mb-3">Order Notes</h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-foreground">{selectedOrder.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
