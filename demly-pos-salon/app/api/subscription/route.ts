// app/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

export async function GET() {
  console.log('🔵 ===== SUBSCRIPTION API CALLED =====');
  console.log('🔵 Timestamp:', new Date().toISOString());
  
  try {
    const cookieStore = await cookies();
    
    // Get the staff cookie first
    const staffCookie = cookieStore.get('current_staff')?.value;
    
    console.log('📋 Staff cookie present:', !!staffCookie);
    
    if (!staffCookie) {
      console.error('❌ No staff cookie found');
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
        email: staff.email,
        role: staff.role
      });
    } catch (e) {
      console.error('❌ Invalid staff cookie:', e);
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

    console.log('🔍 Looking for license with email:', staff.email);

    // Get user's license by staff email
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', staff.email)
      .maybeSingle();

    if (error) {
      console.error('❌ Database error fetching license:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!license) {
      console.log('⚠️ No license found for staff email:', staff.email);
      return NextResponse.json({ subscription: null });
    }

    console.log('✅ License found in database:', {
      id: license.id,
      stripe_subscription_id: license.stripe_subscription_id,
      stripe_customer_id: license.stripe_customer_id,
      plan: license.plan_type,
      status: license.status,
      email: license.email,
      created_at: license.created_at,
      expires_at: license.expires_at
    });

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

    // Try to get from Stripe with proper expansion
    if (license.stripe_subscription_id && license.stripe_subscription_id !== 'test_subscription_id') {
      try {
        console.log('🔍 Attempting to fetch from Stripe with ID:', license.stripe_subscription_id);
        
        // Check Stripe key mode
        const stripeKey = process.env.STRIPE_SECRET_KEY || '';
        const keyMode = stripeKey.startsWith('sk_live') ? 'LIVE' : stripeKey.startsWith('sk_test') ? 'TEST' : 'UNKNOWN';
        console.log('🔑 Stripe key mode:', keyMode);
        console.log('🔑 Stripe key prefix:', stripeKey.substring(0, 7) + '...');
        
        // Log the full Stripe key for debugging (masked)
        const maskedKey = stripeKey.replace(/[^-_]$/g, '*');
        console.log('🔑 Full key (masked):', maskedKey);
        
        const stripeResponse = await stripe.subscriptions.retrieve(
          license.stripe_subscription_id,
          {
            expand: ['default_payment_method', 'customer'],
          }
        );
        
        // Cast to any to avoid TypeScript issues
        const subscription = stripeResponse as any;
        
        console.log('✅ Stripe fetch successful!');
        console.log('📦 Stripe subscription data:', {
          id: subscription.id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          has_default_payment_method: !!subscription.default_payment_method,
          customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id
        });

        const customer = subscription.customer as any;
        
        // Get payment method details
        let paymentMethod = null;
        
        // Try to get from subscription first
        if (subscription.default_payment_method) {
          console.log('💳 Found payment method in subscription');
          const pm = subscription.default_payment_method;
          if (pm?.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            };
            console.log('💳 Payment method details:', paymentMethod);
          } else {
            console.log('💳 Payment method found but no card details:', pm);
          }
        } 
        // If not in subscription, try customer's default
        else if (customer?.invoice_settings?.default_payment_method) {
          console.log('💳 Found payment method in customer');
          const pm = customer.invoice_settings.default_payment_method;
          if (pm?.card) {
            paymentMethod = {
              brand: pm.card.brand,
              last4: pm.card.last4,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
            };
            console.log('💳 Payment method details:', paymentMethod);
          } else {
            console.log('💳 Customer payment method found but no card details:', pm);
          }
        } else {
          console.log('💳 No payment method found in subscription or customer');
        }

        // Get upcoming invoice to show next payment
        let upcomingInvoice = null;
        try {
          console.log('📄 Fetching upcoming invoice...');
          const invoicesApi = stripe.invoices as any;
          upcomingInvoice = await invoicesApi.retrieveUpcoming({
            subscription: license.stripe_subscription_id,
          });
          console.log('📄 Upcoming invoice found:', {
            amount: upcomingInvoice?.total,
            next_payment: upcomingInvoice?.next_payment_attempt
          });
        } catch (upcomingError: any) {
          console.log('📄 No upcoming invoice found or error:', upcomingError.message);
        }

        const price = subscription.items?.data[0]?.price;
        
        console.log('✅ Returning Stripe subscription data');

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
            days_until_deletion: daysUntilDeletion,
            deletion_date: license.deletion_scheduled_at,
          }
        });
      } catch (stripeError: any) {
        // 👇 THIS WILL SHOW US THE REAL ERROR
        console.error('❌❌❌ STRIPE FETCH FAILED ❌❌❌');
        console.error('Error name:', stripeError.name);
        console.error('Error message:', stripeError.message);
        console.error('Error type:', stripeError.type);
        console.error('Error code:', stripeError.code);
        console.error('Status code:', stripeError.statusCode);
        console.error('Stack:', stripeError.stack);
        console.error('Full error object:', JSON.stringify(stripeError, null, 2));
        
        // Log the subscription ID that failed
        console.error('Failed subscription ID:', license.stripe_subscription_id);
        
        // Check if it's a test/live mode mismatch
        const isTestKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test');
        const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live');
        console.error('Stripe key mode:', isTestKey ? 'TEST' : isLiveKey ? 'LIVE' : 'UNKNOWN');
        
        // Check subscription ID format
        const subId = license.stripe_subscription_id || '';
        console.error('Subscription ID format:', {
          startsWith_sub: subId.startsWith('sub_'),
          length: subId.length,
          sample: subId.substring(0, 10) + '...'
        });
        
        // If it's a "no such subscription" error, the ID might be from the wrong mode
        if (stripeError.code === 'resource_missing') {
          console.error('⚠️ This subscription does not exist in Stripe with current key mode');
          console.error('💡 Suggestion: Check if your Stripe key is in the correct mode (test/live) for this subscription');
        }
        
        if (stripeError.type === 'StripeAuthenticationError') {
          console.error('⚠️ Authentication error - your Stripe key might be invalid or expired');
        }
      }
    } else {
      console.log('⚠️ No valid Stripe subscription ID found in database');
    }

    // Fallback to license data
    console.log('⚠️ Using license data as fallback');
    
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
      }
    });
  } catch (error: any) {
    console.error('❌❌❌ UNEXPECTED ERROR ❌❌❌');
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
