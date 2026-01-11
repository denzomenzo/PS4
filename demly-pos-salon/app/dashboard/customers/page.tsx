// app/dashboard/customers/page.tsx
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
  ShoppingBag
} from 'lucide-react';
import Link from 'next/link';
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
  id: string;
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
}

interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
  } | null;
  quantity: number;
  price: number;
  discount: number;
}

// Helper function to format dates
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

// Helper function to safely get numbers
const getSafeNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

function CustomersContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  // Default receipt settings
  const defaultReceiptSettings = {
    business_name: 'Your Business',
    business_address: '',
    business_phone: '',
    business_email: '',
    tax_number: '',
    receipt_footer: 'Thank you for your business!',
    receipt_font_size: 12,
    receipt_logo_url: '',
    show_barcode_on_receipt: true,
    barcode_type: 'CODE128'
  };

  // Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, []);
  
  // Add real-time subscription for customer updates
  useEffect(() => {
    if (!selectedCustomer?.id) return;
    
    const customerSubscription = supabase
      .channel('customer-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${selectedCustomer.id}`
        },
        (payload) => {
          console.log('Customer updated:', payload.new);
          // Update selected customer
          setSelectedCustomer(payload.new as Customer);
          
          // Update customers list
          setCustomers(prev => 
            prev.map(c => 
              c.id === selectedCustomer.id ? { ...c, ...payload.new } : c
            )
          );
          
          // Refresh transactions if balance was updated
          if (payload.new.balance !== selectedCustomer.balance) {
            fetchCustomerTransactions(selectedCustomer.id);
          }
        }
      )
      .subscribe();
    
    return () => {
      customerSubscription.unsubscribe();
    };
  }, [selectedCustomer?.id]);
  
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
      
      if (error) {
        console.error('Supabase error:', error);
        setCustomers([]);
        return;
      }
      
      setCustomers(Array.isArray(data) ? data : []);
      
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCustomerTransactions = async (customerId: string) => {
  try {
    setLoadingTransactions(true);
    
    // Simple query without any joins
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
    
    console.log('Transactions found:', transactions?.length);
    
    // If we have transactions, try to get items separately
    if (transactions && transactions.length > 0) {
      const transactionIds = transactions.map(t => t.id);
      
      // Try to get transaction items
      try {
        const { data: transactionItems } = await supabase
          .from('transaction_items')
          .select('*')
          .in('transaction_id', transactionIds);
        
        // Combine data
        const transformedTransactions = transactions.map(transaction => {
          const items = transactionItems?.filter(item => item.transaction_id === transaction.id) || [];
          return {
            ...transaction,
            products: items // Just include items, no product details
          };
        });
        
        setCustomerTransactions(transformedTransactions);
      } catch (itemsError) {
        console.error('Error fetching transaction items:', itemsError);
        // Fallback: just use transactions without items
        const transformedTransactions = transactions.map(transaction => ({
          ...transaction,
          products: []
        }));
        setCustomerTransactions(transformedTransactions);
      }
    } else {
      setCustomerTransactions([]);
    }
    
  } catch (error) {
    console.error('Error in fetchCustomerTransactions:', error);
    setCustomerTransactions([]);
  } finally {
    setLoadingTransactions(false);
  }
};
    
    // If you need product names, fetch them separately
    const productIds = transactionItems?.map(item => item.product_id).filter(Boolean) || [];
    let productsMap: Record<string, any> = {};
    
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, price')
        .in('id', productIds);
      
      if (!productsError && products) {
        // Create a map for quick lookup
        productsMap = products.reduce((map: Record<string, any>, product) => {
          map[product.id] = product;
          return map;
        }, {});
      }
    }
    
    // Combine data
    const transformedTransactions = transactions.map(transaction => {
      const items = transactionItems?.filter(item => item.transaction_id === transaction.id) || [];
      return {
        ...transaction,
        products: items.map(item => ({
          ...item,
          product: productsMap[item.product_id] || { 
            id: item.product_id, 
            name: 'Product', 
            sku: '', 
            price: 0 
          }
        }))
      };
    });
    
    console.log('Transformed transactions:', transformedTransactions);
    setCustomerTransactions(transformedTransactions);
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    setCustomerTransactions([]);
  } finally {
    setLoadingTransactions(false);
  }
};
    
    // Get transaction IDs
    const transactionIds = transactions.map(t => t.id);
    
    // Fetch transaction items WITHOUT the products join
    const { data: transactionItems, error: itemsError } = await supabase
      .from('transaction_items')
      .select('*')
      .in('transaction_id', transactionIds);
    
    if (itemsError) {
      console.error('Error fetching transaction items:', itemsError);
      // Continue without items
    }
    
    // If you need product names, fetch them separately
    const productIds = transactionItems?.map(item => item.product_id).filter(Boolean) || [];
    let productsMap = {};
    
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku, price')
        .in('id', productIds);
      
      if (!productsError && products) {
        // Create a map for quick lookup
        productsMap = products.reduce((map, product) => {
          map[product.id] = product;
          return map;
        }, {});
      }
    }
    
    // Combine data
    const transformedTransactions = transactions.map(transaction => {
      const items = transactionItems?.filter(item => item.transaction_id === transaction.id) || [];
      return {
        ...transaction,
        products: items.map(item => ({
          ...item,
          product: productsMap[item.product_id] || { 
            id: item.product_id, 
            name: 'Product', 
            sku: '', 
            price: 0 
          }
        }))
      };
    });
    
    console.log('Transformed transactions:', transformedTransactions);
    setCustomerTransactions(transformedTransactions);
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    setCustomerTransactions([]);
  } finally {
    setLoadingTransactions(false);
  }
};
      
      // Combine data
      const transformedTransactions = transactions.map(transaction => {
        const items = transactionItems?.filter(item => item.transaction_id === transaction.id) || [];
        return {
          ...transaction,
          products: items.map(item => ({
            ...item,
            product: item.product || { id: '', name: 'Unknown Product', sku: '', price: 0 }
          }))
        };
      });
      
      console.log('Transformed transactions:', transformedTransactions);
      setCustomerTransactions(transformedTransactions);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setCustomerTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  // Handle customer selection
  const handleCustomerSelect = async (customer: Customer) => {
    console.log('Selecting customer:', customer.id, customer.name);
    setSelectedCustomer(customer);
    await fetchCustomerTransactions(customer.id);
  };
  
  // Calculate customer stats
  const calculateCustomerStats = () => {
    if (!selectedCustomer || !customerTransactions || customerTransactions.length === 0) {
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
  
  // Print transaction receipt
  const printTransactionReceipt = async (transaction: Transaction) => {
    try {
      // Get customer data
      const customer = selectedCustomer || 
        customers.find(c => c.id === transaction.customer_id) || 
        { id: '', name: 'Customer', email: '', phone: '', balance: 0 };
      
      // Transform products for receipt
      const receiptProducts = (transaction.products || []).map((item: any) => ({
        id: item.id || Math.random(),
        name: item.product?.name || 'Product',
        price: getSafeNumber(item.price),
        quantity: getSafeNumber(item.quantity),
        discount: getSafeNumber(item.discount),
        total: (getSafeNumber(item.price) * getSafeNumber(item.quantity)) - getSafeNumber(item.discount)
      }));
      
      // Calculate totals
      const subtotal = getSafeNumber(transaction.subtotal) || 
        receiptProducts.reduce((sum, item) => sum + item.total, 0);
      
      const vat = getSafeNumber(transaction.vat);
      const total = getSafeNumber(transaction.total) || subtotal + vat;
      
      // Prepare receipt data
      const receiptData = {
        id: transaction.id,
        createdAt: transaction.created_at,
        subtotal,
        vat,
        total,
        discountAmount: receiptProducts.reduce((sum, item) => sum + getSafeNumber(item.discount), 0),
        paymentMethod: transaction.payment_method || 'cash',
        paymentStatus: transaction.status || 'completed',
        notes: transaction.notes,
        products: receiptProducts,
        customer: {
          id: parseInt(customer.id) || 0,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          balance: getSafeNumber(customer.balance)
        },
        businessInfo: {
          name: defaultReceiptSettings.business_name,
          address: defaultReceiptSettings.business_address,
          phone: defaultReceiptSettings.business_phone,
          email: defaultReceiptSettings.business_email,
          taxNumber: defaultReceiptSettings.tax_number,
          logoUrl: defaultReceiptSettings.receipt_logo_url
        },
        receiptSettings: {
          fontSize: defaultReceiptSettings.receipt_font_size,
          footer: defaultReceiptSettings.receipt_footer,
          showBarcode: defaultReceiptSettings.show_barcode_on_receipt,
          barcodeType: defaultReceiptSettings.barcode_type,
          showTaxBreakdown: true
        },
        balanceDeducted: getSafeNumber(transaction.balance_deducted),
        paymentDetails: transaction.payment_details || {},
        staffName: 'Staff'
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
    if (!confirm('Are you sure you want to delete this customer? This will also delete all their transactions.')) return;
    
    try {
      // First delete related transactions
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
      
      // Refresh customers list
      fetchCustomers();
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
        setCustomerTransactions([]);
      }
      
      alert('Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer. Make sure they have no pending transactions.');
    }
  };
  
  // Filtered customers based on search
  const filteredCustomers = (customers || []).filter(customer =>
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );
  
  // Calculate stats
  const stats = calculateCustomerStats();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header - GREEN TEXT */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-green-700">Customers</h1>
        <p className="text-green-600 mt-2">Manage your customers and view their transactions</p>
      </div>
      
      {/* Stats Overview - GREEN LABELS, BLACK NUMBERS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Customers</p>
              <p className="text-2xl font-bold mt-1 text-gray-900">{(customers || []).length}</p>
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
                £{(customers || []).reduce((sum, c) => sum + getSafeNumber(c.balance), 0).toFixed(2)}
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
                {(customers || []).filter(c => getSafeNumber(c.balance) > 0).length}
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
                {(customers || []).length > 0 
                  ? Math.round((customers || []).reduce((sum, c) => sum + getSafeNumber(c.loyalty_points), 0) / (customers || []).length)
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
              <Link
                href="/dashboard/customers/new"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
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
                      <Link
                        href={`/dashboard/customers/${customer.id}/edit`}
                        className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-1 font-medium"
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
              {/* Customer Details */}
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.name || 'Unnamed Customer'}</h2>
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
                  </div>
                </div>
                
                {/* Customer Stats - GREEN LABELS, BLACK NUMBERS */}
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
                  <h2 className="text-xl font-bold text-gray-900">Transaction History ({customerTransactions.length})</h2>
                  <p className="text-sm text-gray-500 mt-1">Click print receipt to view transaction details</p>
                </div>
                
                {loadingTransactions ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading transactions...</p>
                  </div>
                ) : customerTransactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No transactions found for this customer</p>
                    <p className="text-sm text-gray-400 mt-1">Transactions will appear here after purchases</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {customerTransactions.map((transaction) => (
                      <div key={transaction.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              Transaction #{transaction.id?.slice(-6) || 'Unknown'}
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
                        
                        {/* Transaction Items */}
                        {transaction.products && transaction.products.length > 0 && (
                          <div className="mt-3 pl-4 border-l-2 border-green-200">
                            <p className="text-xs font-medium text-green-600 mb-2">ITEMS:</p>
                            {transaction.products.slice(0, 3).map((item: any, index: number) => (
                              <div key={item.id || index} className="text-sm text-gray-600 mb-1 flex justify-between">
                                <span>
                                  {getSafeNumber(item.quantity)} × {item.product?.name || 'Product'}
                                </span>
                                <span className="font-medium">
                                  £{(getSafeNumber(item.price) * getSafeNumber(item.quantity) - getSafeNumber(item.discount)).toFixed(2)}
                                </span>
                              </div>
                            ))}
                            {transaction.products.length > 3 && (
                              <div className="text-sm text-gray-500 mt-2">
                                +{transaction.products.length - 3} more items
                              </div>
                            )}
                          </div>
                        )}
                        
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
                <div className="mt-4 text-sm text-green-600">
                  <p>You can view:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Customer balance and details</li>
                    <li>• Transaction history</li>
                    <li>• Purchase statistics</li>
                    <li>• Print receipts</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-green-50">
              <h3 className="text-lg font-semibold text-green-700">Receipt Preview</h3>
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
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Print Receipt
                </button>
                <button
                  onClick={closeReceiptModal}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}

// Main export wrapped with ErrorBoundary
export default function CustomersPage() {
  return (
    <ErrorBoundary fallback={<CustomersErrorFallback />}>
      <CustomersContent />
    </ErrorBoundary>
  );
}



