// lib/cardPaymentProcessor.ts
// Complete card payment processor for POS integration

import { supabase } from '@/lib/supabaseClient';

export interface CardPaymentRequest {
  amount: number;
  currency?: string;
  userId: string;
  transactionId?: string;
  metadata?: any;
  isRefund?: boolean; // Added refund flag
}

export interface CardPaymentResult {
  success: boolean;
  transactionId?: string;
  status?: 'completed' | 'pending' | 'declined' | 'error' | 'refunded'; // Added refunded status
  cardBrand?: string;
  last4?: string;
  approvalCode?: string;
  receiptUrl?: string;
  error?: string;
  refundId?: string; // Added refund ID
}

/**
 * Process a card payment through configured terminal
 */
export async function processCardPayment(
  request: CardPaymentRequest
): Promise<CardPaymentResult> {
  try {
    // 1. Get terminal settings for user
    const { data: settings, error: settingsError } = await supabase
      .from('card_terminal_settings')
      .select('*')
      .eq('user_id', request.userId)
      .single();

    if (settingsError || !settings || !settings.enabled) {
      throw new Error('Card terminal not configured or not enabled');
    }

    if (!settings.provider) {
      throw new Error('No payment provider selected');
    }

    const action = request.isRefund ? 'refund' : 'payment';
    console.log(`Processing £${request.amount} ${action} via ${settings.provider}...`);

    // 2. Call Supabase edge function to process payment/refund
    const { data, error } = await supabase.functions.invoke('process-card-payment', {
      body: {
        provider: settings.provider,
        amount: request.amount,
        currency: request.currency || 'GBP',
        apiKey: settings.api_key,
        deviceId: settings.device_id,
        accessToken: settings.access_token,
        locationId: settings.location_id,
        merchantCode: settings.merchant_code,
        merchantId: settings.merchant_id,
        clientId: settings.client_id,
        terminalId: settings.terminal_id,
        terminalIp: settings.terminal_ip,
        port: settings.port,
        apiToken: settings.api_token,
        testMode: settings.test_mode,
        isRefund: request.isRefund || false, // Pass refund flag to edge function
        metadata: {
          transactionId: request.transactionId,
          ...request.metadata
        }
      }
    });

    if (error) {
      console.error('Payment function error:', error);
      throw new Error(error.message || `${action} processing failed`);
    }

    if (!data || !data.success) {
      throw new Error(data?.error || `${action} failed`);
    }

    const result: CardPaymentResult = {
      success: true,
      transactionId: data.transactionId,
      status: request.isRefund ? 'refunded' : (data.status || 'completed'),
      cardBrand: data.cardBrand,
      last4: data.last4,
      approvalCode: data.approvalCode,
      receiptUrl: data.receiptUrl
    };

    // Add refund ID if this was a refund
    if (request.isRefund && data.refundId) {
      result.refundId = data.refundId;
    }

    return result;

  } catch (error: any) {
    console.error('Card payment error:', error);
    return {
      success: false,
      status: 'error',
      error: error.message || 'Payment processing failed'
    };
  }
}

/**
 * Process a card refund (convenience wrapper)
 */
export async function processCardRefund(
  request: CardPaymentRequest
): Promise<CardPaymentResult> {
  return processCardPayment({
    ...request,
    isRefund: true
  });
}

/**
 * Simulate card payment for testing (when terminal not available)
 */
export async function simulateCardPayment(
  amount: number,
  isRefund?: boolean
): Promise<CardPaymentResult> {
  const action = isRefund ? 'refund' : 'payment';
  console.log(`Simulating card ${action} for £${amount}...`);
  
  // Simulate 2 second processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 90% success rate simulation
  const success = Math.random() > 0.1;
  
  if (success) {
    const result: CardPaymentResult = {
      success: true,
      transactionId: `sim_${Date.now()}`,
      status: isRefund ? 'refunded' : 'completed',
      cardBrand: 'Visa',
      last4: '4242',
      approvalCode: `${Math.floor(100000 + Math.random() * 900000)}`
    };
    
    if (isRefund) {
      result.refundId = `ref_sim_${Date.now()}`;
    }
    
    return result;
  } else {
    return {
      success: false,
      status: 'declined',
      error: `Card ${action} declined - insufficient funds (simulated)`
    };
  }
}

/**
 * Simulate card refund for testing (convenience wrapper)
 */
export async function simulateCardRefund(
  amount: number
): Promise<CardPaymentResult> {
  return simulateCardPayment(amount, true);
}
