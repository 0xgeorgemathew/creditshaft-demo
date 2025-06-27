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
export interface Position {
  collateralLINK: string; // User's initial LINK (18 decimals)
  leverageRatio: number; // 2x, 3x, etc (scaled by 100)
  borrowedUSDC: string; // Aave debt (6 decimals)
  suppliedLINK: string; // Total LINK in Aave (18 decimals)
  entryPrice: string; // LINK price at entry (8 decimals)
  preAuthAmount: string; // Card hold amount (6 decimals)
  openTimestamp: number;
  preAuthExpiryTime: number; // When to charge pre-auth (PAYMENT ONLY - does NOT affect position)
  isActive: boolean; // Position can be traded/closed regardless of preAuth status
  preAuthCharged: boolean; // Track if pre-auth was charged (PAYMENT ONLY - does NOT affect position)
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
}

export interface Loan extends Position {
  // This interface extends Position for UI-specific data if needed,
  // adding fields that are not directly from the smart contract struct
  id: string; // A unique ID for the loan, perhaps derived from tx hash or a counter
  walletAddress: string;
  asset: string; // e.g., "LINK" or "USDC"
  status: "active" | "repaid" | "defaulted"; // UI-specific status
  createdAt: string; // UI-specific creation timestamp
  txHash?: string; // Transaction hash for opening the loan
  // Any other UI-specific fields can be added here
}

export interface PositionStats {
  collateralUSD: number;
  currentCollateralUSD: number;
  totalExposureLINK: number;
  totalExposureUSD: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  liquidationPrice: number;
  healthFactor: number;
  timeRemaining: number;
  isAtRisk: boolean;
}

export interface CreditSummary {
  totalCreditLimit: number;
  totalBorrowed: number;
  availableCredit: number;
  utilizationPercentage: number;
  activeLoans: number;
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
