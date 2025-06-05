# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CreditShaft Demo is a DeFi credit lending platform that allows users to use their credit cards as collateral for crypto borrowing. Users can borrow stablecoins (USDC, USDT, DAI) against credit card pre-authorizations without KYC requirements.

## Development Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Production build  
npm run start        # Start production server
npm run lint         # ESLint code quality checks
```

## Core Architecture

### Tech Stack
- **Next.js 15** with App Router and TypeScript
- **Wagmi v2 + Viem v2** for Web3 integration (Sepolia testnet)
- **Stripe** for credit card processing and pre-authorization
- **Tailwind CSS v4** with custom glassmorphism design system
- **React Query** for server state management

### Application Flow
1. Wallet connection via Wagmi/Reown AppKit
2. Credit card pre-authorization through Stripe Setup Intent
3. Loan creation with LTV ratio calculations
4. Loan management (charge/release operations)

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

## Important Implementation Details

### Logging Pattern
All API endpoints use structured logging with timestamps and request IDs:
```typescript
const logFunction = (event: string, data: any, isError: boolean = false) => {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? "ERROR" : "INFO";
  console.log(`[${timestamp}] [MODULE-${logLevel}] ${event}:`, JSON.stringify(data, null, 2));
};
```

### Session Management
- In-memory storage using `src/lib/loanStorage.ts` for demo purposes
- Wallet address as session key
- Pre-auth data persistence across page refreshes

### Demo Mode Configuration
Currently runs in demo mode with:
- Mock smart contract interactions
- Simulated blockchain transactions  
- Test Stripe payment methods (use 4242424242424242)

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
- **Sepolia testnet only** - no mainnet configuration