// app/api/cron/process-deletions/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // Find accounts scheduled for deletion that are past their deletion date
  const now = new Date().toISOString();
  const { data: accountsToDelete, error: fetchError } = await supabase
    .from('licenses')
    .select('*')
    .lt('deletion_scheduled_at', now)
    .not('deletion_scheduled_at', 'is', null);

  if (fetchError) {
    console.error('Error fetching accounts to delete:', fetchError);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }

  if (!accountsToDelete || accountsToDelete.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const results = {
    processed: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const account of accountsToDelete) {
    try {
      console.log(`Processing deletion for: ${account.email}`);

      // Get user_id from staff table
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('user_id')
        .eq('email', account.email)
        .maybeSingle();

      if (staffError) {
        throw new Error(`Failed to get staff: ${staffError.message}`);
      }

      if (staff?.user_id) {
        // Delete all user data in correct order (respect foreign keys)
        
        // Delete appointments
        await supabase
          .from('appointments')
          .delete()
          .eq('user_id', staff.user_id);
        
        // Delete transactions
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', staff.user_id);
        
        // Delete customers
        await supabase
          .from('customers')
          .delete()
          .eq('user_id', staff.user_id);
        
        // Delete products/inventory
        await supabase
          .from('products')
          .delete()
          .eq('user_id', staff.user_id);
        
        // Delete settings
        await supabase
          .from('settings')
          .delete()
          .eq('user_id', staff.user_id);
        
        // Delete staff records
        await supabase
          .from('staff')
          .delete()
          .eq('user_id', staff.user_id);
        
        // Delete license
        await supabase
          .from('licenses')
          .delete()
          .eq('id', account.id);
        
        // Delete auth user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(staff.user_id);
        
        if (deleteError) {
          throw new Error(`Failed to delete auth user: ${deleteError.message}`);
        }

        console.log(`✅ Successfully deleted account for ${account.email}`);
        results.processed++;
      } else {
        // No staff record found, just delete the license
        await supabase
          .from('licenses')
          .delete()
          .eq('id', account.id);
        
        console.log(`✅ Deleted license only for ${account.email} (no staff record)`);
        results.processed++;
      }

    } catch (error: any) {
      console.error(`❌ Failed to delete ${account.email}:`, error);
      results.failed++;
      results.errors.push(`${account.email}: ${error.message}`);
    }
  }

  return NextResponse.json({ 
    success: true,
    processed: results.processed,
    failed: results.failed,
    errors: results.errors.length > 0 ? results.errors : undefined
  });
}
