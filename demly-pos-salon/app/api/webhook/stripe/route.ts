import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe without a hardcoded apiVersion
// This lets the SDK use its internal default or your Stripe Dashboard setting
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Helper to safely extract an ID from Stripe's "Expandable" fields.
 * This prevents TypeScript errors when Stripe returns an object instead of a string.
 */
function getResourceId(field: string | any | null | undefined): string | null {
  if (!field) return null;
  if (typeof field === 'string') return field;
  return (field as { id: string }).id || null;
}

function generateLicenseKey(): string {
  const segments = Array.from({ length: 4 }, () =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
  return segments.join('-');
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const eventType = event.type;
  const dataObject = event.data.object;

  // --- 1. SUCCESSFUL CHECKOUT (NEW SUBSCRIPTION) ---
  if (eventType === 'checkout.session.completed') {
    const session = dataObject as Stripe.Checkout.Session;
    const customerEmail = session.customer_email || session.customer_details?.email;
    const subscriptionId = getResourceId(session.subscription);
    const customerId = getResourceId(session.customer);
    const planType = session.metadata?.plan || 'annual';

    if (!customerEmail) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    const licenseKey = generateLicenseKey();
    const expiryDate = new Date();
    if (planType === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    }

    const { error: dbError } = await supabase.from('licenses').insert({
      license_key: licenseKey,
      email: customerEmail,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan_type: planType,
      status: 'active',
      expires_at: expiryDate.toISOString(),
    });

    if (dbError) {
      console.error('❌ Supabase Insert Error:', dbError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // Trigger email via Supabase Edge Function
    await supabase.functions.invoke('send-license-email', {
      body: { email: customerEmail, licenseKey, planType },
    });
  }

  // --- 2. RENEWAL (PAYMENT SUCCEEDED) ---
  if (eventType === 'invoice.payment_succeeded') {
    const invoice = dataObject as Stripe.Invoice;
    const subscriptionId = getResourceId(invoice.subscription);

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
          .update({ expires_at: newExpiry.toISOString(), status: 'active' })
          .eq('stripe_subscription_id', subscriptionId);
      }
    }
  }

  // --- 3. CANCELLATION OR FAILURE ---
  if (eventType === 'customer.subscription.deleted' || eventType === 'invoice.payment_failed') {
    const obj = dataObject as Stripe.Subscription | Stripe.Invoice;
    const subscriptionId = getResourceId('subscription' in obj ? obj.subscription : obj.id);

    if (subscriptionId) {
      await supabase
        .from('licenses')
        .update({ status: 'inactive' })
        .eq('stripe_subscription_id', subscriptionId);
    }
  }

  return NextResponse.json({ received: true });
}
