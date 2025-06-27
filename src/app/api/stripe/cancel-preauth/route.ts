import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: "Payment Intent ID is required" },
        { status: 400 }
      );
    }

    console.log("Cancelling Stripe pre-authorization:", paymentIntentId);

    // Cancel the payment intent to release the pre-authorization hold
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    console.log("Stripe pre-authorization cancelled successfully:", {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    });

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
      },
    });
  } catch (error) {
    console.error("Error cancelling Stripe pre-authorization:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to cancel pre-authorization" 
      },
      { status: 500 }
    );
  }
}