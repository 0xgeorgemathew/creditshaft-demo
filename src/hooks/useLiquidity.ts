import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getContract, getUserLPBalance } from '@/lib/contract';
import { useAccount } from 'wagmi';

export const useLPBalance = () => {
  const [balance, setBalance] = useState({ shares: '0', value: '0' });
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance({ shares: '0', value: '0' });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use address-based function (getMyLPBalance removed for contract size optimization)
      const lpBalance = await getUserLPBalance(address);
      
      setBalance({
        shares: lpBalance.shares,
        value: lpBalance.value
      });
    } catch (error) {
      console.error('Error fetching LP balance:', error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
  }, [address, fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
};

export const usePoolStats = () => {
  const [stats, setStats] = useState({
    totalLiquidity: '0',
    totalBorrowed: '0',
    available: '0',
    utilization: '0'
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const contract = getContract();
      const [totalLiq, totalBorr, available, utilization] = await contract.getPoolStats();
      
      setStats({
        totalLiquidity: ethers.utils.formatEther(totalLiq),
        totalBorrowed: ethers.utils.formatEther(totalBorr),
        available: ethers.utils.formatEther(available),
        utilization: (utilization.toNumber() / 100).toString()
      });
    } catch (error) {
      console.error('Error fetching pool stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
};