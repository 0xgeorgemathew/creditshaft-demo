"use client";

import { useState } from "react";
import WalletConnection from "@/components/WalletConnection";
import StripePreAuth from "@/components/StripePreAuth";
import PreAuthStatus from "@/components/PreAuthStatus";
import BorrowingInterface from "@/components/BorrowingInterface";
import { PreAuthData } from "@/types";
import { Zap, Shield, TrendingUp } from "lucide-react";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [preAuthData, setPreAuthData] = useState<PreAuthData | null>(null);
  const [showBorrowing, setShowBorrowing] = useState(false);

  const handleWalletConnected = (address: string) => {
    setWalletAddress(address);
  };

  const handlePreAuthSuccess = (data: PreAuthData) => {
    setPreAuthData(data);
  };

  const handleBorrow = () => {
    setShowBorrowing(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Zap className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-white">CreditBridge</h1>
            </div>
            <div className="text-sm text-gray-300">
              Hackathon Demo • Sepolia Testnet
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        {!walletAddress && (
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Turn Your Credit Card Into
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {" "}
                DeFi Collateral
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Borrow crypto instantly using your credit card as collateral. No
              KYC, no identity verification, completely permissionless.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
                <Zap className="text-blue-400 mb-4 mx-auto" size={32} />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Instant Borrowing
                </h3>
                <p className="text-gray-400 text-sm">
                  Get crypto loans in seconds using credit card pre-auth
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
                <Shield className="text-green-400 mb-4 mx-auto" size={32} />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No KYC Required
                </h3>
                <p className="text-gray-400 text-sm">
                  Completely anonymous, only wallet connection needed
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-xl p-6 border border-white/10">
                <TrendingUp
                  className="text-purple-400 mb-4 mx-auto"
                  size={32}
                />
                <h3 className="text-lg font-semibold text-white mb-2">
                  80% LTV Ratio
                </h3>
                <p className="text-gray-400 text-sm">
                  Borrow up to 80% of your credit card limit
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Flow */}
        <div className="space-y-8">
          {/* Step 1: Wallet Connection */}
          {!walletAddress && (
            <WalletConnection onWalletConnected={handleWalletConnected} />
          )}

          {/* Step 2: Credit Card Pre-Auth */}
          {walletAddress && !preAuthData && (
            <StripePreAuth
              walletAddress={walletAddress}
              onPreAuthSuccess={handlePreAuthSuccess}
            />
          )}

          {/* Step 3: Pre-Auth Status */}
          {preAuthData && !showBorrowing && (
            <PreAuthStatus preAuthData={preAuthData} onBorrow={handleBorrow} />
          )}

          {/* Step 4: Borrowing Interface */}
          {showBorrowing && preAuthData && (
            <BorrowingInterface
              preAuthData={preAuthData}
              walletAddress={walletAddress}
            />
          )}
        </div>

        {/* Demo Info */}
        {walletAddress && (
          <div className="mt-12 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6">
            <h3 className="text-yellow-400 font-semibold mb-2">
              🎯 Hackathon Demo Mode
            </h3>
            <p className="text-yellow-200 text-sm">
              This is a demonstration for hackathon purposes. No real money or
              credit cards are being used. All transactions are on Sepolia
              testnet.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400">
            <p className="mb-2">Built by The Collateral Cartel</p>
            <p className="text-sm">Bridging Web2 Credit with Web3 DeFi</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
