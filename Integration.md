# CreditShaft Integration Guide for Next.js

## 🚨 IMPORTANT: Current Contract Standards

This document reflects the **LATEST** version of the CreditShaft smart contracts. If you're working with an older version or documentation, **IGNORE** old references and follow this guide exclusively.

### Key Changes from Previous Versions:

- ✅ Simplified PreAuth charging with Chainlink Functions
- ✅ Automated expiry handling via Chainlink Automation
- ✅ Position status independent of PreAuth status
- ✅ Real preAuthAmount calculation (150% of borrowed amount)
- ✅ Production-ready automation (no test modes)

---

## 📋 Table of Contents

1. [Contract Overview](#contract-overview)
2. [Core Functions](#core-functions)
3. [Position Management](#position-management)
4. [Integration Requirements](#integration-requirements)
5. [Frontend Components](#frontend-components)
6. [Data Structures](#data-structures)
7. [Event Handling](#event-handling)
8. [Error Handling](#error-handling)
9. [Deployment Information](#deployment-information)

---

## 🏗️ Contract Overview

### Primary Contracts

#### **CreditShaftLeverage.sol** - Main Trading Contract

- **Purpose**: Leveraged LINK trading with Stripe payment card collateral
- **Features**: 2x-5x leverage, automated PreAuth charging, position management
- **Network**: Sepolia (testnet)

#### **CreditShaftCore.sol** - Flash Loan Provider

- **Purpose**: USDC liquidity pool for flash loans
- **Features**: LP rewards, flash loan fees, automated profit distribution

#### **SimplifiedLPToken.sol** - Liquidity Provider Tokens

- **Purpose**: Represents LP shares in the flash loan pool
- **Features**: Proportional rewards, exchange rate tracking

---

## ⚡ Core Functions

### 1. **Opening Positions**

```solidity
function openLeveragePosition(
    uint256 leverageRatio,
    uint256 collateralLINK,
    uint256 expiryTime,
    string calldata stripePaymentIntentId,
    string calldata stripeCustomerId,
    string calldata stripePaymentMethodId
) external
```

**Parameters:**

- `leverageRatio`: 150-500 (1.5x to 5x leverage, scaled by 100)
- `collateralLINK`: User's LINK collateral (18 decimals)
- `expiryTime`: Absolute timestamp when PreAuth expires (block.timestamp + duration)
- `stripePaymentIntentId`: Stripe payment intent ID for backup collateral
- `stripeCustomerId`: Stripe customer ID
- `stripePaymentMethodId`: Stripe payment method ID

**Requirements:**

- User must approve LINK tokens to contract
- Leverage ratio between 150-500 (1.5x-5x)
- Valid Stripe payment details
- No existing active position

**Process:**

1. Validates leverage ratio (150-500) and collateral amount
2. Transfers user's LINK collateral to contract
3. Calculates preAuthAmount = (borrowedAmount \* 150%) / 100
4. Executes flash loan to get leveraged LINK exposure
5. Stores position with absolute PreAuth expiry timestamp
6. Emits `PositionOpened` event

### 2. **Closing Positions**

```solidity
function closeLeveragePosition() external
```

**Requirements:**

- Must have active position (`isActive = true`)
- **No PreAuth restrictions** - positions can be closed regardless of PreAuth status

**Process:**

1. Validates position exists and is active
2. Executes flash loan to unwind position
3. Repays Aave debt, withdraws collateral
4. Calculates profit/loss and LP share (20%)
5. Returns remaining funds to user
6. Deletes position struct
7. Emits `PositionClosed` event

### 3. **PreAuth Charging** (Automated)

```solidity
function chargeExpiredPreAuth(address user) external
```

**Features:**

- **Public function** - anyone can trigger for expired positions
- **Chainlink Automation** handles this automatically
- **Independent of position trading** - positions remain active regardless

---

## 📊 Position Management

### Position Structure

```solidity
struct Position {
    uint256 collateralLINK;        // User's initial LINK (18 decimals)
    uint256 leverageRatio;         // 2x, 3x, etc (scaled by 100)
    uint256 borrowedUSDC;          // Aave debt (6 decimals)
    uint256 suppliedLINK;          // Total LINK in Aave (18 decimals)
    uint256 entryPrice;            // LINK price at entry (8 decimals)
    uint256 preAuthAmount;         // 150% of borrowed amount (6 decimals)
    uint256 openTimestamp;         // When position opened
    uint256 preAuthExpiryTime;     // When PreAuth can be charged
    bool isActive;                 // Position can be traded/closed
    bool preAuthCharged;           // Payment processing status
    string stripePaymentIntentId;  // Stripe payment intent
    string stripeCustomerId;       // Stripe customer
    string stripePaymentMethodId;  // Stripe payment method
}
```

### Key Position States

#### **Active Position**: `isActive = true`

- ✅ Can be closed anytime
- ✅ Tradeable regardless of PreAuth status
- ✅ Earning/losing money based on LINK price

#### **PreAuth Status** (Independent of Position):

- `preAuthCharged = false`: PreAuth available for charging if expired
- `preAuthCharged = true`: PreAuth already charged via Stripe

### Viewing Functions

```solidity
// Get full position details
function positions(address user) external view returns (Position memory)

// Check if position ready for PreAuth charging
function isReadyForPreAuthCharge(address user) external view returns (bool)

// Get current LINK price
function getLINKPrice() external view returns (uint256)
```

---

## 🔧 Integration Requirements

### Frontend Dependencies

```typescript
// Required packages
"ethers": "^5.7.2"           // Blockchain interaction
"@stripe/stripe-js": "^1.54.0"  // Stripe integration
"web3-react": "^8.2.0"      // Wallet connection
"@chainlink/contracts": "^0.6.1"  // For ABIs if needed
```

### Environment Variables

```env
# Blockchain
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_CHAIN_ID=11155111

# Contract Addresses (from deployments/sepolia.json)
NEXT_PUBLIC_CREDIT_SHAFT_LEVERAGE=0x...
NEXT_PUBLIC_CREDIT_SHAFT_CORE=0x...
NEXT_PUBLIC_LP_TOKEN=0x...

# Token Addresses
NEXT_PUBLIC_LINK_TOKEN=0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5
NEXT_PUBLIC_USDC_TOKEN=0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

---

## 🎨 Frontend Components

### 1. **Open Position Component**

```typescript
interface OpenPositionProps {
  userLinkBalance: string;
  currentLinkPrice: string;
  maxLeverage: number; // 500 (5x)
  minLeverage: number; // 150 (1.5x)
}

interface OpenPositionForm {
  collateralAmount: string; // LINK amount to collateral
  leverageRatio: number; // 150-500 (1.5x-5x)
  expiryDuration: number; // Seconds until PreAuth expires
  paymentMethod: string; // Selected Stripe payment method
}
```

**Required UI Elements:**

- LINK collateral input (with balance check)
- Leverage slider (1.5x - 5x)
- PreAuth expiry duration selector
- Stripe payment method selector
- Preview calculation showing:
  - Total LINK exposure
  - Borrowed USDC amount
  - PreAuth amount (150% of borrowed)
  - Liquidation price estimate

### 2. **Position Dashboard Component**

```typescript
interface PositionDashboard {
  position: Position | null;
  currentLinkPrice: string;
  isExpired: boolean;
  timeRemaining: number; // PreAuth time remaining in seconds
}

interface PositionStats {
  unrealizedPnL: string; // Current profit/loss
  unrealizedPnLPercent: string; // P&L percentage
  totalExposure: string; // Total LINK exposure
  borrowedAmount: string; // USDC debt
  collateralValue: string; // Collateral value in USD
  liquidationPrice: string; // Estimated liquidation price
  preAuthStatus: "active" | "expired" | "charged";
}
```

**Dashboard Sections:**

- **Position Overview**: Entry price, current price, P&L
- **Exposure Details**: Collateral, total exposure, leverage ratio
- **Risk Metrics**: LTV ratio, liquidation price, margin health
- **PreAuth Status**: Time remaining, charge status, backup collateral
- **Actions**: Close position button (always available if active)

### 3. **Manage Positions Table**

```typescript
interface PositionTableRow {
  userAddress: string;
  collateral: string; // LINK amount
  exposure: string; // Total LINK exposure
  leverage: string; // "2.5x", "3x", etc
  entryPrice: string; // Entry LINK price
  currentPrice: string; // Current LINK price
  unrealizedPnL: string; // Current P&L
  preAuthStatus: string; // "Active", "Expired", "Charged"
  timeRemaining: string; // "2 hours", "Expired", etc
  isActive: boolean;
}
```

**Table Features:**

- Sortable columns (P&L, leverage, time remaining)
- Filter by status (Active, Expired PreAuth, Charged)
- Real-time price updates
- Individual close buttons
- Export functionality

---

## 📡 Data Structures

### Contract Constants

```typescript
const CONTRACT_CONSTANTS = {
  MAX_LEVERAGE: 500, // 5x
  MIN_LEVERAGE: 150, // 1.5x
  PREAUTH_MULTIPLIER: 150, // 150% of borrowed amount
  LP_PROFIT_SHARE: 2000, // 20% (scaled by 100)
  SAFE_LTV: 6500, // 65% (scaled by 100)

  // Decimals
  LINK_DECIMALS: 18,
  USDC_DECIMALS: 6,
  PRICE_FEED_DECIMALS: 8,
};
```

### Helper Functions

```typescript
// Convert LINK price (8 decimals) to human readable
function formatLinkPrice(price: string): string {
  return (Number(price) / 1e8).toFixed(2);
}

// Convert LINK amount (18 decimals) to human readable
function formatLinkAmount(amount: string): string {
  return (Number(amount) / 1e18).toFixed(4);
}

// Convert USDC amount (6 decimals) to human readable
function formatUsdcAmount(amount: string): string {
  return (Number(amount) / 1e6).toFixed(2);
}

// Calculate leverage from ratio (200 -> "2.0x")
function formatLeverage(ratio: number): string {
  return (ratio / 100).toFixed(1) + "x";
}

// Convert preAuthAmount to Stripe cents
function toStripeCents(preAuthAmount: string): number {
  return Math.floor(Number(preAuthAmount) / 10000);
}
```

---

## 📢 Event Handling

### Key Events to Monitor

```typescript
// Position Events
interface PositionOpenedEvent {
  user: string;
  leverage: number;
  collateral: string;
  totalExposure: string;
}

interface PositionClosedEvent {
  user: string;
  profit: string;
  lpShare: string;
}

// PreAuth Events
interface PreAuthChargeInitiatedEvent {
  user: string;
  initiator: string;
  requestId: string;
  amount: string;
}

interface PreAuthChargedEvent {
  user: string;
  amount: string;
}

interface PreAuthChargeFailedEvent {
  user: string;
  requestId: string;
  reason: string;
}

// Automation Events
interface AutomationExecutedEvent {
  counter: number;
  totalAttempts: number;
  successful: number;
  failed: number;
}
```

### Event Listeners Setup

```typescript
// Listen for position events
contract.on(
  "PositionOpened",
  (user, leverage, collateral, totalExposure, event) => {
    // Update UI for new position
    updatePositionDashboard(user);
  }
);

contract.on("PositionClosed", (user, profit, lpShare, event) => {
  // Update UI for closed position
  removePositionFromDashboard(user);
});

contract.on("PreAuthCharged", (user, amount, event) => {
  // Update PreAuth status in UI
  updatePreAuthStatus(user, "charged");
});
```

---

## ⚠️ Error Handling

### Common Error Scenarios

```typescript
// Position Opening Errors
const OPEN_POSITION_ERRORS = {
  "Position already active":
    "You already have an active position. Close it first.",
  "Invalid leverage ratio": "Leverage must be between 1.5x and 5x",
  "Invalid collateral amount": "Collateral amount must be greater than 0",
  "Insufficient allowance": "Please approve LINK tokens first",
  "Insufficient balance": "Insufficient LINK balance",
};

// Position Closing Errors
const CLOSE_POSITION_ERRORS = {
  "No active position": "You don't have an active position to close",
  "Flash loan failed": "Unable to execute flash loan. Try again.",
  "Insufficient liquidity": "Insufficient liquidity in the pool",
};

// PreAuth Errors
const PREAUTH_ERRORS = {
  "Pre-auth already charged": "PreAuth has already been charged",
  "Pre-auth not expired": "PreAuth has not expired yet",
  "Position not active": "Position is not active",
};
```

### Error Handler Implementation

```typescript
function handleContractError(error: any): string {
  // Parse revert reason from error
  const revertReason = error?.reason || error?.data?.message || error?.message;

  // Match against known errors
  for (const [contractError, userMessage] of Object.entries(
    OPEN_POSITION_ERRORS
  )) {
    if (revertReason?.includes(contractError)) {
      return userMessage;
    }
  }

  // Generic fallback
  return "Transaction failed. Please try again.";
}
```

---

## 🚀 Deployment Information

### Sepolia Testnet Addresses

```typescript
const SEPOLIA_ADDRESSES = {
  // Core Contracts (load from deployments/sepolia.json)
  CREDIT_SHAFT_LEVERAGE: "0x...", // Main trading contract
  CREDIT_SHAFT_CORE: "0x...", // Flash loan pool
  LP_TOKEN: "0x...", // LP tokens

  // Dependencies
  LINK_TOKEN: "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5",
  USDC_TOKEN: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  AAVE_POOL: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  UNISWAP_ROUTER: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008",
  LINK_PRICE_FEED: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
};
```

### Contract ABIs

Load ABIs from the build artifacts:

```typescript
import CreditShaftLeverageABI from "./abis/CreditShaftLeverage.json";
import CreditShaftCoreABI from "./abis/CreditShaftCore.json";
import SimplifiedLPTokenABI from "./abis/SimplifiedLPToken.json";
import ERC20ABI from "./abis/ERC20.json";
```

---

## 📝 Notes for Developers

### Critical Implementation Points

1. **Position Independence**: Always emphasize that positions can be closed regardless of PreAuth status
2. **Real-time Updates**: Implement WebSocket or periodic polling for price and position updates
3. **PreAuth Clarity**: Make it clear that PreAuth is backup collateral, not a trading restriction
4. **Error UX**: Provide clear, actionable error messages for failed transactions
5. **Mobile Responsive**: Ensure trading interface works on mobile devices
6. **Security**: Validate all user inputs and implement proper error boundaries

### Performance Considerations

- Cache contract calls where possible (constants, user balances)
- Batch multiple contract reads using multicall
- Implement optimistic UI updates for better UX
- Use proper loading states during transaction processing

---

## 🔗 Additional Resources

- **Smart Contract Source**: `/src/CreditShaftLeverage.sol`
- **Deployment Scripts**: `/script/` directory
- **Test Scripts**: Use Foundry for contract testing
- **ABI Generation**: `forge build` generates ABIs in `/out/`
- **Verification**: Contracts verified on Sepolia Etherscan

---
