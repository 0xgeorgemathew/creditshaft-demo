/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { loanStorage, generateLoanId } from "@/lib/loanStorage";
import { createLogger, generateRequestId } from "@/lib/logger";
import { getStripeInstance } from "@/lib/stripe-server";

const logBorrow = createLogger("BORROW");

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const {
      amount,
      amountETH,
      ethPrice,
      asset,
      walletAddress,
      preAuthId,
      requiredPreAuth,
      selectedLTV,
      preAuthDurationDays,
      originalCreditLimit,
      customerId,
      paymentMethodId,
      setupIntentId,
      cardLastFour,
      cardBrand,
    } = await request.json();


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
    }

    // Check if this is just storing pre-auth data (amount = 0)
    if (!amount || amount === 0) {
      const response = {
        success: true,
        message: "Pre-auth data stored successfully",
        walletAddress,
        timestamp: new Date().toISOString(),
        preAuthDataStored: true,
      };
      
      return NextResponse.json(response);
    }

    // Validate required fields for actual borrowing
    if (!asset || !walletAddress) {
      const error = "Missing required fields: asset, walletAddress";
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // Generate unique loan ID
    const loanId = generateLoanId();

    // Demo mode processing for mock data
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Calculate loan parameters
      const borrowAmountUSD = parseFloat(amount);
      const borrowAmountETHNum = parseFloat(amountETH);
      const preAuthAmount = requiredPreAuth || Math.ceil(borrowAmountUSD / (selectedLTV / 100));
      const ltvRatio = selectedLTV || Math.round((borrowAmountUSD / preAuthAmount) * 100);
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
        borrowAmount: borrowAmountUSD,
        borrowAmountETH: borrowAmountETHNum,
        ethPriceAtCreation: ethPrice,
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

      // Store the loan in our storage system
      loanStorage.createLoan(loanData);

      const response = {
        success: true,
        loanId,
        txHash: mockTxHash,
        amount: borrowAmountUSD,
        amountETH: borrowAmountETHNum,
        ethPrice: ethPrice,
        asset,
        walletAddress,
        ltvRatio,
        interestRate,
        preAuthAmount,
        selectedLTV,
        timestamp: new Date().toISOString(),
        stripeCustomerId: customerId,
        stripePaymentMethodId: paymentMethodId,
        demoMode: true,
      };

      return NextResponse.json(response);
    }

    // Use real Stripe API for production
    // Validate pre-auth data exists
    if (!customerId || !paymentMethodId) {
      const error = "Missing Stripe customer or payment method data";
      return NextResponse.json({ success: false, error }, { status: 400 });
    }


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
      const borrowAmountUSD = parseFloat(amount);
      const borrowAmountETHNum = parseFloat(amountETH);
      const preAuthAmount = requiredPreAuth || Math.ceil(borrowAmountUSD / (selectedLTV / 100));
      const ltvRatio = selectedLTV || Math.round((borrowAmountUSD / preAuthAmount) * 100);
      const interestRate = getInterestRate(asset);


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
          borrow_amount: borrowAmountUSD.toString(),
          borrow_amount_eth: borrowAmountETHNum.toString(),
          eth_price_at_creation: ethPrice.toString(),
          preauth_amount: preAuthAmount.toString(),
          selected_ltv: selectedLTV.toString(),
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
        borrowAmount: borrowAmountUSD,
        borrowAmountETH: borrowAmountETHNum,
        ethPriceAtCreation: ethPrice,
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

      // Store the loan in our storage system
      loanStorage.createLoan(loanData);

      const response = {
        success: true,
        loanId,
        txHash: mockTxHash,
        amount: borrowAmountUSD,
        amountETH: borrowAmountETHNum,
        ethPrice: ethPrice,
        asset,
        walletAddress,
        ltvRatio,
        interestRate,
        preAuthAmount,
        selectedLTV,
        timestamp: new Date().toISOString(),
        stripeCustomerId: customer.id,
        stripePaymentMethodId: paymentMethod.id,
      };

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
    ETH: 4.5,
    USDC: 5.2,
    USDT: 4.8,
    DAI: 5.5,
  };
  return rates[asset] || 4.5;
}
