// app/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('📋 Subscription API - User:', user?.email);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's license from database
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    console.log('📋 Subscription API - License query:', { license, error });

    if (error) {
      console.error('Error fetching license:', error);
      return NextResponse.json({ subscription: null, error: error.message });
    }

    if (!license) {
      console.log('No license found for user:', user.email);
      return NextResponse.json({ subscription: null });
    }

    // If there's a Stripe subscription ID, get latest data from Stripe
    if (license.stripe_subscription_id && license.stripe_subscription_id !== 'test_subscription_id') {
      try {
        console.log('Fetching from Stripe:', license.stripe_subscription_id);
        
        const stripeSubscription = await stripe.subscriptions.retrieve(
          license.stripe_subscription_id,
          {
            expand: ['default_payment_method', 'latest_invoice'],
          }
        );

        console.log('Stripe subscription found:', stripeSubscription.id);

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
            price: price?.unit_amount ? price.unit_amount / 100 : (license.plan_type === 'annual' ? 299 : 29),
            currency: price?.currency || 'gbp',
            payment_method: paymentMethod,
            created: new Date(stripeSubscription.created * 1000).toISOString(),
          }
        });
      } catch (stripeError: any) {
        console.error('Error fetching from Stripe:', stripeError);
        // Fall back to license data
        return NextResponse.json({
          subscription: {
            id: license.stripe_subscription_id,
            plan: license.plan_type,
            status: license.status,
            current_period_start: license.created_at,
            current_period_end: license.expires_at,
            cancel_at_period_end: false,
            price: license.plan_type === 'annual' ? 299 : 29,
            currency: 'gbp',
            payment_method: null,
            created: license.created_at,
          }
        });
      }
    } else if (license.stripe_subscription_id === 'test_subscription_id') {
      // Handle test licenses
      return NextResponse.json({
        subscription: {
          id: license.stripe_subscription_id,
          plan: license.plan_type,
          status: license.status,
          current_period_start: license.created_at,
          current_period_end: license.expires_at,
          cancel_at_period_end: false,
          price: license.plan_type === 'annual' ? 299 : 29,
          currency: 'gbp',
          payment_method: null,
          created: license.created_at,
        }
      });
    }

    return NextResponse.json({ subscription: null });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
