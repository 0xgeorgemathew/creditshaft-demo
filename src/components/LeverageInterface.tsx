"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PreAuthData } from "@/types";
import {
  ArrowRight,
  CheckCircle,
  Copy,
  AlertCircle,
  CreditCard,
  TrendingUp,
  Link,
  Info,
  Lightbulb,
  BarChart3,
  Shield,
  Zap,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { getRiskLevel, getCollateralizationRatio } from "@/lib/chainlink-price";
import { useContractOperations } from "@/hooks/useContract";
import { getLINKPrice, mintLINK } from "@/lib/contract"; // Import getLINKPrice and mintLINK
import { useAccount } from "wagmi";

interface LeverageInterfaceProps {
  preAuthData: PreAuthData;
  onLeverageSuccess?: () => void;
}

export default function LeverageInterface({
  preAuthData,
  onLeverageSuccess,
}: LeverageInterfaceProps) {
  const { address } = useAccount();
  const { openLeveragePosition, loading: contractLoading } = useContractOperations();
  const [linkPrice, setLinkPrice] = useState(0); // No fallback price - must fetch from contract
  const [linkPriceSource, setLinkPriceSource] = useState("loading");
  const [linkCollateralAmount, setLinkCollateralAmount] = useState("");
  const [selectedAsset] = useState("USDC"); // Borrowing USDC equivalent of LINK
  const [selectedLeverageRatio, setSelectedLeverageRatio] = useState(200); // Default 2x leverage (200%)
  const [selectedDuration, setSelectedDuration] = useState(1); // Default 1 minute
  const [isProcessing, setIsProcessing] = useState(false);
  const [mintLoading, setMintLoading] = useState(false);
  const [mintMessage, setMintMessage] = useState("");
  const isLoading = isProcessing || contractLoading;
  const [leverageSuccess, setLeverageSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [loanId, setLoanId] = useState("");
  const [countdown, setCountdown] = useState(3);

  // Fetch real LINK price on component mount and periodically - NO FALLBACK
  const fetchLinkPrice = useCallback(async () => {
    try {
      const priceString = await getLINKPrice();
      const price = parseFloat(priceString) / 1e8; // LINK price feed has 8 decimals

      if (price && price > 0) {
        setLinkPrice(price);
        setLinkPriceSource("chainlink");
      } else {
        throw new Error("Invalid price received from contract");
      }
    } catch (error) {
      console.error("Error fetching LINK price:", error);
      setLinkPriceSource("error");
      setLinkPrice(0); // Ensure price is 0 on error - no fallback
    }
  }, []);

  // Fetch price on mount
  useEffect(() => {
    fetchLinkPrice();
  }, [fetchLinkPrice]);

  // Auto-refresh price every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchLinkPrice, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [fetchLinkPrice]);

  const handleRedirect = useCallback(() => {
    if (onLeverageSuccess) {
      onLeverageSuccess();
    } else {
      // Fallback: redirect to main page with a URL parameter
      window.location.href = "/?tab=manage";
    }
  }, [onLeverageSuccess]);

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (leverageSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (leverageSuccess && countdown === 0) {
      handleRedirect();
    }
  }, [leverageSuccess, countdown, handleRedirect]);

  // Max LINK collateral (no direct credit limit for LINK, but for pre-auth)
  // For now, we'll use a high arbitrary number or user's LINK balance if available
  const maxLinkCollateral = 1000; // Arbitrary high limit for demo

  // Calculate loan metrics with proper validation
  const linkCollateralAmountValue = useMemo(() => {
    const parsed = parseFloat(linkCollateralAmount);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [linkCollateralAmount]);

  const borrowedUSDC = useMemo(() => {
    if (linkCollateralAmountValue <= 0 || selectedLeverageRatio < 150 || linkPrice <= 0) return 0;
    // borrowedUSDC = collateralLINK_USD_Value * (leverageRatio / 100 - 1)
    return linkCollateralAmountValue * linkPrice * (selectedLeverageRatio / 100 - 1);
  }, [linkCollateralAmountValue, selectedLeverageRatio, linkPrice]);

  // Calculate total supplied LINK (collateral + leveraged amount)
  const totalSuppliedLINK = useMemo(() => {
    if (linkCollateralAmountValue <= 0 || selectedLeverageRatio < 150 || linkPrice <= 0) return 0;
    return linkCollateralAmountValue * (selectedLeverageRatio / 100);
  }, [linkCollateralAmountValue, selectedLeverageRatio, linkPrice]);

  const requiredPreAuth = useMemo(() => {
    // preAuthAmount = 150% of borrowedUSDC
    return borrowedUSDC * 1.5;
  }, [borrowedUSDC]);

  // Calculate liquidation price and risk with validation
  const liquidationPrice = useMemo(() => {
    if (borrowedUSDC <= 0 || totalSuppliedLINK <= 0 || linkPrice <= 0) return 0;
    // Liquidation occurs when: totalSuppliedValue * liquidationThreshold < borrowedAmount
    // So liquidation price is: borrowedUSDC / (totalSuppliedLINK * liquidationThreshold)
    const LIQUIDATION_THRESHOLD = 0.85; // 85% - matches contract liquidation threshold
    return borrowedUSDC / (totalSuppliedLINK * LIQUIDATION_THRESHOLD);
  }, [borrowedUSDC, totalSuppliedLINK, linkPrice]);

  const actualLTV = useMemo(() => {
    if (totalSuppliedLINK <= 0 || borrowedUSDC <= 0 || linkPrice <= 0) return 0;
    // LTV = (borrowedUSDC / (totalSuppliedLINK * linkPrice)) * 100
    return (borrowedUSDC / (totalSuppliedLINK * linkPrice)) * 100;
  }, [totalSuppliedLINK, borrowedUSDC, linkPrice]);

  const riskLevel = useMemo(() => getRiskLevel(actualLTV), [actualLTV]);
  const collateralizationRatio = useMemo(() => {
    if (totalSuppliedLINK <= 0 || borrowedUSDC <= 0 || linkPrice <= 0) return 0;
    return getCollateralizationRatio(totalSuppliedLINK * linkPrice, borrowedUSDC);
  }, [totalSuppliedLINK, borrowedUSDC, linkPrice]);

  const handleLeverage = async () => {
    setIsProcessing(true);

    try {
      // Ensure Stripe details are available
      if (!preAuthData.setupIntentId || !preAuthData.customerId || !preAuthData.paymentMethodId) {
        alert("Stripe payment details are missing. Please ensure you have completed the pre-authorization step.");
        setIsProcessing(false);
        return;
      }

      // Step 1: Call /api/borrow to create payment intent
      console.log("Creating payment intent via /api/borrow...");
      
      const borrowResponse = await fetch("/api/borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: borrowedUSDC.toString(),
          amountETH: "0", // Not used in LINK leverage
          ethPrice: linkPrice.toString(),
          asset: "USDC",
          walletAddress: preAuthData.wallet_address,
          preAuthId: preAuthData.preAuthId,
          requiredPreAuth: requiredPreAuth,
          selectedLTV: actualLTV,
          preAuthDurationMinutes: selectedDuration,
          customerId: preAuthData.customerId,
          paymentMethodId: preAuthData.paymentMethodId,
          setupIntentId: preAuthData.setupIntentId,
          cardLastFour: preAuthData.card_last_four,
          cardBrand: preAuthData.card_brand,
        }),
      });

      const borrowData = await borrowResponse.json();
      
      if (!borrowData.success) {
        throw new Error(borrowData.error || "Failed to create payment intent");
      }

      console.log("Payment intent created successfully:", borrowData.contractParams?.stripePaymentIntentId);

      // Step 2: Open leverage position with the real payment intent
      console.log("Opening leverage position with payment intent:", borrowData.contractParams.stripePaymentIntentId);
      
      const receipt = await openLeveragePosition({
        leverageRatio: selectedLeverageRatio,
        collateralLINK: linkCollateralAmountValue.toString(),
        expiryDuration: selectedDuration, // Pass minutes directly (contract.ts will convert to seconds)
        stripePaymentIntentId: borrowData.contractParams.stripePaymentIntentId,
        stripeCustomerId: borrowData.contractParams.stripeCustomerId,
        stripePaymentMethodId: borrowData.contractParams.stripePaymentMethodId,
      });

      console.log("Contract transaction successful:", receipt);

      setTxHash(receipt.transactionHash);
      // Loan ID might be an event parameter, for now, use tx hash or a placeholder
      setLoanId(receipt.transactionHash.substring(0, 10) + "..."); 
      setLeverageSuccess(true);
      setCountdown(3);
      
    } catch (error) {
      console.error("Leverage failed:", error);
      const errorMessage = (error as Error).message;
      
      alert("Leverage failed: " + errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyTxHash = () => {
    navigator.clipboard.writeText(txHash);
  };

  const handleMintLINK = async () => {
    if (!address) {
      setMintMessage("Wallet not connected");
      return;
    }

    setMintLoading(true);
    setMintMessage("");

    try {
      const receipt = await mintLINK(address);
      setMintMessage(`Successfully minted 1000 LINK! Transaction: ${receipt.transactionHash.substring(0, 10)}...`);
      // Clear message after 5 seconds
      setTimeout(() => setMintMessage(""), 5000);
    } catch (error) {
      console.error("Error minting LINK:", error);
      setMintMessage((error as Error).message || "Failed to mint LINK");
      // Clear message after 5 seconds
      setTimeout(() => setMintMessage(""), 5000);
    } finally {
      setMintLoading(false);
    }
  };

  if (leverageSuccess) {
    return (
      <div className="glassmorphism rounded-2xl p-8 border border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
        <div className="text-center">
          <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
          <h2 className="text-3xl font-bold text-green-300 mb-4">
            Leverage Position Successful!
          </h2>

          <div className="glassmorphism rounded-xl p-6 mb-6 max-w-md mx-auto border border-white/20">
            <p className="text-sm text-gray-300 mb-2">You leveraged:</p>
            <p className="text-3xl font-bold text-green-400">
              ${borrowedUSDC.toFixed(2)} {selectedAsset}
            </p>
            <p className="text-sm text-blue-600">
              ≈ {linkCollateralAmountValue.toFixed(4)} LINK collateral
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Pre-authorized: ${requiredPreAuth.toLocaleString()} ({actualLTV}%
              LTV)
            </p>
            {loanId && (
              <p className="text-xs text-gray-400 mt-1">Loan ID: {loanId}</p>
            )}
          </div>

          <div className="glassmorphism rounded-xl p-4 mb-6 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Transaction Hash:</span>
              <button
                onClick={copyTxHash}
                className="text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
            <p className="text-xs font-mono text-gray-300 break-all bg-black/20 p-2 rounded border border-white/10">
              {txHash}
            </p>
          </div>

          <div className="space-y-4 text-left max-w-md mx-auto">
            <div className="card-gradient rounded-xl p-4 border border-blue-600/30">
              <h4 className="font-semibold text-blue-400 mb-2">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-300 space-y-1">
                <li className="flex items-start gap-2">
                  <CreditCard
                    size={14}
                    className="text-blue-500 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    Your credit card has a ${requiredPreAuth.toLocaleString()}{" "}
                    pre-authorization hold ({collateralizationRatio}%
                    collateralization)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp
                    size={14}
                    className="text-green-400 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    Position is active until repayment or liquidation
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield
                    size={14}
                    className="text-emerald-400 mt-0.5 flex-shrink-0"
                  />
                  <span>Repay anytime to release the hold</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap
                    size={14}
                    className="text-amber-400 mt-0.5 flex-shrink-0"
                  />
                  <span>If not repaid, the pre-auth will be captured</span>
                </li>
              </ul>
            </div>

            {/* Manual redirect button */}
            <div className="flex gap-3">
              <button
                onClick={handleRedirect}
                className="flex-1 btn-gradient text-white py-3 px-4 rounded-xl font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <CreditCard size={16} />
                View My Positions
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-400">
                {countdown > 0 ? (
                  <>
                    Automatically redirecting to position management in{" "}
                    <span className="text-blue-300 font-bold">{countdown}</span>{" "}
                    seconds
                  </>
                ) : (
                  <span className="text-green-300">Redirecting now...</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glassmorphism rounded-2xl shadow-2xl p-8 border border-white/20">
      <h2 className="text-3xl font-bold text-white mb-8 gradient-text">
        Leverage
      </h2>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              LINK Collateral Amount
            </label>
            <div className="relative">
              <Link
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="number"
                value={linkCollateralAmount}
                onChange={(e) => setLinkCollateralAmount(e.target.value)}
                placeholder="0.00"
                max={maxLinkCollateral}
                className="w-full pl-10 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-white placeholder-gray-400 transition-all"
              />
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-300">
                  Maximum: {maxLinkCollateral.toLocaleString()} LINK (arbitrary limit)
                </p>
                <button
                  onClick={handleMintLINK}
                  disabled={mintLoading || !address}
                  className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-md hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {mintLoading ? (
                    <Loader2 className="animate-spin" size={12} />
                  ) : (
                    <Zap size={12} />
                  )}
                  Mint 1000 LINK
                </button>
              </div>
              {mintMessage && (
                <p className={`text-xs ${mintMessage.includes('Successfully') ? 'text-green-300' : 'text-red-300'}`}>
                  {mintMessage}
                </p>
              )}
              {linkCollateralAmountValue > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-green-300 font-semibold">
                    You will get: ${borrowedUSDC.toFixed(2)} USDC
                  </p>
                  <p className="text-sm text-blue-300">
                    At {selectedLeverageRatio / 100}x Leverage • LINK Price: ${linkPrice.toLocaleString()}
                  </p>
                  <p className="text-sm text-yellow-300">
                    Required Pre-Auth: ${requiredPreAuth.toLocaleString()} USD
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Leverage Ratio
            </label>
            <div className="glassmorphism rounded-xl p-4 border border-white/20 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Leverage:</span>
                <span className="text-lg font-semibold text-white">
                  {(selectedLeverageRatio / 100).toFixed(1)}x
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400">1.5x (150%)</span>
                <span className="text-xs text-gray-400">5x (500%)</span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="150"
                  max="500"
                  step="10"
                  value={selectedLeverageRatio}
                  onChange={(e) => setSelectedLeverageRatio(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, 
                      ${selectedLeverageRatio <= 250 
                        ? '#10b981' 
                        : selectedLeverageRatio <= 400 
                        ? '#375bd2' 
                        : '#e84142'} 0%, 
                      ${selectedLeverageRatio <= 250 
                        ? '#10b981' 
                        : selectedLeverageRatio <= 400 
                        ? '#375bd2' 
                        : '#e84142'} ${((selectedLeverageRatio - 150) / (500 - 150)) * 100}%, 
                      rgba(255,255,255,0.2) ${((selectedLeverageRatio - 150) / (500 - 150)) * 100}%, 
                      rgba(255,255,255,0.2) 100%)`,
                  }}
                />
              </div>

              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <button
                  onClick={() => setSelectedLeverageRatio(150)}
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedLeverageRatio === 150
                      ? "text-emerald-300 bg-emerald-500/20"
                      : "hover:text-white"
                  }`}
                >
                  1.5x
                </button>
                <button
                  onClick={() => setSelectedLeverageRatio(200)}
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedLeverageRatio === 200
                      ? "text-emerald-300 bg-emerald-500/20"
                      : "hover:text-white"
                  }`}
                >
                  2x
                </button>
                <button
                  onClick={() => setSelectedLeverageRatio(300)}
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedLeverageRatio === 300
                      ? "text-blue-400 bg-blue-600/20"
                      : "hover:text-white"
                  }`}
                >
                  3x
                </button>
                <button
                  onClick={() => setSelectedLeverageRatio(500)}
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedLeverageRatio === 500
                      ? "text-red-400 bg-red-500/20"
                      : "hover:text-white"
                  }`}
                >
                  5x
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-400 space-y-1">
                <div className="flex items-center gap-2">
                  <Lightbulb size={12} className="text-blue-500" />
                  <span>Higher leverage = Higher potential returns, higher risk</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 size={12} className="text-green-400" />
                  <span>
                    With {linkCollateralAmountValue.toFixed(2)} LINK collateral → {totalSuppliedLINK.toFixed(2)} LINK exposure, you get ${borrowedUSDC.toFixed(2)} USDC
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle size={12} className="text-red-400" />
                  <span>
                    Risk: LINK price falling reduces your safety margin
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Pre-Authorization Duration
            </label>
            <div className="glassmorphism rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Duration:</span>
                <span className="text-lg font-semibold text-white">
                  {selectedDuration === 10080 
                    ? '7 Days' 
                    : selectedDuration === 60 
                      ? '1 Hour' 
                      : `${selectedDuration} Minute${selectedDuration !== 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">1 Min</span>
                <span className="text-xs text-gray-400">
                  7 Days
                </span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="0"      // 0 to 61 positions
                  max="61"     // 61 positions total
                  step="1"     // 1 step increments
                  value={selectedDuration === 10080 ? 61 : selectedDuration}
                  onChange={(e) => {
                    const sliderValue = parseInt(e.target.value);
                    if (sliderValue === 61) {
                      setSelectedDuration(10080); // 7 days
                    } else {
                      setSelectedDuration(sliderValue === 0 ? 1 : sliderValue);
                    }
                  }}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, 
                      ${selectedDuration <= 10  // 10 minutes
                        ? '#10b981' 
                        : selectedDuration <= 60 && selectedDuration !== 10080  // 1 hour
                        ? '#3b82f6' 
                        : '#f59e0b'} 0%, 
                      ${selectedDuration <= 10 
                        ? '#10b981' 
                        : selectedDuration <= 60 && selectedDuration !== 10080
                        ? '#3b82f6' 
                        : '#f59e0b'} ${selectedDuration === 10080 ? 100 : ((selectedDuration - 1) / 60) * 100}%, 
                      rgba(255,255,255,0.2) ${selectedDuration === 10080 ? 100 : ((selectedDuration - 1) / 60) * 100}%, 
                      rgba(255,255,255,0.2) 100%)`
                  }}
                />
              </div>

              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <button
                  onClick={() => setSelectedDuration(1)} // 1 minute
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedDuration === 1
                      ? "text-emerald-300 bg-emerald-500/20"
                      : "hover:text-white"
                  }`}
                >
                  1 Min
                </button>
                <button
                  onClick={() => setSelectedDuration(10)} // 10 minutes
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedDuration === 10
                      ? "text-emerald-300 bg-emerald-500/20"
                      : "hover:text-white"
                  }`}
                >
                  10 Min
                </button>
                <button
                  onClick={() => setSelectedDuration(60)} // 1 hour
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedDuration === 60
                      ? "text-blue-300 bg-blue-500/20"
                      : "hover:text-white"
                  }`}
                >
                  1 Hour
                </button>
                <button
                  onClick={() => setSelectedDuration(10080)} // 7 days in minutes
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedDuration === 10080
                      ? "text-amber-300 bg-amber-500/20"
                      : "hover:text-white"
                  }`}
                >
                  7 Days
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-400 space-y-1">
                <div className="flex items-center gap-2">
                  <Lightbulb size={12} className="text-blue-400" />
                  <span>Shorter duration = Lower risk and better security</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 size={12} className="text-green-400" />
                  <span>
                    Current selection: {selectedDuration === 10080 
                      ? '7 days' 
                      : selectedDuration === 60 
                        ? '1 hour' 
                        : `${selectedDuration} minute${selectedDuration !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle size={12} className="text-amber-400" />
                  <span>
                    Pre-authorization expires automatically after this period
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          {linkCollateralAmountValue > 0 && borrowedUSDC > 0 && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border ${
                riskLevel.level === "Critical"
                  ? "text-red-300 bg-red-500/10 border-red-500/30"
                  : riskLevel.level === "High"
                  ? "text-orange-300 bg-orange-500/10 border-orange-500/30"
                  : riskLevel.level === "Moderate"
                  ? "text-yellow-300 bg-yellow-500/10 border-yellow-500/30"
                  : "text-green-300 bg-green-500/10 border-green-500/30"
              }`}
            >
              <TrendingUp size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold flex items-center gap-2">
                  Risk Level: {riskLevel.level}
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      riskLevel.level === "Critical"
                        ? "bg-red-500/20"
                        : riskLevel.level === "High"
                        ? "bg-orange-500/20"
                        : riskLevel.level === "Moderate"
                        ? "bg-yellow-500/20"
                        : "bg-green-500/20"
                    }`}
                  >
                    {collateralizationRatio.toFixed(0)}% Coverage
                  </span>
                </p>
                <p className="text-sm mt-1">
                  {riskLevel.description
                    .replace(/ETH price increases/g, 'LINK price falls')
                    .replace(/ETH can rise significantly/g, 'LINK can fall significantly')
                    .replace(/monitor ETH price increases/g, 'monitor LINK price decreases')
                    .replace(/liquidation if ETH rises further/g, 'liquidation if LINK falls further')
                  }
                </p>
                {liquidationPrice > 0 && (
                  <p className="text-sm mt-2">
                    <strong>
                      Liquidation if LINK falls below: ${liquidationPrice.toLocaleString()}
                    </strong>
                    <br />
                    <span className="text-xs opacity-80">
                      Current LINK price: ${linkPrice.toLocaleString()}{" "}
                      {liquidationPrice < linkPrice
                        ? `(${(
                            ((linkPrice - liquidationPrice) /
                            linkPrice
                          ) *
                            100
                          ).toFixed(1)}% buffer)`
                        : "(CRITICAL - Already below liquidation!)"}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error if price feed is not available */}
          {linkPriceSource === "error" && (
            <div className="flex items-start gap-3 text-red-300 bg-red-500/10 p-4 rounded-xl border border-red-500/30">
              <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Price Feed Unavailable</p>
                <p className="text-sm">
                  Cannot fetch LINK price from the contract&apos;s price feed. Please check your connection and try again.
                </p>
                <button
                  onClick={fetchLinkPrice}
                  className="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  Retry Price Fetch
                </button>
              </div>
            </div>
          )}

          {/* Warning if pre-auth exceeds credit limit */}
          {requiredPreAuth > 0 &&
            requiredPreAuth > preAuthData.available_credit && (
              <div className="flex items-start gap-3 text-red-300 bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Insufficient Credit Limit</p>
                  <p className="text-sm">
                    You need to pre-authorize ${requiredPreAuth.toLocaleString()}
                    but only have ${preAuthData.available_credit.toLocaleString()} available.
                  </p>
                </div>
              </div>
            )}

          <button
            onClick={handleLeverage}
            disabled={
              !linkCollateralAmount ||
              linkCollateralAmountValue <= 0 ||
              requiredPreAuth > preAuthData.available_credit ||
              isLoading ||
              !preAuthData.setupIntentId || // Disable if Stripe setup not ready
              linkPrice <= 0 || // Disable if no valid price from contract
              linkPriceSource === "error" // Disable if price fetch failed
            }
            className="w-full btn-gradient text-white py-4 px-6 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Processing Position...
              </>
            ) : (
              <>
                Open {selectedLeverageRatio / 100}x Position
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        <div className="space-y-6">
          <div className="card-gradient rounded-xl p-6 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={24} className="text-blue-400" />
              <h3 className="font-bold text-white text-xl">Position Summary</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Collateral Asset:</span>
                <span className="font-medium text-white">
                  LINK (Volatile Asset)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Borrowed Asset:</span>
                <span className="font-medium text-white">
                  USDC (Stablecoin)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Your Credit Limit:</span>
                <span className="font-medium text-white">
                  ${preAuthData.available_credit.toLocaleString()} USD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Liquidation Threshold:</span>
                <span className="font-medium text-white">
                  85%
                </span>
              </div>
              {linkCollateralAmountValue > 0 && (
                <>
                  <hr className="border-white/20" />
                  <div className="flex justify-between">
                    <span className="text-gray-300">
                      LINK Collateral:
                    </span>
                    <span className="text-yellow-300">
                      {linkCollateralAmountValue.toFixed(4)} LINK
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">
                      Total LINK Exposure:
                    </span>
                    <span className="text-blue-300">
                      {totalSuppliedLINK.toFixed(4)} LINK
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-200">USDC You&apos;ll Get:</span>
                    <span className="text-blue-300">
                      ${borrowedUSDC.toFixed(2)} {selectedAsset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-200">Required Pre-Auth:</span>
                    <span className="text-blue-300">
                      ${requiredPreAuth.toLocaleString()} USD
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Coverage Ratio:</span>
                    <span className="text-emerald-300">{collateralizationRatio.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Current LTV:</span>
                    <span className={`font-semibold ${
                      actualLTV > 60 ? 'text-red-300' : 
                      actualLTV > 50 ? 'text-yellow-300' : 
                      'text-green-300'
                    }`}>
                      {actualLTV.toFixed(1)}% / 65% max
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Leverage Ratio:</span>
                    <span className="text-amber-300">{(selectedLeverageRatio / 100).toFixed(1)}x</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Liquidation Buffer:</span>
                    <span className={`text-gray-300 ${
                      liquidationPrice > 0 && linkPrice > 0 && liquidationPrice < linkPrice
                        ? ((linkPrice - liquidationPrice) / linkPrice) * 100 > 15
                          ? 'text-green-300'
                          : 'text-yellow-300'
                        : 'text-red-300'
                    }`}>
                      {liquidationPrice > 0 && linkPrice > 0 && liquidationPrice < linkPrice
                        ? `${(((linkPrice - liquidationPrice) / linkPrice) * 100).toFixed(1)}%`
                        : "Critical"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card-gradient rounded-xl p-6 border border-blue-500/30 hover:border-blue-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-blue-400" />
              <h4 className="font-semibold text-blue-300">How It Works</h4>
            </div>
            <ul className="text-sm text-blue-200 space-y-2">
              <li className="flex items-start gap-2">
                <Link
                  size={14}
                  className="text-blue-400 mt-0.5 flex-shrink-0"
                />
                <span>Set LINK collateral amount</span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3
                  size={14}
                  className="text-blue-400 mt-0.5 flex-shrink-0"
                />
                <span>Choose leverage ratio to determine position power</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Instant transfer of USDC to your wallet</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp
                  size={14}
                  className="text-blue-400 mt-0.5 flex-shrink-0"
                />
                <span>Position stays active until repaid or liquidated</span>
              </li>
              <li className="flex items-start gap-2">
                <Shield
                  size={14}
                  className="text-blue-400 mt-0.5 flex-shrink-0"
                />
                <span>Repay anytime to release the pre-authorization</span>
              </li>
            </ul>
          </div>

          <div className="card-gradient rounded-xl p-6 border border-amber-500/30 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-amber-400" />
              <h4 className="font-semibold text-amber-300">Demo Information</h4>
            </div>
            <div className="space-y-3 text-sm text-amber-200">
              <p>
                This demo uses Sepolia testnet with Chainlink price feeds for LINK
                collateral and USDC borrowing. Real-time liquidation monitoring ensures position safety.
                Use test card 4242424242424242 for payments.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3">
                <p className="text-amber-100 font-semibold text-xs mb-1">💡 How This Works:</p>
                <p className="text-amber-200 text-xs leading-relaxed">
                  You&apos;re borrowing USDC (stable) against your LINK collateral (volatile). 
                  If LINK price falls significantly, your volatile collateral may not cover 
                  the fixed debt value, triggering liquidation protection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}