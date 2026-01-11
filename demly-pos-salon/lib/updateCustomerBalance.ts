// utils/updateCustomerBalance.ts
import { supabase } from '@/lib/supabaseClient';

export async function updateCustomerBalanceAfterTransaction(
  customerId: string, 
  transactionTotal: number,
  balanceUsed: number = 0
) {
  try {
    // Get current customer
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('balance, loyalty_points')
      .eq('id', customerId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!customer) throw new Error('Customer not found');
    
    // Calculate new balance
    const currentBalance = customer.balance || 0;
    const newBalance = currentBalance - balanceUsed;
    
    // Calculate loyalty points (1 point per £1 spent)
    const loyaltyPointsEarned = Math.floor(transactionTotal);
    const newLoyaltyPoints = (customer.loyalty_points || 0) + loyaltyPointsEarned;
    
    // Update customer
    const { error: updateError } = await supabase
      .from('customers')
      .update({ 
        balance: Math.max(0, newBalance), // Prevent negative balance
        loyalty_points: newLoyaltyPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId);
    
    if (updateError) throw updateError;
    
    console.log('Customer balance updated:', {
      customerId,
      oldBalance: currentBalance,
      newBalance: Math.max(0, newBalance),
      balanceUsed,
      loyaltyPointsEarned
    });
    
    return true;
  } catch (error) {
    console.error('Error updating customer balance:', error);
    return false;
  }
}