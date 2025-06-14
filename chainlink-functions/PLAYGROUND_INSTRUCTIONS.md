# Chainlink Functions Playground - Stripe Charge Test

## Overview
This guide helps you test the Stripe charge functionality using the Chainlink Functions Playground. The function will directly call Stripe's API to capture a payment intent (charge a credit card).

## Prerequisites

### 1. Stripe Setup
- **Stripe Account**: You need a Stripe account (test mode is fine)
- **API Key**: Get your Stripe Secret Key from the Stripe Dashboard
- **Payment Intent**: Create a payment intent that's ready to be captured

### 2. Chainlink Functions Setup
- **Subscription**: Create a Chainlink Functions subscription
- **Funds**: Add LINK tokens to your subscription for function execution

## Step-by-Step Instructions

### Step 1: Get Your Stripe Secret Key
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API Keys**
3. Copy your **Secret Key** (starts with `sk_test_` for test mode)
4. **Important**: Never share this key publicly!

### Step 2: Create a Payment Intent (For Testing)
You'll need a payment intent that's ready to be captured. You can create one using:

```bash
# Using curl (replace YOUR_SECRET_KEY)
curl https://api.stripe.com/v1/payment_intents \
  -u YOUR_SECRET_KEY: \
  -d amount=2000 \
  -d currency=usd \
  -d payment_method=pm_card_visa \
  -d capture_method=manual \
  -d confirmation_method=manual \
  -d confirm=true
```

Or use the test payment method `pm_1234567890abcdef` if available in your Stripe test environment.

### Step 3: Set Up Chainlink Functions Playground

1. **Go to Playground**: Visit [Chainlink Functions Playground](https://functions.chain.link/playground)

2. **Connect Wallet**: Connect your wallet with LINK tokens

3. **Select Network**: Choose **Sepolia** testnet

4. **Copy Function Code**: Copy the entire contents of `stripe-charge-test.js` into the code editor

### Step 4: Configure Secrets

1. **Add Secret**: In the playground, add a new secret:
   - **Key**: `STRIPE_SECRET_KEY`
   - **Value**: Your Stripe secret key (e.g., `sk_test_abc123...`)

2. **Important**: Secrets are encrypted and stored securely by Chainlink

### Step 5: Set Function Arguments

In the playground arguments section, provide:

```javascript
[
  "pi_1234567890abcdef",  // Your Payment Intent ID (required)
  "1500",                 // Amount in cents to capture (optional)
  "loan_test_001"         // Loan ID for tracking (optional)
]
```

**Argument Details:**
- **Arg 0**: Payment Intent ID (required) - The payment intent you want to capture
- **Arg 1**: Amount in cents (optional) - If not provided, captures the full amount
- **Arg 2**: Loan ID (optional) - For tracking purposes in your application

### Step 6: Execute the Function

1. **Run Function**: Click "Run Function" in the playground
2. **Monitor Logs**: Watch the console logs for execution details
3. **Check Response**: Review the returned response data

## Expected Responses

### Success Response
```json
{
  "success": true,
  "paymentIntentId": "pi_1234567890abcdef",
  "status": "succeeded",
  "amountCaptured": 1500,
  "currency": "usd",
  "chargeId": "ch_1234567890abcdef",
  "loanId": "loan_test_001",
  "timestamp": 1703123456,
  "message": "Payment successfully captured"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Payment capture failed - status: requires_payment_method",
  "paymentIntentId": "pi_1234567890abcdef",
  "status": "requires_payment_method",
  "loanId": "loan_test_001",
  "timestamp": 1703123456
}
```

## Testing Scenarios

### Test Case 1: Successful Capture
- Use a valid payment intent in `requires_capture` status
- Expect success response with captured amount

### Test Case 2: Invalid Payment Intent
- Use a non-existent payment intent ID
- Expect error response from Stripe API

### Test Case 3: Already Captured Payment
- Use a payment intent that's already been captured
- Expect error about invalid status

### Test Case 4: Partial Capture
- Provide an amount less than the payment intent amount
- Expect successful partial capture

## Troubleshooting

### Common Errors

**"HTTP Request Error: true"** (Most Common Issue)
- **Problem**: Chainlink Functions HTTP request format incompatibility
- **Solution**: Use the simplified version `stripe-charge-simple.js` instead
- **Cause**: Chainlink Functions has specific requirements for HTTP requests that differ from standard Node.js

**"STRIPE_SECRET_KEY not found in secrets"**
- Solution: Make sure you've added the Stripe secret key to Chainlink secrets

**"Payment Intent ID is required"**
- Solution: Provide a valid payment intent ID as the first argument

**"Stripe API returned status 404"**
- Solution: Check that your payment intent ID exists and is correct

**"Payment capture failed - status: succeeded"**
- Solution: This payment intent was already captured

**"Response Status: undefined"**
- Solution: This indicates a Chainlink Functions HTTP request issue - try the simplified version

### Debug Steps for HTTP Request Issues

1. **Use Simplified Version**: Try `stripe-charge-simple.js` which is optimized for Chainlink Functions
2. **Check Logs**: Look for detailed error information in console logs
3. **Verify Secret**: Ensure your Stripe secret key is properly set in Chainlink secrets
4. **Test API Key**: Verify your Stripe API key works outside of Chainlink Functions
5. **Network Issues**: Sometimes Chainlink Functions has temporary network restrictions

### Debug Tips

1. **Check Logs**: Always review the console logs in the playground
2. **Validate Payment Intent**: Verify your payment intent exists in Stripe Dashboard
3. **Test Mode**: Use Stripe test mode for safe testing
4. **Small Amounts**: Test with small amounts first

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never expose Stripe keys** in code or logs
2. **Use test mode** for development and testing
3. **Secrets are encrypted** by Chainlink Functions
4. **Monitor usage** to prevent unexpected charges
5. **Validate amounts** to prevent overcharging

## Next Steps

Once you've successfully tested the function:

1. **Integrate with Smart Contract**: Add this function to a smart contract
2. **Set up Automation**: Configure Chainlink Automation for automatic execution
3. **Add Error Handling**: Implement proper error handling in your dApp
4. **Production Setup**: Configure for mainnet when ready

## Support

If you encounter issues:
- Check [Chainlink Functions Documentation](https://docs.chain.link/chainlink-functions)
- Review [Stripe API Documentation](https://stripe.com/docs/api)
- Join [Chainlink Discord](https://discord.gg/chainlink) for community support