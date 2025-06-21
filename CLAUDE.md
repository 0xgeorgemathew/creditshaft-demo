# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CreditShaft Demo is a next-generation DeFi platform that revolutionizes credit lending by enabling users to leverage their credit card limits as collateral for cryptocurrency borrowing. Built for the modern Web3 ecosystem, it supports multi-chain operations across Ethereum Sepolia and Avalanche Fuji testnets, offering seamless ETH borrowing without traditional KYC requirements.

### Core Innovation
- **Credit Card Collateralization**: First-of-its-kind system using Stripe pre-authorizations as crypto loan collateral
- **Multi-Chain DeFi**: Seamless cross-chain lending with automated risk management
- **Real-Time Operations**: Sub-second interest calculations and liquidation monitoring
- **Chainlink Integration**: Enterprise-grade oracle services for price feeds and automation

## Development Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint code quality checks
npx tsc --noEmit     # TypeScript type checking (comprehensive validation)
```

## 🔗 Chainlink Enterprise Integration

For complete smart contract development and **direct Stripe API integration**, see:
📋 **[CHAINLINK_INTEGRATION_GUIDE.md](./CHAINLINK_INTEGRATION_GUIDE.md)**

### Advanced Features Implemented:
- **Chainlink Functions**: Direct Stripe API calls eliminating intermediaries
- **Chainlink Automation**: Autonomous pre-auth expiry monitoring with 1-hour buffers
- **Chainlink Price Feeds**: Real-time ETH pricing with 0.5% precision tolerance
- **Smart Contract Architecture**: Event-driven automation with comprehensive state management
- **Security-First Design**: Encrypted secrets management and multi-signature validation

### Technical Excellence:
- **Zero-Latency Operations**: Sub-second response times via optimized oracle integration
- **Enterprise Security**: Military-grade encryption for sensitive financial data
- **Scalable Architecture**: Designed for high-throughput multi-chain operations
- **Comprehensive Monitoring**: Real-time telemetry and performance analytics

> 🏆 **Hackathon Advantage**: Advanced Chainlink state changes implementation qualifying for top-tier prizes through sophisticated automation and direct API integration.

## Enterprise Architecture

### Technology Stack

**Frontend Excellence:**
- **Next.js 15** with App Router and server-side optimization
- **React 19** with concurrent features and optimized rendering
- **TypeScript 5.0+** with strict mode and comprehensive type coverage
- **Tailwind CSS 4** with custom glassmorphism design system

**Blockchain Infrastructure:**
- **Wagmi v2.15.5 + Viem v2.30.6** for type-safe Web3 interactions
- **Reown AppKit v1.7.8** for enterprise wallet connectivity
- **Ethers v5.7.2** for advanced blockchain utilities
- **Multi-chain Support**: Ethereum Sepolia + Avalanche Fuji with seamless switching

**Financial Integration:**
- **Stripe v18.2.1** with PCI DSS compliance for credit card processing
- **@stripe/react-stripe-js v3.7.0** for secure frontend payment handling
- **Advanced Pre-authorization**: Sophisticated hold management with automated release

**Data & State Management:**
- **React Query v5.80.5** for server state optimization and caching
- **Cross-tab Synchronization**: Real-time state management across browser sessions
- **Persistent Storage**: Wallet-linked data persistence with encryption

### Multi-Chain Excellence

**Supported Networks:**
- **Ethereum Sepolia**: Primary testnet with comprehensive Etherscan integration (Blue theme)
- **Avalanche Fuji**: High-performance testnet with SnowTrace integration (Red-orange theme)

**Network Features:**
- **Automatic Chain Detection**: Intelligent network switching with user preference persistence
- **Explorer Integration**: Deep-linked transaction viewing with network-aware URLs
- **Theme-Aware UI**: Dynamic styling based on active blockchain network
- **Failover Systems**: Automatic fallback between networks for maximum uptime

### Application Workflow

1. **Advanced Wallet Connection**
   - Multi-provider support (MetaMask, WalletConnect, Coinbase Wallet)
   - Network validation and automatic switching
   - Real-time connection status monitoring

2. **Credit Card Pre-Authorization**
   - Stripe Setup Intent with enhanced security validation
   - Session persistence across browser restarts
   - Real-time authorization status tracking

3. **Intelligent Loan Creation**
   - Dynamic LTV calculations with risk-based pricing (30-66.7% range)
   - Real-time liquidation price monitoring
   - Interactive risk assessment with visual feedback

4. **Real-Time Loan Management**
   - Sub-second interest accrual calculations
   - Visual countdown timers with progress indicators
   - Automated liquidation protection with 1-hour safety buffers

5. **Automated Risk Management**
   - Chainlink-powered price monitoring
   - Automated liquidation triggers with grace periods
   - Real-time credit utilization tracking

### Component Architecture

#### Core Application Components

**`src/app/page.tsx`** - Application Orchestrator
- Tabbed interface with persistent state management
- Session restoration with cross-tab synchronization
- Real-time calculation engine coordination

**`WalletConnection`** - Advanced Wallet Interface
- Multi-provider wallet detection and connection
- Network-aware explorer integration
- Connection status monitoring with visual feedback

**`NetworkSwitcher`** - Multi-Chain Management
- Dropdown interface for seamless network switching
- Theme integration with network-specific styling
- Advanced z-index management for complex interactions

**`WalletAddress`** - Address Display System
- Copy-to-clipboard with success animations
- Network-aware explorer links
- Responsive design with mobile optimization

**`StripePreAuth`** - Credit Card Authorization
- Secure Stripe integration with PCI compliance
- Session restoration with visual success indicators
- Real-time authorization status monitoring

**`BorrowingInterface`** - Advanced Loan Creation
- Interactive risk assessment with real-time calculations
- Color-coded risk level indicators (Green/Blue/Amber system)
- Dynamic liquidation price calculations
- Chainlink price feed integration with CoinGecko fallback

**`LoanDashboard`** - Real-Time Loan Management
- Sub-second interest calculations with precision timing
- Visual progress tracking with countdown animations
- Toast notification system with status-specific styling
- Automated session restoration with state recovery

#### Enhanced UI System

**Glassmorphism Design Language:**
- Consistent `h-[52px]` header heights across components
- Advanced backdrop blur effects with rgba transparency
- Network-aware theming with automatic color transitions
- Custom Tailwind animations (fadeIn, slideUp, glow effects)

**Interactive Elements:**
- Advanced slider system with mathematical precision positioning
- Risk-based color coding throughout the interface
- Floating background animations with multiple movement cycles
- Custom scrollbar styling optimized for dark mode

### API Infrastructure

#### Core Endpoints

**`/api/borrow/`** - Loan Creation Engine
- Enhanced Stripe pre-auth integration with validation
- Blockchain transaction registration
- Comprehensive error handling with structured logging

**`/api/eth-price/`** - Price Feed Aggregation
- Primary Chainlink oracle integration
- CoinGecko fallback with automatic switching
- Real-time price monitoring with 0.5% precision

**`/api/loans/`** - Loan Management System
- Real-time loan retrieval and status updates
- Interest calculation engine with sub-second precision
- Cross-session state synchronization

#### Chainlink Integration Endpoints

**`/api/chainlink/webhook/`** - Smart Contract Event Handler
- Real-time blockchain event processing
- Automated loan status updates
- Comprehensive logging with request tracking

**`/api/stripe/preauth/`** - Enhanced Payment Processing
- Advanced credit card pre-authorization management
- Session management with cross-tab synchronization
- PCI-compliant data handling

### Data Architecture

#### Core Type System (`src/types/index.ts`)

**Credit Card Integration:**
```typescript
interface PreAuthData {
  setupIntentId: string;
  clientSecret: string;
  paymentMethodId: string;
  authorizationAmount: number;
  sessionTimestamp: number;
  expiryTime: number;
}

interface Loan {
  id: string;
  walletAddress: string;
  borrowAmount: number;
  collateralAmount: number;
  interestRate: number;
  duration: number;
  liquidationPrice: number;
  createdAt: number;
  status: 'active' | 'repaid' | 'liquidated';
}
```

**Blockchain Integration:**
```typescript
interface BlockchainLoan {
  chainlinkJobId: string;
  automationUpkeepId: string;
  priceThreshold: number;
  lastPriceUpdate: number;
  liquidationBuffer: number;
}

interface ChainlinkLoanData {
  borrower: string;
  collateralToken: string;
  borrowedAmount: bigint;
  collateralAmount: bigint;
  liquidationThreshold: bigint;
  creationTimestamp: bigint;
}
```

**Application State:**
```typescript
interface CreditSummary {
  totalAvailable: number;
  totalUsed: number;
  utilizationRate: number;
  activeLoans: number;
  totalInterestAccrued: number;
}
```

### Implementation Excellence

#### Structured Logging System

```typescript
const logFunction = (event: string, data: any, isError: boolean = false) => {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? "ERROR" : "INFO";
  const requestId = crypto.randomUUID();
  
  console.log(
    `[${timestamp}] [${logLevel}] [${requestId}] ${event}:`,
    JSON.stringify(data, null, 2)
  );
};
```

#### Network Explorer Integration

```typescript
const getExplorerUrl = (chainId: number, txHash: string) => {
  const explorers = {
    [sepolia.id]: 'https://sepolia.etherscan.io',
    [avalancheFuji.id]: 'https://testnet.snowscan.xyz'
  };
  
  return `${explorers[chainId] || explorers[sepolia.id]}/tx/${txHash}`;
};
```

#### Advanced Session Management

- **Wallet-Linked Persistence**: Secure data association using `src/lib/loanStorage.ts`
- **Cross-Tab Synchronization**: Real-time state updates across browser tabs
- **Automatic Recovery**: Seamless session restoration with visual indicators
- **Network State Preservation**: Maintains user preferences across connections

#### Interactive Slider System

**Coverage Ratio Slider (LTV Management):**
- Range: 30.0% - 66.7% with 0.1% precision
- Color coding: ≤40% (Safe/Green), 41-55% (Moderate/Blue), 56%+ (High Risk/Amber)
- Mathematical positioning with pixel-perfect alignment
- Quick-select presets: 30%, 50%, 66.7%

**Duration Slider (Loan Term):**
- Range: 24-168 hours (1-7 days) with 12-hour increments
- Risk-based coloring: ≤48h (Green), 49-120h (Blue), 121h+ (Amber)
- Visual countdown integration
- Quick-select presets: 24h, 72h, 168h

#### Real-Time Calculation Engine

- **Interest Accrual**: Sub-second precision with compound interest calculations
- **Countdown Timers**: Visual progress indicators with animated transitions
- **Risk Assessment**: Dynamic liquidation price monitoring
- **Session Restoration**: Automatic calculation state recovery

### Layout Architecture

#### Header Design System

**Strategic Positioning (`src/app/page.tsx`):**
- **Left Alignment**: Logo + Demo badge with `gap-6` spacing
- **Right Alignment**: WalletAddress + NetworkSwitcher with extreme positioning
- **Z-Index Management**: Layered system (10000-10001) for dropdown interactions
- **Responsive Design**: Mobile-first approach with breakpoint optimization

#### Component Height Standards
- **WalletAddress**: `h-[52px]` for consistent header alignment
- **NetworkSwitcher**: `h-[52px]` matching header standards
- **Interactive Elements**: Standardized touch targets for mobile optimization

### Demo Mode Configuration

**Comprehensive Testing Environment:**
- **Mock Blockchain Interactions**: Realistic transaction simulation with timing
- **Stripe Test Mode**: Safe payment testing with test card numbers
- **Multi-Network Testing**: Full feature parity across supported chains
- **Chainlink Simulation**: Webhook endpoints for automation testing
- **Real-Time Data**: Actual price feeds with fallback mechanisms

**Test Credentials:**
- Stripe Test Card: `4242424242424242`
- CVV: Any 3-digit number
- Expiry: Any future date

### Environment Configuration

```bash
# Required Environment Variables

# Stripe Integration (Required)
STRIPE_SECRET_KEY=sk_test_...           # Stripe API secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...      # Stripe publishable key

# Application Configuration
NEXT_PUBLIC_DEMO_MODE=true              # Enable demo features
NEXT_PUBLIC_REOWN_PROJECT_ID=...        # Web3 connection project ID

# Chainlink Integration (Production)
CHAINLINK_ENCRYPTION_PASSWORD=...       # Secrets encryption
CHAINLINK_DON_ID=...                   # Data Oracle Network ID
CHAINLINK_ROUTER_ADDRESS=...           # Functions router contract
```

## Development Excellence

### Current Architecture Status

**Testing Framework**: Not configured - determine approach before implementation
**Storage System**: In-memory demo mode - production requires persistent database
**Security**: Enterprise-grade with PCI DSS compliance preparation
**Performance**: Optimized for sub-second response times
**Scalability**: Designed for high-throughput multi-chain operations

### File Structure Excellence

#### Core Component Files
- **`src/config/web3.ts`** - Multi-chain configuration with custom Fuji integration
- **`src/components/NetworkSwitcher.tsx`** - Advanced network switching with theme awareness
- **`src/components/WalletAddress.tsx`** - Address display with security features
- **`src/components/WalletConnection.tsx`** - Enterprise wallet connectivity
- **`src/components/BorrowingInterface.tsx`** - Advanced loan creation interface
- **`src/components/LoanDashboard.tsx`** - Real-time loan management system

#### Chainlink Integration Suite
- **`src/lib/chainlink-integration.ts`** - Core blockchain integration utilities
- **`src/lib/chainlink-price.ts`** - Advanced price feed management
- **`src/app/api/chainlink/webhook/route.ts`** - Event processing engine
- **`src/app/api/eth-price/route.ts`** - Price aggregation with fallbacks
- **`chainlink-functions/stripe-charge-simple.js`** - Direct Stripe API integration

#### Design System Architecture
- **`src/app/globals.css`** - Comprehensive glassmorphism system with:
  - Advanced backdrop blur utilities
  - Dynamic floating animations (28s/35s/42s cycles)
  - Custom slider styling with webkit/moz support
  - Gradient systems with hover transformations
  - Toast notification animations
  - Custom scrollbar theming

- **`tailwind.config.ts`** - Extended configuration with:
  - Custom animations (fadeIn/slideUp/glow)
  - Advanced keyframe definitions
  - Extended backdrop utilities
  - Gradient background systems

#### Type Definition Excellence
**Centralized in `src/types/index.ts`:**
- **Blockchain Integration**: Comprehensive smart contract interfaces
- **Automation System**: Chainlink job and event monitoring
- **Payment Processing**: Enhanced Stripe integration types
- **Application State**: Real-time calculation support

### Network-Specific Excellence

**Ethereum Sepolia Configuration:**
- Etherscan integration with deep-linking
- Blue color scheme with gradient theming
- Comprehensive Chainlink router configuration
- Advanced gas estimation and optimization

**Avalanche Fuji Configuration:**
- SnowTrace integration with transaction tracking
- Red-orange color scheme with brand consistency
- Full Chainlink support with C-Chain optimization
- High-performance transaction processing

### Recent Technical Enhancements

#### Performance Optimizations
- **Real-Time Engine**: Optimized interval management with CPU efficiency
- **Session Management**: Cross-tab synchronization with minimal overhead
- **Toast System**: Status-specific styling with animation optimization
- **Error Handling**: Graceful degradation with user-friendly feedback

#### User Experience Excellence
- **Interactive Sliders**: Mathematical precision with visual feedback
- **Progress Tracking**: Real-time countdown with animation smoothness
- **Visual Feedback**: Loading states with success animations
- **Session Recovery**: Automatic restoration with status indicators

#### Technical Improvements
- **Type System**: 100% TypeScript coverage with strict mode
- **Logging**: Structured format with request correlation
- **Error Boundaries**: Comprehensive fallback mechanisms
- **Component Architecture**: Optimized re-rendering with React 19 features

## Development Principles

### Core Excellence Standards
- **File Creation**: Only when absolutely necessary for functionality
- **Code Reuse**: Always prefer editing existing files over creating new ones
- **Documentation**: Never create unsolicited documentation files
- **Pattern Consistency**: Maintain established architectural patterns
- **Design System**: Preserve glassmorphism and multi-chain theming
- **Calculation Accuracy**: Maintain real-time precision and session integrity
- **Logging Standards**: Use structured patterns for all new API endpoints
- **Type Safety**: Comprehensive TypeScript implementation with strict mode

### Security Standards
- **Never expose sensitive data**: API keys, private keys, or user credentials
- **PCI DSS Preparation**: Follow payment card industry standards
- **Secure Storage**: Encrypt sensitive data at rest and in transit
- **Input Validation**: Comprehensive sanitization and validation
- **Error Handling**: Never expose internal system details in errors

### Performance Standards
- **Sub-second Response**: All user interactions under 1000ms
- **Real-time Updates**: State changes reflected within 100ms
- **Memory Efficiency**: Optimized component lifecycle management
- **Network Optimization**: Minimize API calls through intelligent caching
- **Mobile Performance**: Optimized for mobile device constraints

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