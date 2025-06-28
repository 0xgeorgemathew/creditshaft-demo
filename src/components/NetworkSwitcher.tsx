"use client";

import { useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "viem/chains";
import { avalancheFuji } from "@/config/web3";
import { ChevronDown, Link } from "lucide-react";
import { useState } from "react";

const networks = [
  {
    id: sepolia.id,
    name: "Sepolia",
    symbol: "ETH",
    color: "from-blue-600 to-blue-700",
    explorer: "https://sepolia.etherscan.io",
    explorerName: "Etherscan",
  },
  {
    id: avalancheFuji.id,
    name: "Avalanche Fuji",
    symbol: "AVAX",
    color: "from-red-500 to-orange-600",
    explorer: "https://testnet.snowscan.xyz/",
    explorerName: "SnowTrace",
  },
];

export default function NetworkSwitcher() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [isOpen, setIsOpen] = useState(false);

  const currentNetwork = networks.find((network) => network.id === chainId);

  const handleNetworkSwitch = (networkId: number) => {
    switchChain({ chainId: networkId });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="glassmorphism hover:bg-white/10 text-white p-3 rounded-lg transition-all flex items-center gap-2 border border-white/10 font-medium disabled:opacity-50 min-w-[160px] h-[52px]"
      >
        <div
          className={`w-3 h-3 rounded-full bg-gradient-to-r ${
            currentNetwork?.color || "from-gray-500 to-gray-600"
          }`}
        ></div>
        <Link size={14} />
        <span className="text-sm">{currentNetwork?.name || "Unknown"}</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
        {isPending && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute top-full mt-2 right-0 w-56 glassmorphism rounded-lg border border-white/20 shadow-xl backdrop-blur-lg"
          style={{ zIndex: 50 }}
        >
          {networks.map((network) => (
            <button
              key={network.id}
              onClick={() => handleNetworkSwitch(network.id)}
              disabled={isPending || network.id === chainId}
              className={`w-full text-left px-4 py-3 hover:bg-white/10 transition-all flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50 ${
                network.id === chainId ? "bg-white/10" : ""
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-gradient-to-r ${network.color}`}
              ></div>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">
                  {network.name}
                </div>
                <div className="text-gray-400 text-xs">{network.symbol}</div>
              </div>
              {network.id === chainId && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
