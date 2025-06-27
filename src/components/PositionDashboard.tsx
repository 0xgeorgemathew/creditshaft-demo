"use client";

import { useState, useEffect, useCallback } from "react";
import { Position, PositionStats } from "@/types";
import { getPosition, closePosition, getLinkPrice } from "@/lib/contract";
import { useAccount } from "wagmi";
import { 
    Loader, AlertCircle, BarChart3, Shield
} from "lucide-react";

// Helper to calculate position stats
const calculateStats = (position: Position, currentLinkPrice: number): PositionStats => {
    const collateralUSD = parseFloat(position.collateralLINK) * parseFloat(position.entryPrice);
    const currentCollateralUSD = parseFloat(position.collateralLINK) * currentLinkPrice;
    const totalExposureLINK = parseFloat(position.suppliedLINK);
    const totalExposureUSD = totalExposureLINK * currentLinkPrice;
    const borrowedUSD = parseFloat(position.borrowedUSDC);
    const pnl = totalExposureUSD - (collateralUSD + borrowedUSD);

    const unrealizedPnL_USD = pnl.toFixed(2);
    const unrealizedPnL_Percent = (((pnl) / collateralUSD) * 100).toFixed(2);

    // Simplified liquidation price calculation
    const liquidationPrice = (borrowedUSD / totalExposureLINK * 1.05).toFixed(2); // with 5% buffer

    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = position.preAuthExpiryTime - now;
    let preAuthStatus: "Active" | "Expired" | "Charged" = "Active";
    if (position.preAuthCharged) {
        preAuthStatus = "Charged";
    } else if (timeRemaining <= 0) {
        preAuthStatus = "Expired";
    }

    return {
        unrealizedPnL_USD,
        unrealizedPnL_Percent,
        totalExposure_USD: totalExposureUSD.toFixed(2),
        totalExposure_LINK: totalExposureLINK.toFixed(4),
        borrowedAmount_USD: borrowedUSD.toFixed(2),
        collateralValue_USD: currentCollateralUSD.toFixed(2),
        liquidationPrice,
        preAuthStatus,
        timeRemaining,
        healthFactor: "1.5" // Placeholder
    };
};

export default function PositionDashboard() {
    const { address } = useAccount();
    const [position, setPosition] = useState<Position | null>(null);
    const [stats, setStats] = useState<PositionStats | null>(null);
    const [linkPrice, setLinkPrice] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!address) return;
        try {
            const [pos, price] = await Promise.all([
                getPosition(address),
                getLinkPrice(),
            ]);
            setPosition(pos);
            setLinkPrice(price);
            if (pos) {
                setStats(calculateStats(pos, price));
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleClosePosition = async () => {
        setIsClosing(true);
        setError(null);
        try {
            await closePosition();
            setPosition(null); // Optimistically clear position
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsClosing(false);
        }
    };

    if (loading) {
        return (
            <div className="glassmorphism rounded-2xl p-12 border border-white/20 min-h-[800px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    <span className="text-white text-lg">Loading position data...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="glassmorphism p-8 text-red-400"><AlertCircle className="inline mr-2"/>Error: {error}</div>;
    }

    if (!position) {
        return (
            <div className="glassmorphism rounded-2xl p-12 text-center border border-white/20 min-h-[800px] flex items-center justify-center">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-3">No Active Position</h3>
                    <p className="text-gray-400">Open a position to see your dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glassmorphism rounded-2xl p-12 border border-white/20 min-h-[800px]">
            <h2 className="text-4xl font-bold text-white mb-12 gradient-text">Position Dashboard</h2>
            
            {stats && (
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    <div className={`p-4 rounded-xl ${parseFloat(stats.unrealizedPnL_USD) >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <p className="text-sm text-gray-300">Unrealized P&L</p>
                        <p className={`text-2xl font-bold ${parseFloat(stats.unrealizedPnL_USD) >= 0 ? 'text-green-300' : 'text-red-300'}`}>${stats.unrealizedPnL_USD}</p>
                        <p className={`text-sm ${parseFloat(stats.unrealizedPnL_Percent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{stats.unrealizedPnL_Percent}%</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-500/10">
                        <p className="text-sm text-gray-300">Total Exposure</p>
                        <p className="text-2xl font-bold text-blue-300">${stats.totalExposure_USD}</p>
                        <p className="text-sm text-blue-400">{stats.totalExposure_LINK} LINK</p>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/10">
                        <p className="text-sm text-gray-300">Liquidation Price</p>
                        <p className="text-2xl font-bold text-purple-300">${stats.liquidationPrice}</p>
                        <p className="text-sm text-purple-400">Current: ${linkPrice.toFixed(2)}</p>
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                <div className="card-gradient p-6 rounded-xl border border-white/10">
                    <h4 className="font-bold text-white text-xl mb-4 flex items-center gap-2"><BarChart3/> Position Details</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-300">Collateral:</span><span className="font-mono">{parseFloat(position.collateralLINK).toFixed(4)} LINK</span></div>
                        <div className="flex justify-between"><span className="text-gray-300">Leverage:</span><span className="font-mono">{position.leverageRatio / 100}x</span></div>
                        <div className="flex justify-between"><span className="text-gray-300">Entry Price:</span><span className="font-mono">${parseFloat(position.entryPrice).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-300">Borrowed:</span><span className="font-mono">${parseFloat(position.borrowedUSDC).toFixed(2)} USDC</span></div>
                    </div>
                </div>
                <div className="card-gradient p-6 rounded-xl border border-white/10">
                    <h4 className="font-bold text-white text-xl mb-4 flex items-center gap-2"><Shield/> Pre-Auth Status</h4>
                    {stats && (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-300">Status:</span><span className={`font-bold ${stats.preAuthStatus === 'Active' ? 'text-green-300' : 'text-amber-300'}`}>{stats.preAuthStatus}</span></div>
                            <div className="flex justify-between"><span className="text-gray-300">Amount:</span><span className="font-mono">${parseFloat(position.preAuthAmount).toFixed(2)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-300">Time Remaining:</span><span className="font-mono">{stats.timeRemaining > 0 ? new Date(stats.timeRemaining * 1000).toISOString().substr(11, 8) : 'Expired'}</span></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8">
                <button 
                    onClick={handleClosePosition}
                    disabled={isClosing}
                    className="w-full btn-gradient-red text-white py-5 px-8 rounded-xl font-bold text-xl disabled:opacity-50 transition-all transform hover:scale-105 flex items-center justify-center gap-3"
                >
                    {isClosing ? (
                        <>
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            Closing Position...
                        </>
                    ) : (
                        'Close Position'
                    )}
                </button>
            </div>
        </div>
    );
}