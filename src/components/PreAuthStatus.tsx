"use client";

import { PreAuthData } from "@/types";
import { CreditCard, Wallet, DollarSign, Zap } from "lucide-react";

interface PreAuthStatusProps {
  preAuthData: PreAuthData;
  onLeverage: () => void;
  hasActiveLoans?: boolean;
}

export default function PreAuthStatus({
  preAuthData,
  onLeverage,
  hasActiveLoans = false,
}: PreAuthStatusProps) {
  const maxLeverageAmount = Math.floor(preAuthData.available_credit * 0.65); // 65% LTV

  return (
    <div className="glassmorphism rounded-2xl shadow-2xl p-8 border border-white/20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
          <CreditCard className="text-white" size={24} />
        </div>
        <div className="flex items-center gap-6">
          <h2 className="text-3xl font-bold text-white">Account Overview</h2>
          {preAuthData.preAuthId && (
            <div className="flex items-center gap-2 glassmorphism px-3 py-1 rounded-full border border-white/20">
              <div className="relative">
                {hasActiveLoans ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                    <div className="absolute inset-0 w-2 h-2 bg-green-400/30 rounded-full animate-ping"></div>
                  </>
                ) : (
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  hasActiveLoans ? "text-green-300" : "text-gray-400"
                }`}
              >
                {hasActiveLoans ? "Pre Auth Active" : "Pre Auth Inactive"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="card-gradient rounded-xl p-6 border border-white/10 h-[160px] flex flex-col justify-between">
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

          <div className="card-gradient rounded-xl p-6 border border-white/10 h-[160px] flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Wallet className="text-white" size={20} />
              </div>
              <span className="text-lg font-semibold text-white">
                Linked Wallet
              </span>
            </div>
            <p className="text-xs font-mono text-blue-300 break-all bg-blue-500/10 p-3 rounded-lg border border-blue-500/30 overflow-hidden">
              {preAuthData.wallet_address}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-gradient rounded-xl p-6 border border-white/10 h-[160px] flex flex-col justify-between">
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

          <div className="card-gradient rounded-xl p-6 border border-white/10 h-[160px] flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Zap className="text-white" size={20} />
              </div>
              <span className="text-lg font-semibold text-white">
                Maximum Leverage Capacity
              </span>
            </div>
            <p className="text-3xl font-bold text-blue-400 mb-2">
              ${maxLeverageAmount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-300 mb-4">
              Any crypto asset (USDC, USDT, DAI, ETH, BTC)
            </p>
          </div>
        </div>
      </div>

      {/* Start Borrowing Section */}
      <div className="mt-8 text-center">
        <button
          onClick={onLeverage}
          className="btn-gradient text-white py-4 px-8 rounded-xl font-bold text-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-3 mx-auto"
        >
          <Zap size={24} />
          Start Leveraging
        </button>
        <p className="text-gray-400 text-sm mt-3">
          Ready to leverage any crypto asset against your credit limit
        </p>
      </div>

      <div className="mt-8 card-gradient rounded-xl p-6 border border-blue-500/30">
        <h4 className="font-semibold text-blue-300 mb-3 text-lg">
          How It Works
        </h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 mt-1 font-bold">1.</span>
            <span>Choose your crypto asset and leverage amount</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 mt-1 font-bold">2.</span>
            <span>Credit card is pre-authorized for collateral</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 mt-1 font-bold">3.</span>
            <span>Interest accrues on leveraged amounts</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-400 mt-1 font-bold">4.</span>
            <span>Repay anytime to release the hold</span>
          </div>
        </div>
      </div>
    </div>
  );
}
