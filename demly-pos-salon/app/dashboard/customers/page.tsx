"use client";

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserId } from '@/hooks/useUserId';
import { useStaffAuth } from '@/hooks/useStaffAuth';
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
  ShoppingBag,
  X,
  Save,
  ChevronLeft,
  Plus,
  Eye,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Receipt,
  Hash
} from 'lucide-react';
import ReceiptPrint from '@/components/receipts/ReceiptPrint';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  balance: number;
  created_at: string;
  notes: string | null;
}

interface Transaction {
  id: string | number;
  customer_id: string;
  total: number;
  subtotal: number;
  vat: number;
  status: 'completed' | 'pending' | 'refunded';
  payment_method: 'cash' | 'card' | 'split' | 'balance';
  payment_details: any;
  balance_deducted: number;
  created_at: string;
  notes: string | null;
  products?: any[];
  staff_name?: string;
  transaction_number?: string;
}

interface BalanceAdjustment {
  id?: string;
  customer_id: string;
  amount: number;
  previous_balance: number;
  new_balance: number;
  type: 'credit' | 'debit' | 'adjustment';
  reason: string;
  created_by: string;
  created_at: string;
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

const getTransactionIdDisplay = (transaction: Transaction): string => {
  if (transaction.transaction_number) return transaction.transaction_number;
  const idStr = String(transaction.id);
  return `#${idStr.slice(-6)}`;
};

function CustomersContent() {
  const userId = useUserId();
  const { staff: currentStaff } = useStaffAuth();

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [balanceHistory, setBalanceHistory] = useState<BalanceAdjustment[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
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
    notes: '',
    balance: 0
  });
  
  const [balanceAdjustment, setBalanceAdjustment] = useState({
    amount: '',
    type: 'credit' as 'credit' | 'debit',
    reason: ''
  });
  
  const [businessSettings, setBusinessSettings] = useState<any>(null);

  // Load data
  useEffect(() => {
    fetchCustomers();
    fetchBusinessSettings();
  }, []);

  // Search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchBusinessSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .single();
      if (data) setBusinessSettings(data);
    } catch (error) {
      console.error('Error loading business settings:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setCustomers(data || []);
      
    } catch (error) {
      console.error('Error fetching customers:', error);
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
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      const formattedTransactions = (data || []).map(transaction => ({
        ...transaction,
        staff_name: transaction.staff?.name || 'Staff'
      }));
      
      setCustomerTransactions(formattedTransactions);
      
      // Fetch balance history
      await fetchBalanceHistory(customerId);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setCustomerTransactions([]);
      setBalanceHistory([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchBalanceHistory = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('balance_adjustments')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBalanceHistory(data || []);
    } catch (error) {
      console.error('Error fetching balance history:', error);
    }
  };

  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerTransactions(customer.id);
  };

  const calculateCustomerStats = () => {
    if (!selectedCustomer) {
      return {
        totalSpent: 0,
        totalTransactions: 0,
        lastTransaction: null,
        itemsPurchased: 0
      };
    }
    
    const completedTransactions = customerTransactions.filter(t => t.status === 'completed');
    const totalSpent = completedTransactions.reduce((sum, t) => sum + getSafeNumber(t.total), 0);
    
    // Count total items purchased
    let itemsPurchased = 0;
    completedTransactions.forEach(transaction => {
      if (transaction.products && Array.isArray(transaction.products)) {
        transaction.products.forEach((item: any) => {
          itemsPurchased += getSafeNumber(item.quantity);
        });
      }
    });
    
    return {
      totalSpent: Number(totalSpent.toFixed(2)),
      totalTransactions: customerTransactions.length,
      lastTransaction: customerTransactions[0] || null,
      itemsPurchased
    };
  };

  // Print receipt - IMPROVED with better business info
  const printTransactionReceipt = async (transaction: Transaction) => {
    try {
      const customer = selectedCustomer || 
        customers.find(c => c.id === transaction.customer_id) || 
        { 
          id: '', 
          name: 'Customer', 
          email: '', 
          phone: '', 
          balance: 0
        };

      // Fetch transaction details with items
      const { data: transactionDetails, error } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items (
            quantity,
            price,
            product:products (
              name,
              sku,
              barcode
            )
          )
        `)
        .eq('id', transaction.id)
        .single();

      if (error) throw error;

      const receiptData = {
        id: transaction.id,
        transactionNumber: transaction.transaction_number || getTransactionIdDisplay(transaction),
        createdAt: transaction.created_at,
        subtotal: getSafeNumber(transaction.subtotal),
        vat: getSafeNumber(transaction.vat),
        total: getSafeNumber(transaction.total),
        paymentMethod: transaction.payment_method || 'cash',
        paymentStatus: transaction.status || 'completed',
        notes: transaction.notes,
        products: transactionDetails?.transaction_items?.map((item: any) => ({
          name: item.product?.name || 'Unknown Product',
          sku: item.product?.sku,
          barcode: item.product?.barcode,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price
        })) || [],
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || ''
        },
        businessInfo: {
          name: businessSettings?.business_name || 'Your Business',
          address: businessSettings?.business_address || '',
          phone: businessSettings?.business_phone || '',
          email: businessSettings?.business_email || '',
          taxNumber: businessSettings?.tax_number || '',
          logoUrl: businessSettings?.receipt_logo_url || '/logo.png',
          website: businessSettings?.website || '',
          footerMessage: businessSettings?.receipt_footer || 'Thank you for your business!'
        },
        receiptSettings: {
          fontSize: businessSettings?.receipt_font_size || 12,
          showLogo: businessSettings?.show_logo_on_receipt !== false,
          showTaxBreakdown: businessSettings?.show_tax_breakdown !== false,
          showBarcode: businessSettings?.show_barcode_on_receipt !== false,
          barcodeType: businessSettings?.barcode_type || 'CODE128'
        },
        balanceDeducted: getSafeNumber(transaction.balance_deducted),
        paymentDetails: transaction.payment_details || {},
        staffName: transaction.staff_name || currentStaff?.name || 'Staff'
      };
      
      setReceiptData(receiptData);
      setShowReceiptModal(true);
      
    } catch (error) {
      console.error('Error preparing receipt:', error);
      alert('Failed to generate receipt. Please try again.');
    }
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
  };

  // Customer CRUD operations
  const openAddCustomerModal = () => {
    setNewCustomer({
      name: '',
      email: '',
      phone: '',
      address: '',
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
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: newCustomer.name,
            email: newCustomer.email || null,
            phone: newCustomer.phone || null,
            address: newCustomer.address || null,
            notes: newCustomer.notes || null,
            balance: getSafeNumber(newCustomer.balance),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
        
        // Create audit log
        if (currentStaff && userId) {
          await supabase.from('audit_logs').insert({
            user_id: userId,
            staff_id: currentStaff.id,
            action: 'CUSTOMER_UPDATED',
            entity_type: 'customer',
            entity_id: editingCustomer.id,
            old_values: editingCustomer,
            new_values: newCustomer,
            ip_address: null,
            user_agent: navigator.userAgent
          });
        }
        
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
            notes: newCustomer.notes || null,
            balance: getSafeNumber(newCustomer.balance),
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        
        // Create audit log
        if (currentStaff && userId) {
          await supabase.from('audit_logs').insert({
            user_id: userId,
            staff_id: currentStaff.id,
            action: 'CUSTOMER_CREATED',
            entity_type: 'customer',
            entity_id: data.id,
            new_values: data,
            ip_address: null,
            user_agent: navigator.userAgent
          });
        }
        
        setCustomers([data, ...customers]);
        setSelectedCustomer(data);
        await fetchCustomerTransactions(data.id);
      }
      
      setShowAddEditModal(false);
      setEditingCustomer(null);
      setNewCustomer({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        balance: 0
      });
      
    } catch (error: any) {
      console.error('Error saving customer:', error);
      alert(`Failed to save customer: ${error.message}`);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?\n\nNote: This will also delete all related transactions and balance history.')) return;
    
    try {
      // Create audit log before deletion
      if (currentStaff && userId) {
        const customer = customers.find(c => c.id === customerId);
        await supabase.from('audit_logs').insert({
          user_id: userId,
          staff_id: currentStaff.id,
          action: 'CUSTOMER_DELETED',
          entity_type: 'customer',
          entity_id: customerId,
          old_values: customer,
          ip_address: null,
          user_agent: navigator.userAgent
        });
      }
      
      // Delete related data
      await supabase.from('balance_adjustments').delete().eq('customer_id', customerId);
      await supabase.from('transactions').delete().eq('customer_id', customerId);
      await supabase.from('customers').delete().eq('id', customerId);
      
      setCustomers(customers.filter(c => c.id !== customerId));
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
        setCustomerTransactions([]);
        setBalanceHistory([]);
      }
      
      alert('Customer deleted successfully');
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      alert(`Failed to delete customer: ${error.message}`);
    }
  };

  // Balance adjustment functions
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
    if (!selectedCustomer || !currentStaff || !userId) return;
    
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

      // Update customer balance
      const { error: updateError } = await supabase
        .from('customers')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCustomer.id);

      if (updateError) throw updateError;

      // Record balance adjustment
      const { error: adjustmentError } = await supabase
        .from('balance_adjustments')
        .insert({
          customer_id: selectedCustomer.id,
          amount: adjustmentAmount,
          previous_balance: previousBalance,
          new_balance: newBalance,
          type: balanceAdjustment.type,
          reason: balanceAdjustment.reason,
          created_by: currentStaff.id.toString(),
          created_at: new Date().toISOString()
        });

      if (adjustmentError) throw adjustmentError;

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: userId,
        staff_id: currentStaff.id,
        action: 'CUSTOMER_BALANCE_ADJUSTED',
        entity_type: 'customer',
        entity_id: selectedCustomer.id,
        old_values: { balance: previousBalance },
        new_values: { balance: newBalance },
        ip_address: null,
        user_agent: navigator.userAgent
      });

      // Update local state
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
      const { data, error } = await supabase
        .from('transaction_items')
        .select(`
          quantity,
          price,
          product:products (
            name,
            sku,
            barcode,
            category
          )
        `)
        .eq('transaction_id', transaction.id);

      if (error) throw error;

      setSelectedTransactionItems(data || []);
      setShowViewItemsModal(true);
    } catch (error) {
      console.error('Error fetching transaction items:', error);
      alert('Failed to load transaction items');
    }
  };

  // Calculate total spent with detailed breakdown
  const calculateDetailedSpending = () => {
    if (!selectedCustomer || customerTransactions.length === 0) {
      return { total: 0, byPaymentMethod: {}, byMonth: {} };
    }

    const completedTransactions = customerTransactions.filter(t => t.status === 'completed');
    
    // Total spending
    const total = completedTransactions.reduce((sum, t) => sum + getSafeNumber(t.total), 0);
    
    // Spending by payment method
    const byPaymentMethod: Record<string, number> = {};
    completedTransactions.forEach(t => {
      const method = t.payment_method || 'unknown';
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + getSafeNumber(t.total);
    });
    
    // Spending by month
    const byMonth: Record<string, number> = {};
    completedTransactions.forEach(t => {
      const date = new Date(t.created_at);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + getSafeNumber(t.total);
    });
    
    return {
      total: Number(total.toFixed(2)),
      byPaymentMethod,
      byMonth
    };
  };

  const stats = calculateCustomerStats();
  const detailedSpending = calculateDetailedSpending();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Receipt Modal - Fixed to not close entire tab */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={closeReceiptModal}
              className="p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
              aria-label="Close receipt"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <ReceiptPrint data={receiptData} onClose={closeReceiptModal} />
        </div>
      )}

      {/* View Items Modal */}
      {showViewItemsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-green-700">Transaction Items</h2>
                <button
                  onClick={() => setShowViewItemsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mt-1">{selectedTransactionItems.length} items</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-3">
                {selectedTransactionItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.product?.name || 'Unknown Product'}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        {item.product?.sku && (
                          <span>SKU: {item.product.sku}</span>
                        )}
                        {item.product?.category && (
                          <span>Category: {item.product.category}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        £{(item.price * item.quantity).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {item.quantity} × £{item.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-green-700">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <button
                  onClick={() => setShowAddEditModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Customer name"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="customer@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+44 1234 567890"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="123 Street, City, Postcode"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Balance (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newCustomer.balance}
                  onChange={(e) => setNewCustomer({...newCustomer, balance: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Positive for credit, negative for debit
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Additional notes about this customer..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setShowAddEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomer}
                disabled={!newCustomer.name.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-green-700">Adjust Balance</h2>
                <button
                  onClick={() => setShowAdjustBalanceModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-600 mt-1">Current balance: £{getSafeNumber(selectedCustomer.balance).toFixed(2)}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBalanceAdjustment({...balanceAdjustment, type: 'credit'})}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                      balanceAdjustment.type === 'credit'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ArrowUpRight className="w-4 h-4" />
                      Credit (Add)
                    </div>
                  </button>
                  <button
                    onClick={() => setBalanceAdjustment({...balanceAdjustment, type: 'debit'})}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                      balanceAdjustment.type === 'debit'
                        ? 'bg-red-100 text-red-700 border-2 border-red-500'
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <ArrowDownRight className="w-4 h-4" />
                      Debit (Deduct)
                    </div>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={balanceAdjustment.amount}
                  onChange={(e) => setBalanceAdjustment({...balanceAdjustment, amount: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  value={balanceAdjustment.reason}
                  onChange={(e) => setBalanceAdjustment({...balanceAdjustment, reason: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Reason for balance adjustment..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be logged in the audit trail
                </p>
              </div>
              
              {balanceAdjustment.amount && !isNaN(parseFloat(balanceAdjustment.amount)) && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">New balance will be:</div>
                  <div className="text-lg font-bold text-green-700">
                    £{(getSafeNumber(selectedCustomer.balance) + 
                      (balanceAdjustment.type === 'credit' ? parseFloat(balanceAdjustment.amount) : -parseFloat(balanceAdjustment.amount))
                    ).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setShowAdjustBalanceModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={adjustCustomerBalance}
                disabled={!balanceAdjustment.amount || !balanceAdjustment.reason.trim() || isNaN(parseFloat(balanceAdjustment.amount))}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium flex items-center justify-center gap-2 ${
                  balanceAdjustment.type === 'credit'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Save className="w-4 h-4" />
                {balanceAdjustment.type === 'credit' ? 'Credit Balance' : 'Debit Balance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-2">Manage customer accounts and view transaction history</p>
      </div>
      
      {/* Stats Overview - REVAMPED */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">{customers.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Balance Owed</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">
                £{customers.reduce((sum, c) => sum + getSafeNumber(c.balance), 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">
                {customers.filter(c => getSafeNumber(c.balance) !== 0).length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Customers List */}
        <div className="lg:w-2/5">
          {/* Search and Add Customer */}
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                onClick={openAddCustomerModal}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>
          
          {/* Customers List */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading customers...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="p-8 text-center">
                <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No customers found</p>
                <button
                  onClick={openAddCustomerModal}
                  className="mt-3 text-green-600 hover:text-green-700 font-medium"
                >
                  Add your first customer
                </button>
              </div>
            ) : (
              <div className="divide-y max-h-[70vh] overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedCustomer?.id === customer.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                    }`}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{customer.name || 'Unnamed Customer'}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{customer.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          getSafeNumber(customer.balance) > 0 
                            ? 'text-red-600' 
                            : getSafeNumber(customer.balance) < 0 
                            ? 'text-blue-600' 
                            : 'text-gray-600'
                        }`}>
                          £{getSafeNumber(customer.balance).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
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
        
        {/* Right Column - Customer Details and Transactions */}
        <div className="lg:w-3/5">
          {selectedCustomer ? (
            <>
              {/* Customer Details Header */}
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => setSelectedCustomer(null)}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Back to list"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.name || 'Unnamed Customer'}</h2>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        ID: {selectedCustomer.id.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-gray-600">
                      {selectedCustomer.phone && (
                        <span className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {selectedCustomer.phone}
                        </span>
                      )}
                      {selectedCustomer.email && (
                        <span className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {selectedCustomer.email}
                        </span>
                      )}
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Since {formatDate(selectedCustomer.created_at, false)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      getSafeNumber(selectedCustomer.balance) > 0 
                        ? 'text-red-600' 
                        : getSafeNumber(selectedCustomer.balance) < 0 
                        ? 'text-blue-600' 
                        : 'text-gray-600'
                    }`}>
                      £{getSafeNumber(selectedCustomer.balance).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Current Balance</div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => openEditCustomerModal(selectedCustomer)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1 font-medium"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={openAdjustBalanceModal}
                        className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-1 font-medium"
                      >
                        <DollarSign className="w-3 h-3" />
                        Adjust Balance
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Customer Stats - REVAMPED */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-sm font-medium text-gray-600">Total Spent</div>
                    <div className="text-xl font-bold mt-1 text-gray-900">£{(detailedSpending.total || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">{stats.totalTransactions} transactions</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-sm font-medium text-gray-600">Items Purchased</div>
                    <div className="text-xl font-bold mt-1 text-gray-900">{stats.itemsPurchased}</div>
                    <div className="text-xs text-gray-500 mt-1">Total items</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="text-sm font-medium text-gray-600">Last Transaction</div>
                    <div className="text-xl font-bold mt-1 text-gray-900">
                      {stats.lastTransaction ? `£${getSafeNumber(stats.lastTransaction.total).toFixed(2)}` : 'None'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {stats.lastTransaction ? formatDate(stats.lastTransaction.created_at, true) : 'No transactions'}
                    </div>
                  </div>
                </div>
                
                {/* Customer Notes */}
                {selectedCustomer.notes && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                      <p className="text-gray-700">{selectedCustomer.notes}</p>
                    </div>
                  </div>
                )}
                
                {/* Address */}
                {selectedCustomer.address && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Address</h3>
                    <p className="text-gray-600">{selectedCustomer.address}</p>
                  </div>
                )}
              </div>
              
              {/* Tabs for Transactions and Balance History */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="border-b">
                  <div className="flex">
                    <div className="flex-1 p-6 border-b-2 border-green-500">
                      <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
                      <p className="text-sm text-gray-500 mt-1">{customerTransactions.length} transactions</p>
                    </div>
                    <div className="flex-1 p-6 border-b border-gray-200 text-center">
                      <h2 className="text-xl font-bold text-gray-900">Balance History</h2>
                      <p className="text-sm text-gray-500 mt-1">{balanceHistory.length} adjustments</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {loadingTransactions ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading transactions...</p>
                    </div>
                  ) : customerTransactions.length === 0 ? (
                    <div className="p-8 text-center">
                      <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No transactions found</p>
                      <p className="text-sm text-gray-400 mt-1">Transactions will appear here after purchases</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {customerTransactions.map((transaction) => (
                        <div key={String(transaction.id)} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-2">
                                <Hash className="w-4 h-4 text-gray-400" />
                                Transaction {getTransactionIdDisplay(transaction)}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(transaction.created_at, true)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  transaction.status === 'completed' 
                                    ? 'bg-green-100 text-green-800'
                                    : transaction.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {transaction.status || 'unknown'}
                                </span>
                                <span className="text-gray-500 capitalize">
                                  {transaction.payment_method || 'unknown'}
                                </span>
                                {transaction.staff_name && (
                                  <span className="text-gray-500">
                                    by {transaction.staff_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">
                                £{getSafeNumber(transaction.total).toFixed(2)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Subtotal: £{getSafeNumber(transaction.subtotal).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Transaction Details */}
                          <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                            <div>
                              <span className="text-gray-500">VAT:</span>
                              <span className="ml-2 font-medium">£{getSafeNumber(transaction.vat).toFixed(2)}</span>
                            </div>
                            {getSafeNumber(transaction.balance_deducted) > 0 && (
                              <div>
                                <span className="text-gray-500">Balance Used:</span>
                                <span className="ml-2 font-medium text-blue-600">
                                  £{getSafeNumber(transaction.balance_deducted).toFixed(2)}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">Payment:</span>
                              <span className="ml-2 font-medium capitalize">{transaction.payment_method}</span>
                            </div>
                          </div>
                          
                          {transaction.notes && (
                            <div className="mb-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              <span className="font-medium">Note:</span> {transaction.notes}
                            </div>
                          )}
                          
                          {/* Transaction Actions */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => printTransactionReceipt(transaction)}
                              className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center gap-1 font-medium"
                            >
                              <Printer className="w-3 h-3" />
                              Print Receipt
                            </button>
                            <button
                              onClick={() => viewTransactionItems(transaction)}
                              className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1 font-medium"
                            >
                              <Package className="w-3 h-3" />
                              View Items
                            </button>
                            <button
                              onClick={() => {
                                // View transaction details
                                alert(`Transaction ${getTransactionIdDisplay(transaction)}\nTotal: £${getSafeNumber(transaction.total).toFixed(2)}\nDate: ${formatDate(transaction.created_at, true)}`);
                              }}
                              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1 font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // No customer selected view
            <div className="bg-white rounded-xl shadow-sm border h-full flex items-center justify-center p-12">
              <div className="text-center">
                <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Customer Selected</h3>
                <p className="text-gray-500 max-w-sm">
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
      <div className="bg-white rounded-xl shadow-lg border p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-100 rounded-full">
            <svg 
              className="w-8 h-8 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.73-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard Error</h1>
            <p className="text-gray-600 mt-1">Something went wrong while loading the customer data</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-700 mb-2">Error details:</p>
          <code className="text-sm text-red-600 bg-red-50 p-3 rounded block overflow-auto">
            {error?.message || 'Unknown error occurred'}
          </code>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={resetErrorBoundary}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            Try Loading Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
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
