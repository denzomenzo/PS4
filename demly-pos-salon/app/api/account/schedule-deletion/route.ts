// app/api/account/schedule-deletion/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST() {
  console.log('🔵 ===== SCHEDULE DELETION API CALLED =====');
  
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
      console.log('✅ Staff from cookie:', { 
        id: staff.id, 
        name: staff.name, 
        email: staff.email
      });
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

    // First, get the current license to see its status
    const { data: currentLicense, error: fetchError } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', staff.email)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching license:', fetchError);
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    console.log('📋 Current license before update:', {
      id: currentLicense.id,
      status: currentLicense.status,
      deletion_scheduled_at: currentLicense.deletion_scheduled_at
    });

    // Set deletion scheduled date to 14 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 14);
    
    console.log('📅 Scheduling deletion for:', deletionDate.toISOString());

    // Try to update ONLY the deletion_scheduled_at field
    const { data: updatedData, error: updateError } = await supabase
      .from('licenses')
      .update({ 
        deletion_scheduled_at: deletionDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', currentLicense.id)
      .select();

    if (updateError) {
      console.error('❌ Update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      
      return NextResponse.json(
        { error: 'Failed to schedule deletion: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Update successful:', updatedData);
    console.log('✅ Deletion scheduled for:', staff.email);

    return NextResponse.json({ 
      success: true,
      message: 'Account deletion scheduled',
      deletion_date: deletionDate.toISOString()
    });
    
  } catch (error: any) {
    console.error('❌❌❌ SCHEDULE DELETION ERROR ❌❌❌');
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to schedule deletion' },
      { status: 500 }
    );
  }
}
