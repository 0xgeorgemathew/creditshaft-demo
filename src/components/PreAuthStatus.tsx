/* eslint-disable react/no-unescaped-entities */
"use client";

import { PreAuthData } from "@/types";
import { CheckCircle, CreditCard, Wallet } from "lucide-react";

interface PreAuthStatusProps {
  preAuthData: PreAuthData;
  onBorrow: () => void;
}

export default function PreAuthStatus({
  preAuthData,
  onBorrow,
}: PreAuthStatusProps) {
  const maxBorrowAmount = Math.floor(preAuthData.available_credit * 0.8); // 80% LTV

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle className="text-green-600" size={24} />
        <h2 className="text-2xl font-bold text-green-800">
          Pre-Authorization Active!
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="text-blue-600" size={16} />
              <span className="text-sm font-medium text-gray-600">
                Credit Card
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              **** **** **** {preAuthData.card_last_four}
            </p>
            <p className="text-sm text-gray-500 capitalize">
              {preAuthData.card_brand}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="text-purple-600" size={16} />
              <span className="text-sm font-medium text-gray-600">
                Linked Wallet
              </span>
            </div>
            <p className="text-xs font-mono text-gray-800 break-all">
              {preAuthData.wallet_address}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Available Credit
            </p>
            <p className="text-2xl font-bold text-green-600">
              ${preAuthData.available_credit.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-600 mb-1">
              Max Borrow (80% LTV)
            </p>
            <p className="text-2xl font-bold text-blue-600">
              ${maxBorrowAmount.toLocaleString()}
            </p>
          </div>

          <button
            onClick={onBorrow}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            Borrow Now
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> Your credit card is pre-authorized but
          not charged. You can borrow up to 80% of your credit limit. If you
          don't repay, the pre-authorization will be captured to cover the debt.
        </p>
      </div>
    </div>
  );
}
