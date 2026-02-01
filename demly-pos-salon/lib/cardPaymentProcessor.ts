// lib/cardPaymentProcessor.ts
// Complete card payment processor for POS integration

import { supabase } from '@/lib/supabaseClient';

export interface CardPaymentRequest {
  amount: number;
  currency?: string;
  userId: string;
  transactionId?: string;
  metadata?: any;
}

export interface CardPaymentResult {
  success: boolean;
  transactionId?: string;
  status?: 'completed' | 'pending' | 'declined' | 'error';
  cardBrand?: string;
  last4?: string;
  approvalCode?: string;
  receiptUrl?: string;
  error?: string;
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

    console.log(`Processing £${request.amount} payment via ${settings.provider}...`);

    // 2. Call Supabase edge function to process payment
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
        metadata: {
          transactionId: request.transactionId,
          ...request.metadata
        }
      }
    });

    if (error) {
      console.error('Payment function error:', error);
      throw new Error(error.message || 'Payment processing failed');
    }

    if (!data || !data.success) {
      throw new Error(data?.error || 'Payment failed');
    }

    return {
      success: true,
      transactionId: data.transactionId,
      status: data.status,
      cardBrand: data.cardBrand,
      last4: data.last4,
      approvalCode: data.approvalCode,
      receiptUrl: data.receiptUrl
    };

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
 * Simulate card payment for testing (when terminal not available)
 */
export async function simulateCardPayment(
  amount: number
): Promise<CardPaymentResult> {
  console.log(`Simulating card payment for £${amount}...`);
  
  // Simulate 2 second processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 90% success rate simulation
  const success = Math.random() > 0.1;
  
  if (success) {
    return {
      success: true,
      transactionId: `sim_${Date.now()}`,
      status: 'completed',
      cardBrand: 'Visa',
      last4: '4242',
      approvalCode: `${Math.floor(100000 + Math.random() * 900000)}`
    };
  } else {
    return {
      success: false,
      status: 'declined',
      error: 'Card declined - insufficient funds (simulated)'
    };
  }
}