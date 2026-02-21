// app/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's license from database
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', user.email)
      .single();

    if (error || !license) {
      return NextResponse.json({ subscription: null });
    }

    // If there's a Stripe subscription ID, get latest data from Stripe
    if (license.stripe_subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          license.stripe_subscription_id,
          {
            expand: ['default_payment_method', 'latest_invoice'],
          }
        );

        // Get payment method details if available
        let paymentMethod = null;
        if (stripeSubscription.default_payment_method) {
          const pm = stripeSubscription.default_payment_method as Stripe.PaymentMethod;
          if (pm.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            };
          }
        }

        // Get the price from the subscription items
        const price = stripeSubscription.items.data[0]?.price;
        
        return NextResponse.json({
          subscription: {
            id: stripeSubscription.id,
            plan: license.plan_type || (price?.recurring?.interval === 'month' ? 'monthly' : 'annual'),
            status: stripeSubscription.status,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: stripeSubscription.cancel_at_period_end,
            price: price?.unit_amount ? price.unit_amount / 100 : 0,
            currency: price?.currency || 'gbp',
            payment_method: paymentMethod,
            created: new Date(stripeSubscription.created * 1000).toISOString(),
          }
        });
      } catch (stripeError) {
        console.error('Error fetching from Stripe:', stripeError);
        // Fall back to license data
        return NextResponse.json({
          subscription: {
            id: license.stripe_subscription_id,
            plan: license.plan_type,
            status: license.status,
            current_period_start: new Date().toISOString(),
            current_period_end: license.expires_at,
            cancel_at_period_end: false,
            price: license.plan_type === 'annual' ? 299 : 29,
            currency: 'gbp',
            created: license.created_at,
          }
        });
      }
    }

    return NextResponse.json({ subscription: null });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}