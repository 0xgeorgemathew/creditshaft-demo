# Gemini Frontend Upgrade Plan

This document outlines the necessary frontend changes to integrate with the latest version of the CreditShaft smart contracts, as detailed in `Integration.md`.

## 🎯 Core Objective

The primary goal is to align the frontend with the new smart contract architecture, which simplifies PreAuth handling, decouples position management from PreAuth status, and introduces new data structures and functions.

---

## 💥 Key High-Level Changes

1.  **Position & PreAuth Decoupling**: A position's active status (`isActive`) is now independent of its PreAuth status (`preAuthCharged`, `preAuthExpiryTime`). The UI must reflect this. A user can **always** close an active position, regardless of PreAuth.
2.  **Simplified PreAuth**: The frontend no longer manages the PreAuth charging logic. It is now handled automatically by Chainlink Automation. The UI's role is to display the PreAuth status and expiry.
3.  **New `openLeveragePosition` Signature**: The function for opening a position has new parameters, including Stripe customer and payment method IDs.
4.  **Updated `Position` Struct**: The on-chain `Position` struct has changed. The frontend must adapt to the new data structure.
5.  **Real PreAuth Calculation**: The `preAuthAmount` is now calculated as 150% of the borrowed USDC amount.

---

## ✅ Task Checklist

### 1. Configuration & Setup

- [ ] **Update Environment Variables**: In `.env.local` (or similar), update the contract addresses to point to the new deployments as specified in `Integration.md`.
    - `NEXT_PUBLIC_CREDIT_SHAFT_LEVERAGE`
    - `NEXT_PUBLIC_CREDIT_SHAFT_CORE`
    - `NEXT_PUBLIC_LP_TOKEN`
- [ ] **Update ABIs**: Replace the existing contract ABIs with the new ones generated from the updated smart contracts.
- [ ] **Update Contract Constants**: Review and update hardcoded constants in the frontend (e.g., in `src/lib/contract.ts` or `src/config/web3.ts`) to match the new values (`MAX_LEVERAGE`, `MIN_LEVERAGE`, `PREAUTH_MULTIPLIER`).

### 2. Data Types & Helpers

- [ ] **Update `Position` Type**: Modify the TypeScript interface for `Position` (likely in `src/types/index.ts`) to match the new struct definition from `Integration.md`.
- [ ] **Update Helper Functions**: Review and update utility functions (e.g., in `src/lib/`) for formatting data from the contract (e.g., `formatLinkPrice`, `formatUsdcAmount`).
- [ ] **Create `toStripeCents` Helper**: Implement the `toStripeCents` function as suggested in the guide to handle Stripe amount conversions correctly.

### 3. Core Contract Logic (`/hooks` & `/lib`)

- [ ] **Update `useLoan.ts` (or equivalent hook)**:
    - Modify the `openLeveragePosition` function call to use the new signature: `(uint256 collateralLINK, uint256 leverageRatio, uint256 expiryDuration, string stripePaymentIntentId, string stripeCustomerId, string stripePaymentMethodId)`.
    - Ensure the `closeLeveragePosition` function is called without any PreAuth status checks.
    - Integrate calls to the new view functions, such as `positions(address)` and `isReadyForPreAuthCharge(address)`.
- [ ] **Update Event Listeners**:
    - Adjust listeners for `PositionOpened` and `PositionClosed` to handle the new event parameters.
    - Add listeners for new events like `PreAuthCharged` to update the UI accordingly.

### 4. Stripe Integration

- [ ] **Update Stripe Pre-authorization Flow**:
    - The frontend must now collect `stripePaymentIntentId`, `stripeCustomerId`, and `stripePaymentMethodId` to pass to the `openLeveragePosition` function.
    - The existing logic in `src/app/api/stripe/preauth/route.ts` and `src/lib/stripe-server.ts` will likely need significant changes. The responsibility shifts from creating a charge to simply creating and confirming a Payment Intent to be passed to the smart contract.
- [ ] **Refactor `StripePreAuth.tsx`**: This component needs to be updated to support the new flow. It should focus on selecting a payment method and creating the payment intent.

### 5. Frontend Components (`/components`)

- [ ] **Update `BorrowingInterface.tsx` (Open Position Form)**:
    - Update the form to include an `expiryDuration` selector.
    - Modify the logic to pass all required parameters to the new `openLeveragePosition` hook.
    - Update the "preview calculation" to show the `preAuthAmount` (150% of borrowed amount).
- [ ] **Update `LoanDashboard.tsx` (Position Dashboard)**:
    - Redesign the component to clearly separate "Position Status" from "PreAuth Status".
    - Display the new `Position` struct fields.
    - Show PreAuth time remaining and status (`Active`, `Expired`, `Charged`).
    - Ensure the "Close Position" button is **always enabled** if `position.isActive` is true.
    - Display Unrealized P&L, liquidation price, and other metrics as specified in `Integration.md`.

### 6. Error Handling

- [ ] **Update Error Messages**: Implement the new user-friendly error messages for common scenarios (`OPEN_POSITION_ERRORS`, `CLOSE_POSITION_ERRORS`) as defined in `Integration.md`. A central `handleContractError` function is recommended.

---

## ❓ Open Questions & Verification Steps

- **Verify Stripe Flow**: Double-check if the `stripePaymentIntentId` needs to be confirmed on the client-side before being sent to the contract.
- **Test PreAuth Status**: Thoroughly test the UI's behavior for all PreAuth states: Active, Expired (but not charged), and Charged.
- **Confirm Data Formatting**: Ensure all numeric values (especially decimals for LINK, USDC, and Price Feeds) are correctly handled between the contract and the UI.
