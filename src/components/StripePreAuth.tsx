/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { PreAuthData } from "@/types";
import { CreditCard, AlertCircle, CheckCircle, Loader } from "lucide-react";

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface StripePreAuthProps {
  walletAddress: string;
  onPreAuthSuccess: (data: PreAuthData) => void;
}

// Card Element Options
const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#ffffff",
      backgroundColor: "transparent",
      "::placeholder": {
        color: "#9ca3af",
      },
      iconColor: "#ffffff",
    },
    invalid: {
      color: "#ef4444",
      iconColor: "#ef4444",
    },
  },
  hidePostalCode: true,
};

// Inner component that uses Stripe hooks
function StripeForm({ walletAddress, onPreAuthSuccess }: StripePreAuthProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [cardComplete, setCardComplete] = useState(false);

  // Enhanced logging function
  const addLog = (message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage, data || "");
    setLogs((prev) => [
      ...prev,
      logMessage + (data ? `: ${JSON.stringify(data)}` : ""),
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe has not loaded yet. Please try again.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError("Card element not found. Please refresh the page.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setLogs([]);

    addLog("🚀 Starting secure Stripe Elements flow");

    try {
      // Create payment method using Stripe Elements
      addLog("🔐 Creating secure payment method token");

      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: {
            // Optional: add billing details if needed
          },
        });

      if (stripeError) {
        addLog("❌ Stripe Elements error", {
          type: stripeError.type,
          code: stripeError.code,
          message: stripeError.message,
        });
        setError(stripeError.message || "Payment method creation failed");
        return;
      }

      addLog("✅ Payment method created securely", {
        paymentMethodId: paymentMethod.id,
        cardBrand: paymentMethod.card?.brand,
        cardLast4: paymentMethod.card?.last4,
        cardCountry: paymentMethod.card?.country,
      });

      // Send secure token to backend
      const requestData = {
        paymentMethodId: paymentMethod.id,
        walletAddress,
      };

      addLog("📤 Sending secure token to backend", {
        paymentMethodId: paymentMethod.id,
        walletAddress,
      });

      const response = await fetch("/api/stripe/preauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      addLog("📥 Received response from API", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();
      addLog("📋 Response data received", data);

      if (data.success) {
        addLog("✅ Pre-authorization successful!", {
          preAuthId: data.preAuthId,
          availableCredit: data.availableCredit,
          cardBrand: data.cardBrand,
          cardLastFour: data.cardLastFour,
        });

        const preAuthData: PreAuthData = {
          available_credit: data.availableCredit,
          card_last_four: data.cardLastFour || paymentMethod.card?.last4,
          card_brand: data.cardBrand || paymentMethod.card?.brand,
          status: data.status,
          wallet_address: walletAddress,
          created_at: new Date().toISOString(),
        };

        addLog("🎯 Calling onPreAuthSuccess with data", preAuthData);
        onPreAuthSuccess(preAuthData);
      } else {
        addLog("❌ Pre-authorization failed", {
          error: data.error,
          code: data.code,
          details: data.details,
        });
        setError(data.error || "Pre-authorization failed. Please try again.");
      }
    } catch (err: any) {
      addLog("💥 Exception caught during request", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsProcessing(false);
      addLog("🏁 Pre-authorization request completed");
    }
  };

  // Test card button functionality
  const fillTestCard = async (cardType: "success" | "declined") => {
    if (!elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    // Clear the card element first
    cardElement.clear();

    // For Stripe Elements, we can't programmatically fill test cards
    // Users need to manually enter them
    const testCards = {
      success: "4242 4242 4242 4242",
      declined: "4000 0000 0000 0002",
    };

    addLog("🎭 Test card info", {
      card: testCards[cardType],
      note: "Please enter this card manually in the form below",
    });

    // Focus the card element for user convenience
    cardElement.focus();
  };

  return (
    <div className="glassmorphism rounded-2xl shadow-2xl p-8 border border-white/20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
          <CreditCard className="text-white" size={24} />
        </div>
        <h2 className="text-3xl font-bold text-white">Add Credit Card</h2>
      </div>

      {/* Demo Mode Instructions */}
      <div className="mb-6 card-gradient rounded-xl p-4 border border-blue-500/30">
        <p className="text-blue-200 mb-3 font-semibold flex items-center gap-2">
          <CheckCircle size={16} />
          Secure Mode: Using Stripe Elements for card security
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/30">
            <p className="text-green-200 text-sm font-semibold">
              ✅ Success Test Card:
            </p>
            <p className="text-green-100 text-xs font-mono">
              4242 4242 4242 4242
            </p>
            <p className="text-green-100 text-xs">Expiry: 12/28, CVC: 123</p>
          </div>
          <div className="bg-red-500/10 p-3 rounded-lg border border-red-500/30">
            <p className="text-red-200 text-sm font-semibold">
              ❌ Declined Test Card:
            </p>
            <p className="text-red-100 text-xs font-mono">
              4000 0000 0000 0002
            </p>
            <p className="text-red-100 text-xs">Expiry: 12/28, CVC: 123</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Secure Card Element */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-3">
            Card Information (Secure)
          </label>
          <div className="bg-white/10 border border-white/20 rounded-xl p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
            <CardElement
              options={cardElementOptions}
              onChange={(event) => {
                setCardComplete(event.complete);
                if (event.error) {
                  setError(event.error.message);
                } else {
                  setError("");
                }
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            🔒 Your card information is encrypted and secure. Never stored on
            our servers.
          </p>
        </div>

        <div className="glassmorphism rounded-xl p-4 border border-white/10">
          <p className="text-sm text-gray-300 mb-2 font-semibold">
            Linked Wallet:
          </p>
          <p className="text-xs font-mono text-blue-300 break-all bg-blue-500/10 p-2 rounded-lg">
            {walletAddress}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 text-red-300 bg-red-500/10 p-4 rounded-xl border border-red-500/30">
            <AlertCircle size={20} />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing || !stripe || !cardComplete}
          className="w-full btn-gradient text-white py-4 px-6 rounded-xl font-bold text-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-3"
        >
          {isProcessing ? (
            <>
              <Loader className="animate-spin" size={20} />
              Securely Processing...
            </>
          ) : (
            <>
              <CreditCard size={20} />
              Create Secure Pre-Authorization
            </>
          )}
        </button>
      </form>

      {/* Enhanced Logging Display */}
      {(logs.length > 0 || process.env.NODE_ENV === "development") && (
        <div className="mt-8 glassmorphism rounded-xl p-4 border border-gray-500/30">
          <h4 className="text-gray-300 font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            Secure Stripe API Logs:
          </h4>
          <div className="bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto">
            {logs.length > 0 ? (
              <div className="text-xs text-gray-300 space-y-1 font-mono">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className="border-l-2 border-blue-500/30 pl-2"
                  >
                    {log}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 font-mono">
                No logs yet - submit form to see secure API calls
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main component that provides Stripe Elements context
export default function StripePreAuth(props: StripePreAuthProps) {
  const [stripeError, setStripeError] = useState<string>("");

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      setStripeError("Stripe publishable key is not configured");
    }
  }, []);

  if (stripeError) {
    return (
      <div className="glassmorphism rounded-2xl p-8 border border-red-500/30">
        <div className="flex items-center gap-3 text-red-300">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-semibold">Stripe Configuration Error</h3>
            <p className="text-sm">{stripeError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripeForm {...props} />
    </Elements>
  );
}
