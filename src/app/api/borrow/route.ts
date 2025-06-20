import { NextRequest, NextResponse } from "next/server";
import { loanStorage, generateLoanId } from "@/lib/loanStorage";
import { getStripeInstance } from "@/lib/stripe-server";

export async function POST(request: NextRequest) {
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
      preAuthDurationMinutes,
      customerId,
      paymentMethodId,
      setupIntentId,
      cardLastFour,
      cardBrand,
    } = await request.json();

    // Validate required fields
    if (!amount || !walletAddress) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const loanId = generateLoanId();
    const borrowAmountUSD = parseFloat(amount);
    const borrowAmountETHNum = parseFloat(amountETH);
    const preAuthAmount = requiredPreAuth || Math.ceil(borrowAmountUSD / (selectedLTV / 100));
    const interestRate = 4.5; // Simplified fixed rate

    // Demo mode - return simplified response
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const mockTxHash = "0x" + Math.random().toString(16).substring(2, 66);
      
      const loanData = {
        id: loanId,
        preAuthId: preAuthId || setupIntentId || `demo_${Date.now()}`,
        walletAddress,
        customerId: customerId || "demo_customer",
        paymentMethodId: paymentMethodId || "demo_payment_method",
        borrowAmount: borrowAmountUSD,
        borrowAmountETH: borrowAmountETHNum,
        ethPriceAtCreation: ethPrice,
        asset: asset || "ETH",
        interestRate,
        ltvRatio: selectedLTV,
        originalCreditLimit: 5000, // Mock value for demo
        preAuthAmount,
        status: "active" as const,
        createdAt: new Date().toISOString(),
        txHash: mockTxHash,
      };

      loanStorage.createLoan(loanData);

      return NextResponse.json({
        success: true,
        loanId,
        txHash: mockTxHash,
        amount: borrowAmountUSD,
        amountETH: borrowAmountETHNum,
        contractParams: {
          preAuthAmountUSD: Math.round(preAuthAmount * 100),
          preAuthDurationMinutes: preAuthDurationMinutes || 7 * 24 * 60,
          stripePaymentIntentId: preAuthId || setupIntentId || `demo_${Date.now()}`,
          stripeCustomerId: customerId || "demo_customer",
          stripePaymentMethodId: paymentMethodId || "demo_payment_method"
        }
      });
    }

    // Production mode - simplified Stripe integration
    if (!customerId || !paymentMethodId) {
      return NextResponse.json({ success: false, error: "Missing Stripe data" }, { status: 400 });
    }

    try {
      const stripe = getStripeInstance();
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(preAuthAmount * 100),
        currency: "usd",
        customer: customerId,
        payment_method: paymentMethodId,
        capture_method: "manual",
        confirm: true,
        off_session: true,
        description: `CreditShaft loan ${loanId}`,
      });

      if (paymentIntent.status !== "requires_capture") {
        return NextResponse.json({ 
          success: false, 
          error: `Payment failed: ${paymentIntent.status}` 
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        requiresContractCall: true,
        loanId,
        contractParams: {
          preAuthAmountUSD: Math.round(preAuthAmount * 100),
          preAuthDurationMinutes: preAuthDurationMinutes || 7 * 24 * 60,
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: customerId,
          stripePaymentMethodId: paymentMethodId
        }
      });

    } catch (stripeError: any) {
      return NextResponse.json({
        success: false,
        error: `Stripe error: ${stripeError.message}`,
      }, { status: 400 });
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Borrowing failed",
    }, { status: 500 });
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
