// app/api/subscription/cancel/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe, COOLING_PERIOD_DAYS } from '@/lib/stripe';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    const staffCookie = cookieStore.get('current_staff')?.value;
    
    if (!staffCookie) {
      return NextResponse.json(
        { error: 'Unauthorized - No staff session' }, 
        { status: 401 }
      );
    }

    let staff;
    try {
      staff = JSON.parse(decodeURIComponent(staffCookie));
    } catch (e) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid staff session' }, 
        { status: 401 }
      );
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return null; },
          set() {},
          remove() {},
        },
      }
    );

    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', staff.email)
      .single();

    if (error || !license?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    try {
      // Get subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(
        license.stripe_subscription_id
      );

      // Check if within 14-day cooling period
      const createdDate = new Date(subscription.created * 1000);
      const now = new Date();
      const daysSinceCreation = Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceCreation <= COOLING_PERIOD_DAYS) {
        // WITHIN COOLING PERIOD - Cancel and refund
        await stripe.subscriptions.cancel(license.stripe_subscription_id);

        // Get the latest invoice and refund it
        const invoices = await stripe.invoices.list({
          subscription: license.stripe_subscription_id,
          limit: 1,
        });

        if (invoices.data.length > 0) {
          const latestInvoice = invoices.data[0];
          
          // Get payment intent from invoice
          if (latestInvoice.payment_intent) {
            const paymentIntentId = typeof latestInvoice.payment_intent === 'string'
              ? latestInvoice.payment_intent
              : latestInvoice.payment_intent.id;

            // Create refund
            await stripe.refunds.create({
              payment_intent: paymentIntentId,
              reason: 'requested_by_customer',
            });
          }
        }

        // Update license in database
        await supabase
          .from('licenses')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', license.id);

        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled and refunded',
          refunded: true,
        });

      } else {
        // OUTSIDE COOLING PERIOD - Cancel at period end
        await stripe.subscriptions.update(
          license.stripe_subscription_id,
          { cancel_at_period_end: true }
        );

        return NextResponse.json({
          success: true,
          message: 'Subscription will be cancelled at period end',
          cancel_at_period_end: true,
        });
      }

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
      // If subscription doesn't exist in Stripe, just update database
      if (stripeError.code === 'resource_missing') {
        await supabase
          .from('licenses')
          .update({ status: 'cancelled' })
          .eq('id', license.id);

        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled',
          warning: 'Subscription not found in Stripe'
        });
      }

      throw stripeError;
    }

  } catch (error: any) {
    console.error('Cancel error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
