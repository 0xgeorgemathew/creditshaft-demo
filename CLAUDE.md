# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CreditShaft Demo is a sophisticated multi-chain DeFi credit lending platform that enables users to use their credit cards as collateral for cryptocurrency borrowing. Users can borrow stablecoins (USDC, USDT, DAI) against credit card pre-authorizations without KYC requirements across Ethereum Sepolia and Avalanche Fuji testnets. The platform features real-time interest calculations, automated liquidation protection, and seamless multi-chain support.

## Development Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint code quality checks
npx tsc --noEmit     # TypeScript type checking (comprehensive validation)
```

## 🔗 Enhanced Chainlink Integration

For complete smart contract development and **direct Stripe API integration**, see:
📋 **[CHAINLINK_INTEGRATION_GUIDE.md](./CHAINLINK_INTEGRATION_GUIDE.md)**

This comprehensive guide includes:
- **Enhanced Smart Contract Architecture** with direct Stripe API integration
- **Chainlink Automation** for automated pre-auth expiry monitoring  
- **Chainlink Functions** calling Stripe API **directly** (no intermediary)
- **Data Architecture Guide** - On-chain vs Off-chain data distribution
- **Complete Type Definitions** for blockchain integration
- **Enhanced State Changes** to qualify for Chainlink prizes
- **Frontend integration** with webhook endpoints and real-time updates
- **Deployment instructions** and secrets management

### ✅ Key Enhancements Made:
- **Direct Stripe Integration**: Chainlink Functions → Stripe API (eliminates intermediary)
- **Enhanced Security**: Stripe keys stored in Chainlink secrets
- **Improved Performance**: Reduced latency and failure points
- **Complete Type Safety**: Full TypeScript integration for smart contracts

> ⚠️ **Hackathon Requirement**: Each project must use Chainlink to make state changes on blockchain. Simply reading from data feeds doesn't qualify for core prizes.

## Core Architecture

### Tech Stack

- **Next.js 15** with App Router and TypeScript
- **React 19** with modern hooks and real-time state management
- **Wagmi v2.15.5 + Viem v2.30.6** for Web3 integration (Multi-chain: Sepolia + Avalanche Fuji)
- **Reown AppKit v1.7.8** (formerly WalletConnect) for wallet connection and network management
- **Stripe v18.2.1** for credit card processing and pre-authorization
- **@stripe/react-stripe-js v3.7.0 + @stripe/stripe-js v7.3.1** for frontend payment integration
- **Tailwind CSS v4** with custom glassmorphism design system and extended animations
- **React Query v5.80.5** (@tanstack/react-query) for server state management
- **Lucide React v0.513.0** for modern iconography
- **Ethers v5.7.2** for additional blockchain utilities

### Multi-Chain Support

The platform supports two testnets with seamless switching:

- **Ethereum Sepolia** - Primary testnet with Etherscan integration (blue theme)
- **Avalanche Fuji** - Secondary testnet with SnowTrace integration (red-orange theme)

Network configuration in `src/config/web3.ts` with custom Fuji chain definition and automatic explorer URL generation.

### Application Flow

1. **Wallet Connection** via Reown AppKit with network selection and visual indicators
2. **Network Switching** between Sepolia and Avalanche Fuji with theme-aware UI
3. **Credit Card Pre-authorization** through Stripe Setup Intent with session persistence
4. **Loan Creation** with dynamic LTV ratio calculations (30-66.7%) and real-time risk assessment
5. **Real-time Loan Management** with interest accrual, countdown timers, and progress tracking
6. **Automated Liquidation Protection** with Chainlink monitoring and 1-hour buffer
7. **Explorer Integration** for transaction viewing with network-aware URLs

### Component Architecture

#### Core Components

- **`src/app/page.tsx`** - Central application orchestrator with tabbed interface and session management
- **`WalletConnection`** - Enhanced wallet connection with network-aware explorer links and visual feedback
- **`NetworkSwitcher`** - Dropdown for switching between supported networks with theme integration
- **`WalletAddress`** - Displays wallet address with copy functionality and explorer links
- **`StripePreAuth`** - Credit card pre-authorization interface with session restoration
- **`BorrowingInterface`** - Advanced loan creation with:
  - Dynamic risk assessment and liquidation price calculations
  - Interactive sliders with color-coded risk levels (Coverage Ratio: 30-66.7% LTV, Duration: 1-7 days)
  - Real-time ETH price feeds with Chainlink + CoinGecko fallback
  - Comprehensive loan metrics and visual feedback
- **`LoanDashboard`** - Comprehensive loan management with:
  - Real-time interest calculations down to the second
  - Progress tracking with visual countdown timers
  - Toast notifications for status updates
  - Automated session restoration indicators

#### Enhanced UI Components

All components follow glassmorphism design system with:
- **Consistent header heights**: WalletAddress and NetworkSwitcher components use `h-[52px]` height
- **Glassmorphism effects**: `glassmorphism` CSS class with backdrop blur and rgba transparency
- **Network-aware theming**: Color coding and branding per network
- **Tailwind animations**: fadeIn, slideUp, and glow animations with custom keyframes
- **CSS animations**: Floating background orbs with dynamic movement (28s, 35s, 42s cycles) in globals.css
- **Interactive sliders**: Custom thumb styling with risk-based color coding
- **Toast notifications**: Slide-in animations with status-specific styling

### API Structure

#### Core Endpoints
- **`/api/borrow/`** - Create loans with enhanced Stripe pre-auth integration and blockchain registration
- **`/api/eth-price/`** - ETH price feeds with Chainlink oracle primary + CoinGecko fallback
- **`/api/loans/`** - Loan retrieval and management with real-time calculations
- **`/api/loans/charge/`** - Capture credit card pre-auth for liquidation (legacy)
- **`/api/loans/release/`** - Release credit card hold (legacy)
- **`/api/liquidate/`** - Handle loan liquidations (legacy)

#### **NEW**: Enhanced Chainlink Integration
- **`/api/chainlink/webhook/`** - Receive smart contract events and update loan status
- **`/api/stripe/preauth/`** - Enhanced credit card pre-authorization with session management

All endpoints use structured logging with timestamps, request IDs, and comprehensive error handling.

### Key Data Models

#### Core Types (Located in `src/types/index.ts`)

**Credit Card Integration:**
- **PreAuthData** - Credit card authorization details with Stripe integration and session persistence
- **Loan** - Complete loan record linking crypto borrowing to credit card collateral

**Enhanced Blockchain Types:**
- **BlockchainLoan** - Enhanced loan interface with Chainlink automation fields
- **ChainlinkLoanData** - Smart contract data format for blockchain integration
- **ChainlinkAutomationJob** - Automation tracking and status monitoring
- **SmartContractConfig** - Network-specific smart contract configurations
- **ChainlinkFunctionResponse** - Response format for Chainlink Functions
- **ChainlinkEvent** - Event monitoring and webhook types

**Application State:**
- **CreditSummary** - Aggregated credit utilization metrics with real-time calculations
- **Network Configuration** - Chain-specific explorer URLs and metadata
- **Session Management** - Cross-tab persistence and restoration indicators

### Important Implementation Details

#### Logging Pattern

All API endpoints use enhanced structured logging:

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

#### Network Explorer Integration

Enhanced network-aware explorer functionality:

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

#### Session Management

Advanced session handling with:
- **Wallet-linked persistence** using `src/lib/loanStorage.ts`
- **Cross-tab synchronization** with real-time updates
- **Pre-auth data restoration** with visual success indicators
- **Network state preservation** during session lifecycle
- **Toast notification system** for user feedback

#### Interactive Slider System

Both Coverage Ratio and Duration sliders feature:
- **Risk-based color coding**: Green (safe) → Blue (moderate) → Amber (high risk)
- **Precise positioning**: Mathematical alignment between thumb and selected values
- **Continuous selection**: Full range selection with preset quick-select buttons
- **Real-time feedback**: Instant visual and numerical updates

**Coverage Ratio Slider:**
- Range: 30-66.7% LTV with 0.1% precision
- Color transitions: ≤40% (Green), 41-55% (Blue), 56%+ (Amber)
- Quick presets: 30%, 50%, 66.7%

**Duration Slider:**
- Range: 24-168 hours (1-7 days) with 12-hour increments
- Color transitions: ≤48h (Green), 49-120h (Blue), 121h+ (Amber)
- Quick presets: 24h (1 day), 72h (3 days), 168h (7 days)

#### Real-time Calculations

The platform features sophisticated real-time calculations:
- **Interest accrual**: Updated every second with precise timing
- **Countdown timers**: Visual progress indicators for loan expiry
- **Risk assessment**: Dynamic liquidation price calculations
- **Session restoration**: Automatic recovery of calculation state

### Header Layout Architecture

The main page header (`src/app/page.tsx`) uses strategic layout:

- **Left side**: Logo + Demo badge (grouped with `gap-6`)
- **Right side**: WalletAddress + NetworkSwitcher (extreme right positioning)
- **Z-index management**: NetworkSwitcher uses layered z-index system (10000-10001)
- **Responsive design**: Mobile-first approach with breakpoint handling

### Demo Mode Configuration

Currently runs in comprehensive demo mode with:

- **Mock smart contract interactions** (will be replaced with real Chainlink integration)
- **Simulated blockchain transactions** with realistic timing and feedback
- **Test Stripe payment methods** (use 4242424242424242 for testing)
- **Multi-network testing environment** with full feature parity
- **Chainlink automation simulation** via webhook endpoints and event handlers
- **Real-time price feeds** with actual oracle data and fallbacks

### Environment Variables

Environment variables may be required for full functionality. Check the project's `.env.local` file for specific configuration requirements:

```bash
# Stripe Integration (Required for payment processing)
STRIPE_SECRET_KEY=sk_test_...           # Stripe API secret key

# Application Configuration
NEXT_PUBLIC_DEMO_MODE=true              # Enable demo mode features
NEXT_PUBLIC_REOWN_PROJECT_ID=...        # Web3 connection project ID for wallet integration

# Chainlink Integration (Optional - for blockchain features)
CHAINLINK_ENCRYPTION_PASSWORD=...       # For secrets management
CHAINLINK_DON_ID=...                   # Data Oracle Network ID
```

**Note**: Always use test credentials in development. Never commit sensitive environment variables to version control.

## Development Notes

### Current Architecture Status
- **No test framework** currently configured - determine testing approach before adding tests
- **In-memory storage** used for demo - production would require persistent database with blockchain synchronization
- **Enhanced Stripe integration** with comprehensive pre-authorization management
- **Glassmorphism design system** with custom Tailwind utilities and animations
- **Multi-network support** with full Sepolia and Avalanche Fuji integration
- **Advanced z-index management** for complex dropdown and modal interactions

### File Structure Notes

#### Key Component Files
- **`src/config/web3.ts`** - Multi-chain configuration with custom Fuji definition and explorer integration
- **`src/components/NetworkSwitcher.tsx`** - Enhanced network switching with visual indicators and theme awareness
- **`src/components/WalletAddress.tsx`** - Address display with copy functionality and explorer links
- **`src/components/WalletConnection.tsx`** - Advanced wallet connection with network awareness and error handling
- **`src/components/BorrowingInterface.tsx`** - Comprehensive loan creation with advanced sliders and risk assessment
- **`src/components/LoanDashboard.tsx`** - Real-time loan management with progress tracking and notifications

#### Enhanced Chainlink Integration Files
- **`src/lib/chainlink-integration.ts`** - Core utilities for smart contract integration and data conversion
- **`src/lib/chainlink-price.ts`** - ETH price feeds with liquidation calculations and risk assessment
- **`src/app/api/chainlink/webhook/route.ts`** - Smart contract event handler with comprehensive logging
- **`src/app/api/eth-price/route.ts`** - Enhanced price feeds with Chainlink primary + CoinGecko fallback
- **`chainlink-functions/stripe-charge-simple.js`** - Direct Stripe API integration for Chainlink Functions

#### Design System Files
- **`src/app/globals.css`** - Comprehensive design system with:
  - Glassmorphism utilities (`background: rgba(255, 255, 255, 0.05)`, `backdrop-filter: blur(10px)`)
  - Dynamic floating animations with multiple cycles (float-dynamic-1: 28s, -2: 35s, -3: 42s)
  - Custom slider styling with webkit/moz thumb support
  - Button gradients with hover transformations and scale effects
  - Toast notification slide-in animations
  - Custom scrollbar theming for dark mode
- **`tailwind.config.ts`** - Extended Tailwind configuration with:
  - Custom animations: fadeIn (0.5s), slideUp (0.5s), glow (2s infinite alternate)
  - Custom keyframes for smooth transitions
  - Extended backdrop blur utilities
  - Gradient background utilities

#### Type Definition System
All types centralized in **`src/types/index.ts`** with comprehensive coverage:
- **Blockchain Integration**: ChainlinkLoanData, BlockchainLoan, SmartContractConfig
- **Automation System**: ChainlinkAutomationJob, ChainlinkEvent, ChainlinkFunctionResponse
- **Credit Card Processing**: PreAuthData with enhanced session management
- **Application State**: Loan, CreditSummary with real-time calculation support

#### Network-Specific Configurations
- **Sepolia**: Etherscan integration, blue color scheme, comprehensive Chainlink router configuration
- **Avalanche Fuji**: SnowTrace integration, red-orange color scheme, full Chainlink support
- **Automatic URL generation** based on active network with fallback handling
- **Theme-aware components** with network-specific styling and branding

#### Smart Contract Integration Utilities
- **Data conversion utilities** for wei, USD scaling, and precision handling
- **Validation functions** for comprehensive blockchain data verification
- **Contract ABI definitions** with TypeScript integration
- **Deployment script generators** for multi-network deployment
- **Network-specific Chainlink configurations** with router and registry addresses

## Recent Enhancements

### Performance Improvements
- **Optimized real-time calculations** with efficient interval management
- **Enhanced session management** with cross-tab synchronization
- **Improved toast notification system** with status-specific styling
- **Better error handling** with graceful degradation and user feedback

### User Experience Enhancements
- **Interactive slider system** with precise positioning and risk-based coloring
- **Real-time progress tracking** with countdown timers and visual indicators
- **Enhanced visual feedback** with loading states and success animations
- **Improved session restoration** with automatic recovery and status indicators

### Technical Improvements
- **Comprehensive type system** with full TypeScript coverage
- **Enhanced logging** with structured format and request tracking
- **Better error boundaries** with graceful fallback mechanisms
- **Optimized component architecture** with efficient re-rendering

# Important Instruction Reminders

**Core Development Principles:**
- **NEVER create files** unless absolutely necessary for achieving your goal
- **ALWAYS prefer editing** an existing file to creating a new one
- **NEVER proactively create documentation files** (*.md) or README files unless explicitly requested
- **Follow existing patterns** and maintain consistency with the established architecture
- **Preserve glassmorphism design system** and multi-chain theming
- **Maintain real-time calculation accuracy** and session management integrity
- **Use structured logging patterns** for all new API endpoints
- **Follow TypeScript best practices** with comprehensive type safety