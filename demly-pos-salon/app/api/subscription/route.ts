// app/api/subscription/route.ts
// Key additions vs the current version:
//   - Returns cancelled_during_cooling from DB
//   - Returns cancels_at (the period end / access cutoff date)
//   - Syncs DB if Stripe says cancelled but DB doesn't
//
//

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('current_staff')?.value;
    if (!staffCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let staff: any;
    try { staff = JSON.parse(decodeURIComponent(staffCookie)); }
    catch { return NextResponse.json({ error: 'Invalid session' }, { status: 401 }); }

    if (!staff.email) {
      return NextResponse.json({ error: 'Session missing email — please log out and log back in' }, { status: 401 });
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return null; }, set() {}, remove() {} } }
    );

    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', staff.email)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!license) return NextResponse.json({ subscription: null });

    // Cooling period days left
    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - new Date(license.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const coolingDaysLeft = Math.max(0, 14 - daysSince);

    // Deletion countdown
    let daysUntilDeletion = null;
    if (license.deletion_scheduled_at) {
      daysUntilDeletion = Math.max(
        0,
        Math.ceil((new Date(license.deletion_scheduled_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    // Base response shape — used as fallback if Stripe fails
    const baseSubscription = {
      id: 'license-' + license.id,
      plan: license.plan_type,
      status: license.status,
      current_period_start: license.created_at,
      current_period_end: license.expires_at,
      cancel_at_period_end: license.cancel_at_period_end || false,
      // KEY FIELDS FOR BANNER:
      cancelled_during_cooling: license.cancelled_during_cooling || false,
      cancels_at: license.expires_at || null, // access cutoff date
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
    };

    // If cancelled during cooling, Stripe sub is already gone — return DB data
    if (license.cancelled_during_cooling || !license.stripe_subscription_id) {
      return NextResponse.json({ subscription: baseSubscription });
    }

    // Fetch live from Stripe
    try {
      const sub = await stripe.subscriptions.retrieve(
        license.stripe_subscription_id,
        { expand: ['default_payment_method', 'customer.invoice_settings.default_payment_method', 'latest_invoice'] }
      ) as any;

      // Sync if Stripe says cancelled but DB doesn't
      if (sub.status === 'canceled' && license.status !== 'cancelled') {
        await supabase.from('licenses').update({
          status: 'cancelled',
          stripe_subscription_id: null,
        }).eq('id', license.id);
      }

      // Payment method
      let paymentMethod = null;
      const pm = sub.default_payment_method 
        || sub.customer?.invoice_settings?.default_payment_method;
      if (pm?.card) {
        paymentMethod = {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        };
      }

      // Upcoming invoice
      let upcomingInvoice = null;
      try {
        upcomingInvoice = await (stripe.invoices as any).upcoming({
          subscription: license.stripe_subscription_id,
        });
      } catch {}

      const price = sub.items?.data[0]?.price;

      return NextResponse.json({
        subscription: {
          id: sub.id,
          plan: license.plan_type || (price?.recurring?.interval === 'month' ? 'monthly' : 'annual'),
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          // KEY FIELDS FOR BANNER:
          cancelled_during_cooling: license.cancelled_during_cooling || false,
          cancels_at: sub.cancel_at_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
          price: price?.unit_amount ? price.unit_amount / 100 : (license.plan_type === 'annual' ? 299 : 29),
          currency: price?.currency || 'gbp',
          payment_method: paymentMethod,
          next_payment_amount: upcomingInvoice?.total ? upcomingInvoice.total / 100 : null,
          next_payment_date: upcomingInvoice?.next_payment_attempt
            ? new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString()
            : null,
          created: new Date(sub.created * 1000).toISOString(),
          cooling_days_left: coolingDaysLeft,
          deletion_scheduled: !!license.deletion_scheduled_at,
          days_until_deletion: daysUntilDeletion,
          deletion_date: license.deletion_scheduled_at,
          failed_payment_count: license.failed_payment_count || 0,
          payment_failed_at: license.payment_failed_at,
        }
      });

    } catch (stripeErr: any) {
      if (stripeErr.code === 'resource_missing') {
        await supabase.from('licenses').update({
          status: 'cancelled', stripe_subscription_id: null,
        }).eq('id', license.id);
      }
      // Return DB fallback
      return NextResponse.json({ subscription: baseSubscription });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
