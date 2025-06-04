"use client";

import { useState } from "react";
import { PreAuthData } from "@/types";
import {
  DollarSign,
  ArrowRight,
  CheckCircle,
  Copy,
  AlertCircle,
} from "lucide-react";

interface BorrowingInterfaceProps {
  preAuthData: PreAuthData;
  walletAddress: string;
}

export default function BorrowingInterface({
  preAuthData,
  walletAddress,
}: BorrowingInterfaceProps) {
  const [borrowAmount, setBorrowAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("USDC");
  const [isProcessing, setIsProcessing] = useState(false);
  const [borrowSuccess, setBorrowSuccess] = useState(false);
  const [txHash, setTxHash] = useState("");

  // NEW LOGIC: Calculate required pre-auth amount for 80% LTV
  const calculatePreAuthAmount = (borrowAmount: number): number => {
    return Math.ceil(borrowAmount / 0.8); // If borrow 100, pre-auth 125 (100/0.8)
  };

  const maxBorrow = preAuthData.available_credit; // User can borrow up to their full credit limit

  const assets = [
    { symbol: "USDC", name: "USD Coin", rate: "5.2%", address: "0x..." },
    { symbol: "USDT", name: "Tether", rate: "4.8%", address: "0x..." },
    { symbol: "DAI", name: "Dai Stablecoin", rate: "5.5%", address: "0x..." },
  ];

  const borrowAmountNum = parseFloat(borrowAmount) || 0;
  const requiredPreAuth = calculatePreAuthAmount(borrowAmountNum);
  const ltvRatio =
    borrowAmountNum > 0
      ? ((borrowAmountNum / requiredPreAuth) * 100).toFixed(1)
      : "0";

  const handleBorrow = async () => {
    setIsProcessing(true);

    try {
      // First, call the smart contract to create the loan
      const response = await fetch("/api/borrow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: borrowAmountNum,
          asset: selectedAsset,
          walletAddress,
          preAuthId: preAuthData.preAuthId || "demo_preauth_id",
          requiredPreAuth,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTxHash(data.txHash);
        setBorrowSuccess(true);
      } else {
        throw new Error(data.error || "Borrowing failed");
      }
    } catch (error) {
      console.error("Borrowing failed:", error);
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
            Loan Successful! 🎉
          </h2>

          <div className="glassmorphism rounded-xl p-6 mb-6 max-w-md mx-auto border border-white/20">
            <p className="text-sm text-gray-300 mb-2">You borrowed:</p>
            <p className="text-3xl font-bold text-green-400">
              ${borrowAmountNum.toLocaleString()} {selectedAsset}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Pre-authorized: ${requiredPreAuth.toLocaleString()} ({ltvRatio}%
              LTV)
            </p>
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
                <li>
                  • Your credit card has a ${requiredPreAuth.toLocaleString()}{" "}
                  pre-authorization hold
                </li>
                <li>
                  • Interest accrues at{" "}
                  {assets.find((a) => a.symbol === selectedAsset)?.rate} APY
                </li>
                <li>• Repay anytime to release the hold</li>
                <li>• If not repaid, the pre-auth will be captured</li>
              </ul>
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
              Borrow Amount (USD)
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="number"
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(e.target.value)}
                placeholder="0.00"
                max={maxBorrow}
                className="w-full pl-10 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg text-white placeholder-gray-400 transition-all"
              />
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-300">
                Maximum: ${maxBorrow.toLocaleString()} (your credit limit)
              </p>
              {borrowAmountNum > 0 && (
                <p className="text-sm text-blue-300">
                  Pre-auth required: ${requiredPreAuth.toLocaleString()} (
                  {ltvRatio}% LTV)
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-3">
              Asset to Borrow
            </label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all"
            >
              {assets.map((asset) => (
                <option
                  key={asset.symbol}
                  value={asset.symbol}
                  className="bg-gray-800"
                >
                  {asset.symbol} - {asset.name} ({asset.rate} APY)
                </option>
              ))}
            </select>
          </div>

          {/* Warning if pre-auth exceeds credit limit */}
          {borrowAmountNum > 0 &&
            requiredPreAuth > preAuthData.available_credit && (
              <div className="flex items-start gap-3 text-red-300 bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Insufficient Credit Limit</p>
                  <p className="text-sm">
                    You need ${requiredPreAuth.toLocaleString()} credit limit
                    but only have $
                    {preAuthData.available_credit.toLocaleString()}.
                  </p>
                </div>
              </div>
            )}

          <button
            onClick={handleBorrow}
            disabled={
              !borrowAmount ||
              borrowAmountNum <= 0 ||
              requiredPreAuth > preAuthData.available_credit ||
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
                Borrow $
                {borrowAmountNum > 0 ? borrowAmountNum.toLocaleString() : "0"}{" "}
                {selectedAsset}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>

        <div className="space-y-6">
          <div className="card-gradient rounded-xl p-6 border border-white/10">
            <h3 className="font-bold text-white mb-4 text-xl">Loan Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Collateral:</span>
                <span className="font-medium text-white">
                  Credit Card Pre-Auth
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Available Credit:</span>
                <span className="font-medium text-white">
                  ${preAuthData.available_credit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Target LTV Ratio:</span>
                <span className="font-medium text-white">80%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Interest Rate:</span>
                <span className="font-medium text-white">
                  {assets.find((a) => a.symbol === selectedAsset)?.rate}
                </span>
              </div>
              {borrowAmountNum > 0 && (
                <>
                  <hr className="border-white/20" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-200">Loan Amount:</span>
                    <span className="text-blue-300">
                      ${borrowAmountNum.toLocaleString()} {selectedAsset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Pre-auth Amount:</span>
                    <span className="text-yellow-300">
                      ${requiredPreAuth.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Actual LTV:</span>
                    <span className="text-green-300">{ltvRatio}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Daily Interest:</span>
                    <span className="text-gray-300">
                      ${((borrowAmountNum * 0.052) / 365).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card-gradient rounded-xl p-6 border border-blue-500/30">
            <h4 className="font-semibold text-blue-300 mb-3">How It Works</h4>
            <ul className="text-sm text-blue-200 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>
                  Pre-authorization hold on your credit card for 125% of loan
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Instant transfer of borrowed assets to your wallet</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Interest accrues continuously at competitive rates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Repay anytime to release the pre-authorization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>
                  Auto-liquidation if health factor drops below safe levels
                </span>
              </li>
            </ul>
          </div>

          <div className="card-gradient rounded-xl p-6 border border-amber-500/30">
            <h4 className="font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <AlertCircle size={16} />
              Demo Information
            </h4>
            <p className="text-sm text-amber-200">
              This demo uses Sepolia testnet with real USDC tokens. The smart
              contract is pre-funded for demonstration. In production, this
              would integrate with established DeFi protocols like Aave or
              Compound.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
