import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(request: Request) {
  try {
    const { email, plan = "annual" } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Get app URL with fallback
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   "http://localhost:3000";

    // Define pricing for both plans
    const pricing = {
      monthly: {
        amount: 2900, // £29.00 in pence
        interval: "month" as const,
        description: "Monthly subscription to Demly POS",
      },
      annual: {
        amount: 29900, // £299.00 in pence
        interval: "year" as const,
        description: "Annual subscription to Demly POS (Save £49/year)",
      },
    };

    const selectedPlan = pricing[plan as keyof typeof pricing];

    if (!selectedPlan) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "Demly POS License",
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.amount,
            recurring: {
              interval: selectedPlan.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pay`,
      metadata: {
        email: email,
        plan: plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
