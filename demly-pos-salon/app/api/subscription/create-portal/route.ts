// app/api/subscription/create-portal/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export async function POST() {
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
      .select('stripe_customer_id')
      .eq('email', staff.email)
      .single();

    if (error || !license?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No customer found' },
        { status: 404 }
      );
    }

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: license.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
      configuration: {
        features: {
          payment_method_update: {
            enabled: true,
          },
          invoice_history: {
            enabled: true,
          },
          subscription_cancel: {
            enabled: true,
          },
          subscription_update: {
            enabled: true,
            default_allowed_updates: ['price'],
          },
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to open customer portal' },
      { status: 500 }
    );
  }
}
