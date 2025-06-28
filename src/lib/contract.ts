import { ethers } from "ethers";
import { sepolia } from "viem/chains";
import { avalancheFuji } from "@/config/web3";
import { getGasSettings, formatGasSettings, retryWithIncreasedGas, isGasError } from "./gasUtils";

// CreditShaftCore ABI for USDC liquidity operations
export const CREDITSHAFT_CORE_ABI = [
  // USDC Liquidity functions
  "function addUSDCLiquidity(uint256 amount) external",
  "function removeUSDCLiquidity(uint256 lpTokenAmount) external",
  "function getAvailableUSDCLiquidity() external view returns (uint256)",
  "function getTotalUSDCLiquidity() external view returns (uint256)",
  "function totalUSDCLiquidity() external view returns (uint256)",
  "function totalFlashLoanFees() external view returns (uint256)",
  
  // Token contract addresses
  "function usdc() external view returns (address)",
  "function lpToken() external view returns (address)",
  
  // Events
  "event USDCLiquidityProvided(address indexed lp, uint256 amount)",
  "event USDCLiquidityWithdrawn(address indexed lp, uint256 amount)",
];

// USDC Token ABI
export const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function transfer(address to, uint256 amount) external returns (bool)",
];

// SimplifiedLPToken ABI
export const LP_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

// Updated Contract ABI following CHANGES.md - Size Optimized (Convenience Functions Removed)
export const CREDITSHAFT_ABI = [
  // Core functions
  "function openLeveragePosition(uint256 leverageRatio, uint256 collateralLINK, uint256 expiryTime, string stripePaymentIntentId, string stripeCustomerId, string stripePaymentMethodId) external",
  "function closeLeveragePosition() external", // New function for closing position
  "function borrowMoreUSDC(uint256 additionalAmount) external", // Testing function to make position unsafe
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
  [sepolia.id]:
    process.env.NEXT_PUBLIC_CREDIT_SHAFT_LEVERAGE ||
    "0xCDeB461C501aDE6b384520D27a5A4F34C41aE512", // New CreditShaftLeverage address
  [avalancheFuji.id]:
    process.env.NEXT_PUBLIC_CREDIT_SHAFT_LEVERAGE ||
    "0x0000000000000000000000000000000000000000", // Default fallback
};

// CreditShaftCore addresses for USDC liquidity
export const CREDITSHAFT_CORE_ADDRESSES = {
  [sepolia.id]:
    process.env.NEXT_PUBLIC_CREDIT_SHAFT_CORE ||
    "0x616d95839a1bD4963bBe9cE54f516bd5DfE47E01",
  [avalancheFuji.id]:
    process.env.NEXT_PUBLIC_CREDIT_SHAFT_CORE ||
    "0x0000000000000000000000000000000000000000", // Default fallback
};

// USDC Token addresses
export const USDC_ADDRESSES = {
  [sepolia.id]:
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  [avalancheFuji.id]:
    process.env.NEXT_PUBLIC_USDC_ADDRESS ||
    "0x0000000000000000000000000000000000000000", // Default fallback
};

// SimplifiedLPToken addresses
export const LP_TOKEN_ADDRESSES = {
  [sepolia.id]:
    process.env.NEXT_PUBLIC_SIMPLIFIED_LP_TOKEN ||
    "0xA45F77831dbc29C04D2A9a197e80b5dFD67B055f",
  [avalancheFuji.id]:
    process.env.NEXT_PUBLIC_SIMPLIFIED_LP_TOKEN ||
    "0x0000000000000000000000000000000000000000", // Default fallback
};

export const LINK_TOKEN_ADDRESS =
  process.env.NEXT_PUBLIC_LINK_TOKEN ||
  "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5";

// Faucet contract address
export const FAUCET_ADDRESS = "0xC959483DBa39aa9E78757139af0e9a2EDEb3f42D";

// Faucet ABI
export const FAUCET_ABI = [
  "function mint(address token, address to, uint256 amount) external returns (uint256)",
  "function isPermissioned() external view returns (bool)",
  "function isMintable(address asset) external view returns (bool)",
  "function MAX_MINT_AMOUNT() external view returns (uint256)"
];

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

// Get CreditShaftCore contract instance
export const getCreditShaftCoreContract = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Web3 provider not available");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const address = CREDITSHAFT_CORE_ADDRESSES[sepolia.id]; // Use Sepolia by default

  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error("CreditShaftCore contract not deployed");
  }

  return new ethers.Contract(address, CREDITSHAFT_CORE_ABI, signer);
};

// Get USDC contract instance
export const getUSDCContract = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Web3 provider not available");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const address = USDC_ADDRESSES[sepolia.id]; // Use Sepolia by default

  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error("USDC contract not deployed");
  }

  return new ethers.Contract(address, USDC_ABI, signer);
};

// Get LP Token contract instance
export const getLPTokenContract = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Web3 provider not available");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const address = LP_TOKEN_ADDRESSES[sepolia.id]; // Use Sepolia by default

  if (!address || address === "0x0000000000000000000000000000000000000000") {
    throw new Error("LP Token contract not deployed");
  }

  return new ethers.Contract(address, LP_TOKEN_ABI, signer);
};

// Get pool statistics for liquidity checking
export const getPoolStats = async () => {
  try {
    // Log blockchain query input
    console.log("🔗 BLOCKCHAIN QUERY INPUT:", {
      function: "getPoolStats",
      timestamp: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN QUERY ERROR:", {
      function: "getPoolStats",
      error: error,
      timestamp: new Date().toISOString(),
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
    const collateralLINKWei = ethers.utils.parseUnits(
      params.collateralLINK,
      18
    );

    // Calculate expiryTime in seconds (from minutes)
    const expiryTimeSeconds =
      Math.floor(Date.now() / 1000) + params.expiryDuration * 60;

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
      timestamp: new Date().toISOString(),
    });

    // Check and approve LINK tokens to the contract if necessary
    const linkTokenAddress = "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5"; // From Integration.md
    const linkContract = new ethers.Contract(
      linkTokenAddress,
      [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function allowance(address owner, address spender) view returns (uint256)",
      ],
      signer
    );

    // Check current allowance
    const currentAllowance = await linkContract.allowance(
      await signer.getAddress(),
      contract.address
    );
    console.log(
      `Current LINK allowance: ${ethers.utils.formatEther(
        currentAllowance
      )} LINK`
    );
    console.log(`Required LINK amount: ${params.collateralLINK} LINK`);

    // Only approve if current allowance is insufficient
    if (currentAllowance.lt(collateralLINKWei)) {
      console.log(
        `Insufficient allowance. Approving unlimited LINK for CreditShaftLeverage contract...`
      );
      
      // Get dynamic gas settings for approval (unlimited amount)
      const chainId = (await contract.provider.getNetwork()).chainId;
      const approvalGasSettings = await getGasSettings(
        contract.provider,
        chainId,
        'approval',
        linkContract,
        [contract.address, ethers.constants.MaxUint256]
      );
      
      console.log('Using gas settings for LINK approval:', formatGasSettings(approvalGasSettings));
      
      const approveTx = await linkContract.approve(
        contract.address,
        ethers.constants.MaxUint256, // Unlimited approval
        approvalGasSettings
      );
      await approveTx.wait();
      console.log("LINK unlimited approval successful:", approveTx.hash);
    } else {
      console.log("Sufficient allowance already exists. Skipping approval.");
    }

    // Get dynamic gas settings for position opening
    const chainId = (await contract.provider.getNetwork()).chainId;
    const positionGasSettings = await getGasSettings(
      contract.provider,
      chainId,
      'openLeveragePosition',
      contract,
      [
        params.leverageRatio,
        collateralLINKWei,
        expiryTimeSeconds,
        params.stripePaymentIntentId,
        params.stripeCustomerId,
        params.stripePaymentMethodId
      ]
    );
    
    console.log('Using gas settings for openLeveragePosition:', formatGasSettings(positionGasSettings));
    
    let tx;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const gasSettingsToUse = attempts === 0 ? positionGasSettings : await retryWithIncreasedGas(positionGasSettings, attempts);
        
        tx = await contract.openLeveragePosition(
          params.leverageRatio,
          collateralLINKWei,
          expiryTimeSeconds,
          params.stripePaymentIntentId,
          params.stripeCustomerId,
          params.stripePaymentMethodId,
          gasSettingsToUse
        );
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts || !isGasError(error)) {
          throw error; // Re-throw if max attempts reached or not a gas error
        }
        console.warn(`Gas error on attempt ${attempts}, retrying with increased gas:`, error);
      }
    }

    // Log transaction object
    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString(),
    });

    const receipt = await tx.wait();

    // Log transaction receipt
    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0,
    });

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "openLeveragePosition",
      parameters: {
        leverageRatio: params.leverageRatio,
        collateralLINK: params.collateralLINK,
        expiryDurationMinutes: params.expiryDuration,
        stripePaymentIntentId:
          params.stripePaymentIntentId?.substring(0, 20) + "...",
        stripeCustomerId: params.stripeCustomerId?.substring(0, 20) + "...",
        stripePaymentMethodId:
          params.stripePaymentMethodId?.substring(0, 20) + "...",
      },
      error: error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

export const closeLeveragePosition = async () => {
  try {
    const contract = getContract();
    const userAddress = await contract.signer.getAddress();

    // Get position details before closing to retrieve Stripe payment intent ID and charge status
    const position = await contract.positions(userAddress);
    const stripePaymentIntentId = position[10]; // stripePaymentIntentId is at index 10
    const preAuthCharged = position[9]; // preAuthCharged is at index 9

    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "closeLeveragePosition",
      stripePaymentIntentId: stripePaymentIntentId?.substring(0, 20) + "...",
      preAuthCharged: preAuthCharged,
      timestamp: new Date().toISOString(),
    });

    // Get dynamic gas settings for position closing
    const chainId = (await contract.provider.getNetwork()).chainId;
    const closeGasSettings = await getGasSettings(
      contract.provider,
      chainId,
      'closeLeveragePosition',
      contract,
      []
    );
    
    console.log('Using gas settings for closeLeveragePosition:', formatGasSettings(closeGasSettings));
    
    let tx;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const gasSettingsToUse = attempts === 0 ? closeGasSettings : await retryWithIncreasedGas(closeGasSettings, attempts);
        
        tx = await contract.closeLeveragePosition(gasSettingsToUse);
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts || !isGasError(error)) {
          throw error; // Re-throw if max attempts reached or not a gas error
        }
        console.warn(`Gas error on attempt ${attempts}, retrying with increased gas:`, error);
      }
    }

    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString(),
    });

    const receipt = await tx.wait();

    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0,
    });

    // After successful blockchain transaction, handle Stripe pre-authorization based on charge status
    if (stripePaymentIntentId && stripePaymentIntentId !== "") {
      if (preAuthCharged) {
        console.log("📱 PRE-AUTH ALREADY CHARGED VIA CHAINLINK - SKIPPING CANCELLATION:", {
          stripePaymentIntentId: stripePaymentIntentId?.substring(0, 20) + "...",
          preAuthCharged: true,
          timestamp: new Date().toISOString(),
        });
      } else {
        try {
          console.log(
            "📱 CANCELLING STRIPE PRE-AUTHORIZATION:",
            stripePaymentIntentId
          );

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
      }
    } else {
      console.log(
        "📱 NO STRIPE PAYMENT INTENT ID FOUND - SKIPPING CANCELLATION"
      );
    }

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "closeLeveragePosition",
      error: error,
      timestamp: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
    });

    // Get dynamic gas settings for addLiquidity
    const chainId = (await contract.provider.getNetwork()).chainId;
    const gasSettings = await getGasSettings(
      contract.provider,
      chainId,
      'addLiquidity',
      contract,
      [],
      { value: valueWei }
    );
    
    console.log('Using gas settings for addLiquidity:', formatGasSettings(gasSettings));
    
    let tx;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const gasSettingsToUse = attempts === 0 ? gasSettings : await retryWithIncreasedGas(gasSettings, attempts);
        
        tx = await contract.addLiquidity({
          value: valueWei,
          ...gasSettingsToUse
        });
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts || !isGasError(error)) {
          throw error; // Re-throw if max attempts reached or not a gas error
        }
        console.warn(`Gas error on attempt ${attempts}, retrying with increased gas:`, error);
      }
    }

    // Log transaction object
    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString(),
    });

    const receipt = await tx.wait();

    // Log transaction receipt
    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0,
    });

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "addLiquidity",
      parameters: {
        ethAmount: ethAmount,
        valueWei: ethers.utils.parseEther(ethAmount).toString(),
      },
      error: error,
      timestamp: new Date().toISOString(),
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
      timestamp: new Date().toISOString(),
    });

    // Get dynamic gas settings for removeLiquidity
    const chainId = (await contract.provider.getNetwork()).chainId;
    const gasSettings = await getGasSettings(
      contract.provider,
      chainId,
      'removeLiquidity',
      contract,
      [sharesWei]
    );
    
    console.log('Using gas settings for removeLiquidity:', formatGasSettings(gasSettings));
    
    let tx;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const gasSettingsToUse = attempts === 0 ? gasSettings : await retryWithIncreasedGas(gasSettings, attempts);
        
        tx = await contract.removeLiquidity(sharesWei, gasSettingsToUse);
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts || !isGasError(error)) {
          throw error; // Re-throw if max attempts reached or not a gas error
        }
        console.warn(`Gas error on attempt ${attempts}, retrying with increased gas:`, error);
      }
    }

    // Log transaction object
    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString(),
    });

    const receipt = await tx.wait();

    // Log transaction receipt
    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0,
    });

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "removeLiquidity",
      parameters: {
        shares: shares,
        sharesWei: ethers.utils.parseEther(shares).toString(),
      },
      error: error,
      timestamp: new Date().toISOString(),
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

// =============================================
// USDC LIQUIDITY FUNCTIONS
// =============================================

// Add USDC liquidity to the pool
export const addUSDCLiquidity = async (usdcAmount: string) => {
  try {
    const coreContract = getCreditShaftCoreContract();
    const usdcContract = getUSDCContract();
    const signer = coreContract.signer;

    // Convert USDC amount to proper decimals (6 decimals for USDC)
    const usdcAmountWei = ethers.utils.parseUnits(usdcAmount, 6);

    // Log transaction input
    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "addUSDCLiquidity",
      usdcAmount: usdcAmount,
      usdcAmountWei: usdcAmountWei.toString(),
      timestamp: new Date().toISOString(),
    });

    // Check current USDC allowance
    const userAddress = await signer.getAddress();
    const currentAllowance = await usdcContract.allowance(
      userAddress,
      coreContract.address
    );

    console.log(
      `Current USDC allowance: ${ethers.utils.formatUnits(currentAllowance, 6)} USDC`
    );
    console.log(`Required USDC amount: ${usdcAmount} USDC`);

    // Approve USDC if needed
    if (currentAllowance.lt(usdcAmountWei)) {
      console.log(
        `Insufficient allowance. Approving unlimited USDC for CreditShaftCore contract...`
      );
      // Get dynamic gas settings for USDC approval (unlimited amount)
      const chainId = (await coreContract.provider.getNetwork()).chainId;
      const approvalGasSettings = await getGasSettings(
        coreContract.provider,
        chainId,
        'approval',
        usdcContract,
        [coreContract.address, ethers.constants.MaxUint256]
      );
      
      console.log('Using gas settings for USDC approval:', formatGasSettings(approvalGasSettings));
      
      let approveTx;
      let approvalAttempts = 0;
      const maxAttempts = 3;
      
      while (approvalAttempts < maxAttempts) {
        try {
          const gasSettingsToUse = approvalAttempts === 0 ? approvalGasSettings : await retryWithIncreasedGas(approvalGasSettings, approvalAttempts);
          
          approveTx = await usdcContract.approve(
            coreContract.address,
            ethers.constants.MaxUint256, // Unlimited approval
            gasSettingsToUse
          );
          break; // Success, exit retry loop
        } catch (error) {
          approvalAttempts++;
          if (approvalAttempts >= maxAttempts || !isGasError(error)) {
            throw error; // Re-throw if max attempts reached or not a gas error
          }
          console.warn(`Gas error on approval attempt ${approvalAttempts}, retrying with increased gas:`, error);
        }
      }
      await approveTx.wait();
      console.log("USDC unlimited approval successful:", approveTx.hash);
    } else {
      console.log("Sufficient allowance already exists. Skipping approval.");
    }

    // Get dynamic gas settings for addUSDCLiquidity
    const chainId = (await coreContract.provider.getNetwork()).chainId;
    const liquidityGasSettings = await getGasSettings(
      coreContract.provider,
      chainId,
      'addUSDCLiquidity',
      coreContract,
      [usdcAmountWei]
    );
    
    console.log('Using gas settings for addUSDCLiquidity:', formatGasSettings(liquidityGasSettings));
    
    let tx;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const gasSettingsToUse = attempts === 0 ? liquidityGasSettings : await retryWithIncreasedGas(liquidityGasSettings, attempts);
        
        tx = await coreContract.addUSDCLiquidity(usdcAmountWei, gasSettingsToUse);
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts || !isGasError(error)) {
          throw error; // Re-throw if max attempts reached or not a gas error
        }
        console.warn(`Gas error on attempt ${attempts}, retrying with increased gas:`, error);
      }
    }

    // Log transaction object
    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
    });

    const receipt = await tx.wait();

    // Log transaction receipt
    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0,
    });

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "addUSDCLiquidity",
      parameters: {
        usdcAmount: usdcAmount,
        usdcAmountWei: ethers.utils.parseUnits(usdcAmount, 6).toString(),
      },
      error: error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Remove USDC liquidity from the pool
export const removeUSDCLiquidity = async (lpTokenAmount: string) => {
  try {
    const coreContract = getCreditShaftCoreContract();

    // Convert LP token amount to proper decimals (6 decimals like USDC)
    const lpTokenAmountWei = ethers.utils.parseUnits(lpTokenAmount, 6);

    // Log transaction input
    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "removeUSDCLiquidity", 
      lpTokenAmount: lpTokenAmount,
      lpTokenAmountWei: lpTokenAmountWei.toString(),
      timestamp: new Date().toISOString(),
    });

    // Get dynamic gas settings for removeUSDCLiquidity
    const chainId = (await coreContract.provider.getNetwork()).chainId;
    const gasSettings = await getGasSettings(
      coreContract.provider,
      chainId,
      'removeUSDCLiquidity',
      coreContract,
      [lpTokenAmountWei]
    );
    
    console.log('Using gas settings for removeUSDCLiquidity:', formatGasSettings(gasSettings));
    
    let tx;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const gasSettingsToUse = attempts === 0 ? gasSettings : await retryWithIncreasedGas(gasSettings, attempts);
        
        tx = await coreContract.removeUSDCLiquidity(lpTokenAmountWei, gasSettingsToUse);
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts || !isGasError(error)) {
          throw error; // Re-throw if max attempts reached or not a gas error
        }
        console.warn(`Gas error on attempt ${attempts}, retrying with increased gas:`, error);
      }
    }

    // Log transaction object
    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
    });

    const receipt = await tx.wait();

    // Log transaction receipt
    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0,
    });

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "removeUSDCLiquidity",
      parameters: {
        lpTokenAmount: lpTokenAmount,
        lpTokenAmountWei: ethers.utils.parseUnits(lpTokenAmount, 6).toString(),
      },
      error: error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Get user's LP token balance 
export const getUserUSDCLPBalance = async (userAddress: string) => {
  try {
    const lpTokenContract = getLPTokenContract();
    const lpBalance = await lpTokenContract.balanceOf(userAddress);
    
    return {
      balance: ethers.utils.formatUnits(lpBalance, 6), // 6 decimals for LP token
      balanceWei: lpBalance.toString(),
    };
  } catch (error) {
    console.error("Error getting USDC LP balance:", error);
    throw error;
  }
};

// Get user's USDC balance
export const getUserUSDCBalance = async (userAddress: string) => {
  try {
    const usdcContract = getUSDCContract();
    const usdcBalance = await usdcContract.balanceOf(userAddress);
    
    return {
      balance: ethers.utils.formatUnits(usdcBalance, 6), // 6 decimals for USDC
      balanceWei: usdcBalance.toString(),
    };
  } catch (error) {
    console.error("Error getting USDC balance:", error);
    throw error;
  }
};

// Get pool statistics for USDC liquidity
export const getUSDCPoolStats = async () => {
  try {
    console.log("🔗 BLOCKCHAIN QUERY INPUT:", {
      function: "getUSDCPoolStats",
      timestamp: new Date().toISOString(),
    });

    const coreContract = getCreditShaftCoreContract();
    const totalLiquidity = await coreContract.getTotalUSDCLiquidity();
    const availableLiquidity = await coreContract.getAvailableUSDCLiquidity();
    const totalFees = await coreContract.totalFlashLoanFees();

    const result = {
      totalLiquidity: ethers.utils.formatUnits(totalLiquidity, 6),
      availableLiquidity: ethers.utils.formatUnits(availableLiquidity, 6),
      totalFees: ethers.utils.formatUnits(totalFees, 6),
      totalLiquidityWei: totalLiquidity.toString(),
      availableLiquidityWei: availableLiquidity.toString(),
      totalFeesWei: totalFees.toString(),
    };

    console.log("🔗 BLOCKCHAIN QUERY OUTPUT:", {
      function: "getUSDCPoolStats",
      totalLiquidityUSDC: result.totalLiquidity,
      availableLiquidityUSDC: result.availableLiquidity,
      totalFeesUSDC: result.totalFees,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN QUERY ERROR:", {
      function: "getUSDCPoolStats",
      error: error,
      timestamp: new Date().toISOString(),
    });
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

// =============================================
// FAUCET FUNCTIONS
// =============================================

// Get faucet contract instance
export const getFaucetContract = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("Web3 provider not available");
  }

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();

  return new ethers.Contract(FAUCET_ADDRESS, FAUCET_ABI, signer);
};

// Mint USDC tokens (1000 tokens with 6 decimals)
export const mintUSDC = async (toAddress: string) => {
  try {
    const faucetContract = getFaucetContract();
    const amount = ethers.utils.parseUnits("1000", 6); // 1000 USDC with 6 decimals

    console.log("🔗 FAUCET MINT INPUT:", {
      function: "mintUSDC",
      token: USDC_ADDRESSES[sepolia.id],
      to: toAddress,
      amount: "1000",
      amountWei: amount.toString(),
      timestamp: new Date().toISOString(),
    });

    // Get dynamic gas settings for mintUSDC
    const chainId = (await faucetContract.provider.getNetwork()).chainId;
    const gasSettings = await getGasSettings(
      faucetContract.provider,
      chainId,
      'mint',
      faucetContract,
      [USDC_ADDRESSES[sepolia.id], toAddress, amount]
    );
    
    console.log('Using gas settings for mintUSDC:', formatGasSettings(gasSettings));
    
    let tx;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const gasSettingsToUse = attempts === 0 ? gasSettings : await retryWithIncreasedGas(gasSettings, attempts);
        
        tx = await faucetContract.mint(
          USDC_ADDRESSES[sepolia.id],
          toAddress,
          amount,
          gasSettingsToUse
        );
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts || !isGasError(error)) {
          throw error; // Re-throw if max attempts reached or not a gas error
        }
        console.warn(`Gas error on attempt ${attempts}, retrying with increased gas:`, error);
      }
    }

    const receipt = await tx.wait();

    console.log("🔗 FAUCET MINT OUTPUT:", {
      function: "mintUSDC",
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString(),
    });

    return receipt;
  } catch (error) {
    console.error("🔗 FAUCET MINT ERROR:", {
      function: "mintUSDC",
      error: error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// Mint LINK tokens (1000 tokens with 18 decimals)
export const mintLINK = async (toAddress: string) => {
  try {
    const faucetContract = getFaucetContract();
    const amount = ethers.utils.parseEther("1000"); // 1000 LINK with 18 decimals

    console.log("🔗 FAUCET MINT INPUT:", {
      function: "mintLINK",
      token: LINK_TOKEN_ADDRESS,
      to: toAddress,
      amount: "1000",
      amountWei: amount.toString(),
      timestamp: new Date().toISOString(),
    });

    // Get dynamic gas settings for mintLINK
    const chainId = (await faucetContract.provider.getNetwork()).chainId;
    const gasSettings = await getGasSettings(
      faucetContract.provider,
      chainId,
      'mint',
      faucetContract,
      [LINK_TOKEN_ADDRESS, toAddress, amount]
    );
    
    console.log('Using gas settings for mintLINK:', formatGasSettings(gasSettings));
    
    let tx;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const gasSettingsToUse = attempts === 0 ? gasSettings : await retryWithIncreasedGas(gasSettings, attempts);
        
        tx = await faucetContract.mint(
          LINK_TOKEN_ADDRESS,
          toAddress,
          amount,
          gasSettingsToUse
        );
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts || !isGasError(error)) {
          throw error; // Re-throw if max attempts reached or not a gas error
        }
        console.warn(`Gas error on attempt ${attempts}, retrying with increased gas:`, error);
      }
    }

    const receipt = await tx.wait();

    console.log("🔗 FAUCET MINT OUTPUT:", {
      function: "mintLINK",
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: new Date().toISOString(),
    });

    return receipt;
  } catch (error) {
    console.error("🔗 FAUCET MINT ERROR:", {
      function: "mintLINK",
      error: error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

// =============================================
// TESTING FUNCTIONS
// =============================================

// Borrow additional USDC to make position unsafe (testing only)
export const borrowMoreUSDC = async (additionalAmount: string) => {
  try {
    const contract = getContract();
    
    // Convert additional amount to proper decimals (6 decimals for USDC)
    const additionalAmountWei = ethers.utils.parseUnits(additionalAmount, 6);

    console.log("🔗 BLOCKCHAIN TRANSACTION INPUT:", {
      function: "borrowMoreUSDC",
      additionalAmount: additionalAmount,
      additionalAmountWei: additionalAmountWei.toString(),
      timestamp: new Date().toISOString(),
    });

    // Get dynamic gas settings for borrowMoreUSDC
    const chainId = (await contract.provider.getNetwork()).chainId;
    const gasSettings = await getGasSettings(
      contract.provider,
      chainId,
      'borrowMoreUSDC',
      contract,
      [additionalAmountWei]
    );
    
    console.log('Using gas settings for borrowMoreUSDC:', formatGasSettings(gasSettings));
    
    let tx;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const gasSettingsToUse = attempts === 0 ? gasSettings : await retryWithIncreasedGas(gasSettings, attempts);
        
        tx = await contract.borrowMoreUSDC(additionalAmountWei, gasSettingsToUse);
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts || !isGasError(error)) {
          throw error; // Re-throw if max attempts reached or not a gas error
        }
        console.warn(`Gas error on attempt ${attempts}, retrying with increased gas:`, error);
      }
    }

    console.log("🔗 BLOCKCHAIN TRANSACTION OBJECT:", {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      gasLimit: tx.gasLimit?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString(),
    });

    const receipt = await tx.wait();

    console.log("🔗 BLOCKCHAIN TRANSACTION RECEIPT:", {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status,
      events: receipt.events?.length || 0,
    });

    return receipt;
  } catch (error) {
    console.error("🔗 BLOCKCHAIN TRANSACTION ERROR:", {
      function: "borrowMoreUSDC",
      parameters: {
        additionalAmount: additionalAmount,
        additionalAmountWei: ethers.utils.parseUnits(additionalAmount, 6).toString(),
      },
      error: error,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};
