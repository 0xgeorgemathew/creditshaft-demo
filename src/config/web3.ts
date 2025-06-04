import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { sepolia } from "viem/chains";

// 1. Get a project ID at https://cloud.reown.com
const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ||
  "11a474a6be2638cdf851d49bf0446dc1";

// 2. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks: [sepolia],
  projectId,
  ssr: true,
});

export { wagmiAdapter };
