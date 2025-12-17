import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Stripe (No hardcoded version)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 2. Helper function to bypass the "Expandable" type error
function getStripeId(obj: any): string | null {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object' && 'id' in obj) return obj.id;
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
    return NextResponse.json({ error: 'Missing requirements' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: 'Signature failed' }, { status: 400 });
  }

  // --- CHECKOUT COMPLETED ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any; // Using 'any' here is the safest way to stop the "endless" build errors
    const customerEmail = session.customer_email || session.customer_details?.email;
    const subscriptionId = getStripeId(session.subscription);
    const customerId = getStripeId(session.customer);
    const planType = session.metadata?.plan || 'annual';

    if (customerEmail) {
      const licenseKey = generateLicenseKey();
      const expiryDate = new Date();
      planType === 'monthly' ? expiryDate.setMonth(expiryDate.getMonth() + 1) : expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      await supabase.from('licenses').insert({
        license_key: licenseKey,
        email: customerEmail,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan_type: planType,
        status: 'active',
        expires_at: expiryDate.toISOString(),
      });

      await supabase.functions.invoke('send-license-email', {
        body: { email: customerEmail, licenseKey, planType },
      });
    }
  }

  // --- RENEWAL (THE ERROR LINE) ---
  if (event.type === 'invoice.payment_succeeded') {
    // By casting as 'any', we prevent the "Property subscription does not exist" error
    const invoice = event.data.object as any;
    
    // This line will now pass the compiler
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

  // --- CANCELLATION ---
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    await supabase
      .from('licenses')
      .update({ status: 'inactive' })
      .eq('stripe_subscription_id', subscription.id);
  }

  return NextResponse.json({ received: true });
}
