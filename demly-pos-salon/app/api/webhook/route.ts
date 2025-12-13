import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    if (!sig) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get email from metadata
        const email = session.metadata?.email || session.customer_email;
        
        if (!email) {
          console.error("No email in session metadata");
          break;
        }

        // Find user by email
        const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) {
          console.error("Error fetching users:", userError);
          break;
        }

        const user = users?.find(u => u.email === email);
        
        if (!user) {
          console.error("User not found for email:", email);
          break;
        }

        // Generate license key
        const licenseKey = `DEMLY-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Date.now()}`;

        // Calculate expiry based on plan
        const expiryDate = new Date();
        const plan = session.metadata?.plan || "annual";
        if (plan === "monthly") {
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        const subscriptionId = session.subscription as string;

        // Create license in database using service role
        const { error } = await supabase.from("licenses").insert({
          user_id: user.id,
          license_key: licenseKey,
          status: "active",
          stripe_subscription_id: subscriptionId,
          expires_at: expiryDate.toISOString(),
        });

        if (error) {
          console.error("Error creating license:", error);
        } else {
          console.log("License created:", licenseKey, "for user:", user.id);
        }
        break;

      case "customer.subscription.deleted":
        // Handle subscription cancellation
        const subscription = event.data.object as Stripe.Subscription;
        
        // Deactivate license using service role
        await supabase
          .from("licenses")
          .update({ status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
