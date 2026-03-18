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

// Helper function to generate license key
function generateLicenseKey(): string {
  return Array.from({ length: 4 }, () =>
    Math.random().toString(36).substring(2, 8).toUpperCase()
  ).join('-');
}

// Helper to get Stripe ID
function getStripeId(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && 'id' in value) return value.id;
  return null;
}

// Helper to get subscription ID
function getSubscriptionId(invoice: any): string | null {
  if (!invoice) return null;
  if (typeof invoice.subscription === 'string') return invoice.subscription;
  if (invoice.subscription && typeof invoice.subscription === 'object' && 'id' in invoice.subscription) return invoice.subscription.id;
  return null;
}

// Helper to broadcast events to clients
async function broadcastToUser(email: string, event: any) {
  const { data: license } = await supabase
    .from('licenses')
    .select('id')
    .eq('email', email)
    .single();

  if (license) {
    const userClients = clients.get(license.id.toString()) || [];
    userClients.forEach(controller => {
      try {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
      } catch (e) {
        console.error('Failed to send SSE event');
      }
    });
  }
}

// Helper to send email via edge function
async function sendOrderEmail(emailData: any) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-order-confirmation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    });
  } catch (error) {
    console.error('Failed to send order email:', error);
  }
}

// SSE endpoint for live updates
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

      if (!clients.has(userId)) {
        clients.set(userId, []);
      }
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

// Broadcast endpoint for internal use
export async function POST(req: NextRequest) {
  const { email, event } = await req.json();
  await broadcastToUser(email, event);
  return NextResponse.json({ success: true });
}

// Main webhook handler
export async function PUT(req: NextRequest) {
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

    // Handle checkout.session.completed (for both one-time and subscription)
    if (event.type === 'checkout.session.completed') {
      console.log('💳 ===== CHECKOUT COMPLETED =====');
      
      const session = event.data.object as Stripe.Checkout.Session;
      
      const customerEmail = session.customer_email || session.customer_details?.email;
      const bundle = session.metadata?.bundle || 'software';
      const fullName = session.metadata?.fullName || '';
      const phone = session.metadata?.phone || '';
      const hasHardware = session.metadata?.hasHardware === 'true';

      if (!customerEmail) {
        return new NextResponse(JSON.stringify({ error: 'No customer email' }), { status: 400 });
      }

      try {
        const licenseKey = generateLicenseKey();
        
        // For one-time payments, license never expires
        // For subscriptions, set expiry based on plan
        let expiryDate = null;
        let planType = 'lifetime';
        let stripeSubscriptionId = null;

        if (session.mode === 'subscription') {
          // Old subscription model (keeping for backward compatibility)
          planType = session.metadata?.plan || 'annual';
          stripeSubscriptionId = getStripeId(session.subscription);
          expiryDate = new Date();
          if (planType === 'monthly') {
            expiryDate.setMonth(expiryDate.getMonth() + 1);
          } else {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          }
        }

        const customerId = getStripeId(session.customer);

        // Store license in database
        const { data: licenseData, error: licenseError } = await supabase
          .from('licenses')
          .insert({
            license_key: licenseKey,
            email: customerEmail,
            stripe_customer_id: customerId,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_payment_intent_id: session.payment_intent as string || null,
            plan_type: planType,
            bundle_type: bundle, // 'software' or 'complete'
            status: 'active',
            expires_at: expiryDate?.toISOString() || null,
            has_hardware: hasHardware,
            failed_payment_count: 0,
            metadata: {
              fullName,
              phone,
              ...(hasHardware && {
                address_line1: session.metadata?.address_line1,
                address_line2: session.metadata?.address_line2,
                city: session.metadata?.city,
                postcode: session.metadata?.postcode,
              })
            }
          })
          .select()
          .single();

        if (licenseError) {
          console.error('❌ Database error:', licenseError);
          return new NextResponse(JSON.stringify({ error: 'Database error' }), { status: 500 });
        }

        console.log('✅ License stored for:', customerEmail);

        // Send order confirmation email
        await sendOrderEmail({
          email: customerEmail,
          fullName,
          phone: hasHardware ? phone : undefined,
          bundle,
          orderId: session.id,
          ...(hasHardware && {
            shippingAddress: {
              line1: session.metadata?.address_line1,
              line2: session.metadata?.address_line2,
              city: session.metadata?.city,
              postcode: session.metadata?.postcode,
            }
          })
        });

        // Broadcast success event
        await broadcastToUser(customerEmail, {
          type: 'purchase_completed',
          bundle,
          amount: session.amount_total ? session.amount_total / 100 : 0,
          date: new Date().toISOString(),
        });

        return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

      } catch (error: any) {
        console.error('❌ Checkout error:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Handle payment success (for subscriptions only)
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

      // Only update expiry for subscription plans
      if (license.plan_type !== 'lifetime') {
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
      }

      console.log('✅ Account updated');

      // Broadcast success event
      await broadcastToUser(license.email, {
        type: 'payment_success',
        amount: invoice.total / 100,
        date: new Date().toISOString(),
      });
    }

    // Handle payment failure (for subscriptions only)
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

      // Only update status for subscription plans
      if (license.plan_type !== 'lifetime') {
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
      }

      // Broadcast failure event
      await broadcastToUser(license.email, {
        type: 'payment_failed',
        amount: invoice.total / 100,
        date: new Date().toISOString(),
        attempt: attemptCount,
      });
    }

    // Handle subscription cancellation/deletion
    if (event.type === 'customer.subscription.deleted') {
      console.log('🚫 ===== SUBSCRIPTION CANCELLED =====');
      
      const subscription = event.data.object as Stripe.Subscription;
      
      // Get license
      const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (license && license.plan_type !== 'lifetime') {
        // Check if it was cancelled during cooling period
        const createdDate = new Date(subscription.created * 1000);
        const now = new Date();
        const daysSince = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const cancelledDuringCooling = daysSince <= 14;

        await supabase
          .from('licenses')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_during_cooling: cancelledDuringCooling
          })
          .eq('stripe_subscription_id', subscription.id);

        // Broadcast cancellation event
        await broadcastToUser(license.email, {
          type: 'subscription_cancelled',
          message: cancelledDuringCooling ? 'Subscription cancelled and refunded' : 'Subscription cancelled',
          date: new Date().toISOString(),
        });
      }
    }

    // Handle subscription update (for cancel_at_period_end)
    if (event.type === 'customer.subscription.updated') {
      console.log('📝 ===== SUBSCRIPTION UPDATED =====');
      
      const stripeSubscription = event.data.object as any;
      
      if (stripeSubscription.cancel_at_period_end) {
        // Subscription is scheduled to cancel at period end
        const { data: license } = await supabase
          .from('licenses')
          .select('*')
          .eq('stripe_subscription_id', stripeSubscription.id)
          .single();

        if (license && license.plan_type !== 'lifetime') {
          await supabase
            .from('licenses')
            .update({ 
              cancel_at_period_end: true,
              scheduled_for_deletion_at: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            })
            .eq('id', license.id);

          // Broadcast scheduled cancellation event
          await broadcastToUser(license.email, {
            type: 'subscription_cancelled_scheduled',
            message: 'Subscription will end at billing period',
            date: new Date().toISOString(),
            end_date: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          });
        }
      }
    }

    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
