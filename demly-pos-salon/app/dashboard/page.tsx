// app/dashboard/page.tsx - REDESIGNED DASHBOARD HOME
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
  ArrowLeft,
  CreditCard,
  Receipt,
  BarChart3,
  FileText,
  Zap,
  ChevronRight,
  Clock,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useUserId } from "@/hooks/useUserId";
import { format } from "date-fns";

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

interface Subscription {
  cooling_days_left?: number;
  deletion_scheduled?: boolean;
  days_until_deletion?: number;
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
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [todayTransactions, setTodayTransactions] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadDashboardData();
      loadSubscription();
    }
  }, [userId]);

  const loadSubscription = async () => {
    try {
      const response = await fetch('/api/subscription');
      const data = await response.json();
      if (data.subscription) {
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Load total customers
      const { count: customerCount, error: customerError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (!customerError && customerCount !== null) {
        setTotalCustomers(customerCount);
      }

      // Load recent transactions with customer data
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select(`
          id,
          created_at,
          total,
          payment_method,
          customer:customer_id (
            name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transactions) {
        // Process transactions with safe type handling
        const processedTransactions = transactions.map((t: any) => ({
          id: t.id,
          created_at: t.created_at,
          total: t.total || 0,
          payment_method: t.payment_method || 'cash',
          customer_name: t.customer?.name || null
        }));
        
        setRecentTransactions(processedTransactions);

        // Calculate today's sales
        const todayTransactionsList = transactions.filter((t: any) => 
          new Date(t.created_at) >= today && new Date(t.created_at) < tomorrow
        );
        setTodaySales(todayTransactionsList.reduce((sum: number, t: any) => sum + (t.total || 0), 0));
        setTodayTransactions(todayTransactionsList.length);
      }

      // Load low stock items (stock <= reorder_level or default 5)
      const { data: inventory, error: invError } = await supabase
        .from('products')
        .select('id, name, stock_quantity, reorder_level')
        .eq('user_id', userId)
        .or('stock_quantity.lte.reorder_level,stock_quantity.lte.5')
        .order('stock_quantity', { ascending: true })
        .limit(5);

      if (inventory) {
        setLowStockItems(inventory);
      }

      // Load upcoming appointments with customer data
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_time,
          service,
          customer:customer_id (
            name
          )
        `)
        .eq('user_id', userId)
        .gte('appointment_time', new Date().toISOString())
        .order('appointment_time', { ascending: true })
        .limit(5);

      if (appointments) {
        const processedAppointments = appointments.map((a: any) => ({
          id: a.id,
          customer_name: a.customer?.name || 'Unknown',
          appointment_time: a.appointment_time,
          service: a.service || 'Appointment'
        }));
        setUpcomingAppointments(processedAppointments);
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Cooling period banner
  if (subscription?.cooling_days_left && subscription.cooling_days_left > 0) {
    return (
      <div className="min-h-screen bg-background">
        {/* Cooling Period Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-amber-600">
                    <span className="font-bold">14-Day Cooling Period:</span> You have {subscription.cooling_days_left} days remaining to cancel for a full refund.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/settings#subscription"
                className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Manage Subscription
              </Link>
            </div>
          </div>
        </div>

        {/* Rest of dashboard... */}
        <DashboardContent 
          loading={loading}
          todaySales={todaySales}
          todayTransactions={todayTransactions}
          totalCustomers={totalCustomers}
          recentTransactions={recentTransactions}
          lowStockItems={lowStockItems}
          upcomingAppointments={upcomingAppointments}
        />
      </div>
    );
  }

  // Account deletion countdown banner
  if (subscription?.deletion_scheduled) {
    return (
      <div className="min-h-screen bg-background">
        {/* Deletion Countdown Banner */}
        <div className="bg-destructive/10 border-b border-destructive/30">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-destructive/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-destructive">
                    <span className="font-bold">Account Deletion Scheduled:</span> Your account will be permanently deleted in {subscription.days_until_deletion} days.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/settings#subscription"
                className="text-xs bg-destructive/20 hover:bg-destructive/30 text-destructive px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Cancel Deletion
              </Link>
            </div>
          </div>
        </div>

        {/* Rest of dashboard... */}
        <DashboardContent 
          loading={loading}
          todaySales={todaySales}
          todayTransactions={todayTransactions}
          totalCustomers={totalCustomers}
          recentTransactions={recentTransactions}
          lowStockItems={lowStockItems}
          upcomingAppointments={upcomingAppointments}
        />
      </div>
    );
  }

  // Normal dashboard without banners
  return (
    <DashboardContent 
      loading={loading}
      todaySales={todaySales}
      todayTransactions={todayTransactions}
      totalCustomers={totalCustomers}
      recentTransactions={recentTransactions}
      lowStockItems={lowStockItems}
      upcomingAppointments={upcomingAppointments}
    />
  );
}

// Separate component for the main dashboard content
function DashboardContent({ 
  loading,
  todaySales,
  todayTransactions,
  totalCustomers,
  recentTransactions,
  lowStockItems,
  upcomingAppointments
}: { 
  loading: boolean;
  todaySales: number;
  todayTransactions: number;
  totalCustomers: number;
  recentTransactions: RecentTransaction[];
  lowStockItems: LowStockItem[];
  upcomingAppointments: UpcomingAppointment[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto">
        
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
            <p className="text-2xl font-bold text-foreground">£{todaySales.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">{todayTransactions} transactions</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Customers</p>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalCustomers}</p>
            <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Low Stock Items</p>
              <Package className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{lowStockItems.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Today's Bookings</p>
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{upcomingAppointments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Appointments</p>
          </div>
        </div>

        {/* Main Menu Grid */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const colorClass = item.color === 'primary' ? 'primary' : item.color;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group bg-card border border-border rounded-xl p-6 hover:border-${colorClass}/50 transition-all ${
                    item.featured ? 'md:col-span-2 lg:col-span-1' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      item.color === 'primary' 
                        ? 'bg-primary/10' 
                        : `bg-${item.color}/10`
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        item.color === 'primary' 
                          ? 'text-primary' 
                          : `text-${item.color}`
                      }`} />
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
