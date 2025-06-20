import React, { useState } from 'react';
import { useLPBalance, usePoolStats } from '@/hooks/useLiquidity';
import { useContractOperations } from '@/hooks/useContract';

export const SimpleLiquidityProvider: React.FC = () => {
  const { balance, loading: balanceLoading, refetch: refetchBalance } = useLPBalance();
  const { stats, loading: statsLoading } = usePoolStats();
  const { addLiquidity, removeLiquidity } = useContractOperations();
  const [lpAmount, setLpAmount] = useState('');
  const [removeShares, setRemoveShares] = useState('');

  const handleAddLiquidity = async () => {
    try {
      await addLiquidity(lpAmount);
      refetchBalance();
      setLpAmount('');
    } catch (error) {
      console.error('Failed to add liquidity:', error);
    }
  };

  const handleRemoveLiquidity = async () => {
    try {
      await removeLiquidity(removeShares);
      refetchBalance();
      setRemoveShares('');
    } catch (error) {
      console.error('Failed to remove liquidity:', error);
    }
  };

  if (balanceLoading || statsLoading) return <div>Loading...</div>;

  return (
    <div className="glassmorphism rounded-2xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-6">Liquidity Provider</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="glassmorphism rounded-xl p-4 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">Pool Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Liquidity:</span>
                <span className="text-white">{stats.totalLiquidity} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Borrowed:</span>
                <span className="text-white">{stats.totalBorrowed} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Available:</span>
                <span className="text-white">{stats.available} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Utilization:</span>
                <span className="text-white">{stats.utilization}%</span>
              </div>
            </div>
          </div>

          <div className="glassmorphism rounded-xl p-4 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">Your Position</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">LP Shares:</span>
                <span className="text-white">{balance.shares}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">ETH Value:</span>
                <span className="text-white">{balance.value} ETH</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glassmorphism rounded-xl p-4 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">Add Liquidity</h3>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="ETH Amount"
                value={lpAmount}
                onChange={(e) => setLpAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              />
              <button
                onClick={handleAddLiquidity}
                className="w-full btn-gradient py-2 px-4 rounded-lg font-semibold text-white"
              >
                Add Liquidity
              </button>
            </div>
          </div>

          <div className="glassmorphism rounded-xl p-4 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">Remove Liquidity</h3>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Shares to Remove"
                value={removeShares}
                onChange={(e) => setRemoveShares(e.target.value)}
                max={balance.shares}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
              />
              <button
                onClick={handleRemoveLiquidity}
                className="w-full btn-gradient py-2 px-4 rounded-lg font-semibold text-white"
              >
                Remove Liquidity
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};