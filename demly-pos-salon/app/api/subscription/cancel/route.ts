// app/api/subscription/cancel/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe, COOLING_PERIOD_DAYS } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's license
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', user.email)
      .single();

    if (error || !license?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get the subscription from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      license.stripe_subscription_id
    );

    // Check if within 14-day cooling period
    const createdDate = new Date(stripeSubscription.created * 1000);
    const now = new Date();
    const daysSinceCreation = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation <= COOLING_PERIOD_DAYS) {
      // Within cooling period - cancel immediately and refund
      const canceledSubscription = await stripe.subscriptions.cancel(license.stripe_subscription_id, {
        prorate: true,
        invoice_now: true,
      });

      // Get the latest invoice and create a refund
      const invoices = await stripe.invoices.list({
        subscription: license.stripe_subscription_id,
        limit: 1,
      });

      if (invoices.data.length > 0) {
        const latestInvoice = invoices.data[0];
        // Check if payment_intent exists (it might be a string or an object)
        if (latestInvoice.payment_intent) {
          // Handle both string and object cases
          const paymentIntentId = typeof latestInvoice.payment_intent === 'string' 
            ? latestInvoice.payment_intent 
            : (latestInvoice.payment_intent as Stripe.PaymentIntent).id;
            
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer',
          });
        }
      }

      // Update license status in database
      await supabase
        .from('licenses')
        .update({
          status: 'cancelled',
        })
        .eq('email', user.email);

      return NextResponse.json({
        message: 'Subscription cancelled and refunded (cooling period)',
        refunded: true,
      });
    } else {
      // Outside cooling period - cancel at period end
      const updatedSubscription = await stripe.subscriptions.update(
        license.stripe_subscription_id,
        {
          cancel_at_period_end: true,
        }
      );

      return NextResponse.json({
        message: 'Subscription will be cancelled at period end',
        cancel_at_period_end: true,
      });
    }
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
