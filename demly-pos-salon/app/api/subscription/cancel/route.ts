// app/api/subscription/cancel/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe, COOLING_PERIOD_DAYS } from '@/lib/stripe';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const staffCookie = cookieStore.get('current_staff')?.value;
    if (!staffCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let staff: any;
    try { staff = JSON.parse(decodeURIComponent(staffCookie)); }
    catch { return NextResponse.json({ error: 'Invalid session' }, { status: 401 }); }

    if (!staff.email) {
      return NextResponse.json(
        { error: 'Session missing email — please log out and log back in' },
        { status: 401 }
      );
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return null; }, set() {}, remove() {} } }
    );

    const { data: license } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', staff.email)
      .maybeSingle();

    if (!license) {
      return NextResponse.json({ error: 'No license found' }, { status: 404 });
    }

    const now = new Date();

    // No Stripe subscription — mark cancelled, access ends now
    if (!license.stripe_subscription_id) {
      await supabase.from('licenses').update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        cancel_at_period_end: true,
        scheduled_for_deletion_at: now.toISOString(), // no period to wait for
      }).eq('id', license.id);

      return NextResponse.json({
        success: true,
        cancel_at_period_end: false,
        access_until: now.toISOString(),
        message: 'Subscription cancelled',
      });
    }

    // Fetch real Stripe state
    let sub: any;
    try {
      sub = await stripe.subscriptions.retrieve(license.stripe_subscription_id);
    } catch (e: any) {
      if (e.code === 'resource_missing') {
        // Gone from Stripe — sync DB, no period to wait for
        await supabase.from('licenses').update({
          status: 'cancelled',
          stripe_subscription_id: null,
          cancelled_at: now.toISOString(),
          cancel_at_period_end: true,
          scheduled_for_deletion_at: now.toISOString(),
        }).eq('id', license.id);
        return NextResponse.json({
          success: true,
          cancel_at_period_end: false,
          access_until: now.toISOString(),
          message: 'Subscription cancelled',
        });
      }
      throw e;
    }

    // Already fully cancelled in Stripe
    if (sub.status === 'canceled') {
      await supabase.from('licenses').update({
        status: 'cancelled',
        stripe_subscription_id: null,
        cancelled_at: now.toISOString(),
        cancel_at_period_end: true,
        scheduled_for_deletion_at: now.toISOString(),
      }).eq('id', license.id);
      return NextResponse.json({
        success: true,
        cancel_at_period_end: false,
        access_until: now.toISOString(),
        message: 'Subscription already cancelled',
      });
    }

    // Already pending cancel — just return current state
    if (sub.cancel_at_period_end) {
      const periodEnd = new Date(sub.current_period_end * 1000);
      return NextResponse.json({
        success: true,
        cancel_at_period_end: true,
        access_until: periodEnd.toISOString(),
        message: 'Subscription already scheduled to cancel at end of billing period',
      });
    }

    // --- Cooling period: cancel immediately in Stripe, but keep access until period end ---
    const daysSince = Math.floor(
      (now.getTime() - new Date(license.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const periodEnd = new Date(sub.current_period_end * 1000);

    if (daysSince <= COOLING_PERIOD_DAYS) {
      // Cancel immediately in Stripe (no more charges)
      await stripe.subscriptions.cancel(license.stripe_subscription_id);

      // DB: mark cancellation pending, access continues until period end
      await supabase.from('licenses').update({
        // Keep status as 'active' so dashboard still allows access
        // cancelled_during_cooling flags it for the banner
        cancelled_at: now.toISOString(),
        cancelled_during_cooling: true,
        cancel_at_period_end: true,
        stripe_subscription_id: null, // subscription is gone from Stripe
        scheduled_for_deletion_at: periodEnd.toISOString(),
        // Store period end so dashboard knows when to cut off access
        expires_at: periodEnd.toISOString(),
      }).eq('id', license.id);

      return NextResponse.json({
        success: true,
        cancel_at_period_end: true,
        cooling_cancel: true,
        access_until: periodEnd.toISOString(),
        message: `Subscription cancelled. You have access until ${periodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
      });

    } else {
      // --- Outside cooling: cancel at period end in Stripe ---
      const updated = await stripe.subscriptions.update(
        license.stripe_subscription_id,
        { cancel_at_period_end: true }
      ) as any;

      const updatedPeriodEnd = new Date(updated.current_period_end * 1000);

      await supabase.from('licenses').update({
        cancel_at_period_end: true,
        cancelled_at: now.toISOString(),
        scheduled_for_deletion_at: updatedPeriodEnd.toISOString(),
        expires_at: updatedPeriodEnd.toISOString(),
        deletion_reason: 'subscription_cancelled',
      }).eq('id', license.id);

      return NextResponse.json({
        success: true,
        cancel_at_period_end: true,
        cooling_cancel: false,
        access_until: updatedPeriodEnd.toISOString(),
        message: `Subscription will cancel on ${updatedPeriodEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. You keep access until then.`,
      });
    }

  } catch (error: any) {
    console.error('Cancel error:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel subscription' }, { status: 500 });
  }
}
