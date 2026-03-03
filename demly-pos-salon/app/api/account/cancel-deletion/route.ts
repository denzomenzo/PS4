// app/api/account/cancel-deletion/route.ts
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

    // Clear deletion date and restore status
    const { error } = await supabase
      .from('licenses')
      .update({ 
        deletion_scheduled_at: null,
        status: 'active'
      })
      .eq('email', staff.email);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to cancel deletion' },
        { status: 500 }
      );
    }

    // Send cancellation email
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/deletion-cancelled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: staff.email,
        name: staff.name
      }),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Deletion cancelled'
    });

  } catch (error: any) {
    console.error('Cancel deletion error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
