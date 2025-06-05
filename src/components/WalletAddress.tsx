"use client";

import { useAccount, useChainId } from "wagmi";
import { Copy, ExternalLink, CheckCircle } from "lucide-react";
import { useState } from "react";
import { sepolia } from "viem/chains";
import { avalancheFuji } from "@/config/web3";

const getExplorerUrl = (chainId: number, address: string) => {
  switch (chainId) {
    case sepolia.id:
      return `https://sepolia.etherscan.io/address/${address}`;
    case avalancheFuji.id:
      return `https://testnet.snowscan.xyz/address/${address}`;
    default:
      return `https://sepolia.etherscan.io/address/${address}`;
  }
};

const getExplorerName = (chainId: number) => {
  switch (chainId) {
    case sepolia.id:
      return "Etherscan";
    case avalancheFuji.id:
      return "SnowTrace";
    default:
      return "Etherscan";
  }
};

export default function WalletAddress() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy address:", error);
      }
    }
  };

  const handleExplorerOpen = () => {
    if (address) {
      window.open(
        getExplorerUrl(chainId, address),
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  if (!isConnected || !address) {
    return null;
  }

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="glassmorphism rounded-lg p-3 border border-white/10 flex items-center gap-3 min-w-0 h-[52px]">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 mb-1">Wallet Address</div>
        <div className="text-white text-sm font-mono truncate" title={address}>
          {shortenAddress(address)}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
          title="Copy address"
        >
          {copied ? (
            <CheckCircle size={16} className="text-green-400" />
          ) : (
            <Copy size={16} />
          )}
        </button>

        <button
          onClick={handleExplorerOpen}
          className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
          title={`View on ${getExplorerName(chainId)}`}
        >
          <ExternalLink size={16} />
        </button>
      </div>
    </div>
  );
}
