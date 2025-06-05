// src/app/api/loans/release/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { loanStorage } from "@/lib/loanStorage";

// Enhanced logging utility
const logRelease = (event: string, data: any, isError: boolean = false) => {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? "ERROR" : "INFO";
  console.log(
    `[${timestamp}] [RELEASE-${logLevel}] ${event}:`,
    JSON.stringify(data, null, 2)
  );
};

// Initialize Stripe
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    logRelease("STRIPE_INITIALIZED", { success: true });
  } else {
    logRelease(
      "STRIPE_INIT_ERROR",
      { error: "STRIPE_SECRET_KEY not found" },
      true
    );
  }
} catch (error) {
  logRelease("STRIPE_INIT_ERROR", { error }, true);
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  logRelease("RELEASE_REQUEST_START", { requestId });

  try {
    const { loanId, reason } = await request.json();

    // Validate input
    if (!loanId) {
      const error = "Loan ID is required";
      logRelease("VALIDATION_ERROR", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // Get loan from storage
    const loan = loanStorage.getLoan(loanId);
    if (!loan) {
      const error = "Loan not found";
      logRelease("LOAN_NOT_FOUND", { requestId, loanId }, true);
      return NextResponse.json({ success: false, error }, { status: 404 });
    }

    if (loan.status !== "active") {
      const error = `Loan is not active. Current status: ${loan.status}`;
      logRelease(
        "INVALID_LOAN_STATUS",
        { requestId, loanId, status: loan.status },
        true
      );
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    logRelease("LOAN_FOUND", {
      requestId,
      loanId,
      preAuthId: loan.preAuthId,
      preAuthAmount: loan.preAuthAmount,
    });

    // Demo mode simulation
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      logRelease("DEMO_MODE_RELEASE", { requestId, loanId });

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update loan in storage
      loanStorage.updateLoan(loanId, {
        status: "released",
        releasedAt: new Date().toISOString(),
      });

      const response = {
        success: true,
        setupIntentId: loan.preAuthId,
        loanId,
        reason: reason || "Manual release",
        requestId,
      };

      logRelease("DEMO_RELEASE_SUCCESS", { requestId, response });
      return NextResponse.json(response);
    }

    // Production Stripe release
    if (!stripe) {
      const error = "Stripe not properly configured";
      logRelease("STRIPE_NOT_CONFIGURED", { requestId }, true);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    logRelease("STRIPE_RELEASE_START", {
      requestId,
      setupIntentId: loan.preAuthId,
    });

    // Cancel the setup intent to release the pre-authorization
    // Note: Setup intents can't be cancelled once confirmed, but we can
    // attempt to cancel any pending authorization or detach the payment method
    try {
      // Try to retrieve and cancel the setup intent
      const setupIntent = await stripe.setupIntents.retrieve(loan.preAuthId);

      logRelease("SETUP_INTENT_RETRIEVED", {
        requestId,
        setupIntentId: setupIntent.id,
        status: setupIntent.status,
      });

      if (
        setupIntent.status === "requires_payment_method" ||
        setupIntent.status === "requires_confirmation"
      ) {
        // Can cancel if not yet confirmed
        const cancelledIntent = await stripe.setupIntents.cancel(
          loan.preAuthId
        );

        logRelease("SETUP_INTENT_CANCELLED", {
          requestId,
          setupIntentId: cancelledIntent.id,
          status: cancelledIntent.status,
        });
      } else {
        // If already confirmed, we can't cancel it, but we can mark as released
        // In production, this would trigger a different flow or require manual intervention
        logRelease("SETUP_INTENT_ALREADY_CONFIRMED", {
          requestId,
          setupIntentId: setupIntent.id,
          status: setupIntent.status,
          note: "Cannot cancel confirmed setup intent, marking as released",
        });
      }

      // Update loan in storage regardless
      loanStorage.updateLoan(loanId, {
        status: "released",
        releasedAt: new Date().toISOString(),
      });

      const response = {
        success: true,
        setupIntentId: loan.preAuthId,
        loanId,
        reason: reason || "Manual release",
        stripeStatus: setupIntent.status,
        requestId,
      };

      logRelease("RELEASE_SUCCESS", { requestId, response });
      return NextResponse.json(response);
    } catch (stripeError: any) {
      // Even if Stripe operation fails, we can still mark the loan as released locally
      logRelease(
        "STRIPE_RELEASE_ERROR",
        {
          requestId,
          error: stripeError.message,
          type: stripeError.type,
          code: stripeError.code,
          note: "Marking loan as released despite Stripe error",
        },
        true
      );

      // Update loan in storage
      loanStorage.updateLoan(loanId, {
        status: "released",
        releasedAt: new Date().toISOString(),
      });

      const response = {
        success: true,
        setupIntentId: loan.preAuthId,
        loanId,
        reason: reason || "Manual release",
        warning: "Stripe operation failed but loan marked as released",
        stripeError: stripeError.message,
        requestId,
      };

      logRelease("RELEASE_WITH_WARNING", { requestId, response });
      return NextResponse.json(response);
    }
  } catch (error: any) {
    logRelease(
      "RELEASE_ERROR",
      {
        requestId,
        errorMessage: error.message || "unknown",
        errorStack: error.stack,
      },
      true
    );

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Release failed",
        requestId,
      },
      { status: 500 }
    );
  }
}

// Health check endpoint for release functionality
export async function GET() {
  const requestId = Math.random().toString(36).substr(2, 9);
  logRelease("HEALTH_CHECK", { requestId });

  try {
    const stats = loanStorage.getStats();

    return NextResponse.json({
      status: "ok",
      message: "Release API is operational",
      timestamp: new Date().toISOString(),
      requestId,
      loanStats: stats,
      stripeConfigured: !!stripe,
    });
  } catch (error: any) {
    logRelease("HEALTH_CHECK_ERROR", { requestId, error: error.message }, true);

    return NextResponse.json(
      {
        status: "error",
        message: error.message || "Health check failed",
        timestamp: new Date().toISOString(),
        requestId,
      },
      { status: 500 }
    );
  }
}
