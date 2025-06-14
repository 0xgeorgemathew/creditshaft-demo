/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PreAuthData {
  [x: string]: string | number | undefined;
  available_credit: number;
  card_last_four: string;
  card_brand: string;
  status: "active" | "pending" | "failed";
  wallet_address?: string;
  created_at?: string;
  // Stripe integration fields
  preAuthId?: string;
  customerId?: string;
  paymentMethodId?: string;
  setupIntentId?: string;
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
  borrowAmountETH?: number; // New field for ETH amount
  ethPriceAtCreation?: number; // ETH price when loan was created
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
  preAuthCreatedAt?: string;
  preAuthExpiresAt?: string;
  chargedAt?: string;
  releasedAt?: string;

  // Stripe data
  stripeChargeId?: string;
  actualChargedAmount?: number;
  stripePreAuthStatus?: string;
  stripePreAuthAmount?: number;

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

// Chainlink Integration Types
export interface ChainlinkLoanData {
  loanId: string;
  borrower: string; // wallet address
  borrowAmount: string; // in wei
  collateralAmount: string; // USD amount scaled by 1e8
  stripePaymentIntentId: string; // for direct Stripe API calls
  createdAt: number; // timestamp
  expiryTimestamp: number; // when pre-auth expires
  triggerTimestamp: number; // when automation should trigger (1 hour before expiry)
  isActive: boolean;
  autoChargeEnabled: boolean;
}

export interface ChainlinkAutomationJob {
  loanId: string;
  triggerTime: number;
  executed: boolean;
  cancelled: boolean;
  lastChecked?: number;
}

export interface ChainlinkFunctionResponse {
  success: boolean;
  loanId: string;
  chargedAmount?: number;
  stripeChargeId?: string;
  error?: string;
  timestamp: number;
}

// Enhanced Loan interface for blockchain integration
export interface BlockchainLoan extends Loan {
  // Blockchain specific fields
  contractAddress?: string;
  chainId?: number;
  blockNumber?: number;
  automationUpkeepId?: string;
  functionsSubscriptionId?: string;
  
  // Automation status
  automationStatus: 'pending' | 'scheduled' | 'triggered' | 'cancelled' | 'failed';
  nextAutomationCheck?: string;
  automationGasUsed?: number;
  
  // Chainlink metadata
  chainlinkJobId?: string;
  chainlinkRequestId?: string;
  chainlinkResponse?: ChainlinkFunctionResponse;
}

// Configuration for smart contract deployment
export interface SmartContractConfig {
  network: 'sepolia' | 'avalanche-fuji';
  contractAddress: string;
  chainlinkRouter: string;
  automationRegistry: string;
  functionsSubscriptionId: string;
  gasLimit: number;
  linkTokenAddress: string;
}

// Event types for blockchain monitoring
export interface ChainlinkEvent {
  type: 'LoanCreated' | 'AutomationScheduled' | 'AutoChargeExecuted' | 'LoanLiquidated' | 'LoanReleased';
  loanId: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
  data: any;
}
