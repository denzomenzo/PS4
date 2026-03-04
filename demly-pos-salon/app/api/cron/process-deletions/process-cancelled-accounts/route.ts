// app/api/cron/process-cancelled-accounts/route.ts
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

  const now = new Date();
  const results = {
    processed: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Find accounts where cancellation period has ended
  const { data: accountsToDelete, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('cancel_at_period_end', true)
    .lte('scheduled_for_deletion_at', now.toISOString())
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching accounts to delete:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const account of accountsToDelete || []) {
    try {
      console.log(`🗑️ Deleting cancelled account: ${account.email}`);

      // Get user_id from staff table
      const { data: staff } = await supabase
        .from('staff')
        .select('user_id')
        .eq('email', account.email)
        .maybeSingle();

      if (staff?.user_id) {
        // Delete all user data
        await supabase.from('appointments').delete().eq('user_id', staff.user_id);
        await supabase.from('transactions').delete().eq('user_id', staff.user_id);
        await supabase.from('customers').delete().eq('user_id', staff.user_id);
        await supabase.from('products').delete().eq('user_id', staff.user_id);
        await supabase.from('settings').delete().eq('user_id', staff.user_id);
        await supabase.from('staff').delete().eq('user_id', staff.user_id);
        
        // Delete auth user
        await supabase.auth.admin.deleteUser(staff.user_id);
      }

      // Delete license
      await supabase.from('licenses').delete().eq('id', account.id);

      results.processed++;
      console.log(`✅ Deleted account for ${account.email}`);

    } catch (error: any) {
      console.error(`❌ Failed to delete ${account.email}:`, error);
      results.failed++;
      results.errors.push(`${account.email}: ${error.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: now.toISOString(),
  });
}