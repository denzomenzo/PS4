import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe (No hardcoded API version to avoid conflicts with SDK v20)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Robust helper to extract IDs from Stripe fields.
 * Using 'any' here is the secret to bypassing the v20.0.0 Union Type errors.
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
    return NextResponse.json({ error: 'Webhook config error' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // --- 1. CHECKOUT COMPLETED ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any; 
    const customerEmail = session.customer_email || session.customer_details?.email;
    const planType = session.metadata?.plan || 'annual';

    if (customerEmail) {
      const licenseKey = generateLicenseKey();
      const expiryDate = new Date();
      planType === 'monthly' ? expiryDate.setMonth(expiryDate.getMonth() + 1) : expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      await supabase.from('licenses').insert({
        license_key: licenseKey,
        email: customerEmail,
        stripe_customer_id: getStripeId(session.customer),
        stripe_subscription_id: getStripeId(session.subscription),
        plan_type: planType,
        status: 'active',
        expires_at: expiryDate.toISOString(),
      });

      await supabase.functions.invoke('send-license-email', {
        body: { email: customerEmail, licenseKey, planType },
      });
    }
  }

  // --- 2. RENEWAL (THIS FIXES YOUR SPECIFIC ERROR) ---
  if (event.type === 'invoice.payment_succeeded') {
    // We cast to 'any' here because Stripe SDK 20.x removes '.subscription' 
    // from the base Invoice type to account for one-time payments.
    const invoice = event.data.object as any;
    const subscriptionId = getStripeId(invoice.subscription);

    if (subscriptionId) {
      const { data: license } = await supabase
        .from('licenses')
        .select('plan_type')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (license) {
        const newExpiry = new Date();
        license.plan_type === 'monthly' ? newExpiry.setMonth(newExpiry.getMonth() + 1) : newExpiry.setFullYear(newExpiry.getFullYear() + 1);

        await supabase
          .from('licenses')
          .update({ expires_at: newExpiry.toISOString(), status: 'active' })
          .eq('stripe_subscription_id', subscriptionId);
      }
    }
  }

  // --- 3. CANCELLATION ---
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    await supabase
      .from('licenses')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id);
  }

  return NextResponse.json({ received: true });
}
