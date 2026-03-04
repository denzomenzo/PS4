// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Calendar, 
  Package, 
  Settings, 
  Monitor, 
  ShoppingCart, 
  CreditCard,
  Receipt,
  BarChart3,
  FileText,
  Zap,
  ChevronRight,
  Clock,
  AlertTriangle,
  Snowflake,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { useStaffAuth } from "@/hooks/useStaffAuth";
import { format, differenceInDays } from "date-fns";

interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  totalCustomers: number;
  lowStockCount: number;
  todayAppointments: number;
}

interface RecentTransaction {
  id: string;
  created_at: string;
  total: number;
  payment_method: string;
  customer_name?: string;
}

interface LowStockItem {
  id: string;
  name: string;
  stock_quantity: number;
  reorder_level: number;
}

interface UpcomingAppointment {
  id: string;
  customer_name: string;
  appointment_time: string;
  service: string;
}

interface SubscriptionStatus {
  status: 'active' | 'past_due' | 'frozen' | 'cancelled' | 'deletion_scheduled';
  cooling_days_left?: number;
  days_until_deletion?: number;
  deletion_date?: string;
  failed_payment_count?: number;
  payment_failed_at?: string;
}

interface PaymentEvent {
  type: 'payment_success' | 'payment_failed';
  amount: number;
  date: string;
  attempt?: number;
}

const menuItems = [
  {
    href: "/dashboard/pos",
    icon: ShoppingCart,
    title: "Point of Sale",
    description: "Process transactions and manage sales",
    color: "primary",
    featured: true
  },
  {
    href: "/dashboard/customers",
    icon: Users,
    title: "Customers",
    description: "Manage customer database & balances",
    color: "blue-500"
  },
  {
    href: "/dashboard/appointments",
    icon: Calendar,
    title: "Appointments",
    description: "Schedule and track bookings",
    color: "purple-500"
  },
  {
    href: "/dashboard/inventory",
    icon: Package,
    title: "Inventory",
    description: "Track products and stock levels",
    color: "emerald-500"
  },
  {
    href: "/dashboard/transactions",
    icon: Receipt,
    title: "Transactions",
    description: "View sales history and reports",
    color: "orange-500"
  },
  {
    href: "/dashboard/reports",
    icon: BarChart3,
    title: "Reports",
    description: "Analytics and business insights",
    color: "pink-500"
  },
  {
    href: "/dashboard/card-terminal",
    icon: CreditCard,
    title: "Card Terminal",
    description: "Configure payment terminals",
    color: "indigo-500"
  },
  {
    href: "/dashboard/hardware",
    icon: Monitor,
    title: "Hardware",
    description: "Printers, scanners & displays",
    color: "cyan-500"
  },
  {
    href: "/dashboard/settings",
    icon: Settings,
    title: "Settings",
    description: "Business settings & preferences",
    color: "slate-500"
  }
];

export default function DashboardHome() {
  const userId = useUserId();
  const { staff: currentStaff } = useStaffAuth();
  
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayTransactions: 0,
    totalCustomers: 0,
    lowStockCount: 0,
    todayAppointments: 0,
  });
  
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({ status: 'active' });
  const [loading, setLoading] = useState(true);
  
  // Live payment events
  const [paymentEvents, setPaymentEvents] = useState<PaymentEvent[]>([]);
  const [paymentConnected, setPaymentConnected] = useState(false);
  const [showPaymentToast, setShowPaymentToast] = useState<PaymentEvent | null>(null);

  // Live payment stream
  useEffect(() => {
    if (!userId) return;

    const eventSource = new EventSource(`/api/webhooks/stripe?userId=${userId}`);

    eventSource.onopen = () => {
      setPaymentConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'connected') return;
      
      setPaymentEvents(prev => [data, ...prev].slice(0, 10));
      setShowPaymentToast(data);
      
      // Auto-hide toast after 5 seconds
      setTimeout(() => setShowPaymentToast(null), 5000);
    };

    eventSource.onerror = () => {
      setPaymentConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [userId]);

  // Real-time subscription updates
  useEffect(() => {
    if (!currentStaff?.email) return;

    const channel = supabase
      .channel('dashboard_license_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'licenses',
          filter: `email=eq.${currentStaff.email}`,
        },
        (payload) => {
          // Update subscription status
          if (payload.new.status === 'frozen') {
            setSubscriptionStatus({
              status: 'frozen',
              failed_payment_count: payload.new.failed_payment_count,
              payment_failed_at: payload.new.payment_failed_at,
            });
          } else if (payload.new.status === 'past_due') {
            setSubscriptionStatus({
              status: 'past_due',
              failed_payment_count: payload.new.failed_payment_count,
              payment_failed_at: payload.new.payment_failed_at,
            });
          } else if (payload.new.status === 'cancelled') {
            setSubscriptionStatus({ status: 'cancelled' });
          } else if (payload.new.status === 'deletion_scheduled') {
            const days = differenceInDays(
              new Date(payload.new.deletion_scheduled_at),
              new Date()
            );
            setSubscriptionStatus({
              status: 'deletion_scheduled',
              days_until_deletion: Math.max(0, days),
              deletion_date: payload.new.deletion_scheduled_at,
            });
          } else {
            setSubscriptionStatus({ status: 'active' });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentStaff?.email]);

  useEffect(() => {
    if (userId) {
      loadDashboardData();
      loadSubscriptionStatus();
    }
  }, [userId]);

  const loadSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscription');
      const data = await response.json();
      
      if (data.subscription) {
        if (data.subscription.status === 'frozen') {
          setSubscriptionStatus({
            status: 'frozen',
            failed_payment_count: data.subscription.failed_payment_count,
            payment_failed_at: data.subscription.payment_failed_at,
          });
        } else if (data.subscription.status === 'past_due') {
          setSubscriptionStatus({
            status: 'past_due',
            failed_payment_count: data.subscription.failed_payment_count,
            payment_failed_at: data.subscription.payment_failed_at,
          });
        } else if (data.subscription.status === 'cancelled') {
          setSubscriptionStatus({ status: 'cancelled' });
        } else if (data.subscription.deletion_scheduled) {
          setSubscriptionStatus({
            status: 'deletion_scheduled',
            days_until_deletion: data.subscription.days_until_deletion,
            deletion_date: data.subscription.deletion_date,
          });
        } else {
          setSubscriptionStatus({ 
            status: 'active',
            cooling_days_left: data.subscription.cooling_days_left 
          });
        }
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Load total customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Load recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          id,
          created_at,
          total,
          payment_method,
          customer:customer_id (name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transactions) {
        setRecentTransactions(transactions.map(t => ({
          id: t.id,
          created_at: t.created_at,
          total: t.total || 0,
          payment_method: t.payment_method || 'cash',
          customer_name: t.customer?.name
        })));

        const todayTransactionsList = transactions.filter(t => 
          new Date(t.created_at) >= today && new Date(t.created_at) < tomorrow
        );
        setStats(prev => ({
          ...prev,
          todaySales: todayTransactionsList.reduce((sum, t) => sum + (t.total || 0), 0),
          todayTransactions: todayTransactionsList.length,
          totalCustomers: customerCount || 0,
        }));
      }

      // Load low stock items
      const { data: inventory } = await supabase
        .from('products')
        .select('id, name, stock_quantity, reorder_level')
        .eq('user_id', userId)
        .or('stock_quantity.lte.reorder_level,stock_quantity.lte.5')
        .order('stock_quantity', { ascending: true })
        .limit(5);

      if (inventory) {
        setLowStockItems(inventory);
        setStats(prev => ({ ...prev, lowStockCount: inventory.length }));
      }

      // Load upcoming appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          service,
          customer:customer_id (name)
        `)
        .eq('user_id', userId)
        .gte('appointment_time', new Date().toISOString())
        .order('appointment_time', { ascending: true })
        .limit(5);

      if (appointments) {
        setUpcomingAppointments(appointments.map(a => ({
          id: a.id,
          customer_name: a.customer?.name || 'Unknown',
          appointment_time: a.appointment_time,
          service: a.service || 'Appointment'
        })));
        setStats(prev => ({ ...prev, todayAppointments: appointments.length }));
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    try {
      const response = await fetch('/api/subscription/create-portal', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error opening portal:", error);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      const response = await fetch('/api/account/cancel-deletion', {
        method: 'POST',
      });
      if (response.ok) {
        loadSubscriptionStatus();
      }
    } catch (error) {
      console.error("Error cancelling deletion:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto">
        
        {/* Payment Toast Notification */}
        {showPaymentToast && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border ${
            showPaymentToast.type === 'payment_success'
              ? 'bg-green-500/10 border-green-500/30 text-green-600'
              : 'bg-red-500/10 border-red-500/30 text-red-600'
          }`}>
            <div className="flex items-center gap-3">
              {showPaymentToast.type === 'payment_success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {showPaymentToast.type === 'payment_success' 
                    ? `Payment of £${showPaymentToast.amount} received!` 
                    : `Payment of £${showPaymentToast.amount} failed (Attempt ${showPaymentToast.attempt})`}
                </p>
                <p className="text-xs opacity-80">
                  {new Date(showPaymentToast.date).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Payment Stream */}
        <div className="mb-6 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${paymentConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <h3 className="text-sm font-medium text-foreground">Live Payment Status</h3>
            {paymentEvents.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                Last 10 payments
              </span>
            )}
          </div>
          
          {paymentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent payment activity
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {paymentEvents.map((event, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    event.type === 'payment_success'
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {event.type === 'payment_success' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {event.type === 'payment_success' 
                          ? 'Payment Received' 
                          : `Payment Failed (Attempt ${event.attempt})`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(event.date).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    £{event.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Banners */}
        {subscriptionStatus.status === 'frozen' && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Snowflake className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600 mb-1">❄️ Account Frozen</p>
                <p className="text-xs text-red-600/80 mb-2">
                  Your account has been frozen due to {subscriptionStatus.failed_payment_count} failed payment attempts.
                  Please update your payment method to reactivate your account.
                </p>
                <button
                  onClick={handleOpenCustomerPortal}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Update Payment Method
                </button>
              </div>
            </div>
          </div>
        )}

        {subscriptionStatus.status === 'past_due' && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-600 mb-1">⚠️ Payment Past Due</p>
                <p className="text-xs text-amber-600/80 mb-2">
                  Payment attempt {subscriptionStatus.failed_payment_count} of 3 failed. 
                  {subscriptionStatus.failed_payment_count && subscriptionStatus.failed_payment_count >= 3 
                    ? ' Your account will be frozen if payment is not received.'
                    : ' Please update your payment method to avoid service interruption.'}
                </p>
                <button
                  onClick={handleOpenCustomerPortal}
                  className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Update Payment Method
                </button>
              </div>
            </div>
          </div>
        )}

        {subscriptionStatus.cooling_days_left && subscriptionStatus.cooling_days_left > 0 && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-600">
                  14-Day Cooling Period: {subscriptionStatus.cooling_days_left} days remaining
                </p>
                <p className="text-xs text-amber-600/80">
                  You can cancel for a full refund within this period
                </p>
              </div>
            </div>
          </div>
        )}

        {subscriptionStatus.status === 'deletion_scheduled' && subscriptionStatus.days_until_deletion && subscriptionStatus.days_until_deletion > 0 && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600 mb-1">⚠️ Account Deletion Scheduled</p>
                <p className="text-xs text-red-600/80 mb-3">
                  Your account will be permanently deleted in {subscriptionStatus.days_until_deletion} days on{' '}
                  {subscriptionStatus.deletion_date && format(new Date(subscriptionStatus.deletion_date), 'MMMM do, yyyy')}.
                </p>
                
                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-red-600">Days until deletion</span>
                    <span className="text-xs font-medium text-red-600">{subscriptionStatus.days_until_deletion} days</span>
                  </div>
                  <div className="w-full bg-red-500/20 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${((14 - subscriptionStatus.days_until_deletion) / 14) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <button
                  onClick={handleCancelDeletion}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Cancel Deletion Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Manage your business from here.</p>
          </div>
          <Link 
            href="/dashboard/pos" 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
          >
            <ShoppingCart className="w-5 h-5" />
            Open POS
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Today's Sales</p>
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">£{stats.todaySales.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats.todayTransactions} transactions</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalCustomers}</p>
            <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Low Stock Items</p>
              <Package className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.lowStockCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Today's Bookings</p>
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.todayAppointments}</p>
            <p className="text-xs text-muted-foreground mt-1">Appointments</p>
          </div>
        </div>

        {/* Main Menu Grid */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all ${
                    item.featured ? 'md:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${item.color}/10`}>
                      <Icon className={`w-6 h-6 text-${item.color === 'primary' ? 'primary' : item.color}`} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Getting Started</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Configure your business settings and branding</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Add your products to the inventory</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Set up hardware (printer, scanner, card terminal)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Import or add your customers</span>
              </li>
            </ul>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {transaction.customer_name || 'Walk-in Customer'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.created_at), 'HH:mm')} • {transaction.payment_method}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-foreground">£{transaction.total.toFixed(2)}</p>
                  </div>
                ))}
                <Link 
                  href="/dashboard/transactions" 
                  className="block text-center text-xs text-primary hover:text-primary/80 mt-2"
                >
                  View all transactions →
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground mt-1">Start using the POS to see transactions here</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-bold text-foreground">Low Stock Alert</h3>
            </div>
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-background rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Stock: {item.stock_quantity} (Min: {item.reorder_level || 5})</p>
                    </div>
                    <Link
                      href={`/dashboard/inventory?id=${item.id}`}
                      className="text-xs bg-orange-500/10 text-orange-600 px-2 py-1 rounded hover:bg-orange-500/20 transition-colors"
                    >
                      Restock
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-bold text-foreground">Upcoming Appointments</h3>
            </div>
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between bg-background rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{appointment.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appointment.appointment_time), 'MMM d, HH:mm')} • {appointment.service}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/appointments?id=${appointment.id}`}
                      className="text-xs bg-purple-500/10 text-purple-600 px-2 py-1 rounded hover:bg-purple-500/20 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
