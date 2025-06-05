/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PreAuthData {
  [x: string]: string | number | undefined;
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
export interface Loan {
  id: string;
  preAuthId: string;
  walletAddress: string;
  customerId: string;
  paymentMethodId: string;

  // Loan details
  borrowAmount: number;
  asset: string;
  interestRate: number;
  ltvRatio: number;

  // Credit tracking
  originalCreditLimit: number;
  preAuthAmount: number;

  // Status tracking
  status: "active" | "charged" | "released" | "defaulted";

  // Timestamps
  createdAt: string;
  chargedAt?: string;
  releasedAt?: string;

  // Stripe data
  stripeChargeId?: string;
  actualChargedAmount?: number;

  // Transaction data
  txHash?: string;
}

export interface CreditSummary {
  totalCreditLimit: number;
  totalBorrowed: number;
  totalCharged: number;
  totalReleased: number;
  availableCredit: number;
  utilizationPercentage: number;
  activeLoans: number;
}

export interface LoanAction {
  type: "charge" | "release";
  loanId: string;
  amount?: number;
  reason?: string;
}

export interface StripeChargeResponse {
  success: boolean;
  chargeId?: string;
  amount?: number;
  error?: string;
  stripeResponse?: any;
}

export interface StripeReleaseResponse {
  success: boolean;
  setupIntentId?: string;
  error?: string;
  stripeResponse?: any;
}
