/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import WalletConnection from "@/components/WalletConnection";
import StripePreAuth from "@/components/StripePreAuth";
import PreAuthStatus from "@/components/PreAuthStatus";
import BorrowingInterface from "@/components/BorrowingInterface";
import LoanDashboard from "@/components/LoanDashboard";
import { PreAuthData } from "@/types";
import { Zap, Shield, TrendingUp, Sparkles, CreditCard } from "lucide-react";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [preAuthData, setPreAuthData] = useState<PreAuthData | null>(null);
  const [showBorrowing, setShowBorrowing] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "borrow" | "manage">(
    "overview"
  );

  // Debug tab changes
  useEffect(() => {
    console.log("📋 Active tab changed to:", activeTab);
  }, [activeTab]);

  // Reset states when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setPreAuthData(null);
      setShowBorrowing(false);
      setShowDashboard(false);
      setActiveTab("overview");
    }
  }, [isConnected]);

  const handleWalletConnected = (walletAddress: string) => {
    console.log("Wallet connected:", walletAddress);
    setActiveTab("overview");
  };

  const handlePreAuthSuccess = (data: PreAuthData) => {
    setPreAuthData(data);
  };

  const handleBorrow = () => {
    setShowBorrowing(true);
    setActiveTab("borrow");
  };

  const handleBorrowSuccess = () => {
    console.log("🎯 handleBorrowSuccess called - starting navigation");
    console.log("Current activeTab:", activeTab);
    setShowBorrowing(false);
    setActiveTab("manage");
    console.log("Set activeTab to 'manage'");
    console.log("Redirecting to manage loans tab after successful borrow");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-lg bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg glow-blue">
                <Zap className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-bold text-white">
                <span className="gradient-text">Credit</span>Shaft
              </h1>
            </div>
            <div className="text-sm text-gray-300 bg-white/10 px-3 py-1 rounded-full backdrop-blur">
              <Sparkles className="inline w-4 h-4 mr-1" />
              Hackathon Demo • Sepolia Testnet
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section - Only show when no wallet connected */}
        {!isConnected && (
          <div className="text-center mb-16">
            <div className="mb-8">
              <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Turn Your Credit Card Into
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">
                  DeFi Collateral
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Borrow crypto instantly using your credit card as collateral. No
                KYC, no identity verification, completely permissionless.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="group card-gradient rounded-2xl p-8 card-hover transform transition-all duration-500">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                  <Zap className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  Instant Borrowing
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Get crypto loans in seconds using credit card
                  pre-authorization. No waiting, no approvals.
                </p>
              </div>

              <div className="group card-gradient rounded-2xl p-8 card-hover transform transition-all duration-500">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                  <Shield className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  No KYC Required
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Completely anonymous and permissionless. Only wallet
                  connection needed.
                </p>
              </div>

              <div className="group card-gradient rounded-2xl p-8 card-hover transform transition-all duration-500">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-white" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  80% LTV Ratio
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  Borrow up to 80% of your credit card limit with competitive
                  rates.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs - Show when wallet connected and pre-auth exists */}
        {isConnected && preAuthData && (
          <div className="glassmorphism rounded-xl p-2 border border-white/20 mb-8">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "overview"
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Shield size={16} />
                Overview
              </button>
              <button
                onClick={() => setActiveTab("borrow")}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "borrow"
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <Zap size={16} />
                Borrow
              </button>
              <button
                onClick={() => setActiveTab("manage")}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === "manage"
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    : "text-gray-300 hover:text-white hover:bg-white/10"
                }`}
              >
                <CreditCard size={16} />
                Manage Loans
              </button>
            </div>
          </div>
        )}

        {/* Main Flow */}
        <div className="space-y-8">
          {/* Step 1: Wallet Connection */}
          {!isConnected && (
            <div className="transform transition-all duration-500 animate-fade-in">
              <WalletConnection onWalletConnected={handleWalletConnected} />
            </div>
          )}

          {/* Step 2: Credit Card Pre-Auth */}
          {isConnected && address && !preAuthData && (
            <div className="transform transition-all duration-500 animate-fade-in">
              <StripePreAuth
                walletAddress={address}
                onPreAuthSuccess={handlePreAuthSuccess}
              />
            </div>
          )}

          {/* Step 3: Tabbed Interface */}
          {preAuthData && address && (
            <div className="transform transition-all duration-500 animate-fade-in">
              {activeTab === "overview" && (
                <PreAuthStatus
                  preAuthData={preAuthData}
                  onBorrow={handleBorrow}
                />
              )}

              {activeTab === "borrow" && (
                <BorrowingInterface
                  preAuthData={preAuthData}
                  walletAddress={address}
                  onBorrowSuccess={handleBorrowSuccess}
                />
              )}

              {activeTab === "manage" && (
                <LoanDashboard walletAddress={address} />
              )}
            </div>
          )}
        </div>

        {/* Demo Info */}
        {isConnected && (
          <div className="mt-16 glassmorphism rounded-2xl p-6 border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="text-yellow-400" size={24} />
              <h3 className="text-yellow-300 font-bold text-lg">
                Hackathon Demo Mode
              </h3>
            </div>
            <p className="text-yellow-100 leading-relaxed">
              This is a demonstration for hackathon purposes. No real money or
              credit cards are being used. All transactions are on Sepolia
              testnet.
            </p>
          </div>
        )}

        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 glassmorphism rounded-xl p-4 border border-gray-500/30">
            <h4 className="text-gray-300 font-semibold mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Debug Info:
            </h4>
            <div className="text-sm text-gray-400 space-y-1 font-mono">
              <p>
                Wallet Connected:{" "}
                <span
                  className={isConnected ? "text-green-400" : "text-red-400"}
                >
                  {isConnected ? "Yes" : "No"}
                </span>
              </p>
              <p>
                Wallet Address:{" "}
                <span className="text-blue-400">{address || "None"}</span>
              </p>
              <p>
                Pre-Auth Data:{" "}
                <span
                  className={preAuthData ? "text-green-400" : "text-red-400"}
                >
                  {preAuthData ? "Yes" : "No"}
                </span>
              </p>
              <p>
                Active Tab: <span className="text-purple-400">{activeTab}</span>
              </p>
              <p>
                Show Borrowing:{" "}
                <span
                  className={showBorrowing ? "text-green-400" : "text-red-400"}
                >
                  {showBorrowing ? "Yes" : "No"}
                </span>
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-20 backdrop-blur-lg bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg"></div>
              <span className="text-gray-300 font-semibold">
                Built by Third Leg Ventures
              </span>
            </div>
            <p className="text-gray-400">Bridging Web2 Credit with Web3 DeFi</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
