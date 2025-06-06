// src/app/api/loans/release/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { loanStorage } from "@/lib/loanStorage";
import { createLogger, generateRequestId } from "@/lib/logger";
import { getStripeInstance } from "@/lib/stripe-server";

const logRelease = createLogger("RELEASE");

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
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
    const stripe = getStripeInstance();

    logRelease("STRIPE_RELEASE_START", {
      requestId,
      preAuthId: loan.preAuthId,
      customerId: loan.customerId,
      paymentMethodId: loan.paymentMethodId,
    });

    // Cancel the existing pre-authorization to release the hold
    const paymentIntentId = loan.preAuthId;
    
    logRelease("CANCELING_PREAUTH", {
      requestId,
      paymentIntentId,
      preAuthAmount: loan.preAuthAmount
    });

    try {
      // First, get the current PaymentIntent to check its status
      const existingPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      logRelease("PREAUTH_STATUS_CHECK", {
        requestId,
        paymentIntentId,
        currentStatus: existingPaymentIntent.status,
        amount: existingPaymentIntent.amount
      });

      if (existingPaymentIntent.status === "requires_capture") {
        // Cancel the pre-authorization to release the hold
        const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
        
        logRelease("PREAUTH_CANCELED", {
          requestId,
          paymentIntentId: canceledPaymentIntent.id,
          status: canceledPaymentIntent.status,
          canceledAmount: existingPaymentIntent.amount
        });

        if (canceledPaymentIntent.status === "canceled") {
          // Update loan in storage
          loanStorage.updateLoan(loanId, {
            status: "released",
            releasedAt: new Date().toISOString(),
            stripePreAuthStatus: "canceled"
          });

          const response = {
            success: true,
            preAuthId: loan.preAuthId,
            loanId,
            reason: reason || "Manual release",
            releasedAmount: existingPaymentIntent.amount / 100, // Convert from cents
            requestId,
            stripeStatus: canceledPaymentIntent.status,
            note: "Pre-authorization hold successfully released - funds available on customer's card",
          };

          logRelease("RELEASE_SUCCESS", { requestId, response });
          return NextResponse.json(response);
        } else {
          const error = `Failed to cancel pre-authorization. Status: ${canceledPaymentIntent.status}`;
          logRelease("CANCEL_FAILED", { requestId, status: canceledPaymentIntent.status }, true);
          return NextResponse.json({ success: false, error }, { status: 400 });
        }
      } else if (existingPaymentIntent.status === "canceled") {
        const error = "Pre-authorization is already canceled";
        logRelease("ALREADY_CANCELED", { requestId, paymentIntentId }, true);
        return NextResponse.json({ success: false, error }, { status: 400 });
      } else if (existingPaymentIntent.status === "succeeded") {
        const error = "Cannot release - pre-authorization has already been captured";
        logRelease("ALREADY_CAPTURED", { requestId, paymentIntentId }, true);
        return NextResponse.json({ success: false, error }, { status: 400 });
      } else {
        const error = `Cannot release pre-authorization. Current status: ${existingPaymentIntent.status}`;
        logRelease("INVALID_STATUS_FOR_RELEASE", {
          requestId,
          paymentIntentId,
          currentStatus: existingPaymentIntent.status
        }, true);
        return NextResponse.json({ success: false, error }, { status: 400 });
      }
      
    } catch (stripeError: any) {
      // Even if Stripe verification fails, we can still mark the loan as released locally
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
        preAuthId: loan.preAuthId,
        loanId,
        reason: reason || "Manual release",
        warning: "Stripe verification failed but loan marked as released",
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
  const requestId = Math.random().toString(36).substring(2, 11);
  logRelease("HEALTH_CHECK", { requestId });

  try {
    const stats = loanStorage.getStats();

    return NextResponse.json({
      status: "ok",
      message: "Release API is operational",
      timestamp: new Date().toISOString(),
      requestId,
      loanStats: stats,
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
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
