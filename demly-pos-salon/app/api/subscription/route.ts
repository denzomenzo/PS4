// app/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          async get(name: string) {
            const cookie = await cookieStore.get(name);
            return cookie?.value;
          },
          set() {
            // Not needed for API routes
          },
          remove() {
            // Not needed for API routes
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('📋 Subscription API - User:', user?.email);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's license from database
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', user.email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching license:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!license) {
      return NextResponse.json({ subscription: null });
    }

    // If there's a Stripe subscription ID, get latest data from Stripe
    if (license.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(
          license.stripe_subscription_id,
          {
            expand: ['default_payment_method', 'latest_invoice'],
          }
        );

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

        const price = stripeSub.items?.data[0]?.price;
        
        // Calculate cooling days
        const createdDate = new Date(stripeSub.created * 1000);
        const now = new Date();
        const daysSince = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const coolingDaysLeft = Math.max(0, 14 - daysSince);

        return NextResponse.json({
          subscription: {
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
          }
        });
      } catch (stripeError: any) {
        console.error('Stripe error:', stripeError);
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
            cooling_days_left: 0,
          }
        });
      }
    }

    return NextResponse.json({ subscription: null });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
