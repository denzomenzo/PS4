// app/api/subscription/reactivate/route.ts
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
      console.log('✅ Staff from cookie:', { id: staff.id, name: staff.name, role: staff.role });
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
      .single();

    if (error || !license?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Reactivate subscription (remove cancel at period end)
    await stripe.subscriptions.update(
      license.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    );

    return NextResponse.json({
      message: 'Subscription reactivated successfully',
      cancel_at_period_end: false,
    });
  } catch (error: any) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
