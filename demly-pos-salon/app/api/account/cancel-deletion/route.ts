// app/api/account/cancel-deletion/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
  console.log('🔵 ===== CANCEL DELETION API CALLED =====');
  
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

    // First, check if license exists for this email
    const { data: existingLicense, error: checkError } = await supabase
      .from('licenses')
      .select('id, email, status, deletion_scheduled_at')
      .eq('email', staff.email)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking license:', checkError);
      return NextResponse.json(
        { error: 'Database error: ' + checkError.message },
        { status: 500 }
      );
    }

    if (!existingLicense) {
      console.error('❌ No license found for email:', staff.email);
      return NextResponse.json(
        { error: 'No license found for this account' },
        { status: 404 }
      );
    }

    // Clear deletion scheduled date and restore status
    console.log('📅 Cancelling deletion for:', {
      email: staff.email,
      license_id: existingLicense.id
    });

    const { error: updateError } = await supabase
      .from('licenses')
      .update({ 
        deletion_scheduled_at: null,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', existingLicense.id);

    if (updateError) {
      console.error('❌ Failed to cancel deletion:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel deletion: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Deletion cancelled successfully for:', staff.email);

    return NextResponse.json({ 
      success: true,
      message: 'Account deletion cancelled'
    });
    
  } catch (error: any) {
    console.error('❌❌❌ CANCEL DELETION ERROR ❌❌❌');
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel deletion' },
      { status: 500 }
    );
  }
}
