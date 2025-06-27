import { useState, useEffect, useCallback } from 'react';
import { openLeveragePosition, closeLeveragePosition, addLiquidity, removeLiquidity, getErrorMessage, getUserLPBalance } from '@/lib/contract';
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
      // In demo mode, update local storage
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        const currentBalance = parseFloat(localStorage.getItem('demo_lp_balance') || '1.2500');
        const newBalance = currentBalance + parseFloat(amount);
        localStorage.setItem('demo_lp_balance', newBalance.toString());
        // Return mock receipt
        return { transactionHash: '0x1234567890abcdef...' };
      }
      
      const receipt = await addLiquidity(amount);
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
      // In demo mode, update local storage
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        const currentBalance = parseFloat(localStorage.getItem('demo_lp_balance') || '1.2500');
        const newBalance = Math.max(0, currentBalance - parseFloat(shares));
        localStorage.setItem('demo_lp_balance', newBalance.toString());
        // Return mock receipt
        return { transactionHash: '0x1234567890abcdef...' };
      }
      
      const receipt = await removeLiquidity(shares);
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
      // For demo mode, simulate some LP balance
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        // Simulate user having some LP tokens
        const mockLPBalance = localStorage.getItem('demo_lp_balance') || '1.2500';
        setLpValue(mockLPBalance);
      } else if (address) {
        // Use address-based contract function (getMyLPBalance removed for size optimization)
        const lpBalance = await getUserLPBalance(address);
        setLpValue(lpBalance.value);
      } else {
        setLpValue("0");
      }
    } catch (error) {
      console.error("Error fetching LP value:", error);
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

