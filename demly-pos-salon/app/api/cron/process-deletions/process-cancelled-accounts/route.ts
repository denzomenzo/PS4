// app/api/cron/process-deletions/process-cancelled-accounts/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get() { return null; }, set() {}, remove() {} } }
  );

  const now = new Date();
  const results = { processed: 0, failed: 0, errors: [] as string[] };

  // Find accounts where subscription period has ended (cancel_at_period_end set, date passed)
  // NOTE: Do NOT filter by status='active' — the webhook sets status='cancelled' at period end,
  // so filtering active would miss every account cancelled via the Stripe portal.
  const { data: accountsToDelete, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('cancel_at_period_end', true)
    .lte('scheduled_for_deletion_at', now.toISOString())
    .not('scheduled_for_deletion_at', 'is', null);

  if (error) {
    console.error('Error fetching accounts to delete:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const account of accountsToDelete || []) {
    try {
      console.log(`🗑️ Deleting cancelled account: ${account.email}`);

      const { data: staff } = await supabase
        .from('staff').select('user_id').eq('email', account.email).maybeSingle();

      if (staff?.user_id) {
        await supabase.from('appointments').delete().eq('user_id', staff.user_id);
        await supabase.from('transactions').delete().eq('user_id', staff.user_id);
        await supabase.from('customers').delete().eq('user_id', staff.user_id);
        await supabase.from('products').delete().eq('user_id', staff.user_id);
        await supabase.from('settings').delete().eq('user_id', staff.user_id);
        await supabase.from('staff').delete().eq('user_id', staff.user_id);
        await supabase.auth.admin.deleteUser(staff.user_id);
      }

      await supabase.from('licenses').delete().eq('id', account.id);
      results.processed++;
      console.log(`✅ Deleted: ${account.email}`);
    } catch (e: any) {
      console.error(`❌ Failed: ${account.email}`, e);
      results.failed++;
      results.errors.push(`${account.email}: ${e.message}`);
    }
  }

  return NextResponse.json({ success: true, ...results, timestamp: now.toISOString() });
}
