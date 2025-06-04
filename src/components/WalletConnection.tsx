/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect } from "react";

interface WalletConnectionProps {
  onWalletConnected: (address: string) => void;
}

export default function WalletConnection({
  onWalletConnected,
}: WalletConnectionProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (isConnected && address) {
      onWalletConnected(address);
    }
  }, [isConnected, address, onWalletConnected]);

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
          <w3m-button />
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
