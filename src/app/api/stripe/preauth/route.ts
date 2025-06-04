// src/app/api/stripe/preauth/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(request: NextRequest) {
  try {
    const { cardNumber, expiryDate, cvc, walletAddress } = await request.json();

    // In hackathon demo mode, we'll simulate the pre-authorization
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock pre-authorization based on test card numbers
      let mockResponse;
      if (cardNumber.includes("4242")) {
        mockResponse = {
          success: true,
          preAuthId: "pa_" + Math.random().toString(36).substr(2, 9),
          availableCredit: 12000,
          cardLastFour: "4242",
          cardBrand: "visa",
          walletAddress,
          status: "active",
        };
      } else if (cardNumber.includes("0002")) {
        mockResponse = {
          success: true,
          preAuthId: "pa_" + Math.random().toString(36).substr(2, 9),
          availableCredit: 8500,
          cardLastFour: "0002",
          cardBrand: "visa",
          walletAddress,
          status: "active",
        };
      } else {
        return NextResponse.json(
          { success: false, error: "Card declined" },
          { status: 400 }
        );
      }

      return NextResponse.json(mockResponse);
    }

    // Real Stripe implementation (for production)
    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: cardNumber.replace(/\s/g, ""),
        exp_month: parseInt(expiryDate.split("/")[0]),
        exp_year: parseInt("20" + expiryDate.split("/")[1]),
        cvc: cvc,
      },
    });

    // Create a pre-authorization (this would be a real implementation)
    const preAuth = await stripe.paymentIntents.create({
      amount: 1200000, // $12,000 in cents
      currency: "usd",
      payment_method: paymentMethod.id,
      confirmation_method: "manual",
      capture_method: "manual",
      metadata: {
        wallet_address: walletAddress,
        type: "preauth",
      },
    });

    return NextResponse.json({
      success: true,
      preAuthId: preAuth.id,
      availableCredit: 12000,
      cardLastFour: paymentMethod.card?.last4,
      cardBrand: paymentMethod.card?.brand,
      walletAddress,
      status: "active",
    });
  } catch (error: any) {
    console.error("Pre-authorization error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Pre-authorization failed" },
      { status: 500 }
    );
  }
}
