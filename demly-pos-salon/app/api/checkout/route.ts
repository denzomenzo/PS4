// app/api/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export async function POST(request: Request) {
  try {
    const { email, fullName, phone, bundle, shippingAddress } = await request.json();

    console.log('🛒 Checkout initiated:', { email, fullName, bundle });

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   "https://demly.co.uk");

    console.log('🌐 App URL:', appUrl);

    // Map bundle to price ID from environment variables
    const priceMap = {
      software: process.env.STRIPE_PRICE_SOFTWARE,
      complete: process.env.STRIPE_PRICE_COMPLETE,
    };

    const priceId = priceMap[bundle as keyof typeof priceMap];

    if (!priceId) {
      console.error('❌ Invalid bundle or missing price ID:', { bundle, priceMap });
      return NextResponse.json(
        { error: "Invalid bundle selected or price not configured" },
        { status: 400 }
      );
    }

    console.log('💰 Selected price ID:', priceId);

    // Create checkout session
    const sessionData: any = {
      customer_email: email,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment", // One-time payment, not subscription
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pay`,
      metadata: {
        bundle,
        fullName,
        phone: phone || "",
        hasHardware: bundle === "complete" ? "true" : "false",
      },
    };

    // Add shipping address collection for hardware bundle
    if (bundle === "complete") {
      sessionData.shipping_address_collection = {
        allowed_countries: ["GB"],
      };
      
      if (shippingAddress) {
        sessionData.metadata.address_line1 = shippingAddress.line1;
        sessionData.metadata.address_line2 = shippingAddress.line2 || "";
        sessionData.metadata.city = shippingAddress.city;
        sessionData.metadata.postcode = shippingAddress.postcode;
      }
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    console.log('✅ Checkout session created:', session.id);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
