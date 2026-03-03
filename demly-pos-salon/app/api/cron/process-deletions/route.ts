// app/api/cron/process-deletions/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
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
  const { data: accountsToDelete } = await supabase
    .from('licenses')
    .select('*')
    .lt('deletion_scheduled_at', now)
    .not('deletion_scheduled_at', 'is', null);

  if (!accountsToDelete) {
    return NextResponse.json({ processed: 0 });
  }

  for (const account of accountsToDelete) {
    try {
      // Get user_id from staff table
      const { data: staff } = await supabase
        .from('staff')
        .select('user_id')
        .eq('email', account.email)
        .single();

      if (staff?.user_id) {
        // Delete all user data
        await supabase.from('staff').delete().eq('user_id', staff.user_id);
        await supabase.from('settings').delete().eq('user_id', staff.user_id);
        await supabase.from('transactions').delete().eq('user_id', staff.user_id);
        await supabase.from('customers').delete().eq('user_id', staff.user_id);
        await supabase.from('products').delete().eq('user_id', staff.user_id);
        
        // Delete license
        await supabase.from('licenses').delete().eq('id', account.id);
        
        // Delete auth user
        await supabase.auth.admin.deleteUser(staff.user_id);
      }

      console.log(`✅ Deleted account for ${account.email}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${account.email}:`, error);
    }
  }

  return NextResponse.json({ processed: accountsToDelete.length });
}