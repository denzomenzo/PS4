// lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia", // Use latest stable version
});

export const SUBSCRIPTION_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  annual: process.env.STRIPE_PRICE_ANNUAL!,
};

export const COOLING_PERIOD_DAYS = 14;

export default stripe;
