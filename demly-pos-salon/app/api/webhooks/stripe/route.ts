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

export async function POST(req: NextRequest) {
  console.log('🔔 Webhook endpoint hit');
  
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No stripe-signature header');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    console.log('💳 Processing checkout.session.completed');
    
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_email || session.customer_details?.email;
    const planType = session.metadata?.plan || 'annual';

    console.log('📧 Customer email:', customerEmail);
    console.log('📋 Plan type:', planType);

    if (!customerEmail) {
      console.error('❌ No customer email found in session');
      return NextResponse.json({ error: 'No customer email' }, { status: 400 });
    }

    try {
      const licenseKey = generateLicenseKey();
      console.log('🔑 Generated license key:', licenseKey);

      const expiryDate = new Date();
      if (planType === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }
      console.log('📅 Expiry date:', expiryDate.toISOString());

      const customerId = getStripeId(session.customer);
      const subscriptionId = getStripeId(session.subscription);

      console.log('💾 Storing license in database...');
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
        })
        .select()
        .single();

      if (licenseError) {
        console.error('❌ Database error:', licenseError);
        return NextResponse.json({ 
          error: 'Database error', 
          details: licenseError 
        }, { status: 500 });
      }

      console.log('✅ License stored in database');

      console.log('📧 Calling send-license-email function...');
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-license-email', {
        body: {
          email: customerEmail,
          licenseKey: licenseKey,
          planType: planType,
        },
      });

      if (emailError) {
        console.error('❌ Email function error:', emailError);
      } else {
        console.log('✅ Email sent successfully:', emailData);
      }

      console.log('🎉 License created and email sent:', licenseKey);
      return NextResponse.json({ received: true, licenseKey });

    } catch (error: any) {
      console.error('❌ Error processing checkout:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Handle subscription renewal
  if (event.type === 'invoice.payment_succeeded') {
    console.log('🔄 Processing invoice.payment_succeeded');
    
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = getStripeId(invoice.subscription);

    if (subscriptionId) {
      const { data: license } = await supabase
        .from('licenses')
        .select('plan_type')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (license) {
        const newExpiry = new Date();
        if (license.plan_type === 'monthly') {
          newExpiry.setMonth(newExpiry.getMonth() + 1);
        } else {
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        }

        await supabase
          .from('licenses')
          .update({ 
            expires_at: newExpiry.toISOString(), 
            status: 'active' 
          })
          .eq('stripe_subscription_id', subscriptionId);

        console.log('✅ License renewed');
      }
    }
  }

  // Handle subscription cancellation
  if (event.type === 'customer.subscription.deleted') {
    console.log('🚫 Processing subscription cancellation');
    
    const subscription = event.data.object as Stripe.Subscription;
    await supabase
      .from('licenses')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id);

    console.log('✅ License cancelled');
  }

  return NextResponse.json({ received: true });
}
