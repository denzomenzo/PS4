// app/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Get the staff cookie first
    const staffCookie = cookieStore.get('current_staff')?.value;
    
    if (!staffCookie) {
      console.log('❌ No staff cookie found');
      return NextResponse.json(
        { error: 'Unauthorized - No staff session' }, 
        { status: 401 }
      );
    }

    // Parse staff data from cookie
    let staff;
    try {
      staff = JSON.parse(decodeURIComponent(staffCookie));
      console.log('✅ Staff from cookie:', { id: staff.id, name: staff.name, role: staff.role, email: staff.email });
    } catch (e) {
      console.error('❌ Invalid staff cookie');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid staff session' }, 
        { status: 401 }
      );
    }

    // Use service role client for database access
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

    // Get user's license by staff email
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', staff.email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching license:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!license) {
      console.log('No license found for staff email:', staff.email);
      // Return null subscription - this will show "Purchase License" in settings
      return NextResponse.json({ subscription: null });
    }

    console.log('✅ License found:', {
      id: license.id,
      stripe_subscription_id: license.stripe_subscription_id,
      plan: license.plan_type,
      status: license.status,
      email: license.email
    });

    // Try to get from Stripe, but always return license data even if Stripe fails
    try {
      if (license.stripe_subscription_id) {
        const response = await stripe.subscriptions.retrieve(
          license.stripe_subscription_id,
          {
            expand: ['default_payment_method', 'latest_invoice'],
          }
        );
        
        const stripeSub = response as any;

        // Get payment method details if available
        let paymentMethod = null;
        if (stripeSub.default_payment_method) {
          const pm = stripeSub.default_payment_method;
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
      }
    } catch (stripeError: any) {
      console.log('Stripe fetch failed, using license data:', stripeError.message);
    }

    // Always return license data as fallback
    const createdDate = new Date(license.created_at);
    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const coolingDaysLeft = Math.max(0, 14 - daysSince);

    return NextResponse.json({
      subscription: {
        id: license.stripe_subscription_id || 'license-' + license.id,
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
      }
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
