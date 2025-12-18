import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe (Version 20.0.0 uses strict Union types)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Robust helper to extract IDs from Stripe fields.
 * Using 'any' bypasses the Union Type check for 'subscription' on Invoices.
 */
function getStripeId(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'id' in value) return value.id;
  return null;
}

function generateLicenseKey(): string {
  return Array.from({ length: 4 }, () =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  ).join('-');
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Config missing' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('❌ Webhook verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Use 'any' to bypass strict property checks on the Stripe objects
  const obj = event.data.object as any;

  // --- 1. HANDLE CHECKOUT COMPLETED ---
  if (event.type === 'checkout.session.completed') {
    console.log('💳 Processing checkout for:', obj.id);

    const customerEmail = obj.customer_details?.email || obj.customer_email;
    const planType = obj.metadata?.plan || 'annual';
    const shopName = obj.metadata?.shop_name || 'Generic Shop';
    const userId = obj.metadata?.user_id || null;

    if (!customerEmail) {
      console.error('❌ No email found');
      return NextResponse.json({ error: 'No email' }, { status: 400 });
    }

    const licenseKey = generateLicenseKey();
    const expiryDate = new Date();
    planType === 'monthly' 
      ? expiryDate.setMonth(expiryDate.getMonth() + 1) 
      : expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Matches the columns found in your screenshot
    const { data: licenseData, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        email: customerEmail,
        user_id: userId,
        shop_name: shopName,
        status: 'active',
        stripe_customer_id: getStripeId(obj.customer),
        stripe_subscription_id: getStripeId(obj.subscription),
        stripe_payment_id: obj.payment_intent || null,
        plan_type: planType,
        expires_at: expiryDate.toISOString(),
      })
      .select()
      .single();

    if (licenseError) {
      console.error('❌ DB Insert Error:', licenseError.message);
      return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    }

    console.log('✅ License saved. Triggering email...');

    // Trigger Supabase Edge Function
    await supabase.functions.invoke('send-license-email', {
      body: { email: customerEmail, licenseKey, planType, shopName },
    });
  }

  // --- 2. HANDLE RENEWAL (FIXED: The 'subscription' property error) ---
  if (event.type === 'invoice.payment_succeeded') {
    const subscriptionId = getStripeId(obj.subscription);

    if (subscriptionId) {
      const { data: license } = await supabase
        .from('licenses')
        .select('plan_type')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (license) {
        const newExpiry = new Date();
        license.plan_type === 'monthly' 
          ? newExpiry.setMonth(newExpiry.getMonth() + 1) 
          : newExpiry.setFullYear(newExpiry.getFullYear() + 1);

        await supabase
          .from('licenses')
          .update({ 
            expires_at: newExpiry.toISOString(), 
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);
        
        console.log('🔄 License renewed for subscription:', subscriptionId);
      }
    }
  }

  // --- 3. HANDLE CANCELLATION ---
  if (event.type === 'customer.subscription.deleted') {
    await supabase
      .from('licenses')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', obj.id);
    
    console.log('🚫 License marked as cancelled:', obj.id);
  }

  return NextResponse.json({ received: true });
}
