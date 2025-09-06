# CreditShaft Demo

CreditShaft Demo is a next-generation DeFi platform that revolutionizes credit lending by enabling users to leverage their credit card limits as collateral for cryptocurrency borrowing. Built for the modern Web3 ecosystem, it supports multi-chain operations across Ethereum Sepolia and Avalanche Fuji testnets, offering seamless ETH borrowing without traditional KYC requirements.

## 🚀 Core Innovation

- **Credit Card Collateralization**: First-of-its-kind system using Stripe pre-authorizations as crypto loan collateral
- **Multi-Chain DeFi**: Seamless cross-chain lending with automated risk management
- **Real-Time Operations**: Sub-second interest calculations and liquidation monitoring
- **Chainlink Integration**: Enterprise-grade oracle services for price feeds and automation

## 🛠 Technology Stack

### Frontend Excellence
- **Next.js 15** with App Router and server-side optimization
- **React 19** with concurrent features and optimized rendering
- **TypeScript 5.0+** with strict mode and comprehensive type coverage
- **Tailwind CSS 4** with custom glassmorphism design system

### Blockchain Infrastructure
- **Wagmi v2.15.5 + Viem v2.30.6** for type-safe Web3 interactions
- **Reown AppKit v1.7.8** for enterprise wallet connectivity
- **Ethers v5.7.2** for advanced blockchain utilities
- **Multi-chain Support**: Ethereum Sepolia + Avalanche Fuji with seamless switching

### Financial Integration
- **Stripe v18.2.1** with PCI DSS compliance for credit card processing
- **@stripe/react-stripe-js v3.7.0** for secure frontend payment handling
- **Advanced Pre-authorization**: Sophisticated hold management with automated release

### Data & State Management
- **React Query v5.80.5** for server state optimization and caching
- **Cross-tab Synchronization**: Real-time state management across browser sessions
- **Persistent Storage**: Wallet-linked data persistence with encryption

## 🌐 Supported Networks

- **Ethereum Sepolia**: Primary testnet with comprehensive Etherscan integration (Blue theme)
- **Avalanche Fuji**: High-performance testnet with SnowTrace integration (Red-orange theme)

## 🏗 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Web3 wallet (MetaMask, WalletConnect, etc.)
- Stripe test account for payment integration

### Installation

1. Clone the repository
```bash
git clone https://github.com/0xgeorgemathew/creditshaft-demo.git
cd creditshaft-demo
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
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

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## ✨ Key Features

### 1. **Advanced Wallet Connection**
- Multi-provider support (MetaMask, WalletConnect, Coinbase Wallet)
- Network validation and automatic switching
- Real-time connection status monitoring

### 2. **Credit Card Pre-Authorization**
- Stripe Setup Intent with enhanced security validation
- Session persistence across browser restarts
- Real-time authorization status tracking

### 3. **Intelligent Loan Creation**
- Dynamic LTV calculations with risk-based pricing (30-66.7% range)
- Real-time liquidation price monitoring
- Interactive risk assessment with visual feedback

### 4. **Real-Time Loan Management**
- Sub-second interest accrual calculations
- Visual countdown timers with progress indicators
- Automated liquidation protection with 1-hour safety buffers

### 5. **Automated Risk Management**
- Chainlink-powered price monitoring
- Automated liquidation triggers with grace periods
- Real-time credit utilization tracking

## 🔗 Chainlink Enterprise Integration

For complete smart contract development and **direct Stripe API integration**, see:
📋 **[Integration.md](./Integration.md)**

### Advanced Features Implemented:
- **Chainlink Functions**: Direct Stripe API calls eliminating intermediaries
- **Chainlink Automation**: Autonomous pre-auth expiry monitoring with 1-hour buffers
- **Chainlink Price Feeds**: Real-time ETH pricing with 0.5% precision tolerance
- **Smart Contract Architecture**: Event-driven automation with comprehensive state management
- **Security-First Design**: Encrypted secrets management and multi-signature validation

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── WalletConnection.tsx    # Web3 wallet integration
│   ├── StripePreAuth.tsx       # Credit card authorization
│   ├── LeverageInterface.tsx   # Loan creation interface
│   ├── LoanDashboard.tsx       # Real-time loan management
│   └── NetworkSwitcher.tsx     # Multi-chain switching
├── config/             # Configuration files
│   └── web3.ts         # Web3 and network setup
├── lib/                # Utility libraries
│   ├── chainlink-integration.ts  # Chainlink services
│   └── contract.ts     # Smart contract interactions
├── types/              # TypeScript type definitions
└── hooks/              # Custom React hooks

chainlink-functions/    # Chainlink Functions scripts
Integration.md          # Comprehensive integration guide
Report.md              # Blockchain migration roadmap
CLAUDE.md              # Development guidelines
```

## 🧪 Demo Mode

The application includes a comprehensive testing environment:

- **Mock Blockchain Interactions**: Realistic transaction simulation with timing
- **Stripe Test Mode**: Safe payment testing with test card numbers
- **Multi-Network Testing**: Full feature parity across supported chains
- **Real-Time Data**: Actual price feeds with fallback mechanisms

**Test Credentials:**
- Stripe Test Card: `4242424242424242`
- CVV: Any 3-digit number
- Expiry: Any future date

## 📖 Documentation

- **[Integration.md](./Integration.md)** - Complete smart contract integration guide
- **[Report.md](./Report.md)** - Blockchain migration roadmap and implementation details
- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines and architecture overview

## 🏆 Hackathon Advantage

Advanced Chainlink state changes implementation qualifying for top-tier prizes through sophisticated automation and direct API integration.

### Technical Excellence:
- **Zero-Latency Operations**: Sub-second response times via optimized oracle integration
- **Enterprise Security**: Military-grade encryption for sensitive financial data
- **Scalable Architecture**: Designed for high-throughput multi-chain operations
- **Comprehensive Monitoring**: Real-time telemetry and performance analytics

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

This is a demo project. For production deployment considerations, see the migration roadmap in [Report.md](./Report.md).
