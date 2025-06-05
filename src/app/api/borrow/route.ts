/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { loanStorage, generateLoanId } from "@/lib/loanStorage";
import Stripe from "stripe";

// Enhanced logging utility
const logBorrow = (event: string, data: any, isError: boolean = false) => {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? "ERROR" : "INFO";
  console.log(
    `[${timestamp}] [BORROW-${logLevel}] ${event}:`,
    JSON.stringify(data, null, 2)
  );
};

// Initialize Stripe
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    logBorrow("STRIPE_INITIALIZED", { success: true });
  } else {
    logBorrow(
      "STRIPE_INIT_ERROR",
      { error: "STRIPE_SECRET_KEY not found" },
      true
    );
  }
} catch (error) {
  logBorrow("STRIPE_INIT_ERROR", { error }, true);
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 11);
  logBorrow("BORROW_REQUEST_START", { requestId });

  try {
    const {
      amount,
      asset,
      walletAddress,
      preAuthId,
      requiredPreAuth,
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
    if (!stripe) {
      const error = "Stripe not properly configured";
      logBorrow("STRIPE_NOT_CONFIGURED", { requestId }, true);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    // Validate pre-auth data exists
    if (!customerId || !paymentMethodId) {
      const error = "Missing Stripe customer or payment method data";
      logBorrow("STRIPE_DATA_MISSING", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    logBorrow("PRODUCTION_STRIPE_PROCESSING", { requestId, loanId });

    try {
      // Verify customer and payment method exist in Stripe
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

      // Create a mock transaction hash for demo blockchain integration
      const mockTxHash = "0x" + Math.random().toString(16).substring(2, 66);

      // Create complete loan record
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
