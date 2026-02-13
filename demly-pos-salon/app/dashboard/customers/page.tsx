// app/dashboard/customers/page.tsx
"use client";

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import type { ReceiptData } from "@/components/receipts/ReceiptPrint";
import { 
  Search, 
  UserPlus, 
  Edit, 
  Trash2, 
  CreditCard, 
  Printer,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  X,
  Save,
  ChevronLeft,
  Plus,
  Clock,
  Hash,
  Receipt,
  Package,
  ArrowUp,
  ArrowDown,
  MapPin,
  Coffee,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  History
} from 'lucide-react';
import ReceiptPrint from '@/components/receipts/ReceiptPrint';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  business_name?: string | null;
  balance: number;
  created_at: string;
  notes: string | null;
}

interface ServiceInfo {
  id: number;
  name: string;
  fee: number;
}

interface Transaction {
  id: number;
  created_at: string;
  customer_id: number | null;
  customer_name: string | null;
  staff_name: string | null;
  subtotal: number;
  vat: number;
  total: number;
  payment_method: string;
  payment_details: any;
  balance_deducted: number;
  notes: string | null;
  products: any[];
  services?: any[];
  service_fee?: number;
  service_type_id?: number | null;
  staff?: {
    name: string;
  };
}

interface BalanceHistory {
  id: number;
  created_at: string;
  customer_id: string;
  amount: number;
  previous_balance: number;
  new_balance: number;
  note: string | null;
  transaction_id: number | null;
  staff_name?: string;
}

// Helper functions
const formatDate = (dateString: string, includeTime: boolean = true) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    if (includeTime) {
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const getSafeNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const getTransactionIdDisplay = (id: number): string => {
  return `#${id}`;
};

function CustomersContent() {
  const { staff: currentStaff } = useStaffAuth();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<BalanceHistory[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [loadingBalanceHistory, setLoadingBalanceHistory] = useState(false);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptPrint, setShowReceiptPrint] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showAdjustBalanceModal, setShowAdjustBalanceModal] = useState(false);
  const [showViewItemsModal, setShowViewItemsModal] = useState(false);
  const [selectedTransactionItems, setSelectedTransactionItems] = useState<any[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    business_name: '',
    notes: '',
    balance: 0
  });
  
  const [balanceAdjustment, setBalanceAdjustment] = useState({
    amount: '',
    type: 'credit' as 'credit' | 'debit',
    reason: ''
  });
  
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Pagination for transactions
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load user ID and data
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
    
    fetchCustomers();
    fetchBusinessSettings();
    
    // Run cleanup on mount
    cleanupOldTransactions();
  }, []);

  // Search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter transactions when search changes
  useEffect(() => {
    if (!customerTransactions.length) {
      setFilteredTransactions([]);
      return;
    }

    if (transactionSearch.trim()) {
      const query = transactionSearch.toLowerCase();
      const filtered = customerTransactions.filter(t => 
        t.id.toString().includes(query) ||
        formatDate(t.created_at).toLowerCase().includes(query) ||
        t.payment_method.toLowerCase().includes(query) ||
        t.products?.some(p => p.name?.toLowerCase().includes(query))
      );
      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions(customerTransactions);
    }
    setCurrentPage(1);
  }, [transactionSearch, customerTransactions]);

  // Clean up old transactions (older than 60 days)
  const cleanupOldTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', user.id)
        .lt('created_at', sixtyDaysAgo.toISOString());

      if (error) throw error;
      
      console.log('✅ Cleaned up transactions older than 60 days');
    } catch (error) {
      console.error('Error cleaning up old transactions:', error);
    }
  };

  // Fetch business settings
  const fetchBusinessSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading business settings:', error);
      } else if (data) {
        setBusinessSettings(data);
      }
    } catch (error) {
      console.error('Error in fetchBusinessSettings:', error);
    }
  };

  // Search customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (searchQuery) {
        const searchTerm = `%${searchQuery}%`;
        query = query.or(`
          name.ilike.${searchTerm},
          email.ilike.${searchTerm},
          phone.ilike.${searchTerm},
          address.ilike.${searchTerm},
          business_name.ilike.${searchTerm}
        `);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setCustomers(data || []);
      
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerTransactions = async (customerId: string) => {
    try {
      setLoadingTransactions(true);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*, staff:staff_id(name)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formattedTransactions = (data || []).map(t => ({
        ...t,
        staff_name: t.staff?.name || null
      }));
      
      setCustomerTransactions(formattedTransactions);
      setFilteredTransactions(formattedTransactions);
      setCurrentPage(1);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setCustomerTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchBalanceHistory = async (customerId: string) => {
    try {
      setLoadingBalanceHistory(true);
      
      const { data, error } = await supabase
        .from('customer_balance_history')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Try to get staff names for manual adjustments
      const historyWithStaff = await Promise.all((data || []).map(async (item) => {
        if (item.staff_id) {
          const { data: staffData } = await supabase
            .from('staff')
            .select('name')
            .eq('id', item.staff_id)
            .single();
          return { ...item, staff_name: staffData?.name };
        }
        return item;
      }));
      
      setBalanceHistory(historyWithStaff);
      
    } catch (error) {
      console.error('Error fetching balance history:', error);
      setBalanceHistory([]);
    } finally {
      setLoadingBalanceHistory(false);
    }
  };

  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await Promise.all([
      fetchCustomerTransactions(customer.id),
      fetchBalanceHistory(customer.id)
    ]);
  };

  // EXACT receipt function copied from transactions page
  const printTransactionReceipt = async (transaction: Transaction) => {
    try {
      console.log('🖨️ Generating receipt for transaction:', transaction.id);
      
      const customer = selectedCustomer || 
        customers.find(c => c.id === transaction.customer_id?.toString()) || 
        { 
          id: '', 
          name: 'Walk-in Customer', 
          email: null, 
          phone: null, 
          address: null,
          business_name: null,
          balance: 0,
          created_at: new Date().toISOString(),
          notes: null
        };

      // Fetch transaction items with product details
      let transactionItems: Array<{
        id: string | number;
        name: string;
        price: number;
        quantity: number;
        discount: number;
        total: number;
        sku?: string;
        barcode?: string;
      }> = [];
      
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from('transaction_items')
          .select('*, product:product_id(name, sku, barcode)')
          .eq('transaction_id', transaction.id);
        
        if (itemsError) throw itemsError;
        
        if (itemsData && itemsData.length > 0) {
          transactionItems = itemsData.map(item => ({
            id: item.id || Math.random().toString(),
            name: item.product?.name || 'Product',
            price: getSafeNumber(item.price),
            quantity: getSafeNumber(item.quantity),
            discount: getSafeNumber(item.discount) || 0,
            total: (getSafeNumber(item.price) * getSafeNumber(item.quantity)) - (getSafeNumber(item.discount) || 0),
            sku: item.product?.sku,
            barcode: item.product?.barcode
          }));
          console.log('✅ Loaded transaction items:', transactionItems.length);
        }
      } catch (error) {
        console.error('Error fetching transaction items:', error);
      }

      // Get service info
      const serviceInfo = transaction.services && transaction.services.length > 0 
        ? transaction.services[0] 
        : transaction.service_type_id 
        ? { name: 'Service', fee: transaction.service_fee || 0 }
        : null;

      // Create receipt data matching POS.tsx structure
      const receiptSettings = {
        fontSize: businessSettings?.receipt_font_size || 12,
        footer: businessSettings?.receipt_footer || "Thank you for your business!",
        showBarcode: businessSettings?.show_barcode_on_receipt !== false,
        barcodeType: (businessSettings?.barcode_type?.toUpperCase() || 'CODE128') as 'CODE128' | 'CODE39' | 'EAN13' | 'UPC',
        showTaxBreakdown: businessSettings?.show_tax_breakdown !== false
      };

      const receiptData: ReceiptData = {
        id: String(transaction.id),
        createdAt: transaction.created_at,
        subtotal: getSafeNumber(transaction.subtotal),
        vat: getSafeNumber(transaction.vat),
        total: getSafeNumber(transaction.total),
        paymentMethod: transaction.payment_method as any,
        products: transactionItems,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone || undefined,
          email: customer.email || undefined,
          balance: getSafeNumber(customer.balance)
        },
        businessInfo: {
          name: businessSettings?.business_name || businessSettings?.shop_name || "Your Business",
          address: businessSettings?.business_address || businessSettings?.address,
          phone: businessSettings?.business_phone || businessSettings?.phone,
          email: businessSettings?.business_email || businessSettings?.email,
          taxNumber: businessSettings?.tax_number || businessSettings?.vat_number,
          logoUrl: businessSettings?.business_logo_url || businessSettings?.logo_url
        },
        receiptSettings: receiptSettings,
        balanceDeducted: getSafeNumber(transaction.balance_deducted),
        paymentDetails: transaction.payment_details || {},
        staffName: transaction.staff?.name || 'Staff',
        notes: transaction.notes || undefined,
        serviceName: serviceInfo?.name,
        serviceFee: serviceInfo?.fee
      };
      
      console.log('✅ Receipt data prepared:', {
        transactionId: receiptData.id,
        itemsCount: receiptData.products.length,
        total: receiptData.total,
        serviceName: receiptData.serviceName
      });
      
      setReceiptData(receiptData);
      setShowReceiptPrint(true);
      
    } catch (error) {
      console.error('❌ Error preparing receipt:', error);
      alert('Failed to generate receipt. Please try again.');
    }
  };

  const closeReceiptPrint = () => {
    setShowReceiptPrint(false);
    setReceiptData(null);
  };

  // Customer CRUD operations
  const openAddCustomerModal = () => {
    setNewCustomer({
      name: '',
      email: '',
      phone: '',
      address: '',
      business_name: '',
      notes: '',
      balance: 0
    });
    setEditingCustomer(null);
    setShowAddEditModal(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      business_name: customer.business_name || '',
      notes: customer.notes || '',
      balance: getSafeNumber(customer.balance)
    });
    setShowAddEditModal(true);
  };

  const saveCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('Customer name is required');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to save customers');
        return;
      }

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: newCustomer.name,
            email: newCustomer.email || null,
            phone: newCustomer.phone || null,
            address: newCustomer.address || null,
            business_name: newCustomer.business_name || null,
            notes: newCustomer.notes || null,
            balance: getSafeNumber(newCustomer.balance),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
        
        setCustomers(customers.map(c => 
          c.id === editingCustomer.id 
            ? { ...c, ...newCustomer }
            : c
        ));
        
        if (selectedCustomer?.id === editingCustomer.id) {
          setSelectedCustomer({ ...selectedCustomer, ...newCustomer });
        }
        
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert([{
            name: newCustomer.name,
            email: newCustomer.email || null,
            phone: newCustomer.phone || null,
            address: newCustomer.address || null,
            business_name: newCustomer.business_name || null,
            notes: newCustomer.notes || null,
            balance: getSafeNumber(newCustomer.balance),
            user_id: user.id,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        
        setCustomers([data, ...customers]);
        setSelectedCustomer(data);
        await fetchCustomerTransactions(data.id);
        await fetchBalanceHistory(data.id);
      }
      
      setShowAddEditModal(false);
      setEditingCustomer(null);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        address: '',
        business_name: '',
        notes: '',
        balance: 0
      });
      
    } catch (error: any) {
      console.error('Error saving customer:', error);
      alert(`Failed to save customer: ${error.message}`);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) throw error;
      
      setCustomers(customers.filter(c => c.id !== customerId));
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
        setCustomerTransactions([]);
        setBalanceHistory([]);
      }
      
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      alert(`Failed to delete customer: ${error.message}`);
    }
  };

  // Balance adjustment
  const openAdjustBalanceModal = () => {
    if (!selectedCustomer) return;
    setBalanceAdjustment({
      amount: '',
      type: 'credit',
      reason: ''
    });
    setShowAdjustBalanceModal(true);
  };

  const adjustCustomerBalance = async () => {
    if (!selectedCustomer || !userId || !currentStaff) return;
    
    const amount = parseFloat(balanceAdjustment.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    if (!balanceAdjustment.reason.trim()) {
      alert('Please provide a reason for this adjustment');
      return;
    }

    try {
      const previousBalance = getSafeNumber(selectedCustomer.balance);
      const adjustmentAmount = balanceAdjustment.type === 'credit' ? amount : -amount;
      const newBalance = previousBalance + adjustmentAmount;

      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCustomer.id);

      if (updateError) throw updateError;

      // Log to balance history
      await supabase.from('customer_balance_history').insert({
        user_id: userId,
        customer_id: selectedCustomer.id,
        staff_id: currentStaff.id,
        amount: adjustmentAmount,
        previous_balance: previousBalance,
        new_balance: newBalance,
        note: balanceAdjustment.reason,
        created_at: new Date().toISOString()
      });

      const updatedCustomer = { ...selectedCustomer, balance: newBalance };
      setSelectedCustomer(updatedCustomer);
      setCustomers(customers.map(c => 
        c.id === selectedCustomer.id ? updatedCustomer : c
      ));

      // Refresh balance history
      await fetchBalanceHistory(selectedCustomer.id);

      setShowAdjustBalanceModal(false);
      setBalanceAdjustment({
        amount: '',
        type: 'credit',
        reason: ''
      });

      alert(`Balance ${balanceAdjustment.type === 'credit' ? 'credited' : 'debited'} successfully`);

    } catch (error: any) {
      console.error('Error adjusting balance:', error);
      alert(`Failed to adjust balance: ${error.message}`);
    }
  };

  // View transaction items
  const viewTransactionItems = async (transaction: Transaction) => {
    try {
      const { data } = await supabase
        .from('transaction_items')
        .select('*, product:product_id(name, sku, category)')
        .eq('transaction_id', transaction.id);
      
      if (data && data.length > 0) {
        setSelectedTransactionItems(data.map(item => ({
          name: item.product?.name || 'Product',
          sku: item.product?.sku,
          category: item.product?.category,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        })));
        setShowViewItemsModal(true);
      } else if (transaction.products && transaction.products.length > 0) {
        setSelectedTransactionItems(transaction.products);
        setShowViewItemsModal(true);
      } else {
        alert('No product details available for this transaction');
      }
    } catch (error) {
      console.error('Error viewing transaction items:', error);
      alert('Failed to load transaction items');
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * transactionsPerPage,
    currentPage * transactionsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Error Loading Customers</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={fetchCustomers}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Receipt Print Component */}
      {showReceiptPrint && receiptData && (
        <div className="fixed inset-0 z-[9999] bg-white">
          <ReceiptPrint 
            data={receiptData} 
            onClose={closeReceiptPrint}
          />
        </div>
      )}

      {/* View Items Modal */}
      {showViewItemsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Transaction Items</h2>
                <button
                  onClick={() => setShowViewItemsModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground mt-1">{selectedTransactionItems.length} items</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {selectedTransactionItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{item.name || 'Unknown Product'}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {item.sku && <span>SKU: {item.sku}</span>}
                        {item.category && <span>Category: {item.category}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">£{item.total?.toFixed(2) || '0.00'}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantity || 1} × £{(item.price || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Balance History Modal */}
      {showBalanceHistory && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Balance History - {selectedCustomer.name}</h2>
                <button
                  onClick={() => setShowBalanceHistory(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground mt-1">Current balance: £{selectedCustomer.balance.toFixed(2)}</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingBalanceHistory ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                  <p className="text-muted-foreground">Loading history...</p>
                </div>
              ) : balanceHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No balance history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {balanceHistory.map((item) => (
                    <div key={item.id} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            item.amount > 0 
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-destructive/10 text-destructive border border-destructive/20'
                          }`}>
                            {item.amount > 0 ? 'Credit +' : 'Debit '}£{Math.abs(item.amount).toFixed(2)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.created_at, true)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-foreground mb-2">
                        {item.note || 'No reason provided'}
                      </div>
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Previous: £{item.previous_balance.toFixed(2)}</span>
                        <span>→</span>
                        <span className="font-medium">New: £{item.new_balance.toFixed(2)}</span>
                      </div>
                      
                      {item.staff_name && (
                        <div className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
                          Processed by: {item.staff_name}
                        </div>
                      )}
                      
                      {item.transaction_id && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Transaction: #{item.transaction_id}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <button
                  onClick={() => setShowAddEditModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="Customer name"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Business Name</label>
                <input
                  type="text"
                  value={newCustomer.business_name}
                  onChange={(e) => setNewCustomer({...newCustomer, business_name: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="Business name (optional)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="customer@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="+44 1234 567890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Address</label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="123 Street, City, Postcode"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Balance (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCustomer.balance}
                  onChange={(e) => setNewCustomer({...newCustomer, balance: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={() => setShowAddEditModal(false)}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomer}
                disabled={!newCustomer.name.trim()}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingCustomer ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustBalanceModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md border border-border">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Adjust Balance</h2>
                <button
                  onClick={() => setShowAdjustBalanceModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-muted-foreground mt-1">Current balance: £{getSafeNumber(selectedCustomer.balance).toFixed(2)}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBalanceAdjustment({...balanceAdjustment, type: 'credit'})}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                      balanceAdjustment.type === 'credit'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                    Add Credit
                  </button>
                  <button
                    onClick={() => setBalanceAdjustment({...balanceAdjustment, type: 'debit'})}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 ${
                      balanceAdjustment.type === 'debit'
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <ArrowDown className="w-4 h-4" />
                    Add Debit
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Amount (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={balanceAdjustment.amount}
                  onChange={(e) => setBalanceAdjustment({...balanceAdjustment, amount: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Reason *</label>
                <textarea
                  value={balanceAdjustment.reason}
                  onChange={(e) => setBalanceAdjustment({...balanceAdjustment, reason: e.target.value})}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                  placeholder="Reason for adjustment..."
                  rows={3}
                />
              </div>
              
              {balanceAdjustment.amount && !isNaN(parseFloat(balanceAdjustment.amount)) && (
                <div className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="text-sm text-muted-foreground">New balance will be:</div>
                  <div className="text-lg font-bold text-primary">
                    £{(getSafeNumber(selectedCustomer.balance) + 
                      (balanceAdjustment.type === 'credit' ? parseFloat(balanceAdjustment.amount) : -parseFloat(balanceAdjustment.amount))
                    ).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-border flex gap-3">
              <button
                onClick={() => setShowAdjustBalanceModal(false)}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={adjustCustomerBalance}
                disabled={!balanceAdjustment.amount || !balanceAdjustment.reason.trim()}
                className={`flex-1 px-4 py-2 text-primary-foreground rounded-lg font-medium ${
                  balanceAdjustment.type === 'credit'
                    ? 'bg-primary hover:opacity-90'
                    : 'bg-destructive hover:opacity-90'
                } disabled:opacity-50`}
              >
                {balanceAdjustment.type === 'credit' ? 'Add Credit' : 'Add Debit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Customers</h1>
        <p className="text-muted-foreground mt-2">Manage your customers and view their transaction history</p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{customers.length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <UserPlus className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Balance</p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                £{customers.reduce((sum, c) => sum + getSafeNumber(c.balance), 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Accounts</p>
              <p className="text-2xl font-bold mt-1 text-foreground">
                {customers.filter(c => getSafeNumber(c.balance) !== 0).length}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Customers List */}
        <div className="lg:w-2/5">
          {/* Search and Add Customer */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-4 mb-4">
            <div className="flex gap-3 items-start">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 text-muted-foreground w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, address..."
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={openAddCustomerModal}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 font-medium shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
          
          {/* Customers List */}
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            {customers.length === 0 ? (
              <div className="p-8 text-center">
                <UserPlus className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No customers found</p>
                <button
                  onClick={openAddCustomerModal}
                  className="mt-3 text-primary hover:opacity-80 font-medium"
                >
                  Add your first customer
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedCustomer?.id === customer.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                    }`}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{customer.name}</h3>
                        {customer.business_name && (
                          <div className="text-xs text-primary mt-0.5 truncate">{customer.business_name}</div>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[100px]">{customer.phone}</span>
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{customer.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className={`font-bold ${
                          getSafeNumber(customer.balance) > 0 ? 'text-primary' :
                          getSafeNumber(customer.balance) < 0 ? 'text-destructive' :
                          'text-muted-foreground'
                        }`}>
                          £{getSafeNumber(customer.balance).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(customer.created_at, false)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Column - Customer Details */}
        <div className="lg:w-3/5">
          {selectedCustomer ? (
            <>
              {/* Customer Details Header */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="p-1 hover:bg-muted rounded-lg transition-colors"
                        title="Back to list"
                      >
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                      </button>
                      <h2 className="text-2xl font-bold text-foreground truncate">{selectedCustomer.name}</h2>
                    </div>
                    {selectedCustomer.business_name && (
                      <div className="text-sm text-primary mb-2">🏢 {selectedCustomer.business_name}</div>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{selectedCustomer.email}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Since {formatDate(selectedCustomer.created_at, false)}
                      </span>
                    </div>
                    {selectedCustomer.address && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-1">Address</h3>
                            <p className="text-muted-foreground">{selectedCustomer.address}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-2xl font-bold ${
                      getSafeNumber(selectedCustomer.balance) > 0 ? 'text-primary' :
                      getSafeNumber(selectedCustomer.balance) < 0 ? 'text-destructive' :
                      'text-muted-foreground'
                    }`}>
                      £{getSafeNumber(selectedCustomer.balance).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Current Balance</div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openEditCustomerModal(selectedCustomer)}
                        className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-muted/80 flex items-center gap-1 font-medium"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={openAdjustBalanceModal}
                        className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 flex items-center gap-1 font-medium"
                      >
                        <DollarSign className="w-3 h-3" />
                        Adjust
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Customer Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/50 p-4 rounded-lg border border-border">
                    <div className="text-sm font-medium text-muted-foreground">Current Balance</div>
                    <div className="text-xl font-bold mt-1 text-foreground">£{getSafeNumber(selectedCustomer.balance).toFixed(2)}</div>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg border border-border">
                    <div className="text-sm font-medium text-muted-foreground">Total Transactions</div>
                    <div className="text-xl font-bold mt-1 text-foreground">
                      {customerTransactions.filter(t => t.status === 'completed').length}
                    </div>
                  </div>
                </div>
                
                {/* Customer Notes */}
                {selectedCustomer.notes && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
                    <div className="bg-accent/50 p-3 rounded-lg border border-border">
                      <p className="text-foreground">{selectedCustomer.notes}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Transactions with Scrollable Grid */}
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Transaction History</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {filteredTransactions.length} transactions • Last 60 days
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowBalanceHistory(true);
                        }}
                        className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-muted/80 font-medium flex items-center gap-2"
                        title="View Balance History"
                      >
                        <History className="w-4 h-4" />
                        Balance History
                      </button>
                      <button
                        onClick={() => fetchCustomerTransactions(selectedCustomer.id)}
                        className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-muted/80 font-medium flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    </div>
                  </div>
                  
                  {/* Transaction Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                      placeholder="Search transactions by ID, date, payment method..."
                      className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                {loadingTransactions ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <Receipt className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      {transactionSearch ? 'No transactions match your search' : 'No transactions found'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Scrollable Grid */}
                    <div 
                      ref={scrollContainerRef}
                      className="overflow-y-auto max-h-[400px] p-4 space-y-3"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'var(--border) var(--background)'
                      }}
                    >
                      {paginatedTransactions.map((transaction) => {
                        const serviceInfo = transaction.services && transaction.services.length > 0 
                          ? transaction.services[0] 
                          : transaction.service_type_id 
                          ? { name: 'Service', fee: transaction.service_fee || 0 }
                          : null;

                        return (
                          <div
                            key={transaction.id}
                            className="bg-background border border-border rounded-lg p-4 hover:border-primary/30 transition-all"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-bold text-foreground">
                                    {getTransactionIdDisplay(transaction.id)}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                                    transaction.status === 'completed' 
                                      ? 'bg-primary/20 text-primary'
                                      : transaction.status === 'pending'
                                      ? 'bg-accent text-foreground'
                                      : 'bg-destructive/20 text-destructive'
                                  }`}>
                                    {transaction.status || 'completed'}
                                  </span>
                                  <span className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground capitalize">
                                    {transaction.payment_method}
                                  </span>
                                  {serviceInfo && (
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs flex items-center gap-1">
                                      <Coffee className="w-3 h-3" />
                                      {serviceInfo.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(transaction.created_at, true)}
                                  </span>
                                  {transaction.staff?.name && (
                                    <span>by {transaction.staff.name}</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-foreground">
                                  £{getSafeNumber(transaction.total).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Transaction Preview */}
                            <div className="mt-2 text-sm text-muted-foreground">
                              <div className="flex justify-between">
                                <span>Items: {transaction.products?.length || 0}</span>
                                {transaction.balance_deducted > 0 && (
                                  <span className="text-purple-600">
                                    Balance used: £{transaction.balance_deducted.toFixed(2)}
                                  </span>
                                )}
                              </div>
                              {transaction.notes && (
                                <div className="mt-1 text-xs italic truncate">
                                  "{transaction.notes}"
                                </div>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => printTransactionReceipt(transaction)}
                                className="flex-1 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded hover:bg-primary/20 flex items-center justify-center gap-1 font-medium"
                              >
                                <Printer className="w-3 h-3" />
                                Receipt
                              </button>
                              <button
                                onClick={() => viewTransactionItems(transaction)}
                                className="px-3 py-1.5 text-xs bg-muted text-foreground rounded hover:bg-muted/80 flex items-center justify-center gap-1 font-medium"
                              >
                                <Package className="w-3 h-3" />
                                Items
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="border-t border-border p-4 flex items-center justify-between">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-accent disabled:opacity-50 flex items-center gap-1"
                        >
                          <ChevronLeftIcon className="w-4 h-4" />
                          Previous
                        </button>
                        <span className="text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-accent disabled:opacity-50 flex items-center gap-1"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="bg-card rounded-xl shadow-sm border border-border h-full flex items-center justify-center p-12">
              <div className="text-center">
                <UserPlus className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Customer Selected</h3>
                <p className="text-muted-foreground max-w-sm">
                  Select a customer from the list to view their details and transaction history
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Error fallback component
function CustomersErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-card rounded-xl shadow-lg border border-border p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customer Dashboard Error</h1>
            <p className="text-muted-foreground mt-1">Something went wrong while loading the customer data</p>
          </div>
        </div>
        
        <div className="bg-muted/50 p-4 rounded-lg mb-6 border border-border">
          <p className="text-sm text-foreground mb-2">Error details:</p>
          <code className="text-sm text-destructive bg-destructive/10 p-3 rounded block overflow-auto">
            {error?.message || 'Unknown error occurred'}
          </code>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium"
          >
            Try Loading Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <ErrorBoundary fallback={<CustomersErrorFallback />}>
      <CustomersContent />
    </ErrorBoundary>
  );
}
