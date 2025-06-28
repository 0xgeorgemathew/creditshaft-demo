import { useState, useEffect, useCallback } from 'react';
import { 
  openLeveragePosition, 
  closeLeveragePosition, 
  addUSDCLiquidity, 
  removeUSDCLiquidity, 
  borrowMoreUSDC,
  getErrorMessage, 
  getUserUSDCLPBalance,
  getUserUSDCBalance
} from '@/lib/contract';
import { useAccount } from 'wagmi';


// Simplified contract operations hook
export const useContractOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenLeveragePosition = async (params: {
    leverageRatio: number;
    collateralLINK: string;
    expiryDuration: number;
    stripePaymentIntentId: string;
    stripeCustomerId: string;
    stripePaymentMethodId: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const receipt = await openLeveragePosition(params);
      return receipt;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseLeveragePosition = async () => {
    setLoading(true);
    setError(null);

    try {
      const receipt = await closeLeveragePosition();
      return receipt;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async (amount: string) => {
    setLoading(true);
    setError(null);

    try {
      const receipt = await addUSDCLiquidity(amount);
      return receipt;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async (shares: string) => {
    setLoading(true);
    setError(null);

    try {
      const receipt = await removeUSDCLiquidity(shares);
      return receipt;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrowMoreUSDC = async (additionalAmount: string) => {
    setLoading(true);
    setError(null);

    try {
      const receipt = await borrowMoreUSDC(additionalAmount);
      return receipt;
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    openLeveragePosition: handleOpenLeveragePosition,
    closeLeveragePosition: handleCloseLeveragePosition,
    addLiquidity: handleAddLiquidity,
    removeLiquidity: handleRemoveLiquidity,
    borrowMoreUSDC: handleBorrowMoreUSDC,
    loading,
    error
  };
};

// Simple LP value hook for compatibility
export const useLPValue = () => {
  const [lpValue, setLpValue] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  const fetchLPValue = useCallback(async () => {
    try {
      setLoading(true);
      if (address) {
        // Get user's USDC LP token balance
        const lpBalance = await getUserUSDCLPBalance(address);
        setLpValue(lpBalance.balance);
      } else {
        setLpValue("0");
      }
    } catch (error) {
      console.error("Error fetching USDC LP value:", error);
      setLpValue("0");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchLPValue();
  }, [address, fetchLPValue]);

  return { lpValue, loading, refetch: fetchLPValue };
};

// Hook for USDC wallet balance
export const useUSDCBalance = () => {
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  const fetchUSDCBalance = useCallback(async () => {
    try {
      setLoading(true);
      if (address) {
        // Get user's USDC wallet balance
        const balance = await getUserUSDCBalance(address);
        setUsdcBalance(balance.balance);
      } else {
        setUsdcBalance("0");
      }
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
      setUsdcBalance("0");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchUSDCBalance();
  }, [address, fetchUSDCBalance]);

  return { usdcBalance, loading, refetch: fetchUSDCBalance };
};

