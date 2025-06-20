import { ethers } from "ethers";
import { sepolia } from "viem/chains";
import { avalancheFuji } from "@/config/web3";

// Updated Contract ABI following CHANGES.md
export const CREDITSHAFT_ABI = [
  // Core functions
  "function borrowETH(uint256,uint256,string,string,string) external returns (uint256)",
  "function repayLoan(uint256) external payable", // UPDATED: Now requires loan ID
  "function addLiquidity() external payable",
  "function removeLiquidity(uint256) external",
  
  // New data functions for multiple loans
  "function getUserLoans(address) external view returns (uint256[])",
  "function getLoanDetails(uint256) external view returns (address,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool)",
  "function getActiveLoansForUser(address) external view returns (uint256[],uint256)",
  "function getRepayAmount(uint256) external view returns (uint256)", // UPDATED: Now requires loan ID
  "function hasActiveLoan(address) external view returns (bool)", // UPDATED: Now requires address
  "function getUserLPBalance(address) external view returns (uint256,uint256)", // UPDATED: Now requires address
  
  // Convenience functions for current user
  "function getMyLoans() external view returns (uint256[])",
  "function getMyActiveLoans() external view returns (uint256[],uint256)",
  "function getMyLPBalance() external view returns (uint256,uint256)",
  "function doIHaveActiveLoan() external view returns (bool)",
  
  // Pool stats (unchanged)
  "function getPoolStats() external view returns (uint256,uint256,uint256,uint256)",
  
  // Events
  "event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amountETH, uint256 preAuthUSD)",
  "event LoanRepaid(uint256 indexed loanId, uint256 amountRepaid, uint256 interest)",
  "event LiquidityAdded(address indexed provider, uint256 amount, uint256 shares)",
  "event LiquidityRemoved(address indexed provider, uint256 amount, uint256 shares)",
];

// Contract addresses - Update these with actual deployed addresses
export const CONTRACT_ADDRESSES = {
  [sepolia.id]: "0x6195fA01275b765e1Fc8ad59caADc718D733c2eA", // Deploy to Sepolia and update
  [avalancheFuji.id]: "0x0000000000000000000000000000000000000000", // Deploy to Avalanche Fuji and update
};

// Simplified contract instance getter
export const getContract = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Web3 provider not available");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const address = CONTRACT_ADDRESSES[sepolia.id]; // Use Sepolia by default

  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error("Contract not deployed");
  }

  return new ethers.Contract(address, CREDITSHAFT_ABI, signer);
};

// Simplified transaction functions following INTEGRATION.md patterns
export const borrowETH = async (params: {
  preAuthAmountUSD: number;
  preAuthDurationMinutes: number;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
}) => {
  try {
    const contract = getContract();
    const tx = await contract.borrowETH(
      params.preAuthAmountUSD,
      params.preAuthDurationMinutes,
      params.stripePaymentIntentId,
      params.stripeCustomerId,
      params.stripePaymentMethodId
    );
    return await tx.wait();
  } catch (error) {
    console.error("Error borrowing ETH:", error);
    throw error;
  }
};

// BREAKING CHANGE: repayLoan now requires loanId parameter
export const repayLoan = async (loanId: string) => {
  try {
    const contract = getContract();
    const loanIdBN = ethers.BigNumber.from(loanId);
    const repayAmount = await contract.getRepayAmount(loanIdBN);

    if (repayAmount.eq(0)) {
      throw new Error("No loan to repay or invalid loan ID");
    }

    // Step 1: Pay the blockchain loan with specific loan ID
    const tx = await contract.repayLoan(loanIdBN, {
      value: repayAmount,
    });
    const receipt = await tx.wait();
    
    // Step 2: Release Stripe hold
    try {
      const response = await fetch('/api/loans/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanId,
          reason: 'Loan repaid successfully'
        })
      });
      
      const releaseData = await response.json();
      if (!releaseData.success) {
        console.warn('Stripe release failed:', releaseData.error);
        // Don't throw error - blockchain repayment succeeded
      }
    } catch (releaseError) {
      console.warn('Failed to release Stripe hold:', releaseError);
      // Don't throw error - blockchain repayment succeeded
    }
    
    return receipt;
  } catch (error) {
    console.error("Error repaying loan:", error);
    throw error;
  }
};

// New function to get user's loans
export const getUserLoans = async (userAddress: string): Promise<string[]> => {
  try {
    const contract = getContract();
    const loanIds = await contract.getUserLoans(userAddress);
    return loanIds.map((id: ethers.BigNumber) => id.toString());
  } catch (error) {
    console.error("Error getting user loans:", error);
    throw error;
  }
};

// New function to get loan details
export const getLoanDetails = async (loanId: string) => {
  try {
    const contract = getContract();
    const loanIdBN = ethers.BigNumber.from(loanId);
    const details = await contract.getLoanDetails(loanIdBN);
    
    return {
      borrower: details[0],
      borrowedETH: details[1],
      preAuthAmountUSD: details[2],
      currentInterest: details[3],
      totalRepayAmount: details[4],
      createdAt: details[5],
      preAuthExpiry: details[6],
      isActive: details[7],
      isExpired: details[8]
    };
  } catch (error) {
    console.error("Error getting loan details:", error);
    throw error;
  }
};

// New function to get active loans for user
export const getActiveLoansForUser = async (userAddress: string) => {
  try {
    const contract = getContract();
    const [activeLoans, count] = await contract.getActiveLoansForUser(userAddress);
    return {
      activeLoans: activeLoans.map((id: ethers.BigNumber) => id.toString()),
      count: count.toNumber()
    };
  } catch (error) {
    console.error("Error getting active loans:", error);
    throw error;
  }
};

export const addLiquidity = async (ethAmount: string) => {
  try {
    const contract = getContract();
    const tx = await contract.addLiquidity({
      value: ethers.utils.parseEther(ethAmount),
    });
    return await tx.wait();
  } catch (error) {
    console.error("Error adding liquidity:", error);
    throw error;
  }
};

export const removeLiquidity = async (shares: string) => {
  try {
    const contract = getContract();
    const tx = await contract.removeLiquidity(ethers.utils.parseEther(shares));
    return await tx.wait();
  } catch (error) {
    console.error("Error removing liquidity:", error);
    throw error;
  }
};

// New function to get user LP balance (replaces getMyLPBalance for specific user)
export const getUserLPBalance = async (userAddress: string) => {
  try {
    const contract = getContract();
    const [shares, value] = await contract.getUserLPBalance(userAddress);
    return {
      shares: ethers.utils.formatEther(shares),
      value: ethers.utils.formatEther(value)
    };
  } catch (error) {
    console.error("Error getting LP balance:", error);
    throw error;
  }
};

// Function to check if user has active loan (requires address now)
export const hasActiveLoan = async (userAddress: string): Promise<boolean> => {
  try {
    const contract = getContract();
    return await contract.hasActiveLoan(userAddress);
  } catch (error) {
    console.error("Error checking active loan:", error);
    return false;
  }
};

// Convenience function for current user (backward compatibility)
export const getMyLPBalance = async () => {
  try {
    const contract = getContract();
    const [shares, value] = await contract.getMyLPBalance();
    return {
      shares: ethers.utils.formatEther(shares),
      value: ethers.utils.formatEther(value)
    };
  } catch (error) {
    console.error("Error getting my LP balance:", error);
    throw error;
  }
};

// Convenience function for current user loan check
export const doIHaveActiveLoan = async (): Promise<boolean> => {
  try {
    const contract = getContract();
    return await contract.doIHaveActiveLoan();
  } catch (error) {
    console.error("Error checking my active loan:", error);
    return false;
  }
};

// Get current user's loans
export const getMyLoans = async (): Promise<string[]> => {
  try {
    const contract = getContract();
    const loanIds = await contract.getMyLoans();
    return loanIds.map((id: ethers.BigNumber) => id.toString());
  } catch (error) {
    console.error("Error getting my loans:", error);
    throw error;
  }
};

// Get current user's active loans
export const getMyActiveLoans = async () => {
  try {
    const contract = getContract();
    const [activeLoans, count] = await contract.getMyActiveLoans();
    return {
      activeLoans: activeLoans.map((id: ethers.BigNumber) => id.toString()),
      count: count.toNumber()
    };
  } catch (error) {
    console.error("Error getting my active loans:", error);
    throw error;
  }
};

// Simplified error handling following INTEGRATION.md
export const getErrorMessage = (error: unknown): string => {
  const message = (error as Error)?.message || String(error) || "";

  if (message.includes("No loans found")) {
    return "You don't have any active loans";
  }
  if (message.includes("No outstanding loan")) {
    return "No loan found to repay";
  }
  if (message.includes("Invalid loan ID")) {
    return "Invalid loan ID provided";
  }
  if (message.includes("Loan not found")) {
    return "Loan not found or already repaid";
  }
  if (message.includes("Not loan owner")) {
    return "You can only repay your own loans";
  }
  if (message.includes("Insufficient payment")) {
    return "Please send the exact repayment amount";
  }
  if (message.includes("Insufficient liquidity")) {
    return "Not enough liquidity available in the pool";
  }
  if (message.includes("user rejected")) {
    return "Transaction was cancelled";
  }
  if (message.includes("Contract not deployed")) {
    return "Contract not deployed on this network";
  }

  return "Transaction failed. Please try again.";
};
