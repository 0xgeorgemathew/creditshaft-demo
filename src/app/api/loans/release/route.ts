import { NextRequest, NextResponse } from "next/server";
import { loanStorage } from "@/lib/loanStorage";
import { getStripeInstance } from "@/lib/stripe-server";

export async function POST(request: NextRequest) {
  try {
    const { loanId } = await request.json();

    if (!loanId) {
      return NextResponse.json({ success: false, error: "Missing loanId" }, { status: 400 });
    }

    // Get loan data
    const loan = loanStorage.getLoan(loanId);
    if (!loan) {
      return NextResponse.json({ success: false, error: "Loan not found" }, { status: 404 });
    }

    // Demo mode - just update status
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      loanStorage.updateLoanStatus(loanId, "released");
      return NextResponse.json({
        success: true,
        message: "Demo: Loan released successfully",
        loanId,
        demoMode: true
      });
    }

    // Production mode - release Stripe hold
    try {
      const stripe = getStripeInstance();
      
      // Cancel the PaymentIntent to release the hold
      if (loan.preAuthId) {
        await stripe.paymentIntents.cancel(loan.preAuthId);
      }

      // Update loan status
      loanStorage.updateLoanStatus(loanId, "released");

      return NextResponse.json({
        success: true,
        message: "Loan released and Stripe hold removed",
        loanId,
        stripeReleased: true
      });

    } catch (stripeError: unknown) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error';
      return NextResponse.json({
        success: false,
        error: `Stripe release failed: ${errorMessage}`,
      }, { status: 400 });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Release failed';
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}