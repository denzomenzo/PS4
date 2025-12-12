import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia" as any
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

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
        
        // Get user ID from metadata
        const userId = session.metadata?.userId;
        
        if (!userId) {
          console.error("No userId in session metadata");
          break;
        }

        // Generate license key
        const licenseKey = `DEMLY-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Date.now()}`;

        // Calculate expiry (30 days for monthly, 365 for annual)
        const expiryDate = new Date();
        const subscriptionId = session.subscription as string;
        
        // Check if annual or monthly (you can also fetch from Stripe)
        expiryDate.setDate(expiryDate.getDate() + 30); // Default to 30 days

        // Create license in database
        const { error } = await supabase.from("licenses").insert({
          user_id: userId,
          license_key: licenseKey,
          status: "active",
          stripe_subscription_id: subscriptionId,
          expires_at: expiryDate.toISOString(),
        });

        if (error) {
          console.error("Error creating license:", error);
        } else {
          console.log("License created:", licenseKey);
        }
        break;

      case "customer.subscription.deleted":
        // Handle subscription cancellation
        const subscription = event.data.object as Stripe.Subscription;
        
        // Deactivate license
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