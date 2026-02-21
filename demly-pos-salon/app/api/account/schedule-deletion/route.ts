// app/api/account/schedule-deletion/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Get the user_id from staff table
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('user_id')
      .eq('id', staff.id)
      .single();

    if (staffError || !staffData?.user_id) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Set deletion scheduled date to 14 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 14);

    // Update the license with deletion scheduled date
    const { error: updateError } = await supabase
      .from('licenses')
      .update({ 
        deletion_scheduled_at: deletionDate.toISOString(),
        status: 'deletion_scheduled'
      })
      .eq('email', staff.email);

    if (updateError) {
      console.error('Error scheduling deletion:', updateError);
      return NextResponse.json(
        { error: 'Failed to schedule deletion' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: 'Account deletion scheduled',
      deletion_date: deletionDate.toISOString()
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}