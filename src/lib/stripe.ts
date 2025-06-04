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
    status: "active",
  },
  test_card_4000: {
    available_credit: 8500,
    card_last_four: "0002",
    card_brand: "visa",
    status: "active",
  },
};

// src/types/index.ts
export interface PreAuthData {
  available_credit: number;
  card_last_four: string;
  card_brand: string;
  status: "active" | "pending" | "failed";
  wallet_address?: string;
  created_at?: string;
}

export interface BorrowingData {
  amount: number;
  asset: string;
  ltv_ratio: number;
  interest_rate: number;
  wallet_address: string;
}
