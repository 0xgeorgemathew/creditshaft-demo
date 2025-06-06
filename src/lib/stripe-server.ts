// Shared server-side Stripe utility
import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export const getStripeInstance = (): Stripe => {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }
    
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-05-28.basil",
      typescript: true,
    });
  }
  
  return stripeInstance;
};

// Credit limit mapping for demo mode
export const getCreditLimitByCard = (cardLastFour: string): number => {
  const creditLimits: Record<string, number> = {
    "4242": 12000,
    "4000": 8500,
    "0002": 8500,
    "0005": 15000,
    "0069": 9000,
    "0119": 11000,
  };
  
  return creditLimits[cardLastFour] || 5000; // Default limit
};