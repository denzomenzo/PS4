// app/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function GET() {
  const debug = {
    steps: [] as string[],
    errors: [] as string[],
    data: {} as any
  };

  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    debug.steps.push('Got user');
    debug.data.userEmail = user?.email;
    
    if (!user) {
      debug.errors.push('No user found');
      return NextResponse.json({ error: 'Unauthorized', debug }, { status: 401 });
    }

    // Get user's license from database
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    debug.steps.push('Queried licenses');
    debug.data.licenseFound = !!license;
    debug.data.licenseId = license?.id;
    debug.data.dbError = error?.message;

    if (error) {
      debug.errors.push(`DB Error: ${error.message}`);
      return NextResponse.json({ subscription: null, debug }, { status: 500 });
    }

    if (!license) {
      debug.steps.push('No license found');
      return NextResponse.json({ subscription: null, debug });
    }

    debug.steps.push('License found');
    debug.data.stripeSubscriptionId = license.stripe_subscription_id;
    debug.data.planType = license.plan_type;
    debug.data.licenseStatus = license.status;

    // If there's a Stripe subscription ID, get latest data from Stripe
    if (license.stripe_subscription_id) {
      try {
        debug.steps.push('Fetching from Stripe');
        
        const stripeSub = await stripe.subscriptions.retrieve(
          license.stripe_subscription_id,
          {
            expand: ['default_payment_method', 'latest_invoice'],
          }
        );

        debug.steps.push('Stripe fetch successful');
        debug.data.stripeStatus = stripeSub.status;
        debug.data.stripeId = stripeSub.id;

        // Get payment method details if available
        let paymentMethod = null;
        if (stripeSub.default_payment_method) {
          const pm = stripeSub.default_payment_method as any;
          if (pm?.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            };
          }
        }

        // Get the price from the subscription items
        const price = stripeSub.items?.data[0]?.price;
        
        // Calculate cooling days
        const createdDate = new Date(stripeSub.created * 1000);
        const now = new Date();
        const daysSince = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const coolingDaysLeft = Math.max(0, 14 - daysSince);

        const subscription = {
          id: stripeSub.id,
          plan: license.plan_type || (price?.recurring?.interval === 'month' ? 'monthly' : 'annual'),
          status: stripeSub.status,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: stripeSub.cancel_at_period_end || false,
          price: price?.unit_amount ? price.unit_amount / 100 : (license.plan_type === 'annual' ? 299 : 29),
          currency: price?.currency || 'gbp',
          payment_method: paymentMethod,
          created: new Date(stripeSub.created * 1000).toISOString(),
          cooling_days_left: coolingDaysLeft,
        };

        return NextResponse.json({ 
          subscription,
          debug 
        });
        
      } catch (stripeError: any) {
        debug.errors.push(`Stripe Error: ${stripeError.message}`);
        debug.data.stripeErrorType = stripeError.type;
        debug.data.stripeErrorCode = stripeError.code;
        debug.data.stripeStatusCode = stripeError.statusCode;
        
        console.error('❌ Stripe API error:', {
          message: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          statusCode: stripeError.statusCode
        });
        
        // Fall back to license data
        const createdDate = new Date(license.created_at);
        const now = new Date();
        const daysSince = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const coolingDaysLeft = Math.max(0, 14 - daysSince);

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
            cooling_days_left: coolingDaysLeft,
          },
          debug,
          fallback: true
        });
      }
    }

    return NextResponse.json({ subscription: null, debug });
    
  } catch (error: any) {
    debug.errors.push(`Unexpected: ${error.message}`);
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: error.message, debug },
      { status: 500 }
    );
  }
}
