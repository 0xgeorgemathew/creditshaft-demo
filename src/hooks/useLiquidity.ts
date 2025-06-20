import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract } from '@/lib/contract';

export const useLPBalance = () => {
  const [balance, setBalance] = useState({ shares: '0', value: '0' });
  const [loading, setLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const contract = getContract();
      const [shares, value] = await contract.getMyLPBalance();
      
      setBalance({
        shares: ethers.utils.formatEther(shares),
        value: ethers.utils.formatEther(value)
      });
    } catch (error) {
      console.error('Error fetching LP balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

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