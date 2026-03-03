// app/api/account/schedule-deletion/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    const staffCookie = cookieStore.get('current_staff')?.value;
    
    if (!staffCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const staff = JSON.parse(decodeURIComponent(staffCookie));

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

    // Get user_id from staff table
    const { data: staffData } = await supabase
      .from('staff')
      .select('user_id')
      .eq('id', staff.id)
      .single();

    if (!staffData) {
      return NextResponse.json(
        { error: 'Staff not found' },
        { status: 404 }
      );
    }

    // Set deletion date to 14 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 14);

    // Update license with deletion date
    const { error: updateError } = await supabase
      .from('licenses')
      .update({ 
        deletion_scheduled_at: deletionDate.toISOString(),
        status: 'deletion_scheduled'
      })
      .eq('email', staff.email);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to schedule deletion' },
        { status: 500 }
      );
    }

    // Send confirmation email
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/deletion-scheduled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: staff.email,
        name: staff.name,
        deletion_date: deletionDate.toISOString()
      }),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Deletion scheduled',
      deletion_date: deletionDate.toISOString()
    });

  } catch (error: any) {
    console.error('Schedule deletion error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
