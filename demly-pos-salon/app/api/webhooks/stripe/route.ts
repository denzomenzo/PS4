// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Store connected clients for SSE
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
  if (invoice.subscription && typeof invoice.subscription === 'object' && 'id' in invoice.subscription) return invoice.subscription.id;
  return null;
}

// SSE endpoint for live payment streaming
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

      // Store controller for this user
      if (!clients.has(userId)) {
        clients.set(userId, []);
      }
      clients.get(userId)!.push(controller);

      // Clean up on close
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

export async function POST(req: NextRequest) {
  console.log('🔔 ===== WEBHOOK RECEIVED =====');
  
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new NextResponse(JSON.stringify({ error: 'No signature' }), { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return new NextResponse(JSON.stringify({ error: 'Webhook secret not configured' }), { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('✅ Webhook verified:', event.type);
    } catch (err: any) {
      console.error('❌ Webhook verification failed:', err.message);
      return new NextResponse(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      console.log('💳 ===== CHECKOUT COMPLETED =====');
      
      const session = event.data.object as Stripe.Checkout.Session;
      
      const customerEmail = session.customer_email || session.customer_details?.email;
      const planType = session.metadata?.plan || 'annual';

      if (!customerEmail) {
        return new NextResponse(JSON.stringify({ error: 'No customer email' }), { status: 400 });
      }

      try {
        const licenseKey = generateLicenseKey();
        const expiryDate = new Date();
        if (planType === 'monthly') {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        const customerId = getStripeId(session.customer);
        const subscriptionId = getStripeId(session.subscription);

        const { data: licenseData, error: licenseError } = await supabase
          .from('licenses')
          .insert({
            license_key: licenseKey,
            email: customerEmail,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan_type: planType,
            status: 'active',
            expires_at: expiryDate.toISOString(),
            failed_payment_count: 0,
          })
          .select()
          .single();

        if (licenseError) {
          console.error('❌ Database error:', licenseError);
          return new NextResponse(JSON.stringify({ error: 'Database error' }), { status: 500 });
        }

        console.log('✅ License stored for:', customerEmail);
        return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

      } catch (error: any) {
        console.error('❌ Checkout error:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Handle payment success
    if (event.type === 'invoice.payment_succeeded') {
      console.log('✅ ===== PAYMENT SUCCEEDED =====');
      
      const invoice = event.data.object as any;
      const subscriptionId = getSubscriptionId(invoice);

      if (!subscriptionId) {
        return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
      }

      // Get license
      const { data: license, error: fetchError } = await supabase
        .from('licenses')
        .select('*')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (fetchError || !license) {
        console.error('❌ License not found:', fetchError);
        return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
      }

      // Calculate new expiry date
      const newExpiry = new Date();
      if (license.plan_type === 'monthly') {
        newExpiry.setMonth(newExpiry.getMonth() + 1);
      } else {
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      }

      // Unfreeze account and update expiry
      await supabase
        .from('licenses')
        .update({ 
          status: 'active',
          expires_at: newExpiry.toISOString(),
          payment_failed_at: null,
          failed_payment_count: 0
        })
        .eq('id', license.id);

      console.log('✅ Account unfrozen and expiry updated');

      // Get user_id for SSE broadcast
      const { data: staff } = await supabase
        .from('staff')
        .select('user_id')
        .eq('email', license.email)
        .single();

      if (staff?.user_id) {
        // Broadcast to all connected clients
        const userClients = clients.get(staff.user_id) || [];
        const paymentEvent = {
          type: 'payment_success',
          amount: invoice.total / 100,
          date: new Date().toISOString(),
        };
        
        userClients.forEach(controller => {
          try {
            controller.enqueue(`data: ${JSON.stringify(paymentEvent)}\n\n`);
          } catch (e) {
            console.error('Failed to send SSE event');
          }
        });
      }
    }

    // Handle payment failure
    if (event.type === 'invoice.payment_failed') {
      console.log('❌ ===== PAYMENT FAILED =====');
      
      const invoice = event.data.object as any;
      const subscriptionId = getSubscriptionId(invoice);
      const attemptCount = invoice.attempt_count || 1;

      if (!subscriptionId) {
        return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
      }

      // Get license
      const { data: license, error: fetchError } = await supabase
        .from('licenses')
        .select('*')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (fetchError || !license) {
        return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
      }

      if (attemptCount >= 3) {
        // After 3 failed attempts, freeze account
        await supabase
          .from('licenses')
          .update({ 
            status: 'frozen',
            payment_failed_at: new Date().toISOString(),
            failed_payment_count: attemptCount
          })
          .eq('id', license.id);
      } else {
        // Update past due status
        await supabase
          .from('licenses')
          .update({ 
            status: 'past_due',
            payment_failed_at: new Date().toISOString(),
            failed_payment_count: attemptCount
          })
          .eq('id', license.id);
      }

      // Get user_id for SSE broadcast
      const { data: staff } = await supabase
        .from('staff')
        .select('user_id')
        .eq('email', license.email)
        .single();

      if (staff?.user_id) {
        // Broadcast to all connected clients
        const userClients = clients.get(staff.user_id) || [];
        const paymentEvent = {
          type: 'payment_failed',
          amount: invoice.total / 100,
          date: new Date().toISOString(),
          attempt: attemptCount,
        };
        
        userClients.forEach(controller => {
          try {
            controller.enqueue(`data: ${JSON.stringify(paymentEvent)}\n\n`);
          } catch (e) {
            console.error('Failed to send SSE event');
          }
        });
      }
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      console.log('🚫 ===== SUBSCRIPTION CANCELLED =====');
      
      const subscription = event.data.object as Stripe.Subscription;
      
      await supabase
        .from('licenses')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
