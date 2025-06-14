import { NextResponse } from "next/server";
import { getLatestPrice } from "@/lib/chainlink-price";

// Cache price for 1 second to avoid rate limiting
let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 1 * 1000; // 1 second

export async function GET() {

  try {
    // Check cache first
    const now = Date.now();
    if (cachedPrice && (now - cachedPrice.timestamp) < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        price: cachedPrice.price,
        timestamp: new Date().toISOString(),
        source: "cache",
        cacheAge: now - cachedPrice.timestamp
      });
    }

    // Try Chainlink Price Feed first
    
    let ethPrice: number;
    let timestamp: Date;
    let roundId: string | undefined;
    let source: string;
    
    try {
      const chainlinkData = await getLatestPrice();
      ethPrice = chainlinkData.price;
      timestamp = chainlinkData.timestamp;
      roundId = chainlinkData.roundId;
      source = "chainlink";
      
    } catch {
      // Fallback to CoinGecko
      
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

      ethPrice = price;
      timestamp = new Date();
      source = 'coingecko_fallback';
      
    }

    if (!ethPrice || typeof ethPrice !== 'number') {
      throw new Error("Invalid price data received");
    }

    // Update cache
    cachedPrice = {
      price: ethPrice,
      timestamp: now
    };


    return NextResponse.json({
      success: true,
      price: ethPrice,
      timestamp: timestamp.toISOString(),
      source,
      ...(roundId && { roundId })
    });

  } catch {
    // Fallback: return cached price if available, or mock price
    if (cachedPrice) {
      return NextResponse.json({
        success: true,
        price: cachedPrice.price,
        timestamp: new Date().toISOString(),
        source: "cache_fallback",
        warning: "Using cached price due to API errors"
      });
    }

    // Last resort: return a reasonable mock price
    const mockPrice = 3500;
    
    return NextResponse.json({
      success: true,
      price: mockPrice,
      timestamp: new Date().toISOString(),
      source: "mock_fallback",
      warning: "Using mock price due to API unavailability"
    });
  }
}

// Health check endpoint
export async function HEAD() {
  return new Response(null, { status: 200 });
}