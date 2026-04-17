// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const clients = new Map<string, ReadableStreamDefaultController[]>();

function generateLicenseKey(): string {
  return Array.from({ length: 4 }, () =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  ).join('-');
}

function getStripeId(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'id' in value) return value.id;
  return null;
}

function getSubscriptionId(invoice: any): string | null {
  if (!invoice) return null;
  if (typeof invoice.subscription === 'string') return invoice.subscription;
  if (invoice.subscription?.id) return invoice.subscription.id;
  return null;
}

async function broadcastToUser(email: string, event: any) {
  const { data: license } = await supabase
    .from('licenses').select('id').eq('email', email).single();
  if (license) {
    const userClients = clients.get(license.id.toString()) || [];
    userClients.forEach(controller => {
      try { controller.enqueue(`data: ${JSON.stringify(event)}\n\n`); } catch {}
    });
  }
}

// SSE endpoint — settings page connects here for live payment updates
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      if (!clients.has(userId)) clients.set(userId, []);
      clients.get(userId)!.push(controller);
      req.signal.addEventListener('abort', () => {
        const userClients = clients.get(userId);
        if (userClients) {
          const index = userClients.indexOf(controller);
          if (index > -1) userClients.splice(index, 1);
        }
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Internal broadcast endpoint
export async function POST(req: NextRequest) {
  const { email, event } = await req.json();
  await broadcastToUser(email, event);
  return NextResponse.json({ success: true });
}

// Stripe webhook handler
export async function PUT(req: NextRequest) {
  console.log('🔔 ===== WEBHOOK RECEIVED =====');
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) return new NextResponse(JSON.stringify({ error: 'No signature' }), { status: 400 });
    if (!process.env.STRIPE_WEBHOOK_SECRET) return new NextResponse(JSON.stringify({ error: 'No webhook secret' }), { status: 500 });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
      console.log('✅ Webhook verified:', event.type);
    } catch (err: any) {
      console.error('❌ Webhook verification failed:', err.message);
      return new NextResponse(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    // --- checkout.session.completed ---
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const planType = session.metadata?.plan || 'annual';
      if (!customerEmail) return new NextResponse(JSON.stringify({ error: 'No email' }), { status: 400 });

      const expiryDate = new Date();
      if (planType === 'monthly') expiryDate.setMonth(expiryDate.getMonth() + 1);
      else expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      // Upsert so re-subscribing after cancellation works
      const { error } = await supabase.from('licenses').upsert({
        license_key: generateLicenseKey(),
        email: customerEmail,
        stripe_customer_id: getStripeId(session.customer),
        stripe_subscription_id: getStripeId(session.subscription),
        plan_type: planType,
        status: 'active',
        expires_at: expiryDate.toISOString(),
        failed_payment_count: 0,
        cancelled_at: null,
        cancelled_during_cooling: false,
        cancel_at_period_end: false,
        scheduled_for_deletion_at: null,
        deletion_reason: null,
      }, { onConflict: 'email' });

      if (error) {
        console.error('❌ License upsert error:', error);
        return new NextResponse(JSON.stringify({ error: 'Database error' }), { status: 500 });
      }
      console.log('✅ License upserted for:', customerEmail);
    }

    // --- invoice.payment_succeeded ---
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as any;
      const subscriptionId = getSubscriptionId(invoice);
      if (!subscriptionId) return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

      const { data: license } = await supabase
        .from('licenses').select('*').eq('stripe_subscription_id', subscriptionId).single();
      if (!license) return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

      const newExpiry = new Date();
      if (license.plan_type === 'monthly') newExpiry.setMonth(newExpiry.getMonth() + 1);
      else newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      await supabase.from('licenses').update({
        status: 'active',
        expires_at: newExpiry.toISOString(),
        payment_failed_at: null,
        failed_payment_count: 0,
      }).eq('id', license.id);

      await broadcastToUser(license.email, {
        type: 'payment_success',
        amount: invoice.total / 100,
        date: new Date().toISOString(),
      });
    }

    // --- invoice.payment_failed ---
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as any;
      const subscriptionId = getSubscriptionId(invoice);
      const attemptCount = invoice.attempt_count || 1;
      if (!subscriptionId) return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

      const { data: license } = await supabase
        .from('licenses').select('*').eq('stripe_subscription_id', subscriptionId).single();
      if (!license) return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

      await supabase.from('licenses').update({
        status: attemptCount >= 3 ? 'frozen' : 'past_due',
        payment_failed_at: new Date().toISOString(),
        failed_payment_count: attemptCount,
      }).eq('id', license.id);

      await broadcastToUser(license.email, {
        type: 'payment_failed',
        amount: invoice.total / 100,
        date: new Date().toISOString(),
        attempt: attemptCount,
      });
    }

    // --- customer.subscription.updated ---
    // Fires when: cancel_at_period_end set via portal OR reactivated via portal
    if (event.type === 'customer.subscription.updated') {
      const stripeSub = event.data.object as any;

      const { data: license } = await supabase
        .from('licenses').select('*').eq('stripe_subscription_id', stripeSub.id).single();

      if (license) {
        if (stripeSub.cancel_at_period_end) {
          const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
          await supabase.from('licenses').update({
            cancel_at_period_end: true,
            scheduled_for_deletion_at: periodEnd,
            expires_at: periodEnd,
            deletion_reason: 'subscription_cancelled',
          }).eq('id', license.id);

          await broadcastToUser(license.email, {
            type: 'subscription_cancelled_scheduled',
            message: 'Subscription will end at billing period',
            date: new Date().toISOString(),
            end_date: periodEnd,
          });
        } else {
          // Reactivated via portal — clear all cancellation state
          await supabase.from('licenses').update({
            status: 'active',
            cancel_at_period_end: false,
            cancelled_at: null,
            cancelled_during_cooling: false,
            scheduled_for_deletion_at: null,
            expires_at: null,
            deletion_reason: null,
          }).eq('id', license.id);
        }
      }
    }

    // --- customer.subscription.deleted ---
    // Fires when billing period ends after cancel_at_period_end, or immediate cancel
    // CRITICAL: preserve scheduled_for_deletion_at so cron can delete the account
    if (event.type === 'customer.subscription.deleted') {
      const stripeSub = event.data.object as any; // cast to any — TS types omit current_period_end

      const { data: license } = await supabase
        .from('licenses').select('*').eq('stripe_subscription_id', stripeSub.id).single();

      if (license) {
        const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

        await supabase.from('licenses').update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          stripe_subscription_id: null,
          // Preserve if already set (cooling cancel sets these first)
          // If not set, use period end so cron knows when to delete
          scheduled_for_deletion_at: license.scheduled_for_deletion_at || periodEnd,
          expires_at: license.expires_at || periodEnd,
        }).eq('stripe_subscription_id', stripeSub.id);

        await broadcastToUser(license.email, {
          type: 'subscription_cancelled',
          message: 'Subscription cancelled',
          date: new Date().toISOString(),
        });
      }
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
