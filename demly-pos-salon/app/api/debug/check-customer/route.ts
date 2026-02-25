// app/api/debug/check-customer/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // Get the staff cookie first
    const staffCookie = cookieStore.get('current_staff')?.value;
    
    if (!staffCookie) {
      return NextResponse.json({ error: 'No staff cookie' });
    }

    // Parse staff data from cookie
    const staff = JSON.parse(decodeURIComponent(staffCookie));
    
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

    // Get the license
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', staff.email)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message });
    }

    return NextResponse.json({
      staff_email: staff.email,
      license: {
        id: license.id,
        email: license.email,
        stripe_customer_id: license.stripe_customer_id,
        stripe_customer_id_type: typeof license.stripe_customer_id,
        stripe_customer_id_length: license.stripe_customer_id?.length,
        stripe_subscription_id: license.stripe_subscription_id,
        plan: license.plan_type,
        status: license.status
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}