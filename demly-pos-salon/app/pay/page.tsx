"use client";

import { useState } from "react";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type PlanType = "monthly" | "annual";

interface PlanData {
  price: number;
  interval: string;
  total: number;
  savings: number;
  monthlyEquivalent?: number;
}

export default function PaymentPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("annual");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plans: Record<PlanType, PlanData> = {
    monthly: {
      price: 29,
      interval: "month",
      total: 29,
      savings: 0,
    },
    annual: {
      price: 299,
      interval: "year",
      total: 299,
      savings: 49,
      monthlyEquivalent: 24.92,
    },
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Please enter your email");
      return;
    }
    
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email,
          plan: selectedPlan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create checkout session");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const selectedPlanData = plans[selectedPlan];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <Link href="/login" className="text-slate-400 hover:text-white transition-colors font-medium">
            Already have an account? <span className="text-emerald-400">Sign In →</span>
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-6xl font-black bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent mb-4">
            Demly POS
          </h1>
          <p className="text-2xl text-slate-300">
            Complete Business Management System
          </p>
          <p className="text-lg text-slate-400 mt-2">
            Perfect for Salons, Retailers, Service Businesses & More
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Left: Plan Selection & Features */}
          <div className="space-y-6">
            
            {/* Plan Selection */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8">
              <h2 className="text-2xl font-bold mb-6">Choose Your Plan</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setSelectedPlan("monthly")}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    selectedPlan === "monthly"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="text-sm text-slate-400 mb-1">Monthly</div>
                  <div className="text-3xl font-black mb-1">£29</div>
                  <div className="text-sm text-slate-400">per month</div>
                </button>

                <button
                  onClick={() => setSelectedPlan("annual")}
                  className={`p-6 rounded-2xl border-2 transition-all relative ${
                    selectedPlan === "annual"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full text-xs font-bold">
                    SAVE £49
                  </div>
                  <div className="text-sm text-slate-400 mb-1">Annual</div>
                  <div className="text-3xl font-black mb-1">£299</div>
                  <div className="text-sm text-slate-400">per year</div>
                </button>
              </div>

              {selectedPlan === "annual" && selectedPlanData.monthlyEquivalent && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-emerald-400 font-bold">
                    That's only £{selectedPlanData.monthlyEquivalent.toFixed(2)}/month!
                  </p>
                  <p className="text-sm text-slate-400 mt-1">Save £{selectedPlanData.savings} compared to monthly</p>
                </div>
              )}
            </div>

            {/* Features List */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">Everything Included</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "Complete POS System",
                  "Customer Management",
                  "Appointment Booking",
                  "Sales Reports",
                  "Staff Management",
                  "Inventory Tracking",
                  "Customer Display",
                  "VAT Management",
                  "Custom Receipts",
                  "Unlimited Transactions",
                  "Unlimited Customers",
                  "Email Support",
                  "Regular Updates",
                  "Secure Cloud Backup",
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Checkout Form */}
          <div>
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 sticky top-8">
              <h2 className="text-2xl font-bold mb-6">Complete Your Purchase</h2>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400 mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleCheckout} className="space-y-6">
                <div>
                  <label className="block text-white mb-2 text-sm font-medium">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                  <p className="text-slate-500 text-sm mt-2">
                    Your subscription details will be sent to this email
                  </p>
                </div>

                {/* Order Summary */}
                <div className="bg-slate-800/30 rounded-xl p-6 space-y-4">
                  <h3 className="font-bold text-lg">Order Summary</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-slate-300">
                      <span>Demly POS ({selectedPlan === "monthly" ? "Monthly" : "Annual"})</span>
                      <span className="font-bold">£{selectedPlanData.total}</span>
                    </div>
                    
                    {selectedPlan === "annual" && (
                      <div className="flex justify-between text-emerald-400 text-sm">
                        <span>You save</span>
                        <span className="font-bold">£{selectedPlanData.savings}</span>
                      </div>
                    )}
                    
                    <div className="border-t border-slate-700/50 pt-3 flex justify-between text-lg">
                      <span className="font-bold">Total</span>
                      <span className="font-black text-2xl bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
                        £{selectedPlanData.total}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-400 text-center pt-2">
                      Billed {selectedPlan === "monthly" ? "monthly" : "annually"} • Cancel anytime
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-6 rounded-xl transition disabled:opacity-50 text-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Proceed to Payment</>
                  )}
                </button>

                <div className="space-y-3 text-sm text-slate-400 pt-4">
                  <div className="flex items-center gap-2 justify-center">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Secure payment via Stripe</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Instant access after payment</span>
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>Questions? Email us at <a href="mailto:support@demly.com" className="text-emerald-400 hover:underline">support@demly.com</a></p>
        </div>
      </div>
    </div>
  );
}
