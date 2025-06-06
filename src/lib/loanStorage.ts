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

    console.log(
      `[LOAN-STORAGE] ✅ Created loan ${loan.id} for wallet ${loan.walletAddress}`
    );
    console.log(`[LOAN-STORAGE] 📊 Total loans: ${this.loans.size}`);
    console.log(
      `[LOAN-STORAGE] 🏠 Wallet ${loan.walletAddress} now has ${walletLoans.length} loans`
    );

    // Debug: Log current state
    this.debugCurrentState();
  }

  // Get loan by ID
  getLoan(loanId: string): Loan | undefined {
    const loan = this.loans.get(loanId);
    console.log(
      `[LOAN-STORAGE] 🔍 Getting loan ${loanId}: ${
        loan ? "found" : "not found"
      }`
    );
    return loan;
  }

  // Get all loans for a wallet
  getWalletLoans(walletAddress: string): Loan[] {
    console.log(`[LOAN-STORAGE] 📋 Getting loans for wallet: ${walletAddress}`);

    const loanIds = this.walletLoans.get(walletAddress) || [];
    console.log(
      `[LOAN-STORAGE] 🔢 Found ${loanIds.length} loan IDs for wallet`
    );

    const loans = loanIds
      .map((id) => {
        const loan = this.loans.get(id);
        console.log(
          `[LOAN-STORAGE] 🔍 Mapping loan ID ${id}: ${
            loan ? "found" : "missing"
          }`
        );
        return loan;
      })
      .filter((loan): loan is Loan => {
        const exists = loan !== undefined;
        if (!exists) {
          console.log(`[LOAN-STORAGE] ⚠️ Filtered out undefined loan`);
        }
        return exists;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    console.log(
      `[LOAN-STORAGE] ✅ Returning ${loans.length} loans for wallet ${walletAddress}`
    );

    // Log each loan for debugging
    loans.forEach((loan, index) => {
      console.log(
        `[LOAN-STORAGE] 📄 Loan ${index + 1}: ${loan.id} - ${
          loan.borrowAmount
        } ${loan.asset} - ${loan.status}`
      );
    });

    return loans;
  }

  // Update loan status
  updateLoan(loanId: string, updates: Partial<Loan>): boolean {
    const loan = this.loans.get(loanId);
    if (!loan) {
      console.log(`[LOAN-STORAGE] ❌ Cannot update loan ${loanId}: not found`);
      return false;
    }

    const updatedLoan = { ...loan, ...updates };
    this.loans.set(loanId, updatedLoan);

    console.log(`[LOAN-STORAGE] ✅ Updated loan ${loanId}:`, updates);
    return true;
  }

  // Calculate credit summary for a wallet
  getCreditSummary(walletAddress: string): CreditSummary {
    console.log(
      `[LOAN-STORAGE] 📊 Calculating credit summary for wallet: ${walletAddress}`
    );

    const loans = this.getWalletLoans(walletAddress);
    console.log(
      `[LOAN-STORAGE] 📋 Using ${loans.length} loans for credit summary`
    );

    if (loans.length === 0) {
      console.log(`[LOAN-STORAGE] 🆕 No loans found, returning zero summary`);
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
    console.log(`[LOAN-STORAGE] 💳 Total credit limit: ${totalCreditLimit}`);

    const activeLoans = loans.filter((loan) => loan.status === "active");
    const chargedLoans = loans.filter((loan) => loan.status === "charged");
    const releasedLoans = loans.filter((loan) => loan.status === "released");

    console.log(
      `[LOAN-STORAGE] 📈 Loan breakdown: ${activeLoans.length} active, ${chargedLoans.length} charged, ${releasedLoans.length} released`
    );

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

    console.log(`[LOAN-STORAGE] 📊 Credit summary calculated:`, summary);
    return summary;
  }

  // Get all loans (for admin purposes)
  getAllLoans(): Loan[] {
    const allLoans = Array.from(this.loans.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    console.log(
      `[LOAN-STORAGE] 📋 Getting all loans: ${allLoans.length} total`
    );
    return allLoans;
  }

  // Clear all loans (for testing)
  clearAllLoans(): void {
    this.loans.clear();
    this.walletLoans.clear();
    console.log("[LOAN-STORAGE] 🗑️ Cleared all loans");
  }

  // Get storage stats
  getStats() {
    const stats = {
      totalLoans: this.loans.size,
      totalWallets: this.walletLoans.size,
      loansPerWallet: Array.from(this.walletLoans.values()).map(
        (loans) => loans.length
      ),
    };
    console.log("[LOAN-STORAGE] 📊 Storage stats:", stats);
    return stats;
  }

  // Pre-auth data management
  storePreAuthData(walletAddress: string, preAuth: PreAuthData): void {
    this.preAuthData.set(walletAddress, preAuth);
    console.log(`[LOAN-STORAGE] 💳 Stored pre-auth data for wallet ${walletAddress}`);
  }

  getPreAuthData(walletAddress: string): PreAuthData | undefined {
    const preAuth = this.preAuthData.get(walletAddress);
    console.log(`[LOAN-STORAGE] 🔍 Getting pre-auth for wallet ${walletAddress}: ${preAuth ? "found" : "not found"}`);
    return preAuth;
  }

  hasPreAuthData(walletAddress: string): boolean {
    return this.preAuthData.has(walletAddress);
  }

  // Debug current state
  debugCurrentState(): void {
    console.log("[LOAN-STORAGE] 🔍 === CURRENT STATE DEBUG ===");
    console.log(`[LOAN-STORAGE] 📊 Total loans in storage: ${this.loans.size}`);
    console.log(
      `[LOAN-STORAGE] 🏠 Total wallets tracked: ${this.walletLoans.size}`
    );
    console.log(
      `[LOAN-STORAGE] 💳 Total pre-auths stored: ${this.preAuthData.size}`
    );

    // List all wallets and their loan counts
    for (const [wallet, loanIds] of this.walletLoans.entries()) {
      console.log(
        `[LOAN-STORAGE] 🏠 Wallet ${wallet}: ${loanIds.length} loans`
      );
      loanIds.forEach((loanId, index) => {
        const loan = this.loans.get(loanId);
        console.log(
          `[LOAN-STORAGE]   ${index + 1}. ${loanId} - ${
            loan
              ? `${loan.borrowAmount} ${loan.asset} (${loan.status})`
              : "MISSING"
          }`
        );
      });
    }

    // List pre-auth data
    for (const [wallet, preAuth] of this.preAuthData.entries()) {
      console.log(
        `[LOAN-STORAGE] 💳 Wallet ${wallet}: ${preAuth.available_credit} credit limit, ${preAuth.card_brand} ending in ${preAuth.card_last_four}`
      );
    }

    console.log("[LOAN-STORAGE] 🔍 === END STATE DEBUG ===");
  }

  // Get debug info about storage state
  getDebugInfo(): { totalLoans: number; allLoanIds: string[] } {
    return {
      totalLoans: this.loans.size,
      allLoanIds: Array.from(this.loans.keys())
    };
  }
}

// Global singleton pattern for Next.js development mode
declare global {
  var __loanStorage: LoanStorage | undefined;
}

// Export singleton instance that persists across Next.js hot reloads
export const loanStorage = globalThis.__loanStorage ?? new LoanStorage();

if (process.env.NODE_ENV === 'development') {
  globalThis.__loanStorage = loanStorage;
}

// Utility functions for loan management
export const generateLoanId = (): string => {
  const id = "loan_" + Math.random().toString(36).substring(2, 11);
  console.log(`[LOAN-STORAGE] 🆔 Generated loan ID: ${id}`);
  return id;
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
