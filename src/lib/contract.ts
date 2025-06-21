import { ethers } from "ethers";
import { sepolia } from "viem/chains";
import { avalancheFuji } from "@/config/web3";

// Updated Contract ABI following CHANGES.md - Size Optimized (Convenience Functions Removed)
export const CREDITSHAFT_ABI = [
  // Core functions
  "function borrowETH(uint256,uint256,string,string,string) external returns (uint256)",
  "function repayLoan(uint256) external payable", // UPDATED: Now requires loan ID
  "function addLiquidity() external payable",
  "function removeLiquidity(uint256) external",

  // Data functions (convenience functions removed for size optimization)
  "function getUserLoans(address) external view returns (uint256[])",
  "function getLoanDetails(uint256) external view returns (address,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool)",
  "function getActiveLoansForUser(address) external view returns (uint256[],uint256)",
  "function getRepayAmount(uint256) external view returns (uint256)", // UPDATED: Now requires loan ID
  "function hasActiveLoan(address) external view returns (bool)", // UPDATED: Now requires address
  "function getUserLPBalance(address) external view returns (uint256,uint256)", // UPDATED: Now requires address

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
  [sepolia.id]: "0x5552aa97EB0BF5CA7baAe6485E96a4f387d52418", // Deploy to Sepolia and update
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

// Get pool statistics for liquidity checking
export const getPoolStats = async () => {
  try {
    // Log blockchain query input
    console.log("🔗 BLOCKCHAIN QUERY INPUT:", {
      function: "getPoolStats",
      timestamp: new Date().toISOString()
    });

    const contract = getContract();
    const [totalLiq, totalBorr, available, utilization] =
      await contract.getPoolStats();
    
    const result = {
      totalLiquidity: totalLiq,
      totalBorrowed: totalBorr,
      availableLiquidity: available,
      utilization: utilization,
    };

    // Log blockchain query output
    console.log("🔗 BLOCKCHAIN QUERY OUTPUT:", {
      function: "getPoolStats",
      totalLiquidityWei: totalLiq.toString(),
      totalBorrowedWei: totalBorr.toString(),
      availableLiquidityWei: available.toString(),
      utilizationPercent: utilization.toString(),
      totalLiquidityETH: ethers.utils.formatEther(totalLiq),
      totalBorrowedETH: ethers.utils.formatEther(totalBorr),
      availableLiquidityETH: ethers.utils.formatEther(available),
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN QUERY ERROR:", {
      function: "getPoolStats",
      error: error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
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

    // Debug logging to help troubleshoot liquidity issues
    console.log("BorrowETH called with parameters:", {
      preAuthAmountUSD: params.preAuthAmountUSD,
      preAuthDurationMinutes: params.preAuthDurationMinutes,
      stripePaymentIntentId:
        params.stripePaymentIntentId?.substring(0, 20) + "...",
      stripeCustomerId: params.stripeCustomerId?.substring(0, 20) + "...",
      stripePaymentMethodId:
        params.stripePaymentMethodId?.substring(0, 20) + "...",
    });

    // Check pool liquidity before attempting to borrow
    try {
      const poolStats = await getPoolStats();
      console.log("Pool stats before borrowing:", {
        availableLiquidity: ethers.utils.formatEther(
          poolStats.availableLiquidity
        ),
        totalLiquidity: ethers.utils.formatEther(poolStats.totalLiquidity),
        totalBorrowed: ethers.utils.formatEther(poolStats.totalBorrowed),
        utilization: poolStats.utilization.toString(),
      });

      // Estimate ETH to borrow (similar to contract calculation)
      // This is just for logging - the contract will do the actual calculation
      const ethPrice = 3500; // Approximate for logging purposes
      const ltv = 50; // Contract uses 50% LTV
      const estimatedEthToBorrow =
        (params.preAuthAmountUSD * ltv) / (ethPrice * 100);
      console.log("Estimated borrow calculation:", {
        preAuthAmountUSD: params.preAuthAmountUSD,
        ltv,
        ethPrice,
        estimatedEthToBorrow: estimatedEthToBorrow.toFixed(6),
        availableLiquidityETH: ethers.utils.formatEther(
          poolStats.availableLiquidity
        ),
      });
    } catch (poolError) {
      console.warn("Could not check pool stats before borrowing:", poolError);
      // Continue with borrowing attempt anyway
    }

    // Log blockchain transaction input data
    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "borrowETH",
      preAuthAmountUSD: params.preAuthAmountUSD,
      preAuthDurationMinutes: params.preAuthDurationMinutes,
      stripePaymentIntentId: params.stripePaymentIntentId,
      stripeCustomerId: params.stripeCustomerId,
      stripePaymentMethodId: params.stripePaymentMethodId,
      timestamp: new Date().toISOString()
    });

    const tx = await contract.borrowETH(
      params.preAuthAmountUSD,
      params.preAuthDurationMinutes,
      params.stripePaymentIntentId,
      params.stripeCustomerId,
      params.stripePaymentMethodId
    );

    // Log transaction object
    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString()
    });

    const receipt = await tx.wait();

    // Log transaction receipt
    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0
    });

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "borrowETH",
      parameters: {
        preAuthAmountUSD: params.preAuthAmountUSD,
        preAuthDurationMinutes: params.preAuthDurationMinutes,
        stripePaymentIntentId: params.stripePaymentIntentId?.substring(0, 20) + "...",
        stripeCustomerId: params.stripeCustomerId?.substring(0, 20) + "...",
        stripePaymentMethodId: params.stripePaymentMethodId?.substring(0, 20) + "...",
      },
      error: error,
      timestamp: new Date().toISOString()
    });
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

    // Log blockchain transaction input data
    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "repayLoan",
      loanId: loanId,
      loanIdBN: loanIdBN.toString(),
      repayAmount: repayAmount.toString(),
      timestamp: new Date().toISOString()
    });

    // Step 1: Pay the blockchain loan with specific loan ID
    const tx = await contract.repayLoan(loanIdBN, {
      value: repayAmount,
    });

    // Log transaction object
    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString()
    });

    const receipt = await tx.wait();

    // Log transaction receipt
    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0
    });

    // Note: Stripe hold release is handled by Chainlink Functions automatically
    console.log("ℹ️ Stripe hold release will be handled by Chainlink Functions");

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "repayLoan",
      parameters: {
        loanId: loanId,
        loanIdBN: ethers.BigNumber.from(loanId).toString()
      },
      error: error,
      timestamp: new Date().toISOString()
    });
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
      isExpired: details[8],
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
    const [activeLoans, count] = await contract.getActiveLoansForUser(
      userAddress
    );
    return {
      activeLoans: activeLoans.map((id: ethers.BigNumber) => id.toString()),
      count: count.toNumber(),
    };
  } catch (error) {
    console.error("Error getting active loans:", error);
    throw error;
  }
};

export const addLiquidity = async (ethAmount: string) => {
  try {
    const contract = getContract();
    const valueWei = ethers.utils.parseEther(ethAmount);

    // Log blockchain transaction input data
    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "addLiquidity",
      ethAmount: ethAmount,
      valueWei: valueWei.toString(),
      timestamp: new Date().toISOString()
    });

    const tx = await contract.addLiquidity({
      value: valueWei,
    });

    // Log transaction object
    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString()
    });

    const receipt = await tx.wait();

    // Log transaction receipt
    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0
    });

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "addLiquidity",
      parameters: {
        ethAmount: ethAmount,
        valueWei: ethers.utils.parseEther(ethAmount).toString()
      },
      error: error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const removeLiquidity = async (shares: string) => {
  try {
    const contract = getContract();
    const sharesWei = ethers.utils.parseEther(shares);

    // Log blockchain transaction input data
    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "removeLiquidity",
      shares: shares,
      sharesWei: sharesWei.toString(),
      timestamp: new Date().toISOString()
    });

    const tx = await contract.removeLiquidity(sharesWei);

    // Log transaction object
    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString()
    });

    const receipt = await tx.wait();

    // Log transaction receipt
    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0
    });

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "removeLiquidity",
      parameters: {
        shares: shares,
        sharesWei: ethers.utils.parseEther(shares).toString()
      },
      error: error,
      timestamp: new Date().toISOString()
    });
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
      value: ethers.utils.formatEther(value),
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

// NOTE: Convenience functions (getMyLoans, getMyActiveLoans, getMyLPBalance, doIHaveActiveLoan)
// have been REMOVED from the smart contract for size optimization.
// Use the address-based functions above with userAddress parameter instead.

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
