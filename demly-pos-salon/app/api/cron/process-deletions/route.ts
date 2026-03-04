// app/api/cron/process-deletions/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Email sending function with fallback
async function sendEmail(to: string, subject: string, html: string) {
  // Skip if no API key
  if (!process.env.RESEND_API_KEY) {
    console.log(`📧 Email would be sent to ${to}: ${subject} (skipped - no API key)`);
    return { success: false, skipped: true };
  }

  try {
    // Dynamic import to avoid startup errors
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'accounts@demly.co.uk',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error };
    }

    console.log(`✅ Email sent to ${to}`);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error };
  }
}

export async function GET(request: Request) {
  console.log('🔵 ===== CRON JOB STARTED =====');
  console.log('🔵 Time:', new Date().toISOString());
  
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  
  if (authHeader !== expectedToken) {
    console.error('❌ Unauthorized cron attempt:', authHeader);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Initialize Supabase with service role
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
    errors: [] as string[],
    emails_skipped: !process.env.RESEND_API_KEY
  };

  // 1. Send warnings for accounts scheduled for deletion in 3 days
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  console.log('🔍 Checking for accounts to warn...');
  
  const { data: soonToDelete, error: warnError } = await supabase
    .from('licenses')
    .select('*')
    .lte('deletion_scheduled_at', threeDaysFromNow.toISOString())
    .gt('deletion_scheduled_at', now.toISOString())
    .eq('status', 'deletion_scheduled');

  if (warnError) {
    console.error('❌ Error fetching accounts to warn:', warnError);
    results.errors.push(`Warn fetch: ${warnError.message}`);
  }

  for (const account of soonToDelete || []) {
    try {
      console.log(`📧 Sending warning to ${account.email}`);
      
      const emailResult = await sendEmail(
        account.email,
        '⚠️ Your Account Will Be Deleted in 3 Days',
        `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
              <h1 style="color: #dc2626; margin-bottom: 24px; font-size: 24px;">⚠️ Account Deletion Warning</h1>
              
              <p style="margin-bottom: 16px;">Hi there,</p>
              
              <p style="margin-bottom: 16px;">Your account is scheduled for permanent deletion on <strong style="color: #dc2626;">${new Date(account.deletion_scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
              
              <p style="margin-bottom: 24px;">If you did not request this deletion, please cancel it immediately:</p>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings" 
                   style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                  Cancel Deletion
                </a>
              </div>
              
              <p style="margin-bottom: 16px;">If you don't cancel, all your data will be permanently lost.</p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
              
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                If you need assistance, please contact our support team.
              </p>
            </div>
          </body>
          </html>
        `
      );

      if (emailResult.success) {
        results.warnings_sent++;
      }
    } catch (error: any) {
      console.error(`❌ Failed to send warning to ${account.email}:`, error);
      results.errors.push(`Warning email: ${account.email} - ${error.message}`);
    }
  }

  // 2. Process actual deletions (accounts past their deletion date)
  console.log('🔍 Checking for accounts to delete...');
  
  const { data: accountsToDelete, error: deleteError } = await supabase
    .from('licenses')
    .select('*')
    .lt('deletion_scheduled_at', now.toISOString())
    .not('deletion_scheduled_at', 'is', null);

  if (deleteError) {
    console.error('❌ Error fetching accounts to delete:', deleteError);
    results.errors.push(`Delete fetch: ${deleteError.message}`);
  }

  for (const account of accountsToDelete || []) {
    try {
      console.log(`🗑️ Deleting account: ${account.email}`);

      // Get user_id from staff table
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('user_id')
        .eq('email', account.email)
        .maybeSingle();

      if (staffError) {
        throw new Error(`Staff fetch failed: ${staffError.message}`);
      }

      if (staff?.user_id) {
        // Delete all user data in correct order
        console.log(`Deleting data for user_id: ${staff.user_id}`);
        
        await supabase.from('appointments').delete().eq('user_id', staff.user_id);
        await supabase.from('transactions').delete().eq('user_id', staff.user_id);
        await supabase.from('customers').delete().eq('user_id', staff.user_id);
        await supabase.from('products').delete().eq('user_id', staff.user_id);
        await supabase.from('settings').delete().eq('user_id', staff.user_id);
        await supabase.from('staff').delete().eq('user_id', staff.user_id);
        
        // Delete auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(staff.user_id);
        if (authError) {
          throw new Error(`Auth delete failed: ${authError.message}`);
        }
      }

      // Delete license
      await supabase.from('licenses').delete().eq('id', account.id);

      // Send deletion confirmation email
      await sendEmail(
        account.email,
        'Your Account Has Been Deleted',
        `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
              <h1 style="color: #64748b; margin-bottom: 24px; font-size: 24px;">Account Deleted</h1>
              
              <p style="margin-bottom: 16px;">Hi there,</p>
              
              <p style="margin-bottom: 16px;">Your account and all associated data have been permanently deleted from our system.</p>
              
              <p style="margin-bottom: 24px;">If you wish to use our services again, you'll need to create a new account.</p>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
              
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                Thank you for using Demly POS.
              </p>
            </div>
          </body>
          </html>
        `
      );

      console.log(`✅ Successfully deleted account for ${account.email}`);
      results.deleted++;

    } catch (error: any) {
      console.error(`❌ Failed to delete ${account.email}:`, error);
      results.failed++;
      results.errors.push(`${account.email}: ${error.message}`);
    }
  }

  // 3. Process payment failures and send warnings
  console.log('🔍 Checking for past due accounts...');
  
  const { data: pastDueAccounts, error: pastDueError } = await supabase
    .from('licenses')
    .select('*')
    .eq('status', 'past_due')
    .gte('payment_failed_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (pastDueError) {
    console.error('❌ Error fetching past due accounts:', pastDueError);
    results.errors.push(`Past due fetch: ${pastDueError.message}`);
  }

  for (const account of pastDueAccounts || []) {
    try {
      const daysSinceFailure = Math.floor(
        (now.getTime() - new Date(account.payment_failed_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send warning based on days past due
      if (daysSinceFailure === 3 || daysSinceFailure === 5 || daysSinceFailure === 7) {
        console.log(`📧 Sending payment warning to ${account.email} (${daysSinceFailure} days overdue)`);
        
        await sendEmail(
          account.email,
          `⚠️ Payment ${daysSinceFailure} Days Overdue`,
          `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
                <h1 style="color: #f59e0b; margin-bottom: 24px; font-size: 24px;">⚠️ Payment Overdue</h1>
                
                <p style="margin-bottom: 16px;">Hi there,</p>
                
                <p style="margin-bottom: 16px;">Your payment is <strong style="color: #f59e0b;">${daysSinceFailure} days overdue</strong>.</p>
                
                <p style="margin-bottom: 24px;">Please update your payment method immediately to avoid service interruption:</p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/subscription/create-portal" 
                     style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block;">
                    Update Payment Method
                  </a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                
                <p style="color: #64748b; font-size: 14px; margin: 0;">
                  If you need assistance, please contact our support team.
                </p>
              </div>
            </body>
            </html>
          `
        );
      }
    } catch (error: any) {
      console.error(`❌ Failed to send payment warning to ${account.email}:`, error);
    }
  }

  console.log('✅ Cron job completed:', results);

  return NextResponse.json({
    success: true,
    ...results,
    timestamp: now.toISOString(),
  });
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
