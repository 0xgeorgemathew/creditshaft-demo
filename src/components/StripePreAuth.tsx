/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import { PreAuthData } from "@/types";
import { CreditCard, AlertCircle } from "lucide-react";

interface StripePreAuthProps {
  walletAddress: string;
  onPreAuthSuccess: (data: PreAuthData) => void;
}

export default function StripePreAuth({
  walletAddress,
  onPreAuthSuccess,
}: StripePreAuthProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");

  const handlePreAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError("");

    try {
      // Call API endpoint instead of mock data
      const response = await fetch("/api/stripe/preauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardNumber,
          expiryDate,
          cvc,
          walletAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const preAuthData: PreAuthData = {
          available_credit: data.availableCredit,
          card_last_four: data.cardLastFour,
          card_brand: data.cardBrand,
          status: data.status,
          wallet_address: walletAddress,
          created_at: new Date().toISOString(),
        };
        onPreAuthSuccess(preAuthData);
      } else {
        setError(data.error || "Pre-authorization failed. Please try again.");
      }
    } catch (err) {
      setError("Pre-authorization failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const fillTestCard = (cardType: "success" | "declined") => {
    if (cardType === "success") {
      setCardNumber("4242 4242 4242 4242");
      setExpiryDate("12/28");
      setCvc("123");
    } else {
      setCardNumber("4000 0000 0000 0002");
      setExpiryDate("12/28");
      setCvc("123");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold text-gray-800">Add Credit Card</h2>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800 mb-2">
          <strong>Demo Mode:</strong> Use test cards for hackathon demo
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fillTestCard("success")}
            className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
          >
            Fill Success Card
          </button>
          <button
            type="button"
            onClick={() => fillTestCard("declined")}
            className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded"
          >
            Fill Declined Card
          </button>
        </div>
      </div>

      <form onSubmit={handlePreAuth} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Number
          </label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="1234 5678 9012 3456"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date
            </label>
            <input
              type="text"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              placeholder="MM/YY"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CVC
            </label>
            <input
              type="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              placeholder="123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={4}
              required
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Linked Wallet:</strong>
          </p>
          <p className="text-xs font-mono text-gray-800 break-all">
            {walletAddress}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Creating Pre-Authorization...
            </div>
          ) : (
            "Create Pre-Authorization"
          )}
        </button>
      </form>
    </div>
  );
}
