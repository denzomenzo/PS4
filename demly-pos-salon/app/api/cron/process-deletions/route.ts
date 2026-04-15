// app/api/cron/process-deletions/route.ts
// FIXES:
//   1. Warning emails now query scheduled_for_deletion_at (not deletion_scheduled_at + status='deletion_scheduled')
//   2. Warning emails fire for ANY account with cancel_at_period_end approaching
//   3. Deletion query unchanged (deletion_scheduled_at is manual user-requested deletion)

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`📧 Email skipped (no RESEND_API_KEY): ${subject} → ${to}`);
    return { success: false, skipped: true };
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: 'accounts@demly.co.uk',
      to,
      subject,
      html,
    });
    if (error) { console.error('❌ Resend error:', error); return { success: false, error }; }
    console.log(`✅ Email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error };
  }
}

export async function GET(request: Request) {
  console.log('🔵 ===== CRON JOB STARTED =====', new Date().toISOString());

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
  const results = {
    warnings_sent: 0,
    deleted: 0,
    failed: 0,
    errors: [] as string[],
    emails_skipped: !process.env.RESEND_API_KEY,
  };

  // 1. Send 3-day warnings for subscriptions ending soon (via portal cancel or direct cancel)
  //    These have cancel_at_period_end=true and scheduled_for_deletion_at within 3 days
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const { data: soonToEnd } = await supabase
    .from('licenses')
    .select('*')
    .eq('cancel_at_period_end', true)
    .lte('scheduled_for_deletion_at', threeDaysFromNow.toISOString())
    .gt('scheduled_for_deletion_at', now.toISOString());

  for (const account of soonToEnd || []) {
    try {
      const endDate = new Date(account.scheduled_for_deletion_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      await sendEmail(
        account.email,
        '⚠️ Your Demly POS subscription ends in 3 days',
        `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#f59e0b">⚠️ Subscription Ending Soon</h2>
          <p>Your Demly POS subscription will end on <strong>${endDate}</strong>.</p>
          <p>After this date, your access will be removed and your data will be scheduled for deletion.</p>
          <p style="margin:24px 0">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" 
               style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:8px">
              Reactivate Subscription
            </a>
          </p>
          <p style="color:#64748b;font-size:14px">Thank you for using Demly POS.</p>
        </body></html>`
      );
      results.warnings_sent++;
    } catch (e: any) {
      results.errors.push(`Warning email ${account.email}: ${e.message}`);
    }
  }

  // 2. Send 3-day warnings for manual deletion requests (deletion_scheduled_at)
  const { data: soonToDelete } = await supabase
    .from('licenses')
    .select('*')
    .lte('deletion_scheduled_at', threeDaysFromNow.toISOString())
    .gt('deletion_scheduled_at', now.toISOString())
    .not('deletion_scheduled_at', 'is', null);

  for (const account of soonToDelete || []) {
    try {
      const deleteDate = new Date(account.deletion_scheduled_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      await sendEmail(
        account.email,
        '⚠️ Your account will be deleted in 3 days',
        `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2 style="color:#dc2626">⚠️ Account Deletion Warning</h2>
          <p>Your account is scheduled for permanent deletion on <strong>${deleteDate}</strong>.</p>
          <p>If you did not request this, cancel it immediately.</p>
          <p style="margin:24px 0">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings"
               style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:8px">
              Cancel Deletion
            </a>
          </p>
          <p style="color:#64748b;font-size:14px">All data will be permanently lost if not cancelled.</p>
        </body></html>`
      );
      results.warnings_sent++;
    } catch (e: any) {
      results.errors.push(`Deletion warning ${account.email}: ${e.message}`);
    }
  }

  // 3. Process manual deletions (user requested via settings, 14-day window passed)
  const { data: accountsToDelete } = await supabase
    .from('licenses')
    .select('*')
    .lt('deletion_scheduled_at', now.toISOString())
    .not('deletion_scheduled_at', 'is', null);

  for (const account of accountsToDelete || []) {
    try {
      console.log(`🗑️ Deleting account: ${account.email}`);
      const { data: staff } = await supabase
        .from('staff').select('user_id').eq('email', account.email).maybeSingle();

      if (staff?.user_id) {
        await supabase.from('appointments').delete().eq('user_id', staff.user_id);
        await supabase.from('transactions').delete().eq('user_id', staff.user_id);
        await supabase.from('customers').delete().eq('user_id', staff.user_id);
        await supabase.from('products').delete().eq('user_id', staff.user_id);
        await supabase.from('settings').delete().eq('user_id', staff.user_id);
        await supabase.from('staff').delete().eq('user_id', staff.user_id);
        const { error: authError } = await supabase.auth.admin.deleteUser(staff.user_id);
        if (authError) throw new Error(`Auth delete failed: ${authError.message}`);
      }

      await supabase.from('licenses').delete().eq('id', account.id);

      await sendEmail(account.email, 'Your Demly account has been deleted',
        `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <h2>Account Deleted</h2>
          <p>Your Demly POS account and all data have been permanently deleted.</p>
          <p style="color:#64748b;font-size:14px">Thank you for using Demly POS.</p>
        </body></html>`
      );

      console.log(`✅ Deleted: ${account.email}`);
      results.deleted++;
    } catch (e: any) {
      console.error(`❌ Failed to delete ${account.email}:`, e);
      results.failed++;
      results.errors.push(`${account.email}: ${e.message}`);
    }
  }

  // 4. Past due payment warnings (days 3, 5, 7)
  const { data: pastDueAccounts } = await supabase
    .from('licenses')
    .select('*')
    .eq('status', 'past_due')
    .gte('payment_failed_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

  for (const account of pastDueAccounts || []) {
    try {
      const daysSince = Math.floor(
        (now.getTime() - new Date(account.payment_failed_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if ([3, 5, 7].includes(daysSince)) {
        await sendEmail(
          account.email,
          `⚠️ Payment ${daysSince} days overdue`,
          `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#f59e0b">⚠️ Payment Overdue</h2>
            <p>Your payment is <strong>${daysSince} days overdue</strong>.</p>
            <p style="margin:24px 0">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings"
                 style="background:#3b82f6;color:white;padding:12px 24px;text-decoration:none;border-radius:8px">
                Update Payment Method
              </a>
            </p>
          </body></html>`
        );
      }
    } catch (e: any) {
      results.errors.push(`Payment warning ${account.email}: ${e.message}`);
    }
  }

  console.log('✅ Cron complete:', results);
  return NextResponse.json({ success: true, ...results, timestamp: now.toISOString() });
}

export async function POST() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export async function PUT() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ error: 'Method not allowed' }, { status: 405 }); }
