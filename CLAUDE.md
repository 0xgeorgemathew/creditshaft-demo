# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CreditShaft Demo is a multi-chain DeFi credit lending platform that allows users to use their credit cards as collateral for crypto borrowing. Users can borrow stablecoins (USDC, USDT, DAI) against credit card pre-authorizations without KYC requirements across Ethereum Sepolia and Avalanche Fuji testnets.

## Development Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint code quality checks
npx tsc --noEmit     # TypeScript type checking
```

## Core Architecture

### Tech Stack

- **Next.js 15** with App Router and TypeScript
- **Wagmi v2 + Viem v2** for Web3 integration (Multi-chain: Sepolia + Avalanche Fuji)
- **Reown AppKit** for wallet connection and network management
- **Stripe** for credit card processing and pre-authorization
- **Tailwind CSS v4** with custom glassmorphism design system
- **React Query** for server state management

### Multi-Chain Support

The platform supports two testnets with seamless switching:

- **Ethereum Sepolia** - Primary testnet with Etherscan integration
- **Avalanche Fuji** - Secondary testnet with SnowTrace integration

Network configuration in `src/config/web3.ts` with custom Fuji chain definition.

### Application Flow

1. Wallet connection via Wagmi/Reown AppKit with network selection
2. Network switching between Sepolia and Avalanche Fuji
3. Credit card pre-authorization through Stripe Setup Intent
4. Loan creation with LTV ratio calculations
5. Loan management (charge/release operations)
6. Explorer integration for transaction viewing

### Component Architecture

#### Core Components

- **`WalletConnection`** - Handles wallet connection with network-aware explorer links
- **`NetworkSwitcher`** - Dropdown for switching between supported networks
- **`WalletAddress`** - Displays wallet address with copy and explorer functionality
- **`StripePreAuth`** - Credit card pre-authorization interface
- **`BorrowingInterface`** - Loan creation and management
- **`LoanDashboard`** - Comprehensive loan management dashboard

#### UI Components

All components follow glassmorphism design system with:
- Consistent `h-[52px]` height for header elements
- `glassmorphism` CSS class for backdrop effects
- Network-aware color coding and branding

### API Structure

- `/api/stripe/preauth/` - Credit card pre-authorization setup
- `/api/borrow/` - Create loans against credit card collateral
- `/api/loans/` - Loan management and retrieval
- `/api/loans/charge/` - Capture credit card pre-auth for liquidation
- `/api/loans/release/` - Release credit card hold
- `/api/liquidate/` - Handle loan liquidations

### Key Data Models

- **PreAuthData** - Credit card authorization details with Stripe integration
- **Loan** - Complete loan record linking crypto borrowing to credit card collateral
- **CreditSummary** - Aggregated credit utilization metrics
- **Network Configuration** - Chain-specific explorer URLs and metadata

## Important Implementation Details

### Logging Pattern

All API endpoints use structured logging with timestamps and request IDs:

```typescript
const logFunction = (event: string, data: any, isError: boolean = false) => {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? "ERROR" : "INFO";
  console.log(
    `[${timestamp}] [MODULE-${logLevel}] ${event}:`,
    JSON.stringify(data, null, 2)
  );
};
```

### Network Explorer Integration

Network-aware explorer functionality with automatic redirection:

```typescript
const getExplorerUrl = (chainId: number, address: string) => {
  switch (chainId) {
    case sepolia.id:
      return `https://sepolia.etherscan.io/address/${address}`;
    case avalancheFuji.id:
      return `https://testnet.snowscan.xyz/address/${address}`;
    default:
      return `https://sepolia.etherscan.io/address/${address}`;
  }
};
```

### Session Management

- In-memory storage using `src/lib/loanStorage.ts` for demo purposes
- Wallet address as session key
- Pre-auth data persistence across page refreshes
- Network state preservation during session

### Header Layout Architecture

The main page header (`src/app/page.tsx:189-215`) uses a strategic layout:

- **Left side**: Logo + Demo badge (grouped with `gap-6`)
- **Right side**: WalletAddress + NetworkSwitcher (extreme right positioning)
- **Z-index management**: NetworkSwitcher uses `zIndex: 10000` wrapper and `zIndex: 10001` dropdown

### Demo Mode Configuration

Currently runs in demo mode with:

- Mock smart contract interactions
- Simulated blockchain transactions
- Test Stripe payment methods (use 4242424242424242)
- Multi-network testing environment

### Environment Variables Required

```
STRIPE_SECRET_KEY=sk_test_...           # Stripe API key
NEXT_PUBLIC_DEMO_MODE=true              # Enable demo mode
NEXT_PUBLIC_REOWN_PROJECT_ID=...        # Web3 connection project ID
```

## Development Notes

- **No test framework** currently configured - determine testing approach before adding tests
- **In-memory storage** used for demo - production would require persistent database
- **Client-side Stripe integration** for demo purposes - production should use server-side processing
- **Glassmorphism design system** with custom Tailwind utilities in globals.css
- **Multi-network support** - Sepolia and Avalanche Fuji testnets
- **High z-index management** required for dropdown components in glassmorphic layouts

## File Structure Notes

### Key Component Files
- `src/config/web3.ts` - Multi-chain configuration with custom Fuji definition
- `src/components/NetworkSwitcher.tsx` - Network switching dropdown with visual indicators
- `src/components/WalletAddress.tsx` - Address display with copy/explorer functionality
- `src/components/WalletConnection.tsx` - Enhanced wallet connection with network awareness

### Network-Specific Configurations
- Sepolia: Etherscan integration, blue color scheme
- Avalanche Fuji: SnowTrace integration, red-orange color scheme
- Automatic explorer URL generation based on active network
