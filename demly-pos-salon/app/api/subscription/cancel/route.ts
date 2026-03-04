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

    // Get license
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
        // WITHIN COOLING PERIOD - Cancel immediately and refund
        await stripe.subscriptions.cancel(license.stripe_subscription_id);

        // Get the latest invoice and refund it
        const invoices = await stripe.invoices.list({
          subscription: license.stripe_subscription_id,
          limit: 1,
        });

        if (invoices.data.length > 0) {
          const latestInvoice = invoices.data[0] as any;
          
          if (latestInvoice.payment_intent) {
            const paymentIntentId = typeof latestInvoice.payment_intent === 'string'
              ? latestInvoice.payment_intent
              : latestInvoice.payment_intent.id;

            await stripe.refunds.create({
              payment_intent: paymentIntentId,
              reason: 'requested_by_customer',
            });
          }
        }

        // Update license to cancelled immediately
        await supabase
          .from('licenses')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancelled_during_cooling: true
          })
          .eq('id', license.id);

        // Broadcast cancellation event for live updates
        await broadcastPaymentEvent(staff.email, {
          type: 'subscription_cancelled',
          message: 'Subscription cancelled and refunded',
          date: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled and refunded',
          refunded: true,
        });

      } else {
        // OUTSIDE COOLING PERIOD - Cancel at period end
        const updatedSubscription = await stripe.subscriptions.update(
          license.stripe_subscription_id,
          { 
            cancel_at_period_end: true,
            metadata: {
              scheduled_for_deletion: 'true',
              user_email: staff.email
            }
          }
        );

        // Set a flag in database that deletion is scheduled
        await supabase
          .from('licenses')
          .update({ 
            cancel_at_period_end: true,
            scheduled_for_deletion_at: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
            deletion_reason: 'subscription_cancelled'
          })
          .eq('id', license.id);

        // Broadcast cancellation event
        await broadcastPaymentEvent(staff.email, {
          type: 'subscription_cancelled_scheduled',
          message: 'Subscription will end at billing period',
          date: new Date().toISOString(),
          end_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        });

        return NextResponse.json({
          success: true,
          message: 'Subscription will be cancelled at period end',
          cancel_at_period_end: true,
          end_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        });
      }

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError);
      
      // If subscription doesn't exist in Stripe, just update database
      if (stripeError.code === 'resource_missing') {
        await supabase
          .from('licenses')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
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

// Helper function to broadcast events
async function broadcastPaymentEvent(email: string, event: any) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/stripe/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, event }),
    });
  } catch (error) {
    console.error('Failed to broadcast event:', error);
  }
}
