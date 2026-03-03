// app/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function GET() {
  console.log('🔵 ===== SUBSCRIPTION API CALLED =====');
  
  try {
    const cookieStore = await cookies();
    
    // Get the staff cookie first
    const staffCookie = cookieStore.get('current_staff')?.value;
    
    if (!staffCookie) {
      return NextResponse.json(
        { error: 'Unauthorized - No staff session' }, 
        { status: 401 }
      );
    }

    // Parse staff data from cookie
    let staff;
    try {
      staff = JSON.parse(decodeURIComponent(staffCookie));
      console.log('✅ Staff from cookie:', { 
        id: staff.id, 
        name: staff.name, 
        email: staff.email 
      });
    } catch (e) {
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
      console.error('❌ Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!license) {
      return NextResponse.json({ subscription: null });
    }

    // Calculate cooling days
    const createdDate = new Date(license.created_at);
    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const coolingDaysLeft = Math.max(0, 14 - daysSince);

    // Calculate deletion days if scheduled
    let daysUntilDeletion = null;
    if (license.deletion_scheduled_at) {
      const deletionDate = new Date(license.deletion_scheduled_at);
      const diffTime = deletionDate.getTime() - now.getTime();
      daysUntilDeletion = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    // Try to get from Stripe
    try {
      if (!license.stripe_subscription_id) {
        throw new Error('No subscription ID');
      }

      console.log('🔍 Fetching from Stripe:', license.stripe_subscription_id);
      
      // Get subscription with payment method expanded
      const subscription = await stripe.subscriptions.retrieve(
        license.stripe_subscription_id,
        {
          expand: [
            'default_payment_method',
            'customer.invoice_settings.default_payment_method',
            'latest_invoice'
          ],
        }
      ) as any; // Cast to any to avoid TypeScript issues

      // Get payment method details
      let paymentMethod = null;
      
      // Try subscription default payment method first
      if (subscription.default_payment_method) {
        const pm = subscription.default_payment_method;
        if (pm?.card) {
          paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          };
        }
      } 
      // Try customer default payment method
      else if (subscription.customer && typeof subscription.customer !== 'string') {
        const customer = subscription.customer;
        if (customer.invoice_settings?.default_payment_method?.card) {
          const pm = customer.invoice_settings.default_payment_method;
          paymentMethod = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          };
        }
      }

      // Get upcoming invoice for next payment - FIXED: use 'upcoming' not 'retrieveUpcoming'
      let upcomingInvoice = null;
      try {
        upcomingInvoice = await stripe.invoices.upcoming({
          subscription: license.stripe_subscription_id,
        }) as any;
      } catch (invoiceError) {
        console.log('No upcoming invoice');
      }

      const price = subscription.items?.data[0]?.price;

      return NextResponse.json({
        subscription: {
          id: subscription.id,
          plan: license.plan_type || (price?.recurring?.interval === 'month' ? 'monthly' : 'annual'),
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          price: price?.unit_amount ? price.unit_amount / 100 : (license.plan_type === 'annual' ? 299 : 29),
          currency: price?.currency || 'gbp',
          payment_method: paymentMethod,
          next_payment_amount: upcomingInvoice?.total ? upcomingInvoice.total / 100 : null,
          next_payment_date: upcomingInvoice?.next_payment_attempt 
            ? new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString() 
            : null,
          created: new Date(subscription.created * 1000).toISOString(),
          cooling_days_left: coolingDaysLeft,
          deletion_scheduled: !!license.deletion_scheduled_at,
          days_until_deletion: daysUntilDeletion,
          deletion_date: license.deletion_scheduled_at,
          failed_payment_count: license.failed_payment_count || 0,
          payment_failed_at: license.payment_failed_at,
        }
      });

    } catch (stripeError: any) {
      console.error('❌ Stripe fetch failed:', stripeError.message);
      
      // Return license data as fallback
      return NextResponse.json({
        subscription: {
          id: 'license-' + license.id,
          plan: license.plan_type,
          status: license.status,
          current_period_start: license.created_at,
          current_period_end: license.expires_at,
          cancel_at_period_end: false,
          price: license.plan_type === 'annual' ? 299 : 29,
          currency: 'gbp',
          payment_method: null,
          next_payment_amount: null,
          next_payment_date: null,
          created: license.created_at,
          cooling_days_left: coolingDaysLeft,
          deletion_scheduled: !!license.deletion_scheduled_at,
          days_until_deletion: daysUntilDeletion,
          deletion_date: license.deletion_scheduled_at,
          failed_payment_count: license.failed_payment_count || 0,
          payment_failed_at: license.payment_failed_at,
        }
      });
    }
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
