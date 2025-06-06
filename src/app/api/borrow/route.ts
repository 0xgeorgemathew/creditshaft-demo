/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { loanStorage, generateLoanId } from "@/lib/loanStorage";
import { createLogger, generateRequestId } from "@/lib/logger";
import { getStripeInstance } from "@/lib/stripe-server";

const logBorrow = createLogger("BORROW");

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  logBorrow("BORROW_REQUEST_START", { requestId });

  try {
    const {
      amount,
      asset,
      walletAddress,
      preAuthId,
      requiredPreAuth,
      preAuthDurationDays,
      originalCreditLimit,
      customerId,
      paymentMethodId,
      setupIntentId,
      cardLastFour,
      cardBrand,
    } = await request.json();

    logBorrow("BORROW_REQUEST_DATA", {
      requestId,
      amount,
      asset,
      walletAddress,
      preAuthId,
      requiredPreAuth,
      originalCreditLimit,
      customerId: customerId ? "present" : "missing",
      paymentMethodId: paymentMethodId ? "present" : "missing",
    });

    // Store pre-auth data regardless of borrowing
    if (walletAddress && originalCreditLimit && customerId && paymentMethodId) {
      const preAuthData = {
        available_credit: originalCreditLimit,
        card_last_four: cardLastFour || "****",
        card_brand: cardBrand || "unknown",
        status: "active" as const,
        wallet_address: walletAddress,
        created_at: new Date().toISOString(),
        preAuthId: preAuthId || setupIntentId,
        customerId,
        paymentMethodId,
        setupIntentId,
      };
      
      loanStorage.storePreAuthData(walletAddress, preAuthData);
      logBorrow("PREAUTH_DATA_STORED", { requestId, walletAddress, preAuthData });
    }

    // Check if this is just storing pre-auth data (amount = 0)
    if (!amount || amount === 0) {
      logBorrow("PREAUTH_ONLY_STORAGE", { requestId, walletAddress });
      
      const response = {
        success: true,
        message: "Pre-auth data stored successfully",
        walletAddress,
        timestamp: new Date().toISOString(),
        preAuthDataStored: true,
      };
      
      logBorrow("PREAUTH_STORAGE_SUCCESS", { requestId, response });
      return NextResponse.json(response);
    }

    // Validate required fields for actual borrowing
    if (!asset || !walletAddress) {
      const error = "Missing required fields: asset, walletAddress";
      logBorrow("VALIDATION_ERROR", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // Generate unique loan ID
    const loanId = generateLoanId();
    logBorrow("LOAN_ID_GENERATED", { requestId, loanId });

    // Demo mode processing for mock data
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      logBorrow("DEMO_MODE_PROCESSING", { requestId, loanId });

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Calculate loan parameters
      const borrowAmountNum = parseFloat(amount);
      const preAuthAmount = requiredPreAuth || Math.ceil(borrowAmountNum / 0.8);
      const ltvRatio = Math.round((borrowAmountNum / preAuthAmount) * 100);
      const interestRate = getInterestRate(asset);

      // Create a mock transaction hash for demo blockchain integration
      const mockTxHash = "0x" + Math.random().toString(16).substring(2, 66);

      // Create complete loan record with mock verification
      const loanData = {
        id: loanId,
        preAuthId: preAuthId || setupIntentId || `stripe_${Date.now()}`,
        walletAddress,
        customerId,
        paymentMethodId,

        // Loan details
        borrowAmount: borrowAmountNum,
        asset,
        interestRate,
        ltvRatio,

        // Credit tracking
        originalCreditLimit: originalCreditLimit || 12000,
        preAuthAmount,

        // Status tracking
        status: "active" as const,

        // Timestamps
        createdAt: new Date().toISOString(),

        // Transaction data (mock for demo)
        txHash: mockTxHash,
      };

      logBorrow("DEMO_LOAN_DATA_CREATED", { requestId, loanData });

      // Store the loan in our storage system
      loanStorage.createLoan(loanData);
      logBorrow("DEMO_LOAN_STORED", { requestId, loanId });

      const response = {
        success: true,
        loanId,
        txHash: mockTxHash,
        amount: borrowAmountNum,
        asset,
        walletAddress,
        ltvRatio,
        interestRate,
        preAuthAmount,
        timestamp: new Date().toISOString(),
        stripeCustomerId: customerId,
        stripePaymentMethodId: paymentMethodId,
        demoMode: true,
      };

      logBorrow("DEMO_BORROW_SUCCESS", { requestId, response });
      return NextResponse.json(response);
    }

    // Use real Stripe API for production
    // Validate pre-auth data exists
    if (!customerId || !paymentMethodId) {
      const error = "Missing Stripe customer or payment method data";
      logBorrow("STRIPE_DATA_MISSING", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    logBorrow("PRODUCTION_STRIPE_PROCESSING", { requestId, loanId });

    try {
      // Verify customer and payment method exist in Stripe
      const stripe = getStripeInstance();
      const customer = await stripe.customers.retrieve(customerId);
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      logBorrow("STRIPE_VERIFICATION_SUCCESS", {
        requestId,
        customerId: customer.id,
        paymentMethodId: paymentMethod.id,
        paymentMethodType: paymentMethod.type,
      });

      // Calculate loan parameters
      const borrowAmountNum = parseFloat(amount);
      const preAuthAmount = requiredPreAuth || Math.ceil(borrowAmountNum / 0.8);
      const ltvRatio = Math.round((borrowAmountNum / preAuthAmount) * 100);
      const interestRate = getInterestRate(asset);

      logBorrow("CREATING_PREAUTH_HOLD", {
        requestId,
        borrowAmount: borrowAmountNum,
        preAuthAmount,
        ltvRatio
      });

      // Create PaymentIntent with manual capture for pre-authorization hold
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(preAuthAmount * 100), // Convert to cents
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        confirmation_method: "automatic",
        capture_method: "manual", // This creates a hold without charging
        confirm: true,
        off_session: true, // Try off_session first for better UX
        return_url: `${request.headers.get('origin') || 'http://localhost:3000'}/borrow-success`,
        description: `CreditShaft pre-authorization - Loan ${loanId}`,
        metadata: {
          loan_id: loanId,
          wallet_address: walletAddress,
          borrow_amount: borrowAmountNum.toString(),
          preauth_amount: preAuthAmount.toString(),
          purpose: "credit_collateral_preauth",
          request_id: requestId,
        },
      });

      logBorrow("PREAUTH_PAYMENT_INTENT_CREATED", {
        requestId,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        captureMethod: paymentIntent.capture_method
      });

      if (paymentIntent.status === "requires_action") {
        // Handle 3D Secure authentication requirement
        logBorrow("PREAUTH_REQUIRES_ACTION", {
          requestId,
          paymentIntentId: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          nextAction: paymentIntent.next_action
        });
        
        return NextResponse.json({
          success: false,
          requires_action: true,
          payment_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          error: "Additional authentication required. Please complete 3D Secure verification."
        }, { status: 200 });
      } else if (paymentIntent.status !== "requires_capture") {
        const error = `Pre-authorization failed. Status: ${paymentIntent.status}`;
        logBorrow("PREAUTH_FAILED", {
          requestId,
          status: paymentIntent.status,
          paymentIntentId: paymentIntent.id,
        }, true);
        return NextResponse.json({ success: false, error }, { status: 400 });
      }

      // Create a mock transaction hash for demo blockchain integration
      const mockTxHash = "0x" + Math.random().toString(16).substring(2, 66);
      
      // Calculate pre-auth expiration based on user selection
      const durationDays = preAuthDurationDays || 7; // Default 7 days
      const preAuthCreatedAt = new Date().toISOString();
      const preAuthExpiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      // Create complete loan record with real pre-auth
      const loanData = {
        id: loanId,
        preAuthId: paymentIntent.id, // Use PaymentIntent ID as pre-auth ID
        walletAddress,
        customerId,
        paymentMethodId,

        // Loan details
        borrowAmount: borrowAmountNum,
        asset,
        interestRate,
        ltvRatio,

        // Credit tracking
        originalCreditLimit: originalCreditLimit || 12000,
        preAuthAmount,

        // Status tracking
        status: "active" as const,

        // Timestamps
        createdAt: new Date().toISOString(),
        preAuthCreatedAt,
        preAuthExpiresAt,

        // Transaction data (mock for demo)
        txHash: mockTxHash,
        
        // Stripe pre-auth tracking
        stripePreAuthStatus: paymentIntent.status,
        stripePreAuthAmount: preAuthAmount,
      };

      logBorrow("LOAN_DATA_CREATED", { requestId, loanData });

      // Store the loan in our storage system
      loanStorage.createLoan(loanData);
      logBorrow("LOAN_STORED", { requestId, loanId });

      // Verify storage worked
      const storedLoan = loanStorage.getLoan(loanId);
      const walletLoans = loanStorage.getWalletLoans(walletAddress);
      logBorrow("STORAGE_VERIFICATION", {
        requestId,
        storedLoan: !!storedLoan,
        walletLoansCount: walletLoans.length,
      });

      const response = {
        success: true,
        loanId,
        txHash: mockTxHash,
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

      logBorrow("BORROW_SUCCESS", { requestId, response });
      return NextResponse.json(response);

    } catch (stripeError: any) {
      logBorrow(
        "STRIPE_ERROR",
        {
          requestId,
          errorType: stripeError.type || "unknown",
          errorCode: stripeError.code || "unknown",
          errorMessage: stripeError.message || "unknown",
        },
        true
      );

      return NextResponse.json(
        {
          success: false,
          error: `Stripe error: ${stripeError.message}`,
          requestId,
        },
        { status: 400 }
      );
    }

  } catch (error: any) {
    logBorrow(
      "BORROW_ERROR",
      {
        requestId,
        errorMessage: error.message,
        errorStack: error.stack,
      },
      true
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Borrowing failed",
        requestId,
      },
      { status: 500 }
    );
  }
}

// Helper function to get interest rate by asset
function getInterestRate(asset: string): number {
  const rates: Record<string, number> = {
    USDC: 5.2,
    USDT: 4.8,
    DAI: 5.5,
  };
  return rates[asset] || 5.0;
}
