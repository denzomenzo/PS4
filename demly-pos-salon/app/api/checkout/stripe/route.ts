// app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {

});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate a random license key
function generateLicenseKey(): string {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    const segment = Math.random().toString(36).substring(2, 8).toUpperCase();
    segments.push(segment);
  }
  return segments.join('-');
}

export async function POST(req: NextRequest) {
  console.log('🔔 Webhook received');
  
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('✅ Webhook verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('💳 Processing checkout.session.completed');

    try {
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerId = session.customer as string;
      const planType = session.metadata?.plan || 'annual';

      console.log('📧 Customer email:', customerEmail);
      console.log('📋 Plan type:', planType);

      if (!customerEmail) {
        console.error('❌ No customer email found');
        return NextResponse.json({ error: 'No customer email' }, { status: 400 });
      }

      // Generate license key
      const licenseKey = generateLicenseKey();
      console.log('🔑 Generated license key:', licenseKey);

      // Calculate expiry date based on plan
      const now = new Date();
      let expiryDate: Date | null = null;
      
      if (planType === 'monthly') {
        expiryDate = new Date(now.setMonth(now.getMonth() + 1));
      } else if (planType === 'annual') {
        expiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
      }

      console.log('📅 Expiry date:', expiryDate);

      // Store license in database
      console.log('💾 Storing license in database...');
      const { data: licenseData, error: licenseError } = await supabase
        .from('licenses')
        .insert({
          license_key: licenseKey,
          email: customerEmail,
          stripe_customer_id: customerId,
          stripe_subscription_id: session.subscription as string || null,
          plan_type: planType,
          status: 'active',
          expires_at: expiryDate?.toISOString(),
        })
        .select()
        .single();

      if (licenseError) {
        console.error('❌ Error storing license:', licenseError);
        return NextResponse.json({ error: 'Database error', details: licenseError }, { status: 500 });
      }

      console.log('✅ License stored successfully');

      // Send email with license key via Supabase Edge Function
      console.log('📧 Sending license email...');
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-license-email', {
        body: {
          email: customerEmail,
          licenseKey: licenseKey,
          planType: planType,
        },
      });

      if (emailError) {
        console.error('❌ Error sending email:', emailError);
        // Don't fail the webhook, license is already stored
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
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoice.subscription as string;

    if (subscriptionId) {
      try {
        console.log('🔄 Processing subscription renewal:', subscriptionId);
        
        const { data: license } = await supabase
          .from('licenses')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (license) {
          const now = new Date();
          let newExpiryDate: Date;

          if (license.plan_type === 'monthly') {
            newExpiryDate = new Date(now.setMonth(now.getMonth() + 1));
          } else {
            newExpiryDate = new Date(now.setFullYear(now.getFullYear() + 1));
          }

          await supabase
            .from('licenses')
            .update({
              expires_at: newExpiryDate.toISOString(),
              status: 'active',
            })
            .eq('stripe_subscription_id', subscriptionId);

          console.log('✅ License renewed:', license.license_key);
        }
      } catch (error) {
        console.error('❌ Error renewing license:', error);
      }
    }
  }

  // Handle subscription cancellation
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    
    try {
      console.log('🚫 Processing subscription cancellation:', subscription.id);
      
      await supabase
        .from('licenses')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', subscription.id);

      console.log('✅ License cancelled:', subscription.id);
    } catch (error) {
      console.error('❌ Error cancelling license:', error);
    }
  }

  return NextResponse.json({ received: true });
}