"use client";

import { useState, useEffect } from "react";
import { useContractOperations, useLPValue } from "@/hooks/useContract";
import { Droplets, Plus, Minus, TrendingUp, Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface LiquidityProviderProps {
  walletAddress: string;
}

export default function LiquidityProvider({ walletAddress }: LiquidityProviderProps) {
  const [addAmount, setAddAmount] = useState("");
  const [removeShares, setRemoveShares] = useState("");
  const [activeTab, setActiveTab] = useState<"add" | "remove">("add");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const { addLiquidity, removeLiquidity, loading, error } = useContractOperations();
  const { lpValue, loading: lpLoading, refetch: refetchLP } = useLPValue();

  const hasLPBalance = parseFloat(lpValue || "0") > 0;

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Debug logging
  useEffect(() => {
    console.log("LiquidityProvider Debug:", {
      walletAddress,
      lpValue,
      lpLoading,
      hasLPBalance,
      parseFloat: parseFloat(lpValue)
    });
  }, [walletAddress, lpValue, lpLoading, hasLPBalance]);

  const handleAddLiquidity = async () => {
    if (!addAmount || parseFloat(addAmount) <= 0) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const receipt = await addLiquidity(addAmount);
      setAddAmount("");
      // Force refresh the LP value
      setTimeout(() => refetchLP(), 500);
      setSuccessMessage(`Successfully added ${addAmount} ETH to the liquidity pool! Transaction: ${receipt.transactionHash.substring(0, 10)}...`);
    } catch (error) {
      console.error("Error adding liquidity:", error);
      setErrorMessage((error as Error).message || "Failed to add liquidity");
    }
  };

  const handleRemoveLiquidity = async () => {
    if (!removeShares || parseFloat(removeShares) <= 0) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      const receipt = await removeLiquidity(removeShares);
      setRemoveShares("");
      // Force refresh the LP value
      setTimeout(() => refetchLP(), 500);
      setSuccessMessage(`Successfully removed ${removeShares} ETH from the liquidity pool! Transaction: ${receipt.transactionHash.substring(0, 10)}...`);
    } catch (error) {
      console.error("Error removing liquidity:", error);
      setErrorMessage((error as Error).message || "Failed to remove liquidity");
    }
  };

  return (
    <div className="glassmorphism rounded-2xl shadow-2xl p-8 border border-white/20">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Droplets className="text-white" size={32} />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Liquidity Provider
        </h2>
        <p className="text-gray-300">
          Add ETH to the lending pool and earn interest from borrowers
        </p>
      </div>

      {/* LP Value Display */}
      <div className="bg-white/5 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Your LP Value</h3>
            <p className="text-gray-300 text-sm">Current value of your LP tokens</p>
          </div>
          <div className="text-right">
            {lpLoading ? (
              <Loader2 className="animate-spin text-blue-400" size={24} />
            ) : (
              <>
                <div className={`text-2xl font-bold ${hasLPBalance ? 'text-white' : 'text-gray-400'}`}>
                  {parseFloat(lpValue || "0").toFixed(4)} ETH
                </div>
                <div className="text-sm text-gray-400">≈ ${(parseFloat(lpValue || "0") * 2000).toFixed(2)}</div>
                {!hasLPBalance && (
                  <div className="text-xs text-gray-500 mt-1">No LP tokens</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Contract Not Deployed Warning */}
      {error && error.includes("Contract not deployed") && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-amber-400" />
            <span className="text-amber-300 font-semibold">Demo Mode</span>
          </div>
          <p className="text-amber-100 text-sm">
            The contract is not yet deployed on this network. This is a demo interface showing how the liquidity provider functionality will work.
          </p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-white/5 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab("add")}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "add"
              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
              : "text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          <Plus size={16} />
          Add Liquidity
        </button>
        <button
          onClick={() => setActiveTab("remove")}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "remove"
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
              : "text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          <Minus size={16} />
          Remove Liquidity
        </button>
      </div>

      {/* Add Liquidity Tab */}
      {activeTab === "add" && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              ETH Amount to Add
            </label>
            <div className="relative">
              <input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="0.0"
                step="0.01"
                min="0"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                ETH
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-blue-400" />
              <span className="text-blue-300 font-semibold">Expected Returns</span>
            </div>
            <p className="text-blue-100 text-sm">
              Earn interest from borrowers. APY varies based on pool utilization.
            </p>
          </div>

          <button
            onClick={handleAddLiquidity}
            disabled={loading || !addAmount || parseFloat(addAmount) <= 0}
            className="w-full btn-gradient text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Adding Liquidity...
              </>
            ) : (
              <>
                <Plus size={20} />
                Add Liquidity
              </>
            )}
          </button>
        </div>
      )}

      {/* Remove Liquidity Tab */}
      {activeTab === "remove" && (
        <div className="space-y-6">
          {!hasLPBalance && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-blue-400" />
                <span className="text-blue-300 font-semibold">No LP Tokens</span>
              </div>
              <p className="text-blue-100 text-sm">
                You don&apos;t have any LP tokens to remove. Add liquidity first to earn tokens that can be withdrawn later.
              </p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              LP Shares to Remove
            </label>
            <div className="relative">
              <input
                type="number"
                value={removeShares}
                onChange={(e) => setRemoveShares(e.target.value)}
                placeholder="0.0"
                step="0.01"
                min="0"
                max={lpValue || '0'}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                Shares
              </div>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-gray-400 text-sm">Available: {parseFloat(lpValue || "0").toFixed(4)} ETH</span>
              <button
                onClick={() => setRemoveShares(lpValue || '0')}
                className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Max
              </button>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Minus size={16} className="text-amber-400" />
              <span className="text-amber-300 font-semibold">Important</span>
            </div>
            <p className="text-amber-100 text-sm">
              Removing liquidity will withdraw your ETH from the pool. Make sure there&apos;s sufficient liquidity for active borrowers.
            </p>
          </div>

          <button
            onClick={handleRemoveLiquidity}
            disabled={loading || !removeShares || parseFloat(removeShares) <= 0 || parseFloat(removeShares) > parseFloat(lpValue || '0')}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Removing Liquidity...
              </>
            ) : (
              <>
                <Minus size={20} />
                Remove Liquidity
              </>
            )}
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400" />
            <p className="text-green-300 text-sm">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <XCircle size={20} className="text-red-400" />
            <p className="text-red-300 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Contract Error Display */}
      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <XCircle size={20} className="text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}