// src/app/api/loans/charge/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { loanStorage } from "@/lib/loanStorage";
import { createLogger, generateRequestId } from "@/lib/logger";
import { getStripeInstance } from "@/lib/stripe-server";

const logCharge = createLogger("CHARGE");

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  logCharge("CHARGE_REQUEST_START", { requestId });

  try {
    const { loanId, amount, reason } = await request.json();

    // Validate input
    if (!loanId) {
      const error = "Loan ID is required";
      logCharge("VALIDATION_ERROR", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // Debug: Check what loans exist in storage
    const storageDebugInfo = loanStorage.getDebugInfo();
    const debugInfo = {
      requestId,
      loanId,
      storageInstance: !!loanStorage,
      globalStorageExists: !!(globalThis as any).__loanStorage,
      sameInstance: loanStorage === (globalThis as any).__loanStorage,
      ...storageDebugInfo
    };
    logCharge("DEBUG_STORAGE_STATE", debugInfo);

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
      const mockChargeId =
        "ch_mock_" + Math.random().toString(36).substring(2, 11);

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
    const stripe = getStripeInstance();

    // Calculate charge amount (use provided amount or full pre-auth amount)
    const chargeAmount = amount || loan.preAuthAmount;

    logCharge("STRIPE_CHARGE_START", {
      requestId,
      customerId: loan.customerId,
      paymentMethodId: loan.paymentMethodId,
      chargeAmount,
      currency: "usd",
    });

    // Capture the existing pre-authorization instead of creating new charge
    const paymentIntentId = loan.preAuthId;
    
    logCharge("CAPTURING_PREAUTH", {
      requestId,
      paymentIntentId,
      originalPreAuthAmount: loan.preAuthAmount,
      captureAmount: chargeAmount
    });

    // First, get the current PaymentIntent to check its status
    const existingPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (existingPaymentIntent.status !== "requires_capture") {
      const error = `Cannot capture pre-authorization. Current status: ${existingPaymentIntent.status}`;
      logCharge("PREAUTH_NOT_CAPTURABLE", {
        requestId,
        paymentIntentId,
        currentStatus: existingPaymentIntent.status
      }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // Capture the pre-authorization (can be partial or full amount)
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: Math.round(chargeAmount * 100), // Convert to cents
    });

    logCharge("STRIPE_PREAUTH_CAPTURED", {
      requestId,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      capturedAmount: paymentIntent.amount_received,
      originalAmount: existingPaymentIntent.amount,
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
