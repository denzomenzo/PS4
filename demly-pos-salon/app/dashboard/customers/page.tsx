// app/dashboard/customers/page.tsx
"use client";

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
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
import ReceiptPrint, { ReceiptData, ReceiptProduct } from '@/components/receipts/ReceiptPrint';

const supabase = createClient();

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  balance: number;
  loyalty_points: number;
  created_at: string;
  notes: string;
}

interface Transaction {
  id: string;
  customer_id: string;
  total: number;
  subtotal: number;
  vat: number;
  status: 'completed' | 'pending' | 'refunded';
  payment_method: 'cash' | 'card' | 'split';
  payment_details: any;
  balance_deducted: number;
  created_at: string;
  notes: string;
  products?: TransactionProduct[];
}

interface TransactionProduct {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  price: number;
  discount: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

interface ReceiptSettings {
  id: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  tax_number: string;
  receipt_footer: string;
  receipt_font_size: number;
  receipt_logo_url: string;
  show_barcode_on_receipt: boolean;
  barcode_type: string;
}

// Helper function to format dates using native JavaScript
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

// Helper to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  // Fetch customers
  useEffect(() => {
    fetchCustomers();
    fetchReceiptSettings();
  }, []);
  
  // Fetch receipt settings
  const fetchReceiptSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('receipt_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      setReceiptSettings(data);
    } catch (error) {
      console.error('Error fetching receipt settings:', error);
    }
  };
  
  // Fetch customers with search
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
  
  // Fetch customer transactions
  const fetchCustomerTransactions = async (customerId: string) => {
    try {
      setLoadingTransactions(true);
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          transaction_items(
            *,
            product:products(id, name, sku)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });
      
      if (transactionsError) throw transactionsError;
      
      // Transform the data structure
      const transformedTransactions = (transactions || []).map(transaction => ({
        ...transaction,
        products: transaction.transaction_items?.map((item: any) => ({
          ...item,
          product: item.product || { id: '', name: 'Unknown Product', sku: '' }
        })) || []
      }));
      
      setCustomerTransactions(transformedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  // Handle customer selection
  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerTransactions(customer.id);
  };
  
  // Calculate customer stats
  const calculateCustomerStats = () => {
    if (!selectedCustomer || customerTransactions.length === 0) {
      return {
        totalSpent: 0,
        avgTransaction: 0,
        totalTransactions: 0,
        lastTransaction: null
      };
    }
    
    const totalSpent = customerTransactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + t.total, 0);
    
    const avgTransaction = customerTransactions.length > 0 
      ? totalSpent / customerTransactions.length 
      : 0;
    
    const lastTransaction = customerTransactions.length > 0
      ? customerTransactions[0]
      : null;
    
    return {
      totalSpent,
      avgTransaction,
      totalTransactions: customerTransactions.length,
      lastTransaction
    };
  };
  
  // Print transaction receipt - SIMPLIFIED VERSION
  const printTransactionReceipt = async (transaction: Transaction) => {
    try {
      // Get customer data
      const customer = selectedCustomer || 
        customers.find(c => c.id === transaction.customer_id) || 
        { id: '', name: 'Customer', email: '', phone: '', balance: 0 };
      
      // Transform products for receipt
      const receiptProducts: ReceiptProduct[] = (transaction.products || []).map(item => ({
        id: item.id,
        name: item.product?.name || 'Product',
        price: item.price,
        quantity: item.quantity,
        discount: item.discount || 0,
        total: (item.price * item.quantity) - (item.discount || 0)
      }));
      
      // Calculate totals if missing
      const subtotal = transaction.subtotal || 
        receiptProducts.reduce((sum, item) => sum + item.total, 0);
      
      const vat = transaction.vat || 0;
      const total = transaction.total || subtotal + vat;
      
      // Prepare receipt data
      const receiptData: ReceiptData = {
        id: transaction.id,
        createdAt: transaction.created_at,
        subtotal,
        vat,
        total,
        discountAmount: receiptProducts.reduce((sum, item) => sum + item.discount, 0),
        paymentMethod: transaction.payment_method || 'cash',
        paymentStatus: transaction.status || 'completed',
        notes: transaction.notes,
        products: receiptProducts,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          balance: customer.balance
        },
        businessInfo: {
          name: receiptSettings?.business_name || 'Your Business',
          address: receiptSettings?.business_address || '',
          phone: receiptSettings?.business_phone || '',
          email: receiptSettings?.business_email || '',
          taxNumber: receiptSettings?.tax_number || '',
          logoUrl: receiptSettings?.receipt_logo_url || ''
        },
        receiptSettings: {
          fontSize: receiptSettings?.receipt_font_size || 12,
          footer: receiptSettings?.receipt_footer || 'Thank you for your business!',
          showBarcode: receiptSettings?.show_barcode_on_receipt !== false,
          barcodeType: receiptSettings?.barcode_type || 'CODE128',
          showTaxBreakdown: true
        },
        balanceDeducted: transaction.balance_deducted || 0,
        paymentDetails: transaction.payment_details || {},
        staffName: 'Staff' // You can get this from auth or transaction data
      };
      
      // Set receipt data and show modal
      setReceiptData(receiptData);
      setShowReceiptModal(true);
      
    } catch (error) {
      console.error('Error preparing receipt:', error);
      alert('Failed to generate receipt. Please try again.');
    }
  };
  
  // Close receipt modal
  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
  };
  
  // Delete customer
  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);
      
      if (error) throw error;
      
      // Refresh customers list
      fetchCustomers();
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
        setCustomerTransactions([]);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    }
  };
  
  // Filtered customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );
  
  // Calculate stats
  const stats = calculateCustomerStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-2">Manage your customers and view their transactions</p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Customers</p>
              <p className="text-2xl font-bold mt-1">{customers.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Balance Owed</p>
              <p className="text-2xl font-bold mt-1">
                £{customers.reduce((sum, c) => sum + c.balance, 0).toFixed(2)}
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
              <p className="text-sm text-gray-500">Active Customers</p>
              <p className="text-2xl font-bold mt-1">
                {customers.filter(c => c.balance > 0 || customerTransactions.length > 0).length}
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
              <p className="text-sm text-gray-500">Avg. Loyalty Points</p>
              <p className="text-2xl font-bold mt-1">
                {customers.length > 0 
                  ? Math.round(customers.reduce((sum, c) => sum + c.loyalty_points, 0) / customers.length)
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
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter') fetchCustomers();
                  }}
                />
              </div>
              <button
                onClick={fetchCustomers}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Search
              </button>
              <Link
                href="/dashboard/customers/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add
              </Link>
            </div>
          </div>
          
          {/* Customers List */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
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
                    className="mt-2 text-blue-600 hover:text-blue-700"
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
                      selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{customer.name}</h3>
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
                          customer.balance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          £{customer.balance.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {customer.loyalty_points} pts
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/dashboard/customers/${customer.id}/edit`}
                        className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCustomer(customer.id);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center gap-1"
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
              {/* Customer Details */}
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h2>
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
                      selectedCustomer.balance > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      £{selectedCustomer.balance.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">Current Balance</div>
                  </div>
                </div>
                
                {/* Customer Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Total Spent</div>
                    <div className="text-xl font-bold mt-1">£{stats.totalSpent.toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Avg Transaction</div>
                    <div className="text-xl font-bold mt-1">£{stats.avgTransaction.toFixed(2)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Total Transactions</div>
                    <div className="text-xl font-bold mt-1">{stats.totalTransactions}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-500">Loyalty Points</div>
                    <div className="text-xl font-bold mt-1">{selectedCustomer.loyalty_points}</div>
                  </div>
                </div>
                
                {/* Customer Notes */}
                {selectedCustomer.notes && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
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
              
              {/* Transactions */}
              <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-bold text-gray-900">Transactions ({customerTransactions.length})</h2>
                </div>
                
                {loadingTransactions ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading transactions...</p>
                  </div>
                ) : customerTransactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No transactions found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {customerTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              Transaction #{transaction.id.slice(-6)}
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
                                {transaction.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">
                              £{transaction.total.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500 capitalize">
                              {transaction.payment_method}
                            </div>
                          </div>
                        </div>
                        
                        {/* Transaction Items */}
                        <div className="mt-3 pl-4 border-l-2 border-gray-200">
                          {transaction.products?.slice(0, 2).map((item) => (
                            <div key={item.id} className="text-sm text-gray-600 mb-1">
                              {item.quantity} × {item.product?.name}
                              {item.discount > 0 && (
                                <span className="text-red-500 ml-2">
                                  (-£{item.discount.toFixed(2)})
                                </span>
                              )}
                            </div>
                          ))}
                          {transaction.products && transaction.products.length > 2 && (
                            <div className="text-sm text-gray-500">
                              +{transaction.products.length - 2} more items
                            </div>
                          )}
                        </div>
                        
                        {/* Transaction Actions */}
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => printTransactionReceipt(transaction)}
                            className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            Print Receipt
                          </button>
                          {transaction.balance_deducted > 0 && (
                            <div className="flex-1 px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded flex items-center justify-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              £{transaction.balance_deducted.toFixed(2)} balance used
                            </div>
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
      
      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Receipt Preview</h3>
              <button
                onClick={closeReceiptModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="overflow-auto max-h-[calc(90vh-80px)]">
              <ReceiptPrint data={receiptData} onClose={closeReceiptModal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


