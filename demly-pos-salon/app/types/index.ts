export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  balance: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  transaction_number: string;
  customer_id: number;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: 'cash' | 'card' | 'balance' | 'mixed' | 'online' | 'other';
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  total_price: number;
}

export interface BalanceTransaction {
  id: number;
  amount: number;
  previous_balance: number;
  new_balance: number;
  note: string | null;
  created_at: string;
}

export interface CustomerWithStats extends Customer {
  total_transactions: number;
  total_spent: number;
  avg_transaction: number;
  last_purchase_date: string;
}