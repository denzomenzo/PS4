import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { email, plan = "annual" } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Define pricing for both plans
    const pricing = {
      monthly: {
        amount: 2900, // £29.00 in pence
        mode: "subscription" as const,
        description: "Monthly subscription to Demly POS",
      },
      annual: {
        amount: 29900, // £299.00 in pence
        mode: "subscription" as const,
        description: "Annual subscription to Demly POS (Save £49/year)",
      },
    };

    const selectedPlan = pricing[plan as keyof typeof pricing];

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
              interval: plan === "monthly" ? "month" : "year",
            },
          },
          quantity: 1,
        },
      ],
      mode: selectedPlan.mode,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pay`,
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
