// app/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET() {
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
      console.error('Error fetching license:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!license) {
      console.log('No license found for staff email:', staff.email);
      return NextResponse.json({ subscription: null });
    }

    // Try to get from Stripe with proper expansion
    try {
      if (license.stripe_subscription_id && license.stripe_subscription_id !== 'test_subscription_id') {
        // First get the subscription with expanded payment method
        const subscription = await stripe.subscriptions.retrieve(
          license.stripe_subscription_id,
          {
            expand: ['default_payment_method', 'customer'],
          }
        );

        // Get the customer to access default payment method if needed
        const customer = subscription.customer as Stripe.Customer;
        
        // Get payment method details
        let paymentMethod = null;
        
        // Try to get from subscription first
        if (subscription.default_payment_method) {
          const pm = subscription.default_payment_method as Stripe.PaymentMethod;
          if (pm.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            };
          }
        } 
        // If not in subscription, try customer's default
        else if (customer.invoice_settings?.default_payment_method) {
          const pm = customer.invoice_settings.default_payment_method as Stripe.PaymentMethod;
          if (pm.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            };
          }
        }

        // Get upcoming invoice to show next payment
        let upcomingInvoice = null;
        try {
          // Use the correct method - it might be `upcoming` instead of `retrieveUpcoming`
          upcomingInvoice = await stripe.invoices.retrieveUpcoming({
            subscription: license.stripe_subscription_id,
          });
        } catch (upcomingError) {
          console.log('No upcoming invoice found');
        }

        const price = subscription.items?.data[0]?.price;
        
        // Calculate cooling days
        const createdDate = new Date(subscription.created * 1000);
        const now = new Date();
        const daysSince = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const coolingDaysLeft = Math.max(0, 14 - daysSince);

        return NextResponse.json({
          subscription: {
            id: subscription.id,
            plan: license.plan_type || (price?.recurring?.interval === 'month' ? 'monthly' : 'annual'),
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            price: price?.unit_amount ? price.unit_amount / 100 : (license.plan_type === 'annual' ? 299 : 29),
            currency: price?.currency || 'gbp',
            payment_method: paymentMethod,
            next_payment_amount: upcomingInvoice?.total ? upcomingInvoice.total / 100 : null,
            next_payment_date: upcomingInvoice?.next_payment_attempt ? new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString() : null,
            created: new Date(subscription.created * 1000).toISOString(),
            cooling_days_left: coolingDaysLeft,
            deletion_scheduled: !!license.deletion_scheduled_at,
            days_until_deletion: license.deletion_scheduled_at ? 
              Math.max(0, Math.ceil((new Date(license.deletion_scheduled_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null,
            deletion_date: license.deletion_scheduled_at,
          }
        });
      }
    } catch (stripeError: any) {
      console.log('Stripe fetch failed, using license data:', stripeError.message);
    }

    // Fallback to license data
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
        next_payment_amount: null,
        next_payment_date: null,
        created: license.created_at,
        cooling_days_left: coolingDaysLeft,
        deletion_scheduled: !!license.deletion_scheduled_at,
        days_until_deletion: license.deletion_scheduled_at ? 
          Math.max(0, Math.ceil((new Date(license.deletion_scheduled_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null,
        deletion_date: license.deletion_scheduled_at,
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
