/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/lib/chainlink-integration.ts
import {
  ChainlinkLoanData,
  SmartContractConfig,
  BlockchainLoan,
} from "../types";

/**
 * Chainlink Integration Helper Functions
 * Manages interaction between frontend and smart contracts
 */

export class ChainlinkIntegration {
  private config: SmartContractConfig;

  constructor(config: SmartContractConfig) {
    this.config = config;
  }

  /**
   * Convert frontend loan data to blockchain format
   */
  formatLoanForBlockchain(
    loan: any,
    stripePaymentIntentId: string
  ): ChainlinkLoanData {
    const expiryTime = new Date(loan.preAuthExpiresAt).getTime() / 1000;
    const triggerTime = expiryTime - 60 * 60; // 1 hour before expiry

    return {
      loanId: loan.id,
      borrower: loan.walletAddress,
      borrowAmount: this.toWei(loan.borrowAmount),
      collateralAmount: this.toUSDScaled(loan.preAuthAmount),
      stripePaymentIntentId,
      createdAt: Math.floor(new Date(loan.createdAt).getTime() / 1000),
      expiryTimestamp: Math.floor(expiryTime),
      triggerTimestamp: Math.floor(triggerTime),
      isActive: true,
      autoChargeEnabled: true,
    };
  }

  /**
   * Generate JavaScript source code for Chainlink Functions
   * This code runs in Chainlink nodes and calls Stripe API directly
   */
  getChainlinkFunctionSource(): string {
    return `
// Chainlink Functions source code for direct Stripe API integration
const loanId = args[0];
const paymentIntentId = args[1];
const chargeAmount = args[2]; // in cents

// Stripe API configuration
const stripeApiKey = secrets.STRIPE_SECRET_KEY;
const stripeApiUrl = 'https://api.stripe.com/v1/payment_intents/' + paymentIntentId + '/capture';

// Make direct HTTP request to Stripe API
const stripeResponse = await Functions.makeHttpRequest({
  url: stripeApiUrl,
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + stripeApiKey,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  data: 'amount_to_capture=' + chargeAmount
});

if (stripeResponse.error) {
  console.error('Stripe API error:', stripeResponse.error);
  return Functions.encodeString(JSON.stringify({
    success: false,
    loanId: loanId,
    error: stripeResponse.error.toString(),
    timestamp: Math.floor(Date.now() / 1000)
  }));
}

const stripeData = stripeResponse.data;

// Validate Stripe response
if (stripeData.status !== 'succeeded') {
  return Functions.encodeString(JSON.stringify({
    success: false,
    loanId: loanId,
    error: 'Stripe charge failed: ' + stripeData.status,
    timestamp: Math.floor(Date.now() / 1000)
  }));
}

// Return success response
return Functions.encodeString(JSON.stringify({
  success: true,
  loanId: loanId,
  chargedAmount: stripeData.amount_received,
  stripeChargeId: stripeData.id,
  timestamp: Math.floor(Date.now() / 1000)
}));
`;
  }

  /**
   * Generate smart contract ABI for frontend integration
   */
  getContractABI() {
    return [
      {
        inputs: [
          { name: "loanId", type: "string" },
          { name: "borrowAmount", type: "uint256" },
          { name: "collateralAmount", type: "uint256" },
          { name: "durationDays", type: "uint256" },
          { name: "stripePaymentIntentId", type: "string" },
        ],
        name: "createLoan",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [{ name: "loanId", type: "string" }],
        name: "releaseLoan",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
      },
      {
        inputs: [{ name: "loanId", type: "string" }],
        name: "getLoan",
        outputs: [
          {
            components: [
              { name: "loanId", type: "string" },
              { name: "borrower", type: "address" },
              { name: "borrowAmount", type: "uint256" },
              { name: "collateralAmount", type: "uint256" },
              { name: "createdAt", type: "uint256" },
              { name: "expiryTimestamp", type: "uint256" },
              { name: "isActive", type: "bool" },
              { name: "autoChargeEnabled", type: "bool" },
              { name: "stripePaymentIntentId", type: "string" },
            ],
            name: "",
            type: "tuple",
          },
        ],
        stateMutability: "view",
        type: "function",
      },
    ];
  }

  /**
   * Calculate automation trigger time (1 hour before expiry)
   */
  calculateTriggerTime(expiryTimestamp: number): number {
    return expiryTimestamp - 60 * 60; // 1 hour before
  }

  /**
   * Utility functions for data conversion
   */
  private toWei(amount: number): string {
    return (amount * 1e18).toString();
  }

  private toUSDScaled(amount: number): string {
    return Math.round(amount * 1e8).toString();
  }

  /**
   * Validate loan data before blockchain submission
   */
  validateLoanData(loan: ChainlinkLoanData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!loan.loanId || loan.loanId.length === 0) {
      errors.push("Loan ID is required");
    }

    if (!loan.borrower || !/^0x[a-fA-F0-9]{40}$/.test(loan.borrower)) {
      errors.push("Valid borrower address is required");
    }

    if (
      !loan.stripePaymentIntentId ||
      !loan.stripePaymentIntentId.startsWith("pi_")
    ) {
      errors.push("Valid Stripe PaymentIntent ID is required");
    }

    if (loan.expiryTimestamp <= Math.floor(Date.now() / 1000)) {
      errors.push("Expiry timestamp must be in the future");
    }

    if (loan.triggerTimestamp >= loan.expiryTimestamp) {
      errors.push("Trigger time must be before expiry time");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Network-specific configurations
 */
export const CHAINLINK_CONFIGS: Record<string, SmartContractConfig> = {
  sepolia: {
    network: "sepolia",
    contractAddress: "", // To be set after deployment
    chainlinkRouter: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
    automationRegistry: "0xE16Df59B887e3Caa439E0b29B42bA2e7976FD8b2",
    functionsSubscriptionId: "", // To be set after subscription creation
    gasLimit: 300000,
    linkTokenAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  },
  "avalanche-fuji": {
    network: "avalanche-fuji",
    contractAddress: "", // To be set after deployment
    chainlinkRouter: "0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0",
    automationRegistry: "0x819B58A646CDd8289275A87653a2aA4902b14fe6",
    functionsSubscriptionId: "", // To be set after subscription creation
    gasLimit: 300000,
    linkTokenAddress: "0x0b9d5D9136855f6FEc3c0993feE6E9CE8a297846",
  },
};

/**
 * Deployment helper for smart contracts
 */
export class ChainlinkDeployment {
  static generateDeploymentScript(
    network: "sepolia" | "avalanche-fuji"
  ): string {
    const config = CHAINLINK_CONFIGS[network];

    return `
// scripts/deploy-creditshaft.js
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy CreditShaftCore
  const CreditShaftCore = await ethers.getContractFactory("CreditShaftCore");
  const creditShaftCore = await CreditShaftCore.deploy(
    "${config.chainlinkRouter}", // Functions router
    0, // Subscription ID (will be set later)
    "0x66756e2d6176616c616e6368652d66756a692d31" // DON ID for ${network}
  );

  await creditShaftCore.waitForDeployment();
  console.log("CreditShaftCore deployed to:", await creditShaftCore.getAddress());

  // Verify contract
  console.log("Verifying contract...");
  await run("verify:verify", {
    address: await creditShaftCore.getAddress(),
    constructorArguments: [
      "${config.chainlinkRouter}",
      0,
      "0x66756e2d6176616c616e6368652d66756a692d31"
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
`;
  }
}
