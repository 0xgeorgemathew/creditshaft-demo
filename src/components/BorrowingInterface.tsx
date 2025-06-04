"use client";

import { useState } from "react";
import { PreAuthData } from "@/types";
import { DollarSign, ArrowRight, CheckCircle, Copy } from "lucide-react";

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

  const maxBorrow = Math.floor(preAuthData.available_credit * 0.8);
  const assets = [
    { symbol: "USDC", name: "USD Coin", rate: "5.2%" },
    { symbol: "USDT", name: "Tether", rate: "4.8%" },
    { symbol: "DAI", name: "Dai Stablecoin", rate: "5.5%" },
  ];

  const handleBorrow = async () => {
    setIsProcessing(true);

    // Simulate blockchain transaction
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Mock transaction hash
    const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64);
    setTxHash(mockTxHash);
    setBorrowSuccess(true);
    setIsProcessing(false);
  };

  const copyTxHash = () => {
    navigator.clipboard.writeText(txHash);
  };

  if (borrowSuccess) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200">
        <div className="text-center">
          <CheckCircle className="text-green-600 mx-auto mb-4" size={48} />
          <h2 className="text-3xl font-bold text-green-800 mb-4">
            Loan Successful! 🎉
          </h2>

          <div className="bg-white rounded-lg p-6 mb-6 max-w-md mx-auto">
            <p className="text-sm text-gray-600 mb-2">You borrowed:</p>
            <p className="text-3xl font-bold text-green-600">
              ${parseFloat(borrowAmount).toLocaleString()} {selectedAsset}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Transaction Hash:</span>
              <button
                onClick={copyTxHash}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Copy size={14} />
                Copy
              </button>
            </div>
            <p className="text-xs font-mono text-gray-800 mt-1 break-all">
              {txHash}
            </p>
          </div>

          <div className="space-y-4 text-left max-w-md mx-auto">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">
                What happens next?
              </h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your credit card has a pre-authorization hold</li>
                <li>• Interest accrues at 5.2% APY</li>
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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Borrow Against Your Credit
      </h2>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Maximum: ${maxBorrow.toLocaleString()} (80% of credit limit)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset to Borrow
            </label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {assets.map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.symbol} - {asset.name} ({asset.rate} APY)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleBorrow}
            disabled={
              !borrowAmount ||
              parseFloat(borrowAmount) <= 0 ||
              parseFloat(borrowAmount) > maxBorrow ||
              isProcessing
            }
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Processing Loan...
              </>
            ) : (
              <>
                Borrow $
                {borrowAmount ? parseFloat(borrowAmount).toLocaleString() : "0"}{" "}
                {selectedAsset}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Loan Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Collateral:</span>
                <span className="font-medium">Credit Card Pre-Auth</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available Credit:</span>
                <span className="font-medium">
                  ${preAuthData.available_credit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">LTV Ratio:</span>
                <span className="font-medium">80%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Interest Rate:</span>
                <span className="font-medium">5.2% APY</span>
              </div>
              {borrowAmount && (
                <>
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Loan Amount:</span>
                    <span>
                      ${parseFloat(borrowAmount).toLocaleString()}{" "}
                      {selectedAsset}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Daily Interest:</span>
                    <span>
                      ${((parseFloat(borrowAmount) * 0.052) / 365).toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">How It Works</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Pre-authorization hold on your credit card</li>
              <li>• Instant transfer of borrowed assets to your wallet</li>
              <li>• Interest accrues continuously</li>
              <li>• Repay anytime to release the hold</li>
              <li>• Auto-liquidation if health factor drops</li>
            </ul>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <h4 className="font-semibold text-amber-800 mb-2">⚠️ Important</h4>
            <p className="text-sm text-amber-700">
              This is a hackathon demo using testnet. No real funds or credit
              cards are involved. In production, ensure you understand the risks
              of using credit as DeFi collateral.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
