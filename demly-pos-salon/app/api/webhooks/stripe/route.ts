// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('🔔 ===== WEBHOOK RECEIVED =====');
  console.log('🔔 Time:', new Date().toISOString());
  
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ No stripe-signature header');
      return new NextResponse(JSON.stringify({ error: 'No signature' }), { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not set');
      return new NextResponse(JSON.stringify({ error: 'Webhook secret not configured' }), { status: 500 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log('✅ Webhook verified:', event.type, event.id);
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
        console.error('❌ No customer email found');
        return new NextResponse(JSON.stringify({ error: 'No customer email' }), { status: 400 });
      }

      try {
        const licenseKey = generateLicenseKey();
        console.log('🔑 Generated license:', licenseKey);

        const expiryDate = new Date();
        if (planType === 'monthly') {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        const customerId = getStripeId(session.customer);
        const subscriptionId = getStripeId(session.subscription);

        // Insert license
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

        console.log('✅ License stored:', licenseData);

        // Send welcome email
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: customerEmail,
              licenseKey: licenseKey,
              planType: planType,
            }),
          });
          console.log('📧 Welcome email sent');
        } catch (emailError) {
          console.error('❌ Failed to send welcome email:', emailError);
        }

        return new NextResponse(JSON.stringify({ received: true, licenseKey }), { status: 200 });

      } catch (error: any) {
        console.error('❌ Checkout error:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
      }
    }

    // Handle payment failure
    if (event.type === 'invoice.payment_failed') {
      console.log('❌ ===== PAYMENT FAILED =====');
      
      const invoice = event.data.object as any;
      const subscriptionId = getSubscriptionId(invoice);
      const attemptCount = invoice.attempt_count || 1;
      
      console.log('📋 Payment failed:', { subscriptionId, attemptCount });

      if (!subscriptionId) {
        console.log('No subscription ID found');
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

      if (attemptCount >= 3) {
        // After 3 failed attempts, freeze account
        console.log('❄️ Freezing account after 3 failed attempts');
        
        await supabase
          .from('licenses')
          .update({ 
            status: 'frozen',
            payment_failed_at: new Date().toISOString(),
            failed_payment_count: attemptCount
          })
          .eq('id', license.id);

        // Send freeze email
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/account-frozen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: license.email,
              name: license.email?.split('@')[0] || 'Customer',
            }),
          });
          console.log('📧 Freeze email sent');
        } catch (emailError) {
          console.error('❌ Failed to send freeze email:', emailError);
        }
      } else {
        // Update past due status
        console.log(`⚠️ Payment attempt ${attemptCount}/3 failed`);
        
        await supabase
          .from('licenses')
          .update({ 
            status: 'past_due',
            payment_failed_at: new Date().toISOString(),
            failed_payment_count: attemptCount
          })
          .eq('id', license.id);

        // Send payment failed email
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/payment-failed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: license.email,
              name: license.email?.split('@')[0] || 'Customer',
              attempt: attemptCount,
              next_attempt: invoice.next_payment_attempt 
                ? new Date(invoice.next_payment_attempt * 1000).toISOString() 
                : null
            }),
          });
          console.log('📧 Payment failed email sent');
        } catch (emailError) {
          console.error('❌ Failed to send payment failed email:', emailError);
        }
      }
    }

    // Handle payment success (unfreeze account)
    if (event.type === 'invoice.payment_succeeded') {
      console.log('✅ ===== PAYMENT SUCCEEDED =====');
      
      const invoice = event.data.object as any;
      const subscriptionId = getSubscriptionId(invoice);

      console.log('📋 Payment succeeded:', { subscriptionId });

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

      // Send payment received email if was frozen
      if (license.status === 'frozen' || license.status === 'past_due') {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/account-unfrozen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: license.email,
              name: license.email?.split('@')[0] || 'Customer',
            }),
          });
          console.log('📧 Unfrozen email sent');
        } catch (emailError) {
          console.error('❌ Failed to send unfrozen email:', emailError);
        }
      }
    }

    // Handle subscription cancellation
    if (event.type === 'customer.subscription.deleted') {
      console.log('🚫 ===== SUBSCRIPTION CANCELLED =====');
      
      const subscription = event.data.object as Stripe.Subscription;
      console.log('🔑 Subscription ID:', subscription.id);
      
      await supabase
        .from('licenses')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);

      console.log('✅ License cancelled');
    }

    // Handle subscription update
    if (event.type === 'customer.subscription.updated') {
      console.log('📝 ===== SUBSCRIPTION UPDATED =====');
      
      const subscription = event.data.object as Stripe.Subscription;
      console.log('🔑 Subscription ID:', subscription.id);
      console.log('📋 Status:', subscription.status);
      console.log('📋 Cancel at period end:', subscription.cancel_at_period_end);
      
      // Determine status
      let status = 'active';
      if (subscription.status === 'past_due') status = 'past_due';
      if (subscription.status === 'canceled') status = 'cancelled';
      if (subscription.status === 'incomplete') status = 'incomplete';
      
      await supabase
        .from('licenses')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);

      console.log('✅ License updated');
    }

    console.log('✅ Webhook processed successfully');
    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function GET() {
  return new NextResponse('Method not allowed', { status: 405 });
}
