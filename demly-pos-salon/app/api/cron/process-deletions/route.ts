// app/api/cron/process-deletions/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    warnings_sent: 0,
    deleted: 0,
    failed: 0,
    errors: [] as string[]
  };

  // 1. Send warnings for accounts scheduled for deletion in 3 days
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const { data: soonToDelete } = await supabase
    .from('licenses')
    .select('*')
    .lte('deletion_scheduled_at', threeDaysFromNow.toISOString())
    .gt('deletion_scheduled_at', now.toISOString())
    .eq('status', 'deletion_scheduled');

  for (const account of soonToDelete || []) {
    try {
      await resend.emails.send({
        from: 'accounts@yourdomain.com',
        to: account.email,
        subject: '⚠️ Your Account Will Be Deleted in 3 Days',
        html: `
          <h1>Account Deletion Warning</h1>
          <p>Your account is scheduled for deletion on ${new Date(account.deletion_scheduled_at).toLocaleDateString()}.</p>
          <p>If you did not request this, please cancel the deletion immediately:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Cancel Deletion
          </a>
        `,
      });
      results.warnings_sent++;
    } catch (error) {
      console.error(`Failed to send warning to ${account.email}:`, error);
    }
  }

  // 2. Process actual deletions (accounts past their deletion date)
  const { data: accountsToDelete } = await supabase
    .from('licenses')
    .select('*')
    .lt('deletion_scheduled_at', now.toISOString())
    .not('deletion_scheduled_at', 'is', null);

  for (const account of accountsToDelete || []) {
    try {
      console.log(`Deleting account: ${account.email}`);

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

      // Send deletion confirmation email
      await resend.emails.send({
        from: 'accounts@yourdomain.com',
        to: account.email,
        subject: 'Your Account Has Been Deleted',
        html: `
          <h1>Account Deleted</h1>
          <p>Your account and all associated data have been permanently deleted.</p>
          <p>If you wish to use our services again, you'll need to create a new account.</p>
        `,
      });

      results.deleted++;
    } catch (error: any) {
      console.error(`Failed to delete ${account.email}:`, error);
      results.failed++;
      results.errors.push(`${account.email}: ${error.message}`);
    }
  }

  // 3. Process payment failures and send warnings
  const { data: pastDueAccounts } = await supabase
    .from('licenses')
    .select('*')
    .eq('status', 'past_due')
    .gte('payment_failed_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

  for (const account of pastDueAccounts || []) {
    const daysSinceFailure = Math.floor(
      (now.getTime() - new Date(account.payment_failed_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send warning based on days past due
    if (daysSinceFailure === 3 || daysSinceFailure === 5 || daysSinceFailure === 7) {
      await resend.emails.send({
        from: 'billing@yourdomain.com',
        to: account.email,
        subject: `⚠️ Payment ${daysSinceFailure} Days Overdue`,
        html: `
          <h1>Payment Overdue</h1>
          <p>Your payment is ${daysSinceFailure} days overdue.</p>
          <p>Please update your payment method immediately to avoid service interruption:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/subscription/create-portal" 
             style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Update Payment Method
          </a>
        `,
      });
    }
  }

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: now.toISOString(),
  });
}
