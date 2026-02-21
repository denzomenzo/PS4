// app/api/account/delete/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { stripe, COOLING_PERIOD_DAYS } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get user's license and subscription data
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('email', user.email)
      .single();

    // 2. Handle active subscription if exists
    if (license?.stripe_subscription_id) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          license.stripe_subscription_id
        );

        const createdDate = new Date(stripeSubscription.created * 1000);
        const now = new Date();
        const daysSinceCreation = Math.floor(
          (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceCreation <= COOLING_PERIOD_DAYS) {
          // Within cooling period - cancel immediately and refund
          await stripe.subscriptions.cancel(license.stripe_subscription_id, {
            prorate: true,
            invoice_now: true,
          });

          // Get latest invoice and refund
          const invoices = await stripe.invoices.list({
            subscription: license.stripe_subscription_id,
            limit: 1,
          });

          if (invoices.data.length > 0) {
            const latestInvoice = invoices.data[0] as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null };
            if (latestInvoice.payment_intent) {
              const paymentIntentId = typeof latestInvoice.payment_intent === 'string' 
                ? latestInvoice.payment_intent 
                : (latestInvoice.payment_intent as Stripe.PaymentIntent).id;
                
              await stripe.refunds.create({
                payment_intent: paymentIntentId,
                reason: 'requested_by_customer',
              });
            }
          }
        } else {
          // Outside cooling period - cancel at period end
          await stripe.subscriptions.update(
            license.stripe_subscription_id,
            {
              cancel_at_period_end: true,
            }
          );
        }
      } catch (stripeError) {
        console.error('Error handling Stripe subscription:', stripeError);
        // Continue with account deletion even if Stripe fails
      }
    }

    // 3. Delete all user data from database
    // Order matters due to foreign key constraints
    
    // Delete staff members
    await supabase
      .from('staff')
      .delete()
      .eq('user_id', user.id);
    
    // Delete settings
    await supabase
      .from('settings')
      .delete()
      .eq('user_id', user.id);
    
    // Delete license
    if (license) {
      await supabase
        .from('licenses')
        .delete()
        .eq('id', license.id);
    }
    
    // Delete any other user data (transactions, customers, inventory, etc.)
    await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id);
    
    await supabase
      .from('customers')
      .delete()
      .eq('user_id', user.id);
    
    await supabase
      .from('products')
      .delete()
      .eq('user_id', user.id);
    
    // 4. Finally, delete the user from Supabase Auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Account deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    );
  }
}
