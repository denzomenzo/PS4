// app/api/subscription/create-portal/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function POST() {
  console.log('🔵 ===== CREATE PORTAL API CALLED =====');
  
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
      .select('stripe_customer_id, stripe_subscription_id, plan_type, status, email')
      .eq('email', staff.email)
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    if (!license) {
      console.error('❌ No license found for email:', staff.email);
      return NextResponse.json(
        { error: 'No license found' },
        { status: 404 }
      );
    }

    console.log('✅ License found:', {
      email: license.email,
      stripe_customer_id: license.stripe_customer_id,
      stripe_subscription_id: license.stripe_subscription_id,
      plan: license.plan_type,
      status: license.status
    });

    if (!license.stripe_customer_id) {
      console.error('❌ No stripe_customer_id in license');
      return NextResponse.json(
        { error: 'No customer found - missing customer ID' },
        { status: 404 }
      );
    }

    console.log('🔑 Using Stripe key mode:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' : 'TEST');
    console.log('🚀 Creating portal session for customer:', license.stripe_customer_id);

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: license.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
    });

    console.log('✅ Portal session created:', {
      id: session.id,
      url: session.url,
      customer: session.customer
    });

    return NextResponse.json({ url: session.url });
    
  } catch (error: any) {
    console.error('❌❌❌ PORTAL API ERROR ❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Status code:', error.statusCode);
    console.error('Full error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to open customer portal' },
      { status: 500 }
    );
  }
}
