/**
 * Chainlink Price Feed Reader - TypeScript Version
 * Fetches ETH/USD price from Chainlink oracle on Sepolia testnet
 * Uses fetch API directly for Next.js compatibility
 */

const SEPOLIA_RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/5NIZupGMAK990bNPC95clhTZBkvw4BrE";
const ETH_USD_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

// ABI function signatures
const LATEST_ROUND_DATA = "0xfeaf968c";
const DECIMALS = "0x313ce567";

interface ChainlinkPrice {
  price: number;
  timestamp: Date;
  roundId: string;
}

async function makeRpcCall(method: string, params: unknown[]): Promise<string> {
  const response = await fetch(SEPOLIA_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`RPC Error: ${data.error.message}`);
  }

  return data.result;
}

function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

function parseHexData(hex: string): {
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
} {
  // Remove 0x prefix and ensure we have enough data
  const data = hex.slice(2);
  if (data.length < 320) { // 5 * 64 hex chars
    throw new Error('Invalid response data length');
  }

  return {
    roundId: hexToBigInt('0x' + data.slice(0, 64)),
    answer: hexToBigInt('0x' + data.slice(64, 128)),
    startedAt: hexToBigInt('0x' + data.slice(128, 192)),
    updatedAt: hexToBigInt('0x' + data.slice(192, 256)),
    answeredInRound: hexToBigInt('0x' + data.slice(256, 320)),
  };
}

export async function getLatestPrice(): Promise<ChainlinkPrice> {
  try {
    // Get decimals and latest round data
    const [decimalsHex, roundDataHex] = await Promise.all([
      makeRpcCall('eth_call', [
        { to: ETH_USD_PRICE_FEED, data: DECIMALS },
        'latest'
      ]),
      makeRpcCall('eth_call', [
        { to: ETH_USD_PRICE_FEED, data: LATEST_ROUND_DATA },
        'latest'
      ])
    ]);

    if (!roundDataHex || roundDataHex === '0x' || roundDataHex.length < 10) {
      throw new Error('Empty or invalid response from oracle');
    }

    const decimals = parseInt(decimalsHex, 16);
    const parsed = parseHexData(roundDataHex);

    // Convert to human readable
    const price = Number(parsed.answer) / Math.pow(10, decimals);
    const timestamp = new Date(Number(parsed.updatedAt) * 1000);

    // Validate price
    if (price <= 0 || price > 100000) {
      throw new Error(`Invalid price: ${price}`);
    }

    return {
      price,
      timestamp,
      roundId: parsed.roundId.toString(),
    };
  } catch (error) {
    throw new Error(`Chainlink price fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate liquidation price for borrowing ETH against USD collateral
 * @param borrowAmountUSD - Current USD value of borrowed ETH
 * @param preAuthAmount - Pre-authorization amount (USD collateral)
 * @param currentEthPrice - Current ETH price in USD
 * @param liquidationThreshold - LTV threshold for liquidation (default 85%)
 * @returns Liquidation price in USD (ETH price at which liquidation occurs)
 */
export function calculateLiquidationPrice(
  borrowAmountUSD: number,
  preAuthAmount: number,
  currentEthPrice: number,
  liquidationThreshold: number = 85
): number {
  if (borrowAmountUSD <= 0 || preAuthAmount <= 0 || currentEthPrice <= 0) return 0;
  
  // For borrowing ETH against USD collateral:
  // - User owes fixed amount of ETH
  // - Collateral is fixed USD amount
  // - Risk increases when ETH price rises (debt value increases)
  // - Liquidation when: (ETH_debt_value / USD_collateral) >= liquidation_threshold
  
  const ethAmountBorrowed = borrowAmountUSD / currentEthPrice; // Amount of ETH borrowed
  
  // Liquidation occurs when: (ethAmountBorrowed * liquidationPrice) / preAuthAmount = liquidationThreshold/100
  // Solving for liquidationPrice: liquidationPrice = (liquidationThreshold/100 * preAuthAmount) / ethAmountBorrowed
  
  const liquidationPrice = (liquidationThreshold / 100 * preAuthAmount) / ethAmountBorrowed;
  
  return liquidationPrice;
}

/**
 * Get risk level based on current LTV for ETH borrowing against USD collateral
 * Higher LTV = Higher risk (borrowed ETH value approaches collateral value)
 */
export function getRiskLevel(currentLTV: number): { level: string; color: string; description: string } {
  if (currentLTV <= 40) {
    return { level: "Safe", color: "green", description: "Low risk, ETH can rise significantly before liquidation" };
  } else if (currentLTV <= 55) {
    return { level: "Moderate", color: "yellow", description: "Moderate risk, monitor ETH price increases" };
  } else if (currentLTV <= 70) {
    return { level: "High", color: "orange", description: "High risk, ETH price increases are dangerous" };
  } else {
    return { level: "Critical", color: "red", description: "Very high risk, liquidation if ETH rises further" };
  }
}

/**
 * Calculate collateralization ratio (inverse of LTV)
 * @param preAuthAmount - USD collateral amount
 * @param borrowAmountUSD - USD value of borrowed ETH
 * @returns Collateralization ratio as percentage
 */
export function getCollateralizationRatio(preAuthAmount: number, borrowAmountUSD: number): number {
  if (borrowAmountUSD <= 0) return 0;
  return (preAuthAmount / borrowAmountUSD) * 100;
}

/**
 * Fallback price fetcher using CoinGecko API
 */
export async function getFallbackPrice(): Promise<{ price: number; timestamp: Date; source: string }> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CreditShaft-Demo/1.0'
        },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const price = data.ethereum?.usd;

    if (!price || typeof price !== 'number') {
      throw new Error('Invalid price data');
    }

    return {
      price,
      timestamp: new Date(),
      source: 'coingecko_fallback'
    };
  } catch (error) {
    throw new Error(`Fallback price fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export default getLatestPrice;