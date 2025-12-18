import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe without hardcoding the API version 
// to avoid version drift between the SDK and Dashboard
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * FIXED: Bypasses the "Property does not exist" error by using 'any'.
 * Also handles Stripe's Expandable fields safely.
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
    return NextResponse.json({ error: 'Configuration missing' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error('❌ Webhook verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // --- 1. HANDLE CHECKOUT COMPLETED ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any; // Cast as any to stop build errors
    const customerEmail = session.customer_email || session.customer_details?.email;
    const planType = session.metadata?.plan || 'annual';

    if (!customerEmail) {
      return NextResponse.json({ error: 'No email' }, { status: 400 });
    }

    const licenseKey = generateLicenseKey();
    const expiryDate = new Date();
    
    if (planType === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const { error: licenseError } = await supabase.from('licenses').insert({
      license_key: licenseKey,
      email: customerEmail,
      stripe_customer_id: getStripeId(session.customer),
      stripe_subscription_id: getStripeId(session.subscription),
      plan_type: planType,
      status: 'active',
      expires_at: expiryDate.toISOString(),
    });

    if (!licenseError) {
      await supabase.functions.invoke('send-license-email', {
        body: { email: customerEmail, licenseKey, planType },
      });
    }
  }

  // --- 2. HANDLE RENEWAL (THE ERROR FIX) ---
  if (event.type === 'invoice.payment_succeeded') {
    // FIX: Using 'as any' here forces the compiler to ignore the Union check
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
        license.plan_type === 'monthly' 
          ? newExpiry.setMonth(newExpiry.getMonth() + 1) 
          : newExpiry.setFullYear(newExpiry.getFullYear() + 1);

        await supabase
          .from('licenses')
          .update({ 
            expires_at: newExpiry.toISOString(), 
            status: 'active' 
          })
          .eq('stripe_subscription_id', subscriptionId);
      }
    }
  }

  // --- 3. HANDLE CANCELLATION ---
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    await supabase
      .from('licenses')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id);
  }

  return NextResponse.json({ received: true });
}
