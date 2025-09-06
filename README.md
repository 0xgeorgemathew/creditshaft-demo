# CreditShaft Demo

A next-generation DeFi platform that revolutionizes credit lending by enabling users to leverage their credit card limits as collateral for cryptocurrency borrowing. Built for the modern Web3 ecosystem, it supports multi-chain operations across Ethereum Sepolia and Avalanche Fuji testnets, offering seamless ETH borrowing without traditional KYC requirements.

## 🚀 Core Innovation

- **Credit Card Collateralization**: First-of-its-kind system using Stripe pre-authorizations as crypto loan collateral
- **Multi-Chain DeFi**: Seamless cross-chain lending with automated risk management
- **Real-Time Operations**: Sub-second interest calculations and liquidation monitoring
- **Chainlink Integration**: Enterprise-grade oracle services for price feeds and automation

## 🛠️ Technology Stack

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

## 🏗️ Getting Started

### Prerequisites

- Node.js 18+ and npm
- Stripe account for payment processing
- Wallet (MetaMask, WalletConnect, etc.) for blockchain interaction

### Installation

```bash
# Clone the repository
git clone https://github.com/0xgeorgemathew/creditshaft-demo.git
cd creditshaft-demo

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Configure your Stripe keys and other environment variables
```

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

### Development Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint code quality checks
npx tsc --noEmit     # TypeScript type checking (comprehensive validation)
```

Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

## 🌐 Supported Networks

**Ethereum Sepolia:**
- Primary testnet with comprehensive Etherscan integration
- Blue color scheme with gradient theming
- Comprehensive Chainlink router configuration

**Avalanche Fuji:**
- High-performance testnet with SnowTrace integration
- Red-orange color scheme with brand consistency
- Full Chainlink support with C-Chain optimization

## 🔗 Chainlink Enterprise Integration

For complete smart contract development and **direct Stripe API integration**, see:
📋 **[CHAINLINK_INTEGRATION_GUIDE.md](./CHAINLINK_INTEGRATION_GUIDE.md)**

### Advanced Features Implemented:
- **Chainlink Functions**: Direct Stripe API calls eliminating intermediaries
- **Chainlink Automation**: Autonomous pre-auth expiry monitoring with 1-hour buffers
- **Chainlink Price Feeds**: Real-time ETH pricing with 0.5% precision tolerance
- **Smart Contract Architecture**: Event-driven automation with comprehensive state management
- **Security-First Design**: Encrypted secrets management and multi-signature validation

## 🎯 Application Workflow

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

## 🧪 Demo Mode

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

## 📚 Additional Resources

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive development guide and architecture documentation
- **[Integration.md](./Integration.md)** - Smart contract integration guide
- **[Report.md](./Report.md)** - Blockchain integration migration report

## 🔐 Security Standards

- **PCI DSS Preparation**: Follow payment card industry standards
- **Secure Storage**: Encrypt sensitive data at rest and in transit
- **Input Validation**: Comprehensive sanitization and validation
- **Error Handling**: Never expose internal system details in errors

## 📄 License

This project is for demonstration purposes. Please ensure compliance with applicable regulations when implementing similar systems in production.
