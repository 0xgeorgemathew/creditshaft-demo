"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import WalletConnection from "@/components/WalletConnection";
import StripePreAuth from "@/components/StripePreAuth";
import PreAuthStatus from "@/components/PreAuthStatus";
import BorrowingInterface from "@/components/BorrowingInterface";
import LoanDashboard from "@/components/LoanDashboard";
import LiquidityProvider from "@/components/LiquidityProvider";
import NetworkSwitcher from "@/components/NetworkSwitcher";
import WalletAddress from "@/components/WalletAddress";
import { PreAuthData, Loan } from "@/types";
import { Zap, Shield, TrendingUp, Sparkles, CreditCard, Droplets } from "lucide-react";

// Key for session storage (in-memory)
const PREAUTH_STORAGE_KEY = "creditshaft_preauth_data";

// Valid tab types
type TabType = "overview" | "borrow" | "manage" | "setup" | "liquidity";

// Helper function to validate tab type
const isValidTab = (tab: string): tab is TabType => {
  return ["overview", "borrow", "manage", "setup", "liquidity"].includes(tab as TabType);
};

export default function Home() {
  const { address, isConnected } = useAccount();
  const [preAuthData, setPreAuthData] = useState<PreAuthData | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [hasActiveLoans, setHasActiveLoans] = useState(false);
  const [sessionStorageCount, setSessionStorageCount] = useState(0);
  const [isSessionRestored, setIsSessionRestored] = useState(false);

  // Enhanced session storage helper (browser persistent)
  const saveToSession = <T,>(key: string, data: T) => {
    try {
      if (typeof window !== 'undefined') {
        const dataString = JSON.stringify(data);
        window.sessionStorage.setItem(key, dataString);
      }
    } catch {
      // Silent error handling
    }
  };

  const loadFromSession = <T,>(key: string): T | null => {
    try {
      if (typeof window !== 'undefined') {
        const dataString = window.sessionStorage.getItem(key);
        if (dataString) {
          const data = JSON.parse(dataString) as T;
          return data;
        }
      }
    } catch {
      // Silent error handling
    }
    return null;
  };


  // Check for active loans
  const checkActiveLoans = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch(
        `/api/loans?wallet=${encodeURIComponent(address)}`
      );
      const data = await response.json();

      if (data.success && data.loans) {
        const activeLoans = data.loans.filter(
          (loan: Loan) => loan.status === "active"
        );
        setHasActiveLoans(activeLoans.length > 0);
      }
    } catch {
      // Silent error handling
    }
  }, [address]);


  // Update session storage count on client-side to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSessionStorageCount(window.sessionStorage.length);
      
      // Check if session was restored for the current address
      if (address) {
        const sessionKey = `${PREAUTH_STORAGE_KEY}_${address}`;
        const hasSessionData = !!window.sessionStorage.getItem(sessionKey);
        setIsSessionRestored(hasSessionData && !!preAuthData);
      }
    }
  }, [address, preAuthData]);

  // Load preAuth data from session when component mounts
  useEffect(() => {
    if (isConnected && address) {
      const sessionKey = `${PREAUTH_STORAGE_KEY}_${address}`;
      const savedPreAuth = loadFromSession<PreAuthData>(sessionKey);

      if (savedPreAuth) {
        setPreAuthData(savedPreAuth);

        // Check if user was in the middle of borrowing or managing loans
        const lastActiveTab = loadFromSession<string>(`tab_${address}`) || "overview";
        if (isValidTab(lastActiveTab)) {
          setActiveTab(lastActiveTab);
        } else {
          setActiveTab("overview");
        }
      } else {
      }

      // Check for active loans whenever wallet connects
      checkActiveLoans();
    }
  }, [isConnected, address, checkActiveLoans]);

  // Save active tab to session whenever it changes
  useEffect(() => {
    if (address && preAuthData) {
      saveToSession(`tab_${address}`, activeTab);
    }
  }, [activeTab, address, preAuthData]);

  // Reset states when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setPreAuthData(null);
      setActiveTab("overview");

      // Session data persists across wallet disconnections for better UX
    }
  }, [isConnected]);

  const handleWalletConnected = () => {
    // Always redirect to overview after wallet connection
    setActiveTab("overview");
  };

  const handlePreAuthSuccess = (data: PreAuthData) => {

    // Enhanced preAuth data with wallet linkage
    const enhancedData = {
      ...data,
      wallet_address: address,
      created_at: new Date().toISOString(),
    };

    setPreAuthData(enhancedData);

    // Save to session for persistence across refreshes
    if (address) {
      const sessionKey = `${PREAUTH_STORAGE_KEY}_${address}`;
      saveToSession(sessionKey, enhancedData);

      // Store pre-auth data in loan storage system for API access
      fetch("/api/borrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 0, // No borrowing, just storing pre-auth
          asset: "ETH",
          walletAddress: address,
          originalCreditLimit: enhancedData.available_credit,
          customerId: enhancedData.customerId,
          paymentMethodId: enhancedData.paymentMethodId,
          setupIntentId: enhancedData.setupIntentId,
          cardLastFour: enhancedData.card_last_four,
          cardBrand: enhancedData.card_brand,
        }),
      })
        .then((response) => response.json())
        .then(() => {
          // Pre-auth data stored successfully
        })
        .catch(() => {
          // Silent error handling for pre-auth storage
        });
    }

    // Show overview tab after successful pre-auth
    setActiveTab("overview");
  };

  const handleBorrow = () => {
    // Only proceed to borrow tab if pre-auth data exists
    if (preAuthData) {
      setActiveTab("borrow");
    } else {
      // If no pre-auth data, user needs to set up card first
      // This shouldn't happen since borrow button only shows when pre-auth exists
      // But adding as safety measure
      setActiveTab("overview");
    }
  };

  const handleBorrowSuccess = () => {
    setActiveTab("manage");

    // Check for active loans after successful borrow
    checkActiveLoans();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mix-blend-multiply filter blur-2xl float-dynamic-1 shadow-2xl"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full mix-blend-multiply filter blur-2xl float-dynamic-2 shadow-2xl"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full mix-blend-multiply filter blur-2xl float-dynamic-3 shadow-2xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-lg bg-white/5">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 max-w-7xl">
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
                Chromion Hackathon Demo
              </div>
            </div>
            
            {isConnected && (
              <div className="flex items-center gap-4">
                <WalletAddress />
                <div className="relative">
                  <NetworkSwitcher />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
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

        {/* Session Restoration Indicator */}
        {isConnected &&
          preAuthData &&
          isSessionRestored && (
            <div className="mb-6 glassmorphism rounded-xl p-4 border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 font-semibold">
                  ✅ Session Restored - Your credit card setup has been
                  recovered
                </span>
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

          {/* Step 2: Main Interface (always show when connected) */}
          {isConnected && address && (
            <div className="transform transition-all duration-500 animate-fade-in">
              {!preAuthData ? (
                /* Welcome Overview - Choose between Liquidity and Borrowing */
                <div className="glassmorphism rounded-2xl shadow-2xl p-8 border border-white/20">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Shield className="text-white" size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">
                      Welcome to CreditShaft! 👋
                    </h2>
                    <p className="text-gray-300 text-lg mb-6 max-w-2xl mx-auto">
                      Choose how you want to participate in the CreditShaft ecosystem:
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 mb-8">
                    {/* Borrow Option */}
                    <div className="group bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 hover:from-blue-500/15 hover:to-purple-500/15 transition-all duration-300 cursor-pointer"
                         onClick={() => setActiveTab("setup")}>
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                        <CreditCard className="text-white" size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">
                        Borrow Crypto
                      </h3>
                      <p className="text-gray-300 mb-4 leading-relaxed">
                        Use your credit card as collateral to borrow crypto instantly. No KYC required.
                      </p>
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          Up to 66.7% LTV ratio
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          Instant borrowing
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                          Competitive rates
                        </div>
                      </div>
                      <button className="w-full btn-gradient text-white py-3 px-6 rounded-xl font-semibold transition-all transform group-hover:scale-105">
                        Set Up Credit Card
                      </button>
                    </div>

                    {/* Liquidity Provider Option */}
                    <div className="group bg-gradient-to-br from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded-2xl p-6 hover:from-green-500/15 hover:to-cyan-500/15 transition-all duration-300 cursor-pointer"
                         onClick={() => setActiveTab("liquidity")}>
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                        <Droplets className="text-white" size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">
                        Provide Liquidity
                      </h3>
                      <p className="text-gray-300 mb-4 leading-relaxed">
                        Add ETH to the lending pool and earn interest from borrowers.
                      </p>
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                          Earn interest on deposits
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                          Withdraw anytime
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                          LP token rewards
                        </div>
                      </div>
                      <button className="w-full bg-gradient-to-r from-green-500 to-cyan-500 text-white py-3 px-6 rounded-xl font-semibold transition-all transform group-hover:scale-105">
                        Add Liquidity
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-400 text-sm">
                      You can switch between these options at any time
                    </p>
                  </div>
                </div>
              ) : (
                /* Tabbed Interface when preAuth exists */
                <>
                  {/* Navigation Tabs */}
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
                      <button
                        onClick={() => setActiveTab("liquidity")}
                        className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                          activeTab === "liquidity"
                            ? "bg-gradient-to-r from-green-500 to-cyan-500 text-white"
                            : "text-gray-300 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <Droplets size={16} />
                        Liquidity
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  {activeTab === "overview" && (
                    <PreAuthStatus
                      preAuthData={preAuthData}
                      onBorrow={handleBorrow}
                      hasActiveLoans={hasActiveLoans}
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

                  {activeTab === "liquidity" && (
                    <LiquidityProvider walletAddress={address} />
                  )}
                </>
              )}

              {/* Credit Card Setup Tab */}
              {activeTab === "setup" && !preAuthData && (
                <StripePreAuth
                  walletAddress={address}
                  onPreAuthSuccess={handlePreAuthSuccess}
                />
              )}

              {/* Liquidity Tab (available even without preAuth) */}
              {activeTab === "liquidity" && !preAuthData && (
                <LiquidityProvider walletAddress={address} />
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
              testnet. Your session is preserved across page refreshes.
            </p>
          </div>
        )}

        {/* Enhanced Debug Info */}
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
                Session Storage Keys:{" "}
                <span className="text-orange-400">
                  {sessionStorageCount}
                </span>
              </p>
              {address && preAuthData && (
                <p>
                  Session Restored:{" "}
                  <span className="text-green-400">
                    {isSessionRestored ? "Yes" : "No"}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-auto backdrop-blur-lg bg-white/5">
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
