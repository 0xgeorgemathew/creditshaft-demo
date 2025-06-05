// src/app/api/loans/charge/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { loanStorage } from "@/lib/loanStorage";

// Enhanced logging utility
const logCharge = (event: string, data: any, isError: boolean = false) => {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? "ERROR" : "INFO";
  console.log(
    `[${timestamp}] [CHARGE-${logLevel}] ${event}:`,
    JSON.stringify(data, null, 2)
  );
};

// Initialize Stripe
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    logCharge("STRIPE_INITIALIZED", { success: true });
  } else {
    logCharge(
      "STRIPE_INIT_ERROR",
      { error: "STRIPE_SECRET_KEY not found" },
      true
    );
  }
} catch (error) {
  logCharge("STRIPE_INIT_ERROR", { error }, true);
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  logCharge("CHARGE_REQUEST_START", { requestId });

  try {
    const { loanId, amount, reason } = await request.json();

    // Validate input
    if (!loanId) {
      const error = "Loan ID is required";
      logCharge("VALIDATION_ERROR", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // Get loan from storage
    const loan = loanStorage.getLoan(loanId);
    if (!loan) {
      const error = "Loan not found";
      logCharge("LOAN_NOT_FOUND", { requestId, loanId }, true);
      return NextResponse.json({ success: false, error }, { status: 404 });
    }

    if (loan.status !== "active") {
      const error = `Loan is not active. Current status: ${loan.status}`;
      logCharge(
        "INVALID_LOAN_STATUS",
        { requestId, loanId, status: loan.status },
        true
      );
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    logCharge("LOAN_FOUND", {
      requestId,
      loanId,
      preAuthId: loan.preAuthId,
      preAuthAmount: loan.preAuthAmount,
      customerId: loan.customerId,
    });

    // Demo mode simulation
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      logCharge("DEMO_MODE_CHARGE", {
        requestId,
        loanId,
        amount: amount || loan.preAuthAmount,
      });

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const chargedAmount = amount || loan.preAuthAmount;
      const mockChargeId = "ch_mock_" + Math.random().toString(36).substr(2, 9);

      // Update loan in storage
      loanStorage.updateLoan(loanId, {
        status: "charged",
        chargedAt: new Date().toISOString(),
        stripeChargeId: mockChargeId,
        actualChargedAmount: chargedAmount,
      });

      const response = {
        success: true,
        chargeId: mockChargeId,
        amount: chargedAmount,
        loanId,
        reason: reason || "Manual charge",
        requestId,
      };

      logCharge("DEMO_CHARGE_SUCCESS", { requestId, response });
      return NextResponse.json(response);
    }

    // Production Stripe charge
    if (!stripe) {
      const error = "Stripe not properly configured";
      logCharge("STRIPE_NOT_CONFIGURED", { requestId }, true);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    // Calculate charge amount (use provided amount or full pre-auth amount)
    const chargeAmount = amount || loan.preAuthAmount;

    logCharge("STRIPE_CHARGE_START", {
      requestId,
      customerId: loan.customerId,
      paymentMethodId: loan.paymentMethodId,
      chargeAmount,
      currency: "usd",
    });

    // Create payment intent and capture immediately
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(chargeAmount * 100), // Convert to cents
      currency: "usd",
      customer: loan.customerId,
      payment_method: loan.paymentMethodId,
      confirm: true,
      off_session: true, // This is for charging saved payment methods
      description: `CreditBridge loan charge - ${loanId}`,
      metadata: {
        loan_id: loanId,
        wallet_address: loan.walletAddress,
        reason: reason || "Manual charge",
        request_id: requestId,
      },
    });

    logCharge("STRIPE_PAYMENT_INTENT_CREATED", {
      requestId,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    });

    if (paymentIntent.status === "succeeded") {
      // Update loan in storage
      loanStorage.updateLoan(loanId, {
        status: "charged",
        chargedAt: new Date().toISOString(),
        stripeChargeId: paymentIntent.id,
        actualChargedAmount: chargeAmount,
      });

      const response = {
        success: true,
        chargeId: paymentIntent.id,
        amount: chargeAmount,
        loanId,
        reason: reason || "Manual charge",
        stripeStatus: paymentIntent.status,
        requestId,
      };

      logCharge("CHARGE_SUCCESS", { requestId, response });
      return NextResponse.json(response);
    } else {
      const error = `Charge failed with status: ${paymentIntent.status}`;
      logCharge(
        "CHARGE_FAILED",
        {
          requestId,
          status: paymentIntent.status,
          paymentIntentId: paymentIntent.id,
        },
        true
      );
      return NextResponse.json({ success: false, error }, { status: 400 });
    }
  } catch (error: any) {
    logCharge(
      "CHARGE_ERROR",
      {
        requestId,
        errorType: error.type || "unknown",
        errorCode: error.code || "unknown",
        errorMessage: error.message || "unknown",
      },
      true
    );

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Card charge failed",
          code: error.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Charge failed",
        requestId,
      },
      { status: 500 }
    );
  }
}
