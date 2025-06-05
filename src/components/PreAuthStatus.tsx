/* eslint-disable react/no-unescaped-entities */
"use client";

import { PreAuthData } from "@/types";
import { CheckCircle, CreditCard, Wallet, DollarSign, Zap } from "lucide-react";

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
    <div className="glassmorphism rounded-2xl shadow-2xl p-8 border border-white/20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
          <CheckCircle className="text-white" size={24} />
        </div>
        <h2 className="text-3xl font-bold text-white">
          Pre-Authorization Active! 🎉
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card-gradient rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard className="text-white" size={20} />
              </div>
              <span className="text-lg font-semibold text-white">
                Credit Card
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-white">
                **** **** **** {preAuthData.card_last_four}
              </p>
              <p className="text-gray-300 capitalize text-lg">
                {preAuthData.card_brand}
              </p>
            </div>
          </div>

          <div className="card-gradient rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Wallet className="text-white" size={20} />
              </div>
              <span className="text-lg font-semibold text-white">
                Linked Wallet
              </span>
            </div>
            <p className="text-sm font-mono text-blue-300 break-all bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
              {preAuthData.wallet_address}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-gradient rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <DollarSign className="text-white" size={20} />
              </div>
              <span className="text-lg font-semibold text-white">
                Available Credit
              </span>
            </div>
            <p className="text-3xl font-bold text-green-400 mb-2">
              ${preAuthData.available_credit.toLocaleString()}
            </p>
            <p className="text-sm text-gray-300">
              Total credit limit on your card
            </p>
          </div>

          <div className="card-gradient rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Zap className="text-white" size={20} />
              </div>
              <span className="text-lg font-semibold text-white">
                Max Borrow (80% LTV)
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-400 mb-2">
              ${maxBorrowAmount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-300">
              Maximum you can borrow right now
            </p>
          </div>

          <button
            onClick={onBorrow}
            className="w-full btn-gradient text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
          >
            <Zap size={20} />
            Start Borrowing
          </button>
        </div>
      </div>

      <div className="mt-8 card-gradient rounded-xl p-6 border border-blue-500/30">
        <h4 className="font-semibold text-blue-300 mb-3 text-lg">
          How It Works
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 mt-1 font-bold">1.</span>
            <span>Your credit card is pre-authorized but not charged</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 mt-1 font-bold">2.</span>
            <span>You can borrow up to 80% of your credit limit</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 mt-1 font-bold">3.</span>
            <span>Interest accrues on borrowed amounts</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 mt-1 font-bold">4.</span>
            <span>Repay anytime or card will be charged</span>
          </div>
        </div>
      </div>
    </div>
  );
}
