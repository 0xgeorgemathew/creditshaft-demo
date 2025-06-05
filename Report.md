Blockchain Integration Migration Report

Overview

This report outlines the comprehensive changes needed to integrate real
blockchain functionality into the CreditShaft Demo application.
Currently, the app uses mock blockchain interactions while maintaining
real Stripe integration. This guide details the transition from demo
mode to production-ready blockchain implementation.

Current Architecture Analysis

Existing Mock Components

- Mock Transaction Hashes: Generated with Math.random().toString(16)
- Simulated Blockchain Delays: setTimeout() calls
- In-Memory Storage: loanStorage.ts for demo persistence
- Demo Mode Flags: NEXT_PUBLIC_DEMO_MODE=true

Real Components Already Implemented

- ✅ Stripe Integration: Full production-ready API integration
- ✅ Wallet Connection: Wagmi v2 + Viem v2 (Sepolia testnet ready)
- ✅ UI Components: Complete loan management interface
- ✅ Session Management: Wallet-based data persistence

Migration Roadmap

Phase 1: Smart Contract Development

1.1 Core Smart Contract Architecture

File: contracts/CreditBridge.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreditBridge is ReentrancyGuard, Ownable {
struct Loan {
bytes32 id;
address borrower;
address asset;
uint256 amount;
uint256 preAuthAmount;
uint256 interestRate;
uint256 createdAt;
uint256 lastAccrual;
bool active;
string stripeCustomerId;
string stripePaymentMethodId;
}

      mapping(bytes32 => Loan) public loans;
      mapping(address => bytes32[]) public userLoans;
      mapping(address => bool) public supportedAssets;

      event LoanCreated(bytes32 indexed loanId, address indexed borrower,

uint256 amount);
event LoanRepaid(bytes32 indexed loanId, uint256 amount);
event LoanLiquidated(bytes32 indexed loanId, uint256 amount);

      function createLoan(
          bytes32 _loanId,
          address _asset,
          uint256 _amount,
          uint256 _preAuthAmount,
          uint256 _interestRate,
          string memory _stripeCustomerId,
          string memory _stripePaymentMethodId
      ) external nonReentrant {
          // Implementation
      }

      function repayLoan(bytes32 _loanId, uint256 _amount) external

nonReentrant {
// Implementation
}

      function liquidateLoan(bytes32 _loanId) external onlyOwner

nonReentrant {
// Implementation
}
}

1.2 Supporting Contracts

File: contracts/interfaces/ICreditBridge.sol
interface ICreditBridge {
function createLoan(...) external;
function repayLoan(bytes32 loanId, uint256 amount) external;
function getLoan(bytes32 loanId) external view returns (Loan
memory);
function getUserLoans(address user) external view returns (bytes32[]
memory);
}

File: contracts/CreditBridgeFactory.sol
// Factory contract for deploying individual user vaults if needed

Phase 2: Web3 Integration Layer

2.1 Contract Configuration

File: src/config/contracts.ts
export const CONTRACT_ADDRESSES = {
sepolia: {
creditBridge: "0x...", // Deploy address
usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
usdt: "0x...", // Sepolia USDT  
 dai: "0x...", // Sepolia DAI
},
mainnet: {
creditBridge: "0x...",
usdc: "0xA0b86a33E6417C16C103F8c7f59AF3244B424d77",
usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
}
} as const;

export const CONTRACT_ABIS = {
creditBridge: [...], // Generated from compilation
erc20: [...], // Standard ERC20 ABI
} as const;

2.2 Web3 Hooks and Utilities

File: src/hooks/useContracts.ts
import { useContract, useNetwork } from 'wagmi';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from '@/config/contracts';

export function useCreditBridgeContract() {
const { chain } = useNetwork();
const chainId = chain?.id === 1 ? 'mainnet' : 'sepolia';

    return useContract({
      address: CONTRACT_ADDRESSES[chainId].creditBridge,
      abi: CONTRACT_ABIS.creditBridge,
    });

}

export function useERC20Contract(tokenSymbol: 'USDC' | 'USDT' | 'DAI') {
const { chain } = useNetwork();
const chainId = chain?.id === 1 ? 'mainnet' : 'sepolia';

    return useContract({
      address: CONTRACT_ADDRESSES[chainId][tokenSymbol.toLowerCase()],
      abi: CONTRACT_ABIS.erc20,
    });

}

File: src/lib/blockchain.ts
import { encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { CONTRACT_ABIS } from '@/config/contracts';

export interface BlockchainLoan {
id: string;
borrower: string;
asset: string;
amount: bigint;
preAuthAmount: bigint;
interestRate: number;
createdAt: bigint;
active: boolean;
stripeCustomerId: string;
stripePaymentMethodId: string;
}

export class BlockchainService {
constructor(
private creditBridgeContract: any,
private walletClient: any
) {}

    async createLoan(params: {
      loanId: string;
      asset: string;
      amount: number;
      preAuthAmount: number;
      interestRate: number;
      stripeCustomerId: string;
      stripePaymentMethodId: string;
    }): Promise<string> {
      const loanIdBytes = stringToBytes32(params.loanId);
      const amountWei = parseUnits(params.amount.toString(), 6); //

USDC/USDT 6 decimals
const preAuthWei = parseUnits(params.preAuthAmount.toString(), 6);

      const hash = await this.walletClient.writeContract({
        address: this.creditBridgeContract.address,
        abi: CONTRACT_ABIS.creditBridge,
        functionName: 'createLoan',
        args: [
          loanIdBytes,
          params.asset,
          amountWei,
          preAuthWei,
          Math.floor(params.interestRate * 100), // Convert to basis

points
params.stripeCustomerId,
params.stripePaymentMethodId,
],
});

      return hash;
    }

    async repayLoan(loanId: string, amount: number): Promise<string> {
      const loanIdBytes = stringToBytes32(loanId);
      const amountWei = parseUnits(amount.toString(), 6);

      const hash = await this.walletClient.writeContract({
        address: this.creditBridgeContract.address,
        abi: CONTRACT_ABIS.creditBridge,
        functionName: 'repayLoan',
        args: [loanIdBytes, amountWei],
      });

      return hash;
    }

    async getLoan(loanId: string): Promise<BlockchainLoan | null> {
      const loanIdBytes = stringToBytes32(loanId);

      const loan = await

this.creditBridgeContract.read.loans([loanIdBytes]);

      if (!loan.active) return null;

      return {
        id: loanId,
        borrower: loan.borrower,
        asset: loan.asset,
        amount: loan.amount,
        preAuthAmount: loan.preAuthAmount,
        interestRate: Number(loan.interestRate) / 100,
        createdAt: loan.createdAt,
        active: loan.active,
        stripeCustomerId: loan.stripeCustomerId,
        stripePaymentMethodId: loan.stripePaymentMethodId,
      };
    }

    async getUserLoans(userAddress: string): Promise<string[]> {
      const loanIds = await

this.creditBridgeContract.read.getUserLoans([userAddress]);
return loanIds.map(bytes32ToString);
}
}

// Utility functions
function stringToBytes32(str: string): `0x${string}` {
// Convert string to bytes32
return `0x${Buffer.from(str).toString('hex').padEnd(64, '0')}` as
`0x${string}`;
}

function bytes32ToString(bytes32: string): string {
return Buffer.from(bytes32.slice(2), 'hex').toString().replace(/\0/g,
'');
}

Phase 3: API Layer Modifications

3.1 Borrow API Enhancement

File: src/app/api/borrow/route.ts

Changes Required:
// Remove demo mode section entirely
// Replace mock transaction with real blockchain call

// ADD: New imports
import { BlockchainService } from '@/lib/blockchain';
import { createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';

// MODIFY: After loan validation, replace demo section with:
export async function POST(request: NextRequest) {
// ... existing validation code ...

    try {
      // Validate Stripe data (keep existing validation)
      const customer = await stripe.customers.retrieve(customerId);
      const paymentMethod = await

stripe.paymentMethods.retrieve(paymentMethodId);

      // NEW: Initialize blockchain service
      const walletClient = createWalletClient({
        chain: sepolia, // or mainnet based on environment
        transport: http(process.env.RPC_URL),
        account: process.env.DEPLOYER_PRIVATE_KEY, // Server wallet for

gas
});

      const blockchainService = new BlockchainService(
        creditBridgeContract, // Initialize with contract instance
        walletClient
      );

      // Calculate loan parameters
      const borrowAmountNum = parseFloat(amount);
      const preAuthAmount = requiredPreAuth || Math.ceil(borrowAmountNum /

0.8);
const ltvRatio = Math.round((borrowAmountNum / preAuthAmount) \*
100);
const interestRate = getInterestRate(asset);

      // NEW: Create loan on blockchain
      logBorrow("BLOCKCHAIN_TRANSACTION_START", { requestId, loanId });

      const txHash = await blockchainService.createLoan({
        loanId,
        asset: CONTRACT_ADDRESSES[chainId][asset.toLowerCase()],
        amount: borrowAmountNum,
        preAuthAmount,
        interestRate,
        stripeCustomerId: customerId,
        stripePaymentMethodId: paymentMethodId,
      });

      logBorrow("BLOCKCHAIN_TRANSACTION_SUCCESS", {
        requestId,
        loanId,
        txHash,
        gasUsed: "pending" // Get from receipt
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 30000 // 30 second timeout
      });

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed');
      }

      // Store loan data (modified structure)
      const loanData = {
        id: loanId,
        preAuthId: preAuthId || setupIntentId,
        walletAddress,
        customerId,
        paymentMethodId,
        borrowAmount: borrowAmountNum,
        asset,
        interestRate,
        ltvRatio,
        originalCreditLimit: originalCreditLimit || 12000,
        preAuthAmount,
        status: "active" as const,
        createdAt: new Date().toISOString(),
        txHash: txHash, // Real transaction hash
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };

      // Store in database (replace in-memory storage)
      loanStorage.createLoan(loanData);

      const response = {
        success: true,
        loanId,
        txHash,
        blockNumber: receipt.blockNumber.toString(),
        amount: borrowAmountNum,
        asset,
        walletAddress,
        ltvRatio,
        interestRate,
        preAuthAmount,
        timestamp: new Date().toISOString(),
        stripeCustomerId: customer.id,
        stripePaymentMethodId: paymentMethod.id,
      };

      return NextResponse.json(response);

    } catch (blockchainError: any) {
      logBorrow("BLOCKCHAIN_ERROR", {
        requestId,
        error: blockchainError.message,
        code: blockchainError.code,
      }, true);

      return NextResponse.json({
        success: false,
        error: `Blockchain error: ${blockchainError.message}`,
        requestId,
      }, { status: 500 });
    }

}

3.2 Loans API Enhancement

File: src/app/api/loans/route.ts

Changes Required:
// MODIFY: Replace in-memory queries with blockchain queries

export async function GET(request: NextRequest) {
const { searchParams } = new URL(request.url);
const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      return NextResponse.json({ success: false, error: "Wallet address

required" });
}

    try {
      // NEW: Query blockchain for user loans
      const blockchainService = new

BlockchainService(creditBridgeContract, walletClient);
const loanIds = await blockchainService.getUserLoans(walletAddress);

      // Fetch detailed loan data
      const loans = await Promise.all(
        loanIds.map(async (loanId) => {
          const blockchainLoan = await blockchainService.getLoan(loanId);

          // Merge with stored Stripe data
          const storedLoan = loanStorage.getLoan(loanId);

          return {
            ...blockchainLoan,
            // Include Stripe-specific fields from storage
            customerId: storedLoan?.customerId,
            paymentMethodId: storedLoan?.paymentMethodId,
            // Calculate current interest
            currentInterest: calculateAccruedInterest(blockchainLoan),
          };
        })
      );

      // Calculate credit summary from blockchain data
      const creditSummary = calculateCreditSummary(loans);

      return NextResponse.json({
        success: true,
        loans,
        creditSummary,
      });

    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

}

function calculateAccruedInterest(loan: BlockchainLoan): number {
const now = BigInt(Math.floor(Date.now() / 1000));
const timeElapsed = now - loan.createdAt;
const secondsPerYear = BigInt(365 _ 24 _ 60 \* 60);

    const interest = (loan.amount * BigInt(loan.interestRate) *

timeElapsed) /
(BigInt(10000) \* secondsPerYear); // 10000 for basis
points

    return Number(formatUnits(interest, 6));

}

3.3 Charge API Enhancement

File: src/app/api/loans/charge/route.ts

Changes Required:
// MODIFY: Replace demo mode with blockchain liquidation

export async function POST(request: NextRequest) {
const { loanId } = await request.json();

    try {
      // Get loan from blockchain
      const blockchainService = new

BlockchainService(creditBridgeContract, walletClient);
const loan = await blockchainService.getLoan(loanId);

      if (!loan) {
        return NextResponse.json({ success: false, error: "Loan not found"

});
}

      // Calculate total amount owed including interest
      const currentInterest = calculateAccruedInterest(loan);
      const totalOwed = Number(formatUnits(loan.amount, 6)) +

currentInterest;
const chargeAmount = Math.min(totalOwed,
Number(formatUnits(loan.preAuthAmount, 6)));

      // Create Stripe PaymentIntent for liquidation
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(chargeAmount * 100),
        currency: "usd",
        customer: loan.stripeCustomerId,
        payment_method: loan.stripePaymentMethodId,
        confirm: true,
        off_session: true,
        description: `CreditBridge loan liquidation - ${loanId}`,
      });

      if (paymentIntent.status === 'succeeded') {
        // NEW: Execute blockchain liquidation
        const liquidationTxHash = await

blockchainService.liquidateLoan(loanId);

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: liquidationTxHash
        });

        // Update stored loan data
        loanStorage.updateLoan(loanId, {
          status: "liquidated",
          liquidatedAt: new Date().toISOString(),
          liquidationTxHash,
          chargedAmount: chargeAmount,
          stripePaymentIntentId: paymentIntent.id,
        });

        return NextResponse.json({
          success: true,
          chargedAmount: chargeAmount,
          paymentIntentId: paymentIntent.id,
          liquidationTxHash,
          blockNumber: receipt.blockNumber.toString(),
        });
      } else {
        throw new Error(`Payment failed: ${paymentIntent.status}`);
      }

    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

}

3.4 Release API Enhancement

File: src/app/api/loans/release/route.ts

Changes Required:

// MODIFY: Add blockchain repayment functionality

export async function POST(request: NextRequest) {
const { loanId, repaymentAmount } = await request.json();

    try {
      // Get loan from blockchain
      const blockchainService = new

BlockchainService(creditBridgeContract, walletClient);
const loan = await blockchainService.getLoan(loanId);

      if (!loan) {
        return NextResponse.json({ success: false, error: "Loan not found"

});
}

      // Calculate repayment details
      const currentInterest = calculateAccruedInterest(loan);
      const totalOwed = Number(formatUnits(loan.amount, 6)) +

currentInterest;
const repayAmount = repaymentAmount || totalOwed;

      // NEW: Execute blockchain repayment
      const repaymentTxHash = await blockchainService.repayLoan(loanId,

repayAmount);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: repaymentTxHash
      });

      // If full repayment, release Stripe hold
      if (repayAmount >= totalOwed) {
        // Release Stripe pre-authorization hold
        // (Implementation depends on how you want to handle partial vs

full releases)
}

      // Update stored loan data
      loanStorage.updateLoan(loanId, {
        status: repayAmount >= totalOwed ? "repaid" : "partial_repayment",
        repaidAt: repayAmount >= totalOwed ? new Date().toISOString() :

undefined,
repaymentTxHash,
repaidAmount: repayAmount,
});

      return NextResponse.json({
        success: true,
        repaidAmount: repayAmount,
        remainingBalance: Math.max(0, totalOwed - repayAmount),
        repaymentTxHash,
        blockNumber: receipt.blockNumber.toString(),
        fullyRepaid: repayAmount >= totalOwed,
      });

    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 500 });
    }

}

Phase 4: Frontend Component Updates

4.1 BorrowingInterface Component

File: src/components/BorrowingInterface.tsx

Changes Required:
// MODIFY: Update success handling to show real transaction details

// In the success state JSX, replace mock transaction display:

  <div className="glassmorphism rounded-xl p-4 mb-6 border 
  border-white/10">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-300">Transaction Hash:</span>
      <div className="flex gap-2">
        <button
          onClick={copyTxHash}
          className="text-blue-400 hover:text-blue-300 flex items-center 
  gap-1"
        >
          <Copy size={14} />
          Copy
        </button>
        <a
          href={`https://sepolia.etherscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 flex items-center 
  gap-1"
        >
          <ExternalLink size={14} />
          View on Etherscan
        </a>
      </div>
    </div>
    <p className="text-xs font-mono text-gray-300 break-all bg-black/20 
  p-2 rounded border border-white/10">
      {txHash}
    </p>
    {/* NEW: Add block confirmation info */}
    {data.blockNumber && (
      <p className="text-xs text-gray-400 mt-1">
        Block: {data.blockNumber} • Gas Used: {data.gasUsed}
      </p>
    )}
  </div>

// ADD: Transaction confirmation status
{isProcessing && (

<div className="mb-4 glassmorphism rounded-xl p-4 border 
  border-blue-500/30">
<div className="flex items-center gap-3">
<div className="animate-spin rounded-full h-6 w-6 border-2 
  border-blue-500 border-t-transparent"></div>
<div>
<p className="text-blue-300 font-semibold">Confirming
Transaction...</p>
<p className="text-blue-200 text-sm">
Please wait for blockchain confirmation (usually 15-30
seconds)
</p>
</div>
</div>
</div>
)}

4.2 LoanDashboard Component

File: src/components/LoanDashboard.tsx

Changes Required:
// MODIFY: Update to handle real blockchain data

// ADD: New state for blockchain interaction
const [isCharging, setIsCharging] = useState<string | null>(null);
const [isReleasing, setIsReleasing] = useState<string | null>(null);
const [txPending, setTxPending] = useState<{ [loanId: string]: string
}>({});

// MODIFY: Charge function to handle blockchain confirmation
const handleCharge = async (loanId: string) => {
setIsCharging(loanId);

    try {
      const response = await fetch("/api/loans/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId }),
      });

      const data = await response.json();

      if (data.success) {
        // NEW: Show pending transaction
        setTxPending(prev => ({
          ...prev,
          [loanId]: data.liquidationTxHash
        }));

        // Refresh loans after a delay for blockchain confirmation
        setTimeout(() => {
          fetchLoans();
          setTxPending(prev => {
            const updated = { ...prev };
            delete updated[loanId];
            return updated;
          });
        }, 30000); // 30 second delay for confirmation

        alert(`Liquidation successful! TX: ${data.liquidationTxHash}`);
      }
    } catch (error) {
      console.error("Liquidation failed:", error);
      alert("Liquidation failed");
    } finally {
      setIsCharging(null);
    }

};

// ADD: Transaction status indicators in loan cards
{txPending[loan.id] && (

<div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 
  rounded-lg">
<div className="flex items-center gap-2">
<div className="animate-spin rounded-full h-4 w-4 border-2 
  border-yellow-500 border-t-transparent"></div>
<span className="text-yellow-300 text-sm font-semibold">
Transaction Pending
</span>
</div>
<p className="text-yellow-200 text-xs mt-1 font-mono break-all">
{txPending[loan.id]}
</p>
<a
href={`https://sepolia.etherscan.io/tx/${txPending[loan.id]}`}
target="\_blank"
rel="noopener noreferrer"
className="text-yellow-400 hover:text-yellow-300 text-xs
inline-flex items-center gap-1 mt-1" >
<ExternalLink size={12} />
View on Etherscan
</a>
</div>
)}

// MODIFY: Update loan display to show blockchain data

  <div className="flex justify-between text-sm">
    <span className="text-gray-300">Interest Accrued:</span>
    <span className="text-red-300">
      ${loan.currentInterest?.toFixed(2) || "0.00"}
    </span>
  </div>
  <div className="flex justify-between text-sm">
    <span className="text-gray-300">Total Owed:</span>
    <span className="text-white font-semibold">
      ${(loan.borrowAmount + (loan.currentInterest || 0)).toFixed(2)}
    </span>
  </div>

Phase 5: Environment and Configuration

5.1 Environment Variables

File: .env.local

# Existing Stripe variables

STRIPE*SECRET_KEY=sk_test*...
NEXT*PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test*...

# NEW: Blockchain variables

RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
DEPLOYER_PRIVATE_KEY=0x... # Server wallet for paying gas fees
CONTRACT_ADDRESS_SEPOLIA=0x... # Deployed CreditBridge contract
CONTRACT_ADDRESS_MAINNET=0x... # Future mainnet deployment

# NEW: Remove demo mode

# NEXT_PUBLIC_DEMO_MODE=true # DELETE THIS LINE

# NEW: Network configuration

NEXT_PUBLIC_CHAIN_ID=11155111 # Sepolia testnet
NEXT_PUBLIC_NETWORK_NAME=sepolia

5.2 Package Dependencies

File: package.json
{
"dependencies": {
// ... existing dependencies

      // NEW: Add these blockchain dependencies
      "@openzeppelin/contracts": "^4.9.0",
      "hardhat": "^2.19.0",
      "@nomiclabs/hardhat-ethers": "^2.2.3",
      "@typechain/hardhat": "^6.1.6",
      "typechain": "^8.3.0",

      // Viem and Wagmi are already included
      "viem": "^1.19.9", // ✅ Already present
      "wagmi": "^1.4.7"   // ✅ Already present
    },
    "devDependencies": {
      // NEW: Add these for contract development
      "hardhat-gas-reporter": "^1.0.9",
      "@nomiclabs/hardhat-etherscan": "^3.1.7"
    }

}

5.3 Hardhat Configuration

File: hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
solidity: {
version: "0.8.19",
settings: {
optimizer: {
enabled: true,
runs: 200,
},
},
},
networks: {
sepolia: {
url: process.env.RPC_URL,
accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
},
mainnet: {
url: process.env.MAINNET_RPC_URL,
accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
},
},
etherscan: {
apiKey: process.env.ETHERSCAN_API_KEY,
},
};

export default config;

Phase 6: Database Migration

6.1 Replace In-Memory Storage

Current: src/lib/loanStorage.ts (in-memory)
New: src/lib/database.ts (persistent database)

// Option 1: PostgreSQL with Prisma
// File: prisma/schema.prisma
generator client {
provider = "prisma-client-js"
}

datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
}

model Loan {
id String @id
walletAddress String
customerId String
paymentMethodId String
borrowAmount Float
asset String
interestRate Float
ltvRatio Int
originalCreditLimit Float
preAuthAmount Float
status String
createdAt DateTime @default(now())
txHash String?
blockNumber String?
gasUsed String?
liquidatedAt DateTime?
repaidAt DateTime?

    @@map("loans")

}

model PreAuthData {
id String @id @default(cuid())
walletAddress String @unique
availableCredit Float
cardLastFour String
cardBrand String
status String
customerId String
paymentMethodId String
preAuthId String
setupIntentId String
createdAt DateTime @default(now())

    @@map("preauth_data")

}

File: src/lib/database.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma =
prisma;

export class DatabaseService {
async createLoan(loanData: any) {
return await prisma.loan.create({
data: loanData,
});
}

    async getLoan(loanId: string) {
      return await prisma.loan.findUnique({
        where: { id: loanId },
      });
    }

    async getWalletLoans(walletAddress: string) {
      return await prisma.loan.findMany({
        where: { walletAddress },
        orderBy: { createdAt: 'desc' },
      });
    }

    async updateLoan(loanId: string, updates: any) {
      return await prisma.loan.update({
        where: { id: loanId },
        data: updates,
      });
    }

    async storePreAuthData(walletAddress: string, preAuthData: any) {
      return await prisma.preAuthData.upsert({
        where: { walletAddress },
        update: preAuthData,
        create: { ...preAuthData, walletAddress },
      });
    }

    async getPreAuthData(walletAddress: string) {
      return await prisma.preAuthData.findUnique({
        where: { walletAddress },
      });
    }

}

Phase 7: Testing and Deployment

7.1 Contract Testing

File: test/CreditBridge.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { CreditBridge } from "../typechain-types";

describe("CreditBridge", function () {
let creditBridge: CreditBridge;
let owner: any;
let borrower: any;

    beforeEach(async function () {
      [owner, borrower] = await ethers.getSigners();

      const CreditBridge = await

ethers.getContractFactory("CreditBridge");
creditBridge = await CreditBridge.deploy();
await creditBridge.deployed();
});

    it("Should create a loan", async function () {
      const loanId = ethers.utils.formatBytes32String("loan1");
      const asset = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; //

Sepolia USDC
const amount = ethers.utils.parseUnits("1000", 6);
const preAuthAmount = ethers.utils.parseUnits("1250", 6);

      await expect(
        creditBridge.connect(borrower).createLoan(
          loanId,
          asset,
          amount,
          preAuthAmount,
          520, // 5.2% in basis points
          "cus_test123",
          "pm_test123"
        )
      ).to.emit(creditBridge, "LoanCreated");

      const loan = await creditBridge.loans(loanId);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.amount).to.equal(amount);
    });

    it("Should repay a loan", async function () {
      // Test loan repayment functionality
    });

    it("Should liquidate a loan", async function () {
      // Test liquidation functionality
    });

});

7.2 Deployment Scripts

File: scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await

deployer.getBalance()).toString());

    const CreditBridge = await ethers.getContractFactory("CreditBridge");
    const creditBridge = await CreditBridge.deploy();

    await creditBridge.deployed();

    console.log("CreditBridge deployed to:", creditBridge.address);

    // Verify contract on Etherscan
    console.log("Waiting for block confirmations...");
    await creditBridge.deployTransaction.wait(6);

    console.log("Verifying contract on Etherscan...");
    await hre.run("verify:verify", {
      address: creditBridge.address,
      constructorArguments: [],
    });

}

main().catch((error) => {
console.error(error);
process.exitCode = 1;
});

Phase 8: Migration Checklist

Pre-Migration Checklist

- Deploy and verify smart contracts on Sepolia testnet
- Set up PostgreSQL database and run Prisma migrations
- Configure environment variables with contract addresses
- Test contract interactions in isolated environment
- Set up monitoring and alerting for blockchain transactions
- Create backup of current demo data/sessions

Migration Steps

1. Deploy smart contracts to Sepolia
2. Update contract addresses in configuration
3. Replace demo mode checks with blockchain calls
4. Update all API routes to use blockchain service
5. Migrate frontend components to show real transaction data
6. Replace in-memory storage with database
7. Test complete flow: wallet → preauth → borrow → manage →
   charge/release
8. Set up transaction monitoring and error handling
9. Update documentation and user guides
10. Deploy to production

Post-Migration Validation

- Verify all loan operations work with real blockchain
- Confirm Stripe integration still functions correctly
- Test error handling for failed transactions
- Verify gas optimization and transaction costs
- Validate security measures and access controls
- Test with multiple users and concurrent transactions

Phase 9: Performance and Security Considerations

9.1 Gas Optimization

// Batch operations where possible
// Use events for off-chain indexing
// Implement circuit breakers for high gas prices

const GAS_PRICE_LIMIT = parseUnits("20", "gwei");

async function checkGasPrice(): Promise<boolean> {
const gasPrice = await publicClient.getGasPrice();
return gasPrice <= GAS_PRICE_LIMIT;
}

9.2 Error Handling

// Implement comprehensive error handling
export class BlockchainError extends Error {
constructor(
message: string,
public code: string,
public txHash?: string
) {
super(message);
this.name = 'BlockchainError';
}
}

// Retry logic for failed transactions
async function retryTransaction(
operation: () => Promise<string>,
maxRetries: number = 3
): Promise<string> {
for (let i = 0; i < maxRetries; i++) {
try {
return await operation();
} catch (error) {
if (i === maxRetries - 1) throw error;
await new Promise(resolve => setTimeout(resolve, 1000 \* (i + 1)));
}
}
throw new Error('Max retries exceeded');
}

9.3 Security Measures

// Rate limiting
// Input validation
// Access control
// Reentrancy protection (already in smart contract)
// Slippage protection for token operations

This comprehensive migration plan provides the detailed roadmap for
transitioning from the current demo implementation to a production-ready
blockchain-integrated application while maintaining the existing Stripe
functionality and user experience.
