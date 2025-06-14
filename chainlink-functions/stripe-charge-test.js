// Chainlink Functions - Stripe Charge Test
// Purpose: Test direct Stripe API integration for charging payment methods
// Usage: Copy this code into Chainlink Functions Playground

const paymentIntentId = args[0]; // Payment Intent ID to capture
const amountToCapture = args[1]; // Amount in cents (optional, captures full amount if not provided)
const loanId = args[2]; // Loan ID for tracking (optional)

console.log("Stripe Charge Function Started");
console.log("Payment Intent ID:", paymentIntentId);
console.log("Amount to Capture:", amountToCapture || "full amount");
console.log("Loan ID:", loanId || "not provided");

// Validate required arguments
if (!paymentIntentId) {
  throw Error("Payment Intent ID is required as first argument");
}

// Validate Stripe secret key is available
if (!secrets.STRIPE_SECRET_KEY) {
  throw Error("STRIPE_SECRET_KEY not found in secrets");
}

try {
  // Build capture URL
  const captureUrl = `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/capture`;
  
  // Prepare request parameters for Chainlink Functions
  const requestConfig = {
    url: captureUrl,
    method: "POST",
    headers: {
      "Authorization": `Bearer ${secrets.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  };
  
  // Add data if amount specified
  if (amountToCapture) {
    requestConfig.data = `amount_to_capture=${amountToCapture}`;
  }
  
  console.log("Making Stripe API request to:", captureUrl);
  console.log("Request config:", JSON.stringify(requestConfig, null, 2));
  
  // Make direct API call to Stripe
  const stripeResponse = await Functions.makeHttpRequest(requestConfig);
  
  console.log("Full Stripe Response:", JSON.stringify(stripeResponse, null, 2));
  console.log("Response Status:", stripeResponse.status);
  console.log("Response Error:", stripeResponse.error);
  console.log("Response Data:", stripeResponse.data);
  
  // Handle Stripe API errors
  if (stripeResponse.error) {
    console.log("HTTP Request Error Details:", JSON.stringify(stripeResponse.error, null, 2));
    const errorResponse = {
      success: false,
      error: "HTTP request failed",
      details: JSON.stringify(stripeResponse.error),
      paymentIntentId: paymentIntentId,
      loanId: loanId || null,
      timestamp: Math.floor(Date.now() / 1000),
      fullResponse: stripeResponse
    };
    
    return Functions.encodeString(JSON.stringify(errorResponse));
  }
  
  // Check HTTP status
  if (stripeResponse.status !== 200) {
    console.log("Non-200 status code:", stripeResponse.status);
    console.log("Response data:", JSON.stringify(stripeResponse.data));
    
    const errorResponse = {
      success: false,
      error: `Stripe API returned status ${stripeResponse.status}`,
      details: stripeResponse.data,
      paymentIntentId: paymentIntentId,
      loanId: loanId || null,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    return Functions.encodeString(JSON.stringify(errorResponse));
  }
  
  const paymentIntent = stripeResponse.data;
  console.log("Payment Intent Status:", paymentIntent.status);
  console.log("Amount Received:", paymentIntent.amount_received);
  
  // Check if capture was successful
  if (paymentIntent.status === "succeeded") {
    const successResponse = {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amountCaptured: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      chargeId: paymentIntent.latest_charge,
      loanId: loanId || null,
      timestamp: Math.floor(Date.now() / 1000),
      message: "Payment successfully captured"
    };
    
    console.log("SUCCESS: Payment captured successfully");
    return Functions.encodeString(JSON.stringify(successResponse));
    
  } else {
    // Capture failed or payment intent in unexpected state
    const failureResponse = {
      success: false,
      error: `Payment capture failed - status: ${paymentIntent.status}`,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      lastPaymentError: paymentIntent.last_payment_error,
      loanId: loanId || null,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    console.log("FAILURE: Payment capture failed");
    return Functions.encodeString(JSON.stringify(failureResponse));
  }
  
} catch (error) {
  console.log("Caught exception:", error.message);
  
  const exceptionResponse = {
    success: false,
    error: "Function execution failed",
    details: error.message,
    paymentIntentId: paymentIntentId,
    loanId: loanId || null,
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  return Functions.encodeString(JSON.stringify(exceptionResponse));
}