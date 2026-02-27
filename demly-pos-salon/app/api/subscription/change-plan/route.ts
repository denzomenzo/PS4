// app/api/subscription/change-plan/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe, SUBSCRIPTION_PRICES } from '@/lib/stripe';

export async function POST(req: Request) {
  console.log('🔵 ===== CHANGE PLAN API CALLED =====');
  
  try {
    const { newPlan } = await req.json();
    
    if (!newPlan || !['monthly', 'annual'].includes(newPlan)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

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
      .single();

    if (error || !license) {
      return NextResponse.json(
        { error: 'No license found' },
        { status: 404 }
      );
    }

    if (!license.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get the price ID for the new plan
    const newPriceId = SUBSCRIPTION_PRICES[newPlan];
    
    if (!newPriceId) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Get current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      license.stripe_subscription_id
    );

    // Check if already on this plan
    const currentPriceId = subscription.items.data[0]?.price.id;
    if (currentPriceId === newPriceId) {
      return NextResponse.json(
        { error: 'Already on this plan' },
        { status: 400 }
      );
    }

    // Calculate proration and schedule the change at period end
    const updatedSubscription = await stripe.subscriptions.update(
      license.stripe_subscription_id,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'always_invoice', // This will create an invoice for the prorated amount
        payment_behavior: 'pending_if_incomplete',
        cancel_at_period_end: false, // Ensure we don't cancel
      }
    );

    console.log('✅ Subscription updated successfully:', {
      id: updatedSubscription.id,
      plan: newPlan,
      current_period_end: new Date(updatedSubscription.current_period_end * 1000).toISOString()
    });

    // Update license plan type in database
    await supabase
      .from('licenses')
      .update({ 
        plan_type: newPlan,
        updated_at: new Date().toISOString()
      })
      .eq('id', license.id);

    // Calculate prorated amount for response
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      subscription: license.stripe_subscription_id,
    });

    const proratedAmount = upcomingInvoice?.total ? upcomingInvoice.total / 100 : 0;
    const effectiveDate = new Date(updatedSubscription.current_period_end * 1000).toISOString();

    return NextResponse.json({
      success: true,
      message: `Your plan will change to ${newPlan} at the end of your current billing period`,
      new_plan: newPlan,
      effective_date: effectiveDate,
      prorated_amount: proratedAmount,
      next_invoice_date: upcomingInvoice?.next_payment_attempt 
        ? new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString() 
        : null
    });

  } catch (error: any) {
    console.error('❌ Error changing plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to change plan' },
      { status: 500 }
    );
  }
}