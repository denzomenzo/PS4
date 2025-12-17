import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe. 
// We omit apiVersion to use the version associated with your Stripe Account/SDK.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * FIXED: This helper handles Stripe's "Expandable" fields.
 * It ensures TypeScript is happy by checking if the field is a string,
 * an object with an ID, or null.
 */
function getResourceId(field: any): string | null {
  if (!field) return null;
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && 'id' in field) return (field as { id: string }).id;
  return null;
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
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // --- 1. CHECKOUT COMPLETED ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
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
      console.error('❌ DB Error:', dbError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    await supabase.functions.invoke('send-license-email', {
      body: { email: customerEmail, licenseKey, planType },
    });
  }

  // --- 2. PAYMENT SUCCEEDED (RENEWAL) ---
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;
    // FIXED: Safely extract subscription ID using our helper
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

  // --- 3. SUBSCRIPTION DELETED / FAILED ---
  if (event.type === 'customer.subscription.deleted' || event.type === 'invoice.payment_failed') {
    const dataObj = event.data.object;
    // Check if it's an invoice or a subscription object to get the ID
    const subId = event.type === 'customer.subscription.deleted' 
      ? (dataObj as Stripe.Subscription).id 
      : getResourceId((dataObj as Stripe.Invoice).subscription);

    if (subId) {
      await supabase
        .from('licenses')
        .update({ status: 'inactive' })
        .eq('stripe_subscription_id', subId);
    }
  }

  return NextResponse.json({ received: true });
}
