import { ethers } from "ethers";
import { sepolia } from "viem/chains";
import { avalancheFuji } from "@/config/web3";

// Updated Contract ABI following CHANGES.md - Size Optimized (Convenience Functions Removed)
export const CREDITSHAFT_ABI = [
  // Core functions
  "function openLeveragePosition(uint256 leverageRatio, uint256 collateralLINK, uint256 expiryTime, string stripePaymentIntentId, string stripeCustomerId, string stripePaymentMethodId) external",
  "function closeLeveragePosition() external", // New function for closing position
  "function addLiquidity() external payable",
  "function removeLiquidity(uint256) external",

  // Data functions
  "function positions(address user) external view returns (uint256 collateralLINK, uint256 leverageRatio, uint256 borrowedUSDC, uint256 suppliedLINK, uint256 entryPrice, uint256 preAuthAmount, uint256 openTimestamp, uint256 preAuthExpiryTime, bool isActive, bool preAuthCharged, string stripePaymentIntentId, string stripeCustomerId, string stripePaymentMethodId)",
  "function isReadyForPreAuthCharge(address user) external view returns (bool)",
  "function getLINKPrice() external view returns (uint256)",
  "function getPoolStats() external view returns (uint256,uint256,uint256,uint256)",
  "function getUserLPBalance(address) external view returns (uint256,uint256)",

  // Events
  "event PositionOpened(address indexed user, uint256 leverage, uint256 collateral, uint256 totalExposure)",
  "event PositionClosed(address indexed user, uint256 profit, uint256 lpShare)",
  "event PreAuthCharged(address indexed user, uint256 amount)",
  "event LiquidityAdded(address indexed provider, uint256 amount, uint256 shares)",
  "event LiquidityRemoved(address indexed provider, uint256 amount, uint256 shares)",
];

// Contract addresses - Update these with actual deployed addresses
export const CONTRACT_ADDRESSES = {
  [sepolia.id]: process.env.NEXT_PUBLIC_CREDIT_SHAFT_LEVERAGE || "0x348D1f1ae7268C41D4480b191f65F6D9A3085B75", // New CreditShaftLeverage address
  [avalancheFuji.id]: process.env.NEXT_PUBLIC_CREDIT_SHAFT_LEVERAGE || "0x0000000000000000000000000000000000000000", // Default fallback
};

export const LINK_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_LINK_TOKEN || "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5";


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
export const openLeveragePosition = async (params: {
  leverageRatio: number;
  collateralLINK: string; // Amount in LINK (as string, will be parsed to BigNumber)
  expiryDuration: number; // In minutes, converted to seconds for contract
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  stripePaymentMethodId: string;
}) => {
  try {
    const contract = getContract();
    const signer = contract.signer; // Get the signer from the contract instance

    // Convert collateralLINK to BigNumber (18 decimals)
    const collateralLINKWei = ethers.utils.parseUnits(params.collateralLINK, 18);

    // Calculate expiryTime in seconds (from minutes)
    const expiryTimeSeconds = Math.floor(Date.now() / 1000) + (params.expiryDuration * 60);

    // Log blockchain transaction input data
    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "openLeveragePosition",
      leverageRatio: params.leverageRatio,
      collateralLINK: params.collateralLINK,
      collateralLINKWei: collateralLINKWei.toString(),
      expiryDurationMinutes: params.expiryDuration,
      expiryTimeSeconds: expiryTimeSeconds,
      stripePaymentIntentId: params.stripePaymentIntentId,
      stripeCustomerId: params.stripeCustomerId,
      stripePaymentMethodId: params.stripePaymentMethodId,
      timestamp: new Date().toISOString()
    });

    // Check and approve LINK tokens to the contract if necessary
    const linkTokenAddress = "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5"; // From Integration.md
    const linkContract = new ethers.Contract(
      linkTokenAddress, 
      [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)"
      ], 
      signer
    );

    // Check current allowance
    const currentAllowance = await linkContract.allowance(await signer.getAddress(), contract.address);
    console.log(`Current LINK allowance: ${ethers.utils.formatEther(currentAllowance)} LINK`);
    console.log(`Required LINK amount: ${params.collateralLINK} LINK`);

    // Only approve if current allowance is insufficient
    if (currentAllowance.lt(collateralLINKWei)) {
      console.log(`Insufficient allowance. Approving ${params.collateralLINK} LINK for CreditShaftLeverage contract...`);
      const approveTx = await linkContract.approve(contract.address, collateralLINKWei);
      await approveTx.wait();
      console.log("LINK approval successful:", approveTx.hash);
    } else {
      console.log("Sufficient allowance already exists. Skipping approval.");
    }

    const tx = await contract.openLeveragePosition(
      params.leverageRatio,
      collateralLINKWei,
      expiryTimeSeconds,
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
      function: "openLeveragePosition",
      parameters: {
        leverageRatio: params.leverageRatio,
        collateralLINK: params.collateralLINK,
        expiryDurationMinutes: params.expiryDuration,
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

export const closeLeveragePosition = async () => {
  try {
    const contract = getContract();
    const userAddress = await contract.signer.getAddress();

    // Get position details before closing to retrieve Stripe payment intent ID
    const position = await contract.positions(userAddress);
    const stripePaymentIntentId = position[10]; // stripePaymentIntentId is at index 10

    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "closeLeveragePosition",
      stripePaymentIntentId: stripePaymentIntentId?.substring(0, 20) + "...",
      timestamp: new Date().toISOString()
    });

    const tx = await contract.closeLeveragePosition();

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

    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0
    });

    // After successful blockchain transaction, cancel Stripe pre-authorization
    if (stripePaymentIntentId && stripePaymentIntentId !== "") {
      try {
        console.log("📱 CANCELLING STRIPE PRE-AUTHORIZATION:", stripePaymentIntentId);
        
        const cancelResponse = await fetch("/api/stripe/cancel-preauth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: stripePaymentIntentId,
          }),
        });

        const cancelData = await cancelResponse.json();
        
        if (cancelData.success) {
          console.log("📱 STRIPE PRE-AUTHORIZATION CANCELLED SUCCESSFULLY:", {
            paymentIntentId: cancelData.paymentIntent.id,
            status: cancelData.paymentIntent.status,
          });
        } else {
          console.error("📱 STRIPE CANCELLATION FAILED:", cancelData.error);
          // Don't throw error - blockchain transaction was successful
        }
      } catch (stripeError) {
        console.error("📱 STRIPE CANCELLATION ERROR:", stripeError);
        // Don't throw error - blockchain transaction was successful
      }
    } else {
      console.log("📱 NO STRIPE PAYMENT INTENT ID FOUND - SKIPPING CANCELLATION");
    }

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "closeLeveragePosition",
      error: error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
};

export const getPositionDetails = async (userAddress: string) => {
  try {
    const contract = getContract();
    const position = await contract.positions(userAddress);

    // Map the array result to the Position interface
    return {
      collateralLINK: position[0].toString(),
      leverageRatio: position[1].toNumber(),
      borrowedUSDC: position[2].toString(),
      suppliedLINK: position[3].toString(),
      entryPrice: position[4].toString(),
      preAuthAmount: position[5].toString(),
      openTimestamp: position[6].toNumber(),
      preAuthExpiryTime: position[7].toNumber(),
      isActive: position[8],
      preAuthCharged: position[9],
      stripePaymentIntentId: position[10],
      stripeCustomerId: position[11],
      stripePaymentMethodId: position[12],
    };
  } catch (error) {
    console.error("Error getting position details:", error);
    throw error;
  }
};

export const getLINKPrice = async (): Promise<string> => {
  try {
    const contract = getContract();
    const price = await contract.getLINKPrice();
    return price.toString(); // Return as string to handle large numbers
  } catch (error) {
    console.error("Error getting LINK price:", error);
    throw error;
  }
};

// Helper to convert amount to Stripe cents (integer)
export const toStripeCents = (amount: number): number => {
  return Math.floor(amount * 100); // Stripe amounts are in cents
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
