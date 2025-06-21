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
      loanStorage.updateLoanStatus(loanId, "charged");
      return NextResponse.json({
        success: true,
        message: "Demo: Loan charged successfully",
        loanId,
        demoMode: true
      });
    }

    // Production mode - capture Stripe payment
    try {
      const stripe = getStripeInstance();
      
      // Capture the PaymentIntent to charge the card
      if (loan.preAuthId) {
        const paymentIntent = await stripe.paymentIntents.capture(loan.preAuthId);
        
        // Update loan status
        loanStorage.updateLoanStatus(loanId, "charged");

        return NextResponse.json({
          success: true,
          message: "Loan charged successfully",
          loanId,
          stripeCharged: true,
          chargedAmount: paymentIntent.amount_received,
          paymentIntentId: paymentIntent.id
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "No Stripe PaymentIntent found for this loan"
        }, { status: 400 });
      }

    } catch (stripeError: unknown) {
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Unknown Stripe error';
      return NextResponse.json({
        success: false,
        error: `Stripe charge failed: ${errorMessage}`,
      }, { status: 400 });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Charge failed';
    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 500 });
  }
}