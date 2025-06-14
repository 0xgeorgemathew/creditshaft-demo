// Simplified Chainlink Functions - Stripe Charge
// Optimized for Chainlink Functions HTTP request limitations

const paymentIntentId = args[0];
const amountToCapture = args[1];

console.log(`Starting Stripe charge for Payment Intent: ${paymentIntentId}`);

if (!paymentIntentId) {
  throw Error("Payment Intent ID required");
}

if (!secrets.STRIPE_SECRET_KEY) {
  throw Error("STRIPE_SECRET_KEY not found");
}

// Build the request
const url = `https://api.stripe.com/v1/payment_intents/${paymentIntentId}/capture`;

// Prepare headers
const headers = {
  "Authorization": `Bearer ${secrets.STRIPE_SECRET_KEY}`,
  "Content-Type": "application/x-www-form-urlencoded"
};

// Prepare body
let body = "";
if (amountToCapture) {
  body = `amount_to_capture=${amountToCapture}`;
}

console.log(`URL: ${url}`);
console.log(`Body: ${body || "empty (full capture)"}`);

// Make the HTTP request
const httpRequest = {
  url: url,
  method: "POST",
  headers: headers
};

// Only add data if we have it
if (body) {
  httpRequest.data = body;
}

try {
  const response = await Functions.makeHttpRequest(httpRequest);
  
  console.log(`Response received:`);
  console.log(`Status: ${response.status}`);
  console.log(`Error: ${response.error}`);
  
  // Log the full response for debugging
  if (response.data) {
    console.log(`Data: ${JSON.stringify(response.data)}`);
  }
  
  // Check for errors first
  if (response.error) {
    const result = {
      success: false,
      error: "HTTP_REQUEST_FAILED", 
      message: "Request to Stripe API failed",
      errorDetails: String(response.error),
      paymentIntentId: paymentIntentId
    };
    return Functions.encodeString(JSON.stringify(result));
  }
  
  // Check status code
  if (!response.status || response.status !== 200) {
    const result = {
      success: false,
      error: "BAD_STATUS_CODE",
      status: response.status || "undefined",
      message: "Stripe API returned non-200 status",
      paymentIntentId: paymentIntentId,
      responseData: response.data
    };
    return Functions.encodeString(JSON.stringify(result));
  }
  
  // Parse successful response
  const paymentIntent = response.data;
  
  if (paymentIntent && paymentIntent.status === "succeeded") {
    const result = {
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amountCaptured: paymentIntent.amount_received,
      currency: paymentIntent.currency,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    console.log("SUCCESS: Payment captured");
    return Functions.encodeString(JSON.stringify(result));
  } else {
    const result = {
      success: false,
      error: "CAPTURE_FAILED",
      status: paymentIntent ? paymentIntent.status : "unknown",
      message: "Payment capture was not successful",
      paymentIntentId: paymentIntentId,
      responseData: paymentIntent
    };
    
    console.log("FAILED: Payment not captured");
    return Functions.encodeString(JSON.stringify(result));
  }
  
} catch (error) {
  console.log(`Exception caught: ${error.message}`);
  
  const result = {
    success: false,
    error: "EXCEPTION",
    message: error.message,
    paymentIntentId: paymentIntentId,
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  return Functions.encodeString(JSON.stringify(result));
}