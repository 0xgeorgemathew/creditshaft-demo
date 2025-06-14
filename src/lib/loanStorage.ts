/* eslint-disable no-var */
// src/lib/loanStorage.ts
import { Loan, CreditSummary, PreAuthData } from "@/types";

// In-memory storage for demo purposes
// This will be replaced with blockchain data in production
class LoanStorage {
  private loans: Map<string, Loan> = new Map();
  private walletLoans: Map<string, string[]> = new Map();
  private preAuthData: Map<string, PreAuthData> = new Map(); // Store pre-auth by wallet address

  // Create a new loan
  createLoan(loan: Loan): void {
    this.loans.set(loan.id, loan);

    // Track loans by wallet
    const walletLoans = this.walletLoans.get(loan.walletAddress) || [];
    walletLoans.push(loan.id);
    this.walletLoans.set(loan.walletAddress, walletLoans);

  }

  // Get loan by ID
  getLoan(loanId: string): Loan | undefined {
    return this.loans.get(loanId);
  }

  // Get all loans for a wallet
  getWalletLoans(walletAddress: string): Loan[] {
    const loanIds = this.walletLoans.get(walletAddress) || [];
    const loans = loanIds
      .map((id) => this.loans.get(id))
      .filter((loan): loan is Loan => loan !== undefined)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return loans;
  }

  // Update loan status
  updateLoan(loanId: string, updates: Partial<Loan>): boolean {
    const loan = this.loans.get(loanId);
    if (!loan) {
      return false;
    }

    const updatedLoan = { ...loan, ...updates };
    this.loans.set(loanId, updatedLoan);

    return true;
  }

  // Calculate credit summary for a wallet
  getCreditSummary(walletAddress: string): CreditSummary {
    const loans = this.getWalletLoans(walletAddress);

    if (loans.length === 0) {
      return {
        totalCreditLimit: 0,
        totalBorrowed: 0,
        totalCharged: 0,
        totalReleased: 0,
        availableCredit: 0,
        utilizationPercentage: 0,
        activeLoans: 0,
      };
    }

    // Use the most recent loan's credit limit as the total
    // In production, this would be fetched from Stripe or stored separately
    const totalCreditLimit = loans[0]?.originalCreditLimit || 0;

    const activeLoans = loans.filter((loan) => loan.status === "active");
    const chargedLoans = loans.filter((loan) => loan.status === "charged");
    const releasedLoans = loans.filter((loan) => loan.status === "released");

    const totalBorrowed = activeLoans.reduce(
      (sum, loan) => sum + loan.borrowAmount,
      0
    );
    const totalCharged = chargedLoans.reduce(
      (sum, loan) => sum + (loan.actualChargedAmount || loan.preAuthAmount),
      0
    );
    const totalReleased = releasedLoans.reduce(
      (sum, loan) => sum + loan.borrowAmount,
      0
    );

    // Available credit = total limit - currently pre-authorized amounts
    const currentPreAuths = activeLoans.reduce(
      (sum, loan) => sum + loan.preAuthAmount,
      0
    );
    const availableCredit = Math.max(0, totalCreditLimit - currentPreAuths);

    const utilizationPercentage =
      totalCreditLimit > 0 ? (currentPreAuths / totalCreditLimit) * 100 : 0;

    const summary = {
      totalCreditLimit,
      totalBorrowed,
      totalCharged,
      totalReleased,
      availableCredit,
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
      activeLoans: activeLoans.length,
    };

    return summary;
  }

  // Get all loans (for admin purposes)
  getAllLoans(): Loan[] {
    return Array.from(this.loans.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Clear all loans (for testing)
  clearAllLoans(): void {
    this.loans.clear();
    this.walletLoans.clear();
  }

  // Get storage stats
  getStats() {
    return {
      totalLoans: this.loans.size,
      totalWallets: this.walletLoans.size,
      loansPerWallet: Array.from(this.walletLoans.values()).map(
        (loans) => loans.length
      ),
    };
  }

  // Pre-auth data management
  storePreAuthData(walletAddress: string, preAuth: PreAuthData): void {
    this.preAuthData.set(walletAddress, preAuth);
  }

  getPreAuthData(walletAddress: string): PreAuthData | undefined {
    return this.preAuthData.get(walletAddress);
  }

  hasPreAuthData(walletAddress: string): boolean {
    return this.preAuthData.has(walletAddress);
  }


  // Get debug info about storage state
  getDebugInfo(): { totalLoans: number; allLoanIds: string[] } {
    return {
      totalLoans: this.loans.size,
      allLoanIds: Array.from(this.loans.keys()),
    };
  }
}

// Global singleton pattern for Next.js development mode
declare global {
  var __loanStorage: LoanStorage | undefined;
}

// Export singleton instance that persists across Next.js hot reloads
export const loanStorage = globalThis.__loanStorage ?? new LoanStorage();

if (process.env.NODE_ENV === "development") {
  globalThis.__loanStorage = loanStorage;
}

// Utility functions for loan management
export const generateLoanId = (): string => {
  return "loan_" + Math.random().toString(36).substring(2, 11);
};

export const calculateLoanInterest = (
  principal: number,
  rate: number,
  days: number
): number => {
  // Simple interest calculation: P * R * T / 365
  return (principal * (rate / 100) * days) / 365;
};

export const calculateHealthFactor = (
  borrowAmount: number,
  collateralValue: number
): number => {
  // Health factor = collateral value / borrow amount
  // Higher is better, < 1.0 means undercollateralized
  return collateralValue > 0 ? collateralValue / borrowAmount : 0;
};
