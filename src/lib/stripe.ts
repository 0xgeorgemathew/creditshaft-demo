// src/lib/stripe.ts
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export { stripePromise };

// Mock pre-authorization data for demo
export const mockPreAuthData = {
  test_card_4242: {
    available_credit: 12000,
    card_last_four: "4242",
    card_brand: "visa",
    status: "active" as const,
  },
  test_card_4000: {
    available_credit: 8500,
    card_last_four: "0002",
    card_brand: "visa",
    status: "active" as const,
  },
};
