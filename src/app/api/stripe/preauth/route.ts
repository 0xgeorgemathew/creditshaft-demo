/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Enhanced logging utility
const logStripe = (event: string, data: any, isError: boolean = false) => {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? "ERROR" : "INFO";
  console.log(
    `[${timestamp}] [STRIPE-${logLevel}] ${event}:`,
    JSON.stringify(data, null, 2)
  );
};

// Initialize Stripe with correct API version
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    logStripe("INITIALIZATION", {
      success: true,
      keyLength: process.env.STRIPE_SECRET_KEY.length,
      keyPrefix: process.env.STRIPE_SECRET_KEY.substring(0, 12) + "...",
    });
  } else {
    logStripe(
      "INITIALIZATION",
      { error: "STRIPE_SECRET_KEY not found in environment" },
      true
    );
  }
} catch (error) {
  logStripe("INITIALIZATION", { error: error }, true);
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 11);
  logStripe("REQUEST_START", {
    requestId,
    timestamp: new Date().toISOString(),
  });

  try {
    const requestBody = await request.json();

    // Support both old format (direct card data) and new format (payment method token)
    const { paymentMethodId, walletAddress, cardNumber, expiryDate, cvc } =
      requestBody;

    logStripe("REQUEST_BODY", {
      requestId,
      hasPaymentMethodId: !!paymentMethodId,
      hasDirectCardData: !!(cardNumber && expiryDate && cvc),
      walletAddress: walletAddress || "missing",
    });

    // In hackathon demo mode, we'll simulate the pre-authorization
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      logStripe("DEMO_MODE_ACTIVE", { requestId, using: "mock_responses" });

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock pre-authorization - works with both old and new format
      let mockResponse;
      const cardIdentifier = paymentMethodId || cardNumber;

      if (cardIdentifier?.includes("4242") || cardIdentifier?.includes("pm_")) {
        mockResponse = {
          success: true,
          preAuthId: "seti_" + Math.random().toString(36).substring(2, 11),
          availableCredit: 12000,
          cardLastFour: "4242",
          cardBrand: "visa",
          walletAddress,
          status: "active",
          customerId: "cus_mock_" + Math.random().toString(36).substring(2, 11),
          paymentMethodId:
            paymentMethodId ||
            "pm_mock_" + Math.random().toString(36).substring(2, 11),
        };
        logStripe("DEMO_RESPONSE", {
          requestId,
          card: "success_card",
          response: mockResponse,
        });
      } else if (cardIdentifier?.includes("0002")) {
        mockResponse = {
          success: true,
          preAuthId: "seti_" + Math.random().toString(36).substring(2, 11),
          availableCredit: 8500,
          cardLastFour: "0002",
          cardBrand: "visa",
          walletAddress,
          status: "active",
          customerId: "cus_mock_" + Math.random().toString(36).substring(2, 11),
          paymentMethodId:
            paymentMethodId ||
            "pm_mock_" + Math.random().toString(36).substring(2, 11),
        };
        logStripe("DEMO_RESPONSE", {
          requestId,
          card: "success_card_0002",
          response: mockResponse,
        });
      } else {
        const errorResponse = { success: false, error: "Card declined" };
        logStripe("DEMO_RESPONSE", {
          requestId,
          card: "declined_card",
          response: errorResponse,
        });
        return NextResponse.json(errorResponse, { status: 400 });
      }

      return NextResponse.json(mockResponse);
    }

    // Check if Stripe is properly initialized
    if (!stripe) {
      const error =
        "Stripe not properly configured. Please set STRIPE_SECRET_KEY environment variable.";
      logStripe("STRIPE_NOT_CONFIGURED", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    // Validate input - require either payment method ID or wallet address
    if (!walletAddress) {
      const error = "Wallet address is required";
      logStripe("VALIDATION_ERROR", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    let paymentMethod: Stripe.PaymentMethod;

    // Handle secure payment method token (preferred method)
    if (paymentMethodId) {
      logStripe("SECURE_PAYMENT_METHOD_FLOW", { requestId, paymentMethodId });

      try {
        // Retrieve the payment method that was created securely on the frontend
        paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        logStripe("PAYMENT_METHOD_RETRIEVED", {
          requestId,
          paymentMethodId: paymentMethod.id,
          cardBrand: paymentMethod.card?.brand,
          cardLast4: paymentMethod.card?.last4,
          cardCountry: paymentMethod.card?.country,
        });
      } catch (error: any) {
        logStripe(
          "PAYMENT_METHOD_RETRIEVAL_ERROR",
          { requestId, error: error.message },
          true
        );
        return NextResponse.json(
          { success: false, error: "Invalid payment method" },
          { status: 400 }
        );
      }
    } else if (cardNumber && expiryDate && cvc) {
      // Legacy direct card handling (less secure, for backwards compatibility)
      logStripe("LEGACY_DIRECT_CARD_FLOW", {
        requestId,
        cardNumberMasked: `****-****-****-${cardNumber.slice(-4)}`,
      });

      // Parse expiry date
      const [month, year] = expiryDate.split("/");
      if (!month || !year || month.length !== 2 || year.length !== 2) {
        const error = "Invalid expiry date format. Use MM/YY";
        logStripe(
          "EXPIRY_VALIDATION_ERROR",
          { requestId, expiryDate, error },
          true
        );
        return NextResponse.json({ success: false, error }, { status: 400 });
      }

      const expMonth = parseInt(month, 10);
      const expYear = parseInt("20" + year, 10);

      if (expMonth < 1 || expMonth > 12) {
        const error = "Invalid month in expiry date";
        logStripe(
          "MONTH_VALIDATION_ERROR",
          { requestId, expMonth, error },
          true
        );
        return NextResponse.json({ success: false, error }, { status: 400 });
      }

      try {
        // Create payment method with direct card data (may be blocked by Stripe security)
        paymentMethod = await stripe.paymentMethods.create({
          type: "card",
          card: {
            number: cardNumber.replace(/\s/g, ""),
            exp_month: expMonth,
            exp_year: expYear,
            cvc: cvc,
          },
        });

        logStripe("DIRECT_PAYMENT_METHOD_CREATED", {
          requestId,
          paymentMethodId: paymentMethod.id,
          cardBrand: paymentMethod.card?.brand,
          cardLast4: paymentMethod.card?.last4,
        });
      } catch (error: any) {
        logStripe(
          "DIRECT_PAYMENT_METHOD_ERROR",
          { requestId, error: error.message },
          true
        );
        return NextResponse.json(
          {
            success: false,
            error: "Invalid card information provided",
            details: error.message,
          },
          { status: 400 }
        );
      }
    } else {
      const error =
        "Either paymentMethodId or complete card information is required";
      logStripe("VALIDATION_ERROR", { requestId, error }, true);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // Create a customer for this wallet
    logStripe("STRIPE_CUSTOMER_CREATE_START", { requestId, walletAddress });

    const customer = await stripe.customers.create({
      metadata: {
        wallet_address: walletAddress,
        created_via: "creditshaft_api",
        request_id: requestId,
      },
    });

    logStripe("STRIPE_CUSTOMER_CREATED", {
      requestId,
      customerId: customer.id,
      customerCreated: customer.created,
    });

    // Attach payment method to customer
    logStripe("STRIPE_PAYMENT_METHOD_ATTACH_START", {
      requestId,
      paymentMethodId: paymentMethod.id,
      customerId: customer.id,
    });

    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    });

    logStripe("STRIPE_PAYMENT_METHOD_ATTACHED", { requestId, success: true });

    // Create a setup intent for saving payment method (no hold yet)
    logStripe("STRIPE_SETUP_INTENT_CREATE_START", {
      requestId,
      customerId: customer.id,
      paymentMethodId: paymentMethod.id,
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method: paymentMethod.id,
      confirm: true,
      usage: "off_session",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        wallet_address: walletAddress,
        purpose: "credit_collateral_setup",
        request_id: requestId,
      },
    });

    logStripe("STRIPE_SETUP_INTENT_CREATED", {
      requestId,
      setupIntentId: setupIntent.id,
      status: setupIntent.status,
      clientSecret: setupIntent.client_secret ? "present" : "missing",
    });

    // Calculate available credit based on card (simplified for demo)
    let availableCredit = 5000; // Default
    const lastFour = paymentMethod.card?.last4 || "0000";

    if (lastFour === "4242") {
      availableCredit = 12000;
    } else if (lastFour === "0002") {
      availableCredit = 8500;
    }

    const response = {
      success: true,
      preAuthId: setupIntent.id,
      availableCredit,
      cardLastFour: lastFour,
      cardBrand: paymentMethod.card?.brand,
      walletAddress,
      status: "active",
      customerId: customer.id,
      paymentMethodId: paymentMethod.id,
    };

    logStripe("SUCCESS_RESPONSE", { requestId, response });
    return NextResponse.json(response);
  } catch (error: any) {
    logStripe(
      "ERROR_CAUGHT",
      {
        requestId,
        errorType: error.type || "unknown",
        errorCode: error.code || "unknown",
        errorMessage: error.message || "unknown",
        errorStack: error.stack || "unknown",
      },
      true
    );

    // Handle specific Stripe errors
    if (error.type === "StripeCardError") {
      const errorResponse = {
        success: false,
        error: error.message || "Card was declined",
        code: error.code,
      };
      logStripe("STRIPE_CARD_ERROR", { requestId, errorResponse }, true);
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (error.type === "StripeInvalidRequestError") {
      const errorResponse = {
        success: false,
        error: "Invalid card information provided",
        details: error.message,
      };
      logStripe(
        "STRIPE_INVALID_REQUEST_ERROR",
        { requestId, errorResponse },
        true
      );
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const errorResponse = {
      success: false,
      error: error.message || "Pre-authorization failed",
      type: error.type || "unknown_error",
    };
    logStripe("GENERIC_ERROR", { requestId, errorResponse }, true);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Health check endpoint with enhanced logging
export async function GET() {
  const requestId = Math.random().toString(36).substring(2, 11);
  logStripe("HEALTH_CHECK_START", { requestId });

  try {
    if (!stripe) {
      const error = "Stripe not configured - missing STRIPE_SECRET_KEY";
      logStripe("HEALTH_CHECK_FAILED", { requestId, error }, true);
      return NextResponse.json({
        status: "error",
        message: error,
        timestamp: new Date().toISOString(),
        requestId,
      });
    }

    // Test Stripe connection
    logStripe("STRIPE_ACCOUNT_RETRIEVE_START", { requestId });
    const account = await stripe.accounts.retrieve();
    logStripe("STRIPE_ACCOUNT_RETRIEVED", {
      requestId,
      accountId: account.id,
      country: account.country,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });

    const response = {
      status: "ok",
      message: "Stripe API connected successfully",
      timestamp: new Date().toISOString(),
      requestId,
      accountCountry: account.country,
    };
    logStripe("HEALTH_CHECK_SUCCESS", { requestId, response });
    return NextResponse.json(response);
  } catch (error: any) {
    logStripe(
      "HEALTH_CHECK_ERROR",
      {
        requestId,
        error: error.message,
        type: error.type,
      },
      true
    );
    return NextResponse.json({
      status: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
