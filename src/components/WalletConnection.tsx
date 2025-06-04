"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useEffect, useState } from "react";

interface WalletConnectionProps {
  onWalletConnected: (address: string) => void;
}

export default function WalletConnection({
  onWalletConnected,
}: WalletConnectionProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      onWalletConnected(address);
    }
  }, [isConnected, address, onWalletConnected]);

  // Mock wallet connection for demo
  const handleMockConnection = () => {
    const mockAddress = "0x59d4C5BE20B41139494F494e41139494e1139494";
    onWalletConnected(mockAddress);
  };

  if (!hasMounted) {
    return (
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl shadow-lg">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded mb-4"></div>
          <div className="h-16 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-4">
        Connect Your Wallet
      </h2>

      {!isConnected ? (
        <div className="space-y-4">
          <p className="text-blue-100">
            Connect your wallet to start using your credit as DeFi collateral
          </p>

          <div className="space-y-3">
            <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-lg p-3">
              <p className="text-yellow-200 text-sm">
                🎯 Demo Mode: Using mock wallet connection for hackathon demo
              </p>
            </div>
            <button
              onClick={handleMockConnection}
              className="w-full bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-105"
            >
              Connect Demo Wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-blue-100 mb-1">Connected Wallet:</p>
            <p className="text-white font-mono text-sm break-all">{address}</p>
          </div>
          <button
            onClick={() => disconnect()}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
