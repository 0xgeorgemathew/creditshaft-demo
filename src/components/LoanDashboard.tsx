// src/components/LoanDashboard.tsx
"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  DollarSign,
  Loader,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Clock,
  BarChart3,
  Zap,
  Target,
  CreditCard,
  Eye,
} from "lucide-react";
import { useLoanStatus } from "@/hooks/useLoan";
import { useContractOperations } from "@/hooks/useContract";
import { useToast } from "@/hooks/useToast";
import { ToastContainer } from "@/components/loan/ToastSystem";
import { getLINKPrice } from "@/lib/contract";

interface LoanDashboardProps {
  walletAddress: string;
}

// Main dashboard component
export default function LoanDashboard({ walletAddress }: LoanDashboardProps) {
  const { positionInfo, loading: contractLoading, refetch, isRealTimeActive } = useLoanStatus();
  const { closeLeveragePosition: contractCloseLeveragePosition } = useContractOperations();
  const [isProcessingPosition, setIsProcessingPosition] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentLinkPrice, setCurrentLinkPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Fetch current LINK price
  const fetchCurrentPrice = useCallback(async () => {
    try {
      setPriceLoading(true);
      const priceString = await getLINKPrice();
      const price = parseFloat(priceString) / 1e8; // Convert from 8 decimals
      setCurrentLinkPrice(price);
    } catch (error) {
      console.error("Error fetching LINK price:", error);
    } finally {
      setPriceLoading(false);
    }
  }, []);

  // Effect to fetch price on mount and every 30 seconds
  useEffect(() => {
    fetchCurrentPrice();
    const interval = setInterval(fetchCurrentPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchCurrentPrice]);

  // Calculate position metrics
  const positionMetrics = useMemo(() => {
    if (!positionInfo?.position || currentLinkPrice === 0) return null;

    const position = positionInfo.position;
    
    // Parse contract values
    const collateralLINK = parseFloat(position.collateralLINK) / 1e18;
    const suppliedLINK = parseFloat(position.suppliedLINK) / 1e18;
    const borrowedUSDC = parseFloat(position.borrowedUSDC) / 1e6;
    const entryPrice = parseFloat(position.entryPrice) / 1e8;
    const preAuthAmount = parseFloat(position.preAuthAmount) / 1e6;
    
    // Calculate current values
    const currentCollateralValue = collateralLINK * currentLinkPrice;
    const currentSuppliedValue = suppliedLINK * currentLinkPrice;
    const entryCollateralValue = collateralLINK * entryPrice;
    
    // Calculate P&L (correct for leverage positions)
    const entrySuppliedValue = suppliedLINK * entryPrice;
    const unrealizedPnL = currentSuppliedValue - entrySuppliedValue;
    const unrealizedPnLPercent = entryCollateralValue > 0 ? (unrealizedPnL / entryCollateralValue) * 100 : 0;
    
    // Calculate liquidation price (borrowedUSDC / (suppliedLINK * 0.85))
    const liquidationPrice = suppliedLINK > 0 ? borrowedUSDC / (suppliedLINK * 0.85) : 0;
    
    // Calculate health factor (correct for supplied position)
    const healthFactor = borrowedUSDC > 0 ? (currentSuppliedValue * 0.85) / borrowedUSDC : 0;
    
    // Calculate time remaining until pre-auth expiry
    const timeRemaining = Math.max(0, position.preAuthExpiryTime - Math.floor(Date.now() / 1000));
    
    // Calculate current LTV (Loan-to-Value ratio)
    const currentLTV = currentSuppliedValue > 0 ? (borrowedUSDC / currentSuppliedValue) * 100 : 0;
    
    return {
      collateralLINK,
      suppliedLINK,
      borrowedUSDC,
      entryPrice,
      currentPrice: currentLinkPrice,
      preAuthAmount,
      currentCollateralValue,
      currentSuppliedValue,
      entryCollateralValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      liquidationPrice,
      healthFactor,
      timeRemaining,
      leverageRatio: position.leverageRatio / 100,
      currentLTV,
      isAtRisk: healthFactor < 1.2, // Risk if health factor below 1.2
      priceChange: entryPrice > 0 ? ((currentLinkPrice - entryPrice) / entryPrice) * 100 : 0,
    };
  }, [positionInfo?.position, currentLinkPrice]);

  // Initialize timeRemaining when positionMetrics changes
  useEffect(() => {
    if (positionMetrics?.timeRemaining !== undefined) {
      setTimeRemaining(positionMetrics.timeRemaining);
    }
  }, [positionMetrics?.timeRemaining]);

  // Real-time countdown timer
  useEffect(() => {
    if (!positionInfo?.hasActivePosition || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        return newTime > 0 ? newTime : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [positionInfo?.hasActivePosition, timeRemaining]);


  const isLoading = contractLoading;

  // Debounced refresh function to prevent repeated calls
  const debouncedRefetch = useCallback(() => {
    // Don't refresh if position is already closed
    if (!positionInfo?.hasActivePosition || isRefreshing) return;
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    setIsRefreshing(true);
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        await refetch();
      } finally {
        setIsRefreshing(false);
        refreshTimeoutRef.current = null;
      }
    }, 300); // 300ms debounce
  }, [refetch, isRefreshing, positionInfo?.hasActivePosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const handleClosePosition = useCallback(
    async () => {
      addToast(
        "info",
        "Processing...",
        "Closing position on blockchain."
      );

      setIsProcessingPosition(true);
      try {
        const receipt = await contractCloseLeveragePosition();

        addToast(
          "success",
          "Position Closed Successfully!",
          `Transaction: ${receipt.transactionHash.substring(
            0,
            10
          )}...`
        );

        // Refresh blockchain data and clear any intervals
        await refetch();
      } catch (error) {
        addToast(
          "error",
          "Position Closure Failed",
          (error as Error).message ||
            "Failed to close the position. Please try again."
        );
      } finally {
        setIsProcessingPosition(false);
      }
    },
    [addToast, contractCloseLeveragePosition, refetch]
  );

  useEffect(() => {
    if (walletAddress) {
      debouncedRefetch();
    }
  }, [walletAddress, debouncedRefetch]);

  if (isLoading && !positionInfo?.hasActivePosition) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign size={32} className="text-blue-400" />
            <h2 className="text-3xl font-bold gradient-text">
              Position Management
            </h2>
          </div>
          <div className="animate-pulse bg-white/10 rounded-lg h-10 w-20"></div>
        </div>

        <div className="glassmorphism rounded-2xl p-8 border border-white/20">
          <div className="flex items-center justify-center">
            <Loader className="animate-spin text-blue-400" size={32} />
            <span className="ml-3 text-white">Loading your position...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign size={32} className="text-blue-400" />
            <h2 className="text-3xl font-bold gradient-text">
              Position Management
            </h2>
            {isRealTimeActive && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 text-sm font-medium">Live Updates</span>
              </div>
            )}
          </div>
        </div>

        {!positionInfo?.hasActivePosition ? (
          <div className="glassmorphism rounded-2xl p-12 text-center border border-white/20 bg-gradient-to-br from-slate-900/40 to-gray-900/40">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
              <DollarSign className="text-blue-400" size={36} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 gradient-text">
              No Active Position
            </h3>
            <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
              You haven&apos;t opened a leveraged position yet. Open one to see it here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Position Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-white">Your Active Position</h3>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium border border-emerald-500/30">
                  Active
                </span>
              </div>
              {positionMetrics && (
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    positionMetrics.isAtRisk 
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}>
                    {positionMetrics.isAtRisk ? <AlertTriangle size={14} /> : <Shield size={14} />}
                    {positionMetrics.isAtRisk ? 'At Risk' : 'Healthy'}
                  </div>
                </div>
              )}
            </div>

            {/* Position Metrics Grid */}
            {positionMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {/* Current Price Card */}
                <div className="glassmorphism rounded-xl p-4 border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-blue-400" />
                    <span className="text-blue-200 text-sm font-medium">Current LINK Price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-white">
                      ${positionMetrics.currentPrice.toFixed(2)}
                    </span>
                    {priceLoading && <Loader className="animate-spin text-blue-400" size={16} />}
                  </div>
                  <div className={`text-sm flex items-center gap-1 ${
                    positionMetrics.priceChange >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {positionMetrics.priceChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {positionMetrics.priceChange >= 0 ? '+' : ''}{positionMetrics.priceChange.toFixed(2)}%
                  </div>
                </div>

                {/* P&L Card */}
                <div className={`glassmorphism rounded-xl p-4 border ${
                  positionMetrics.unrealizedPnL >= 0 
                    ? 'border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10'
                    : 'border-red-500/20 bg-gradient-to-br from-red-500/10 to-pink-500/10'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={16} className={positionMetrics.unrealizedPnL >= 0 ? "text-green-400" : "text-red-400"} />
                    <span className={`text-sm font-medium ${positionMetrics.unrealizedPnL >= 0 ? "text-green-200" : "text-red-200"}`}>
                      Unrealized P&L
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {positionMetrics.unrealizedPnL >= 0 ? '+' : ''}${positionMetrics.unrealizedPnL.toFixed(2)}
                  </div>
                  <div className={`text-sm ${positionMetrics.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {positionMetrics.unrealizedPnLPercent >= 0 ? '+' : ''}{positionMetrics.unrealizedPnLPercent.toFixed(2)}%
                  </div>
                </div>

                {/* Health Factor Card */}
                <div className={`glassmorphism rounded-xl p-4 border ${
                  positionMetrics.healthFactor >= 1.5 
                    ? 'border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10'
                    : positionMetrics.healthFactor >= 1.2
                    ? 'border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-orange-500/10'
                    : 'border-red-500/20 bg-gradient-to-br from-red-500/10 to-pink-500/10'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className={
                      positionMetrics.healthFactor >= 1.5 ? "text-green-400" 
                      : positionMetrics.healthFactor >= 1.2 ? "text-yellow-400" 
                      : "text-red-400"
                    } />
                    <span className={`text-sm font-medium ${
                      positionMetrics.healthFactor >= 1.5 ? "text-green-200" 
                      : positionMetrics.healthFactor >= 1.2 ? "text-yellow-200" 
                      : "text-red-200"
                    }`}>Health Factor</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {positionMetrics.healthFactor.toFixed(2)}
                  </div>
                  <div className={`text-sm ${
                    positionMetrics.healthFactor >= 1.5 ? 'text-green-400' 
                    : positionMetrics.healthFactor >= 1.2 ? 'text-yellow-400' 
                    : 'text-red-400'
                  }`}>
                    {positionMetrics.healthFactor >= 1.5 ? 'Safe' 
                     : positionMetrics.healthFactor >= 1.2 ? 'Moderate' 
                     : 'At Risk'}
                  </div>
                </div>

                {/* Liquidation Price Card */}
                <div className="glassmorphism rounded-xl p-4 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} className="text-amber-400" />
                    <span className="text-amber-200 text-sm font-medium">Liquidation Price</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    ${positionMetrics.liquidationPrice.toFixed(2)}
                  </div>
                  <div className={`text-sm ${
                    positionMetrics.currentPrice > positionMetrics.liquidationPrice * 1.2 
                      ? 'text-green-400' : 'text-amber-400'
                  }`}>
                    {(((positionMetrics.currentPrice - positionMetrics.liquidationPrice) / positionMetrics.currentPrice) * 100).toFixed(1)}% buffer
                  </div>
                </div>

                {/* LTV Card */}
                <div className={`glassmorphism rounded-xl p-4 border ${
                  positionMetrics.currentLTV <= 60 
                    ? 'border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10'
                    : positionMetrics.currentLTV <= 80
                    ? 'border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-orange-500/10'
                    : 'border-red-500/20 bg-gradient-to-br from-red-500/10 to-pink-500/10'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={16} className={
                      positionMetrics.currentLTV <= 60 ? "text-green-400" 
                      : positionMetrics.currentLTV <= 80 ? "text-yellow-400" 
                      : "text-red-400"
                    } />
                    <span className={`text-sm font-medium ${
                      positionMetrics.currentLTV <= 60 ? "text-green-200" 
                      : positionMetrics.currentLTV <= 80 ? "text-yellow-200" 
                      : "text-red-200"
                    }`}>Current LTV</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {positionMetrics.currentLTV.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400">
                    Liquidation at 85%
                  </div>
                </div>
              </div>
            )}

            {/* Position Details Grid */}
            {positionMetrics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Collateral Information */}
                <div className="glassmorphism rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={20} className="text-blue-400" />
                    <h4 className="text-lg font-bold text-white">Collateral & Leverage</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Initial Collateral:</span>
                      <span className="text-white font-medium">{positionMetrics.collateralLINK.toFixed(4)} LINK</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total Supplied:</span>
                      <span className="text-white font-medium">{positionMetrics.suppliedLINK.toFixed(4)} LINK</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Borrowed Amount:</span>
                      <span className="text-white font-medium">${positionMetrics.borrowedUSDC.toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Leverage Ratio:</span>
                      <span className="text-blue-300 font-bold">{positionMetrics.leverageRatio.toFixed(1)}x</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                      <span className="text-gray-300">Current Value:</span>
                      <span className="text-green-300 font-bold">${positionMetrics.currentSuppliedValue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment & Timeline */}
                <div className="glassmorphism rounded-xl p-6 border border-white/20">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard size={20} className="text-purple-400" />
                    <h4 className="text-lg font-bold text-white">Payment & Timeline</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Pre-Auth Amount:</span>
                      <span className="text-white font-medium">${positionMetrics.preAuthAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Pre-Auth Status:</span>
                      <span className={`font-medium ${
                        positionInfo?.position?.preAuthCharged ? 'text-red-300' : 'text-green-300'
                      }`}>
                        {positionInfo?.position?.preAuthCharged ? 'Charged' : 'Active Hold'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Entry Price:</span>
                      <span className="text-white font-medium">${positionMetrics.entryPrice.toFixed(2)}</span>
                    </div>
                    {timeRemaining > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Time Remaining:</span>
                        <div className="flex items-center gap-1">
                          <Clock size={14} className="text-amber-400" />
                          <span className={`font-medium ${timeRemaining < 3600 ? 'text-amber-300' : 'text-white'}`}>
                            {timeRemaining >= 60 ? 
                              `${Math.floor(timeRemaining / 3600)}h ${Math.floor((timeRemaining % 3600) / 60)}m ${timeRemaining % 60}s` :
                              `${timeRemaining}s`
                            }
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Position Age:</span>
                        <span className="text-blue-300 font-medium">
                          {Math.floor((Date.now() / 1000 - (positionInfo?.position?.openTimestamp || 0)) / 86400)}d {Math.floor(((Date.now() / 1000 - (positionInfo?.position?.openTimestamp || 0)) % 86400) / 3600)}h
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleClosePosition}
                disabled={isProcessingPosition}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 px-6 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center gap-2 shadow-lg"
              >
                {isProcessingPosition ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Closing Position...
                  </>
                ) : (
                  <>
                    <Zap size={16} />
                    Close Position
                  </>
                )}
              </button>
              <button
                onClick={debouncedRefetch}
                disabled={isRefreshing}
                className="px-6 py-3 glassmorphism border border-white/20 hover:border-white/30 text-white rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                {isRefreshing ? (
                  <Loader className="animate-spin" size={16} />
                ) : (
                  <Eye size={16} />
                )}
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}