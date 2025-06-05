import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { sepolia } from "viem/chains";
import { defineChain } from "viem";

// Define Avalanche Fuji testnet
const avalancheFuji = defineChain({
  id: 43113,
  name: "Avalanche Fuji",
  nativeCurrency: {
    decimals: 18,
    name: "Avalanche",
    symbol: "AVAX",
  },
  rpcUrls: {
    default: {
      http: ["https://api.avax-test.network/ext/bc/C/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "SnowTrace",
      url: "https://testnet.snowscan.xyz/",
    },
  },
  testnet: true,
});

// 1. Get a project ID at https://cloud.reown.com
const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
  "11a474a6be2638cdf851d49bf0446dc1";

// 2. Create Wagmi Adapter with both networks
const wagmiAdapter = new WagmiAdapter({
  networks: [sepolia, avalancheFuji],
  projectId,
  ssr: true,
});

export { wagmiAdapter, avalancheFuji };
