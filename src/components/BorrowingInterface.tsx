"use client";

import { useState, useEffect, useCallback } from "react";
import { PreAuthData } from "@/types";
import {
  DollarSign,
  ArrowRight,
  CheckCircle,
  Copy,
  AlertCircle,
  CreditCard,
  TrendingUp,
  RefreshCw,
  Link,
  Clock,
  Info,
  Lightbulb,
  BarChart3,
  Shield,
  Zap,
} from "lucide-react";
import { calculateLiquidationPrice, getRiskLevel, getCollateralizationRatio } from "@/lib/chainlink-price";

interface BorrowingInterfaceProps {
  preAuthData: PreAuthData;
  walletAddress: string;
  onBorrowSuccess?: () => void;
}

export default function BorrowingInterface({
  preAuthData,
  walletAddress,
  onBorrowSuccess,
}: BorrowingInterfaceProps) {
  const [preAuthAmount, setPreAuthAmount] = useState("");
  const [selectedAsset] = useState("ETH");
  const [selectedLTV, setSelectedLTV] = useState(50); // Default 50% LTV (200% collateralization)
  const [selectedDuration, setSelectedDuration] = useState(168); // Default 7 days (168 hours)
  const [ethPrice, setEthPrice] = useState(3500); // Default fallback price
  const [ethPriceLoading, setEthPriceLoading] = useState(true);
  const [ethPriceSource, setEthPriceSource] = useState("loading");
  const [lastPriceUpdate, setLastPriceUpdate] = useState<Date | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [loanId, setLoanId] = useState("");
  const [countdown, setCountdown] = useState(3);

  // Fetch real ETH price on component mount and periodically
  const fetchEthPrice = useCallback(async () => {
    try {
      setEthPriceLoading(true);
      const response = await fetch("/api/eth-price");
      const data = await response.json();

      if (data.success && data.price) {
        setEthPrice(data.price);
        setEthPriceSource(data.source || "api");
        setLastPriceUpdate(new Date());
      } else {
      }
    } catch {
      setEthPriceSource("fallback");
    } finally {
      setEthPriceLoading(false);
    }
  }, []);

  // Fetch price on mount
  useEffect(() => {
    fetchEthPrice();
  }, [fetchEthPrice]);

  // Auto-refresh price every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchEthPrice, 60000); // 1 minute
    return () => clearInterval(interval);
  }, [fetchEthPrice]);

  const handleRedirect = useCallback(() => {
    if (onBorrowSuccess) {
      onBorrowSuccess();
    } else {
      // Fallback: redirect to main page with a URL parameter
      window.location.href = "/?tab=manage";
    }
  }, [onBorrowSuccess]);

  // Countdown timer for auto-redirect
  useEffect(() => {
    if (borrowSuccess && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (borrowSuccess && countdown === 0) {
      handleRedirect();
    }
  }, [borrowSuccess, countdown, handleRedirect]);

  const maxBorrow = preAuthData.available_credit; // User can borrow up to their full credit limit

  const assets = [{ symbol: "ETH", name: "Ethereum", rate: "4.5%" }];

  // Calculate loan metrics
  const preAuthAmountValue = parseFloat(preAuthAmount) || 0;
  const borrowAmountUSD = preAuthAmountValue * (selectedLTV / 100);
  const borrowAmountETH = borrowAmountUSD / ethPrice;
  const requiredPreAuth = preAuthAmountValue;
  const actualLTV = selectedLTV;
  // Calculate liquidation price and risk
  const liquidationPrice = calculateLiquidationPrice(
    borrowAmountUSD,
    preAuthAmountValue,
    ethPrice,
    85
  );
  const riskLevel = getRiskLevel(actualLTV);
  const collateralizationRatio = getCollateralizationRatio(preAuthAmountValue, borrowAmountUSD);

  const handleBorrow = async () => {
    setIsProcessing(true);

    try {
      // Enhanced request data with all required fields
      const requestData = {
        amount: borrowAmountUSD,
        amountETH: borrowAmountETH,
        ethPrice: ethPrice,
        asset: selectedAsset,
        walletAddress,
        preAuthId: preAuthData.preAuthId || "demo_preauth_id",
        requiredPreAuth: preAuthAmountValue,
        selectedLTV: actualLTV,
        preAuthDurationDays: Math.round(selectedDuration / 24), // Convert hours to days
        originalCreditLimit: preAuthData.available_credit,
        customerId: preAuthData.customerId,
        paymentMethodId: preAuthData.paymentMethodId,
        setupIntentId: preAuthData.setupIntentId,
        cardLastFour: preAuthData.card_last_four,
        cardBrand: preAuthData.card_brand,
      };

      const response = await fetch("/api/borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (data.success) {
        setTxHash(data.txHash || data.loanId);
        setLoanId(data.loanId || "unknown");
        setBorrowSuccess(true);
        setCountdown(3); // Reset countdown
      } else {
        throw new Error(data.error || "Borrowing failed");
      }
    } catch (error) {
      alert("Borrowing failed: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyTxHash = () => {
    navigator.clipboard.writeText(txHash);
  };

  if (borrowSuccess) {
    return (
      <div className="glassmorphism rounded-2xl p-8 border border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
        <div className="text-center">
          <CheckCircle className="text-green-400 mx-auto mb-4" size={48} />
          <h2 className="text-3xl font-bold text-green-300 mb-4">
            Loan Successful!
          </h2>

          <div className="glassmorphism rounded-xl p-6 mb-6 max-w-md mx-auto border border-white/20">
            <p className="text-sm text-gray-300 mb-2">You borrowed:</p>
            <p className="text-3xl font-bold text-green-400">
              {borrowAmountETH.toFixed(4)} {selectedAsset}
            </p>
            <p className="text-sm text-blue-300">
              ≈ ${borrowAmountUSD.toLocaleString()} USD
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
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
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
            <div className="card-gradient rounded-xl p-4 border border-blue-500/30">
              <h4 className="font-semibold text-blue-300 mb-2">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-200 space-y-1">
                <li className="flex items-start gap-2">
                  <CreditCard
                    size={14}
                    className="text-blue-400 mt-0.5 flex-shrink-0"
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
                    Interest accrues at{" "}
                    {assets.find((a) => a.symbol === selectedAsset)?.rate} APY
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
                View My Loans
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-400">
                {countdown > 0 ? (
                  <>
                    Automatically redirecting to loan management in{" "}
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
        Borrow Against Your Credit
      </h2>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Pre-Authorization Amount (Collateral)
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="number"
                value={preAuthAmount}
                onChange={(e) => setPreAuthAmount(e.target.value)}
                placeholder="0.00"
                max={maxBorrow}
                className="w-full pl-10 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-white placeholder-gray-400 transition-all"
              />
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-300">
                Maximum: ${maxBorrow.toLocaleString()} (your credit limit)
              </p>
              {preAuthAmountValue > 0 && (
                <div className="space-y-1">
                  <p className="text-sm text-green-300 font-semibold">
                    You can borrow: {borrowAmountETH.toFixed(4)} ETH ($
                    {borrowAmountUSD.toLocaleString()} USD)
                  </p>
                  <p className="text-sm text-blue-300">
                    At {actualLTV}% LTV • ETH Price: $
                    {ethPrice.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Asset to Borrow
            </label>
            <div className="glassmorphism rounded-xl p-4 border border-white/20 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">Ξ</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">Ethereum (ETH)</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-400">
                      4.5% APY •
                      {ethPriceLoading ? (
                        <span className="animate-pulse">Loading...</span>
                      ) : (
                        <span className="font-mono">
                          ${ethPrice.toLocaleString()}/ETH
                        </span>
                      )}
                    </p>
                    <button
                      onClick={fetchEthPrice}
                      disabled={ethPriceLoading}
                      className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors p-1 hover:bg-blue-500/10 rounded"
                      title="Refresh ETH price"
                    >
                      <RefreshCw
                        size={12}
                        className={ethPriceLoading ? "animate-spin" : ""}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {ethPriceSource === "chainlink" && (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Link size={10} />
                        <span>Chainlink Oracle</span>
                      </div>
                    )}
                    {ethPriceSource === "coingecko_fallback" && (
                      <div className="flex items-center gap-1 text-blue-400">
                        <TrendingUp size={10} />
                        <span>CoinGecko API</span>
                      </div>
                    )}
                    {ethPriceSource === "cache" && (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <Clock size={10} />
                        <span>Cached price</span>
                      </div>
                    )}
                    {ethPriceSource === "cache_fallback" && (
                      <div className="flex items-center gap-1 text-orange-400">
                        <Clock size={10} />
                        <span>Cache fallback</span>
                      </div>
                    )}
                    {ethPriceSource === "mock_fallback" && (
                      <div className="flex items-center gap-1 text-red-400">
                        <AlertCircle size={10} />
                        <span>Mock fallback</span>
                      </div>
                    )}
                    {ethPriceSource === "loading" && (
                      <div className="flex items-center gap-1 text-orange-400">
                        <RefreshCw size={10} className="animate-spin" />
                        <span>Loading...</span>
                      </div>
                    )}
                    {lastPriceUpdate && (
                      <span className="text-gray-400">
                        • Updated {lastPriceUpdate.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Loan Coverage Ratio
            </label>
            <div className="glassmorphism rounded-xl p-4 border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Coverage Ratio:</span>
                <span className="text-lg font-semibold text-white">
                  {preAuthAmountValue > 0 ? collateralizationRatio.toFixed(0) : "0"}%
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400">LTV:</span>
                <span className="text-xs text-white font-medium">
                  {selectedLTV}%
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Safe (High Coverage)</span>
                <span className="text-xs text-gray-400">
                  Risky (Low Coverage)
                </span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="30"
                  max="66.67"
                  step="0.1"
                  value={selectedLTV}
                  onChange={(e) => setSelectedLTV(parseFloat(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, 
                      #10b981 0%, 
                      #10b981 ${((selectedLTV - 30) / (66.67 - 30)) * 100}%, 
                      rgba(255,255,255,0.2) ${((selectedLTV - 30) / (66.67 - 30)) * 100}%, 
                      rgba(255,255,255,0.2) 100%)`,
                  }}
                />
              </div>

              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <button
                  onClick={() => setSelectedLTV(30)}
                  className={`px-2 py-1 rounded transition-colors ${
                    Math.abs(selectedLTV - 30) < 0.1
                      ? "text-emerald-300 bg-emerald-500/20"
                      : "hover:text-white"
                  }`}
                >
                  30%
                </button>
                <button
                  onClick={() => setSelectedLTV(50)}
                  className={`px-2 py-1 rounded transition-colors ${
                    Math.abs(selectedLTV - 50) < 0.1
                      ? "text-emerald-300 bg-emerald-500/20"
                      : "hover:text-white"
                  }`}
                >
                  50%
                </button>
                <button
                  onClick={() => setSelectedLTV(66.67)}
                  className={`px-2 py-1 rounded transition-colors ${
                    Math.abs(selectedLTV - 66.67) < 0.1
                      ? "text-emerald-300 bg-emerald-500/20"
                      : "hover:text-white"
                  }`}
                >
                  66.7%
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-400 space-y-1">
                <div className="flex items-center gap-2">
                  <Lightbulb size={12} className="text-blue-400" />
                  <span>Higher coverage = Safer against ETH price increases</span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 size={12} className="text-green-400" />
                  <span>
                    Your ${preAuthAmountValue.toLocaleString()} covers ${borrowAmountUSD.toLocaleString()} of ETH
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle size={12} className="text-amber-400" />
                  <span>
                    Risk: ETH price rising reduces your safety margin
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
                  {Math.round(selectedDuration / 24)} Day{Math.round(selectedDuration / 24) !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400">Hours:</span>
                <span className="text-xs text-white font-medium">
                  {selectedDuration}h
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Quick</span>
                <span className="text-xs text-gray-400">
                  Maximum
                </span>
              </div>

              <div className="relative">
                <input
                  type="range"
                  min="24"
                  max="168"
                  step="12"
                  value={selectedDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setSelectedDuration(value);
                  }}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider-thumb"
                  style={{
                    background: `linear-gradient(to right, 
                      ${selectedDuration <= 48 
                        ? '#10b981' 
                        : selectedDuration <= 120 
                        ? '#3b82f6' 
                        : '#f59e0b'} 0%, 
                      ${selectedDuration <= 48 
                        ? '#10b981' 
                        : selectedDuration <= 120 
                        ? '#3b82f6' 
                        : '#f59e0b'} ${((selectedDuration - 24) / (168 - 24)) * 100}%, 
                      rgba(255,255,255,0.2) ${((selectedDuration - 24) / (168 - 24)) * 100}%, 
                      rgba(255,255,255,0.2) 100%)`
                  }}
                />
              </div>

              <div className="flex justify-between mt-2 text-xs text-gray-400">
                <button
                  onClick={() => setSelectedDuration(24)}
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedDuration === 24
                      ? "text-emerald-300 bg-emerald-500/20"
                      : "hover:text-white"
                  }`}
                >
                  1 Day
                </button>
                <button
                  onClick={() => setSelectedDuration(72)}
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedDuration === 72
                      ? "text-blue-300 bg-blue-500/20"
                      : "hover:text-white"
                  }`}
                >
                  3 Days
                </button>
                <button
                  onClick={() => setSelectedDuration(168)}
                  className={`px-2 py-1 rounded transition-colors ${
                    selectedDuration === 168
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
                    Current selection: {Math.round(selectedDuration / 24)} day{Math.round(selectedDuration / 24) !== 1 ? 's' : ''} ({selectedDuration} hours)
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
          {preAuthAmountValue > 0 && borrowAmountUSD > 0 && (
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
                <p className="text-sm mt-1">{riskLevel.description}</p>
                {liquidationPrice > 0 && (
                  <p className="text-sm mt-2">
                    <strong>
                      Liquidation if ETH rises above: $
                      {liquidationPrice.toLocaleString()}
                    </strong>
                    <br />
                    <span className="text-xs opacity-80">
                      Current ETH price: ${ethPrice.toLocaleString()}{" "}
                      {liquidationPrice > ethPrice
                        ? `(${(
                            ((liquidationPrice - ethPrice) / ethPrice) *
                            100
                          ).toFixed(1)}% buffer)`
                        : "(CRITICAL - Already above liquidation!)"}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Warning if pre-auth exceeds credit limit */}
          {preAuthAmountValue > 0 &&
            preAuthAmountValue > preAuthData.available_credit && (
              <div className="flex items-start gap-3 text-red-300 bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Insufficient Credit Limit</p>
                  <p className="text-sm">
                    You want to pre-authorize $
                    {preAuthAmountValue.toLocaleString()}
                    but only have $
                    {preAuthData.available_credit.toLocaleString()} available.
                  </p>
                </div>
              </div>
            )}

          <button
            onClick={handleBorrow}
            disabled={
              !preAuthAmount ||
              preAuthAmountValue <= 0 ||
              preAuthAmountValue > preAuthData.available_credit ||
              isProcessing
            }
            className="w-full btn-gradient text-white py-4 px-6 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Processing Loan...
              </>
            ) : (
              <>
                Borrow{" "}
                {preAuthAmountValue > 0 ? borrowAmountETH.toFixed(4) : "0"}{" "}
                {selectedAsset}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        <div className="space-y-6">
          <div className="card-gradient rounded-xl p-6 border border-white/10 hover:border-white/20 transition-colors">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={24} className="text-blue-400" />
              <h3 className="font-bold text-white text-xl">Loan Summary</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Borrowing:</span>
                <span className="font-medium text-white">
                  ETH (Volatile Asset)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Collateral:</span>
                <span className="font-medium text-white">
                  USD Credit Limit (Stable)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Available Credit:</span>
                <span className="font-medium text-white">
                  ${preAuthData.available_credit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Interest Rate:</span>
                <span className="font-medium text-white">
                  {assets.find((a) => a.symbol === selectedAsset)?.rate}
                </span>
              </div>
              {preAuthAmountValue > 0 && (
                <>
                  <hr className="border-white/20" />
                  <div className="flex justify-between">
                    <span className="text-gray-300">
                      USD Collateral Used:
                    </span>
                    <span className="text-yellow-300">
                      ${preAuthAmountValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-200">ETH You&apos;ll Receive:</span>
                    <span className="text-blue-300">
                      {borrowAmountETH.toFixed(4)} {selectedAsset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-200">Current ETH Value:</span>
                    <span className="text-blue-300">
                      ${borrowAmountUSD.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Coverage Ratio:</span>
                    <span className="text-emerald-300">{collateralizationRatio.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">LTV Ratio:</span>
                    <span className="text-amber-300">{actualLTV}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Daily Interest:</span>
                    <span className="text-gray-300">
                      $
                      {(
                        (borrowAmountUSD *
                          (parseFloat(
                            assets.find((a) => a.symbol === selectedAsset)
                              ?.rate || "4.5"
                          ) /
                            100)) /
                        365
                      ).toFixed(2)}
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
                <DollarSign
                  size={14}
                  className="text-blue-400 mt-0.5 flex-shrink-0"
                />
                <span>Set pre-authorization amount (your collateral)</span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3
                  size={14}
                  className="text-blue-400 mt-0.5 flex-shrink-0"
                />
                <span>Choose LTV ratio to determine borrowing power</span>
              </li>
              <li className="flex items-start gap-2">
                <Zap size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <span>Instant transfer of borrowed ETH to your wallet</span>
              </li>
              <li className="flex items-start gap-2">
                <TrendingUp
                  size={14}
                  className="text-blue-400 mt-0.5 flex-shrink-0"
                />
                <span>Interest accrues continuously at competitive rates</span>
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
                This demo uses Sepolia testnet with Chainlink price feeds for ETH
                borrowing. Real-time liquidation monitoring ensures loan safety.
                Use test card 4242424242424242 for payments.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3">
                <p className="text-amber-100 font-semibold text-xs mb-1">💡 How This Works:</p>
                <p className="text-amber-200 text-xs leading-relaxed">
                  You&apos;re borrowing ETH (volatile) against your USD credit limit (stable). 
                  If ETH price rises significantly, your fixed USD collateral may not cover 
                  the increased debt value, triggering liquidation protection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
