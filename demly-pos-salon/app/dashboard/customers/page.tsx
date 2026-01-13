// app/dashboard/customers/page.tsx - FIXED VERSION
"use client";

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
  TrendingUp,
  ShoppingBag,
  X,
  Save,
  ChevronLeft,
  Plus,
  Eye
} from 'lucide-react';
import ReceiptPrint from '@/components/receipts/ReceiptPrint';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  balance: number;
  loyalty_points: number;
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
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
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

const getTransactionIdDisplay = (id: string | number | null | undefined): string => {
  if (!id) return 'Unknown';
  const idStr = String(id);
  return idStr.length > 6 ? `#${idStr.slice(-6)}` : `#${idStr}`;
};

function CustomersContent() {
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    balance: 0,
    loyalty_points: 0
  });
  const [businessSettings, setBusinessSettings] = useState<any>(null);

  // Load data
  useEffect(() => {
    fetchCustomers();
    fetchBusinessSettings();
  }, []);

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
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Format transactions with staff name
      const formattedTransactions = (data || []).map(transaction => ({
        ...transaction,
        staff_name: transaction.staff?.name || 'Staff'
      }));
      
      setCustomerTransactions(formattedTransactions);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setCustomerTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerTransactions(customer.id);
  };

  const calculateCustomerStats = () => {
    if (!selectedCustomer || customerTransactions.length === 0) {
      return {
        totalSpent: 0,
        avgTransaction: 0,
        totalTransactions: 0,
        lastTransaction: null
      };
    }
    
    const completedTransactions = customerTransactions.filter(t => t.status === 'completed');
    const totalSpent = completedTransactions.reduce((sum, t) => sum + getSafeNumber(t.total), 0);
    const avgTransaction = completedTransactions.length > 0 
      ? totalSpent / completedTransactions.length 
      : 0;
    
    return {
      totalSpent: Number(totalSpent.toFixed(2)),
      avgTransaction: Number(avgTransaction.toFixed(2)),
      totalTransactions: customerTransactions.length,
      lastTransaction: customerTransactions[0] || null
    };
  };

  // Print receipt - FIXED to show properly
  const printTransactionReceipt = async (transaction: Transaction) => {
    try {
      const customer = selectedCustomer || 
        customers.find(c => c.id === transaction.customer_id) || 
        { 
          id: '', 
          name: 'Customer', 
          email: '', 
          phone: '', 
          balance: 0,
          loyalty_points: 0 
        };

      const receiptData = {
        id: transaction.id,
        createdAt: transaction.created_at,
        subtotal: getSafeNumber(transaction.subtotal),
        vat: getSafeNumber(transaction.vat),
        total: getSafeNumber(transaction.total),
        paymentMethod: transaction.payment_method || 'cash',
        paymentStatus: transaction.status || 'completed',
        notes: transaction.notes,
        products: transaction.products || [],
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          balance: getSafeNumber(customer.balance)
        },
        businessInfo: {
          name: businessSettings?.business_name || 'Your Business',
          address: businessSettings?.business_address || '',
          phone: businessSettings?.business_phone || '',
          email: businessSettings?.business_email || '',
          taxNumber: businessSettings?.tax_number || '',
          logoUrl: businessSettings?.receipt_logo_url || ''
        },
        receiptSettings: {
          fontSize: businessSettings?.receipt_font_size || 12,
          footer: businessSettings?.receipt_footer || 'Thank you for your business!',
          showBarcode: businessSettings?.show_barcode_on_receipt !== false,
          barcodeType: businessSettings?.barcode_type || 'CODE128',
          showTaxBreakdown: businessSettings?.show_tax_breakdown !== false
        },
        balanceDeducted: getSafeNumber(transaction.balance_deducted),
        paymentDetails: transaction.payment_details || {},
        staffName: transaction.staff_name || 'Staff'
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
      balance: 0,
      loyalty_points: 0
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
      balance: getSafeNumber(customer.balance),
      loyalty_points: getSafeNumber(customer.loyalty_points)
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
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update({
            name: newCustomer.name,
            email: newCustomer.email || null,
            phone: newCustomer.phone || null,
            address: newCustomer.address || null,
            notes: newCustomer.notes || null,
            balance: getSafeNumber(newCustomer.balance),
            loyalty_points: getSafeNumber(newCustomer.loyalty_points),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
        
        // Update local state
        setCustomers(customers.map(c => 
          c.id === editingCustomer.id 
            ? { 
                ...c, 
                ...newCustomer,
                balance: getSafeNumber(newCustomer.balance),
                loyalty_points: getSafeNumber(newCustomer.loyalty_points)
              }
            : c
        ));
        
        if (selectedCustomer?.id === editingCustomer.id) {
          setSelectedCustomer({
            ...selectedCustomer,
            ...newCustomer,
            balance: getSafeNumber(newCustomer.balance),
            loyalty_points: getSafeNumber(newCustomer.loyalty_points)
          });
        }
        
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert([{
            name: newCustomer.name,
            email: newCustomer.email || null,
            phone: newCustomer.phone || null,
            address: newCustomer.address || null,
            notes: newCustomer.notes || null,
            balance: getSafeNumber(newCustomer.balance),
            loyalty_points: getSafeNumber(newCustomer.loyalty_points),
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        
        // Add to local state
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
        balance: 0,
        loyalty_points: 0
      });
      
    } catch (error: any) {
      console.error('Error saving customer:', error);
      alert(`Failed to save customer: ${error.message}`);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?\n\nNote: This will also delete all related transactions.')) return;
    
    try {
      // First, delete related transactions
      await supabase
        .from('transactions')
        .delete()
        .eq('customer_id', customerId);
      
      // Then delete the customer
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) throw error;
      
      // Update local state
      setCustomers(customers.filter(c => c.id !== customerId));
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
        setCustomerTransactions([]);
      }
      
      alert('Customer deleted successfully');
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      alert(`Failed to delete customer: ${error.message}`);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const stats = calculateCustomerStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Receipt Modal - FIXED: Full screen overlay */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-[9999] bg-white">
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={closeReceiptModal}
              className="p-2 bg-gray-800 text-white rounded-full hover:bg-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <ReceiptPrint data={receiptData} onClose={closeReceiptModal} />
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
              
              <div className="grid grid-cols-2 gap-4">
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
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loyalty Points
                  </label>
                  <input
                    type="number"
                    value={newCustomer.loyalty_points}
                    onChange={(e) => setNewCustomer({...newCustomer, loyalty_points: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
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

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-green-700">Customers</h1>
        <p className="text-green-600 mt-2">Manage your customers and view their transactions</p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Customers</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">{customers.length}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Balance Owed</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">
                £{customers.reduce((sum, c) => sum + getSafeNumber(c.balance), 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Active Customers</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">
                {customers.filter(c => getSafeNumber(c.balance) > 0).length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Avg. Loyalty Points</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">
                {customers.length > 0 
                  ? Math.round(customers.reduce((sum, c) => sum + getSafeNumber(c.loyalty_points), 0) / customers.length)
                  : 0}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-orange-600" />
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
                  onKeyUp={(e) => {
                    if (e.key === 'Enter') fetchCustomers();
                  }}
                />
              </div>
              <button
                onClick={fetchCustomers}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Search
              </button>
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
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center">
                <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No customers found</p>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      fetchCustomers();
                    }}
                    className="mt-2 text-green-600 hover:text-green-700 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedCustomer?.id === customer.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                    }`}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{customer.name || 'Unnamed Customer'}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                          {customer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          getSafeNumber(customer.balance) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          £{getSafeNumber(customer.balance).toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getSafeNumber(customer.loyalty_points)} pts
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCustomerModal(customer);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1 font-medium"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomer(customer.id);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center gap-1 font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
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
                        className="p-1 hover:bg-gray-100 rounded-lg"
                        title="Back to list"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.name || 'Unnamed Customer'}</h2>
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
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      getSafeNumber(selectedCustomer.balance) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      £{getSafeNumber(selectedCustomer.balance).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Current Balance</div>
                    <div className="text-xs text-green-600 mt-1">
                      {getSafeNumber(selectedCustomer.loyalty_points)} loyalty points
                    </div>
                    <button
                      onClick={() => openEditCustomerModal(selectedCustomer)}
                      className="mt-3 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-1 font-medium"
                    >
                      <Edit className="w-3 h-3" />
                      Edit Customer
                    </button>
                  </div>
                </div>
                
                {/* Customer Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Total Spent</div>
                    <div className="text-xl font-bold mt-1 text-gray-900">£{(stats.totalSpent || 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Avg Transaction</div>
                    <div className="text-xl font-bold mt-1 text-gray-900">£{(stats.avgTransaction || 0).toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Total Transactions</div>
                    <div className="text-xl font-bold mt-1 text-gray-900">{stats.totalTransactions || 0}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Loyalty Points</div>
                    <div className="text-xl font-bold mt-1 text-gray-900">{getSafeNumber(selectedCustomer.loyalty_points)}</div>
                  </div>
                </div>
                
                {/* Customer Notes */}
                {selectedCustomer.notes && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-green-600 mb-2">Notes</h3>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                      <p className="text-gray-700">{selectedCustomer.notes}</p>
                    </div>
                  </div>
                )}
                
                {/* Address */}
                {selectedCustomer.address && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-600 mb-2">Address</h3>
                    <p className="text-gray-600">{selectedCustomer.address}</p>
                  </div>
                )}
              </div>
              
              {/* Transactions */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Transaction History ({customerTransactions.length})</h2>
                      <p className="text-sm text-gray-500 mt-1">All transactions for this customer</p>
                    </div>
                    <button
                      onClick={() => fetchCustomerTransactions(selectedCustomer.id)}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 font-medium"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
                
                {loadingTransactions ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading transactions...</p>
                  </div>
                ) : customerTransactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No transactions found</p>
                    <p className="text-sm text-gray-400 mt-1">Transactions will appear here after purchases</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {customerTransactions.map((transaction) => (
                      <div key={String(transaction.id)} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              Transaction {getTransactionIdDisplay(transaction.id)}
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
                            <div className="text-sm text-gray-500 capitalize">
                              {transaction.payment_method || 'unknown'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Transaction Details */}
                        <div className="mt-3 text-sm text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>£{getSafeNumber(transaction.subtotal).toFixed(2)}</span>
                          </div>
                          {getSafeNumber(transaction.vat) > 0 && (
                            <div className="flex justify-between">
                              <span>VAT:</span>
                              <span>£{getSafeNumber(transaction.vat).toFixed(2)}</span>
                            </div>
                          )}
                          {transaction.notes && (
                            <div className="mt-2 text-gray-500">
                              <span className="font-medium">Note:</span> {transaction.notes}
                            </div>
                          )}
                        </div>
                        
                        {/* Transaction Actions */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => printTransactionReceipt(transaction)}
                            className="flex-1 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center gap-1 font-medium"
                          >
                            <Printer className="w-3 h-3" />
                            Print Receipt
                          </button>
                          {getSafeNumber(transaction.balance_deducted) > 0 && (
                            <div className="flex-1 px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded flex items-center justify-center gap-1 font-medium">
                              <DollarSign className="w-3 h-3" />
                              £{getSafeNumber(transaction.balance_deducted).toFixed(2)} balance used
                            </div>
                          )}
                          {transaction.products && transaction.products.length > 0 && (
                            <button
                              onClick={() => {
                                alert(`${transaction.products?.length} items purchased`);
                              }}
                              className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1 font-medium"
                            >
                              <Eye className="w-3 h-3" />
                              View Items
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
