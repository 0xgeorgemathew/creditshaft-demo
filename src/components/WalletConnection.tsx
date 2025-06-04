"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useEffect, useState } from "react";
import { Wallet, ExternalLink, Zap } from "lucide-react";

interface WalletConnectionProps {
  onWalletConnected: (address: string) => void;
}

export default function WalletConnection({
  onWalletConnected,
}: WalletConnectionProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
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

  if (!hasMounted) {
    return (
      <div className="glassmorphism rounded-xl shadow-2xl p-8 border border-white/20">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded mb-4"></div>
          <div className="h-16 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glassmorphism rounded-xl shadow-2xl p-8 border border-white/20 card-hover">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
          <Wallet className="text-white" size={20} />
        </div>
        <h2 className="text-2xl font-bold gradient-text">
          Connect Your Wallet
        </h2>
      </div>

      {!isConnected ? (
        <div className="space-y-6">
          <p className="text-gray-300 text-lg">
            Connect your wallet to start using your credit as DeFi collateral
          </p>

          <div className="space-y-4">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                disabled={isPending || isConnecting}
                className="w-full glassmorphism hover:bg-white/10 text-white py-4 px-6 rounded-xl font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between border border-white/10 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg flex items-center justify-center">
                    <Zap size={16} />
                  </div>
                  <span className="text-lg">{connector.name}</span>
                </div>
                {(isPending || isConnecting) && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                )}
              </button>
            ))}

            {connectors.length === 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 backdrop-blur">
                <p className="text-yellow-200 text-sm mb-4 font-medium">
                  No wallet connectors found. Make sure you have a Web3 wallet
                  installed.
                </p>
                <div className="space-y-3">
                  <a
                    href="https://metamask.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-100 hover:text-white text-sm flex items-center gap-2 transition-colors p-2 rounded-lg hover:bg-yellow-500/10"
                  >
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">M</span>
                    </div>
                    Install MetaMask <ExternalLink size={14} />
                  </a>
                  <a
                    href="https://www.coinbase.com/wallet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-100 hover:text-white text-sm flex items-center gap-2 transition-colors p-2 rounded-lg hover:bg-yellow-500/10"
                  >
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">C</span>
                    </div>
                    Install Coinbase Wallet <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 backdrop-blur success-bounce">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-200 text-lg font-semibold">
                Wallet Connected
              </span>
            </div>
            <div className="glassmorphism rounded-lg p-4 border border-white/10">
              <p className="text-sm text-gray-300 mb-2">Connected Address:</p>
              <p className="text-white font-mono text-sm break-all bg-black/20 p-3 rounded-lg border border-white/10">
                {address}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => disconnect()}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-white px-6 py-3 rounded-xl transition-all border border-red-500/40 font-medium backdrop-blur"
            >
              Disconnect
            </button>
            <a
              href={`https://sepolia.etherscan.io/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glassmorphism hover:bg-white/10 text-white px-6 py-3 rounded-xl transition-all flex items-center gap-2 border border-white/10 font-medium"
            >
              View on Etherscan <ExternalLink size={16} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
