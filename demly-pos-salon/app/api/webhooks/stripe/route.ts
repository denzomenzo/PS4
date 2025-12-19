// app/api/webhooks/stripe/route.ts
// ENHANCED VERSION WITH DETAILED LOGGING

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

interface InvoiceWithSubscription extends Stripe.Invoice {
  subscription?: string | Stripe.Subscription | null;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('🔔 ================================');
  console.log('🔔 WEBHOOK RECEIVED AT:', new Date().toISOString());
  console.log('🔔 ================================');
  
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  console.log('📋 Request details:', {
    hasBody: !!body,
    bodyLength: body.length,
    hasSignature: !!signature,
    signaturePreview: signature?.substring(0, 20) + '...',
  });

  if (!signature) {
    console.error('❌ No stripe-signature header found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not set in environment');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('✅ Webhook signature verified');
    console.log('📌 Event type:', event.type);
    console.log('📌 Event ID:', event.id);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    console.log('💳 ================================');
    console.log('💳 PROCESSING CHECKOUT COMPLETION');
    console.log('💳 ================================');
    
    const session = event.data.object as Stripe.Checkout.Session;
    
    console.log('📋 Session details:', {
      id: session.id,
      customer: session.customer,
      customer_email: session.customer_email,
      customer_details_email: session.customer_details?.email,
      subscription: session.subscription,
      payment_status: session.payment_status,
      status: session.status,
      metadata: session.metadata,
    });

    const customerEmail = session.customer_email || session.customer_details?.email;
    const planType = session.metadata?.plan || 'annual';

    console.log('📧 Extracted email:', customerEmail);
    console.log('📋 Extracted plan:', planType);

    if (!customerEmail) {
      console.error('❌ No customer email found in session');
      console.error('❌ Session object:', JSON.stringify(session, null, 2));
      return NextResponse.json({ error: 'No customer email' }, { status: 400 });
    }

    try {
      // Generate license key
      const licenseKey = generateLicenseKey();
      console.log('🔑 Generated license key:', licenseKey);

      // Calculate expiry
      const expiryDate = new Date();
      if (planType === 'monthly') {
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }
      console.log('📅 Expiry date calculated:', expiryDate.toISOString());

      const customerId = getStripeId(session.customer);
      const subscriptionId = getStripeId(session.subscription);

      console.log('🆔 Stripe IDs:', {
        customerId,
        subscriptionId,
      });

      // Insert into database
      console.log('💾 Attempting database insert...');
      console.log('💾 Insert data:', {
        license_key: licenseKey,
        email: customerEmail,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan_type: planType,
        status: 'active',
        expires_at: expiryDate.toISOString(),
      });

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
        console.error('❌ Database insertion error:', {
          message: licenseError.message,
          details: licenseError.details,
          hint: licenseError.hint,
          code: licenseError.code,
        });
        return NextResponse.json({ 
          error: 'Database error', 
          details: licenseError 
        }, { status: 500 });
      }

      console.log('✅ License stored in database successfully');
      console.log('💾 Stored license data:', licenseData);

      // Send email
      console.log('📧 ================================');
      console.log('📧 ATTEMPTING TO SEND EMAIL');
      console.log('📧 ================================');
      console.log('📧 Email payload:', {
        email: customerEmail,
        licenseKey: licenseKey,
        planType: planType,
      });

      console.log('📧 Calling Supabase Edge Function: send-license-email');
      
      const emailStartTime = Date.now();
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-license-email', {
        body: {
          email: customerEmail,
          licenseKey: licenseKey,
          planType: planType,
        },
      });
      const emailDuration = Date.now() - emailStartTime;

      console.log(`📧 Email function took ${emailDuration}ms`);

      if (emailError) {
        console.error('❌ Email function error:', {
          message: emailError.message,
          details: emailError,
          fullError: JSON.stringify(emailError, null, 2),
        });
        // Don't fail the webhook - license is already created
        console.warn('⚠️ Continuing despite email error - license was created');
      } else {
        console.log('✅ Email function returned successfully');
        console.log('📧 Email response data:', emailData);
      }

      const totalDuration = Date.now() - startTime;
      console.log('🎉 ================================');
      console.log('🎉 CHECKOUT PROCESSING COMPLETE');
      console.log(`🎉 Total duration: ${totalDuration}ms`);
      console.log('🎉 License key:', licenseKey);
      console.log('🎉 ================================');

      return NextResponse.json({ 
        received: true, 
        licenseKey,
        emailSent: !emailError,
        emailError: emailError ? emailError.message : null,
      });

    } catch (error: any) {
      console.error('❌ ================================');
      console.error('❌ UNEXPECTED ERROR IN CHECKOUT');
      console.error('❌ ================================');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // Handle subscription renewal
  if (event.type === 'invoice.payment_succeeded') {
    console.log('🔄 ================================');
    console.log('🔄 PROCESSING SUBSCRIPTION RENEWAL');
    console.log('🔄 ================================');
    
    const invoice = event.data.object as InvoiceWithSubscription;
    const subscriptionId = getStripeId(invoice.subscription);

    console.log('🔑 Subscription ID:', subscriptionId);

    if (subscriptionId) {
      const { data: license, error: fetchError } = await supabase
        .from('licenses')
        .select('plan_type')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching license:', fetchError);
      } else if (license) {
        console.log('📋 Found license:', license);
        
        const newExpiry = new Date();
        if (license.plan_type === 'monthly') {
          newExpiry.setMonth(newExpiry.getMonth() + 1);
        } else {
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        }

        const { error: updateError } = await supabase
          .from('licenses')
          .update({ 
            expires_at: newExpiry.toISOString(), 
            status: 'active' 
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (updateError) {
          console.error('❌ Error updating license:', updateError);
        } else {
          console.log('✅ License renewed successfully');
        }
      }
    }
  }

  // Handle subscription cancellation
  if (event.type === 'customer.subscription.deleted') {
    console.log('🚫 ================================');
    console.log('🚫 PROCESSING SUBSCRIPTION CANCELLATION');
    console.log('🚫 ================================');
    
    const subscription = event.data.object as Stripe.Subscription;
    console.log('🔑 Subscription ID:', subscription.id);
    
    const { error } = await supabase
      .from('licenses')
      .update({ status: 'cancelled' })
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('❌ Error cancelling license:', error);
    } else {
      console.log('✅ License cancelled successfully');
    }
  }

  console.log('✅ Webhook processing complete');
  return NextResponse.json({ received: true });
}
