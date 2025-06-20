import { useState, useEffect } from 'react';
import { borrowETH, repayLoan, addLiquidity, removeLiquidity, getErrorMessage, getMyLPBalance } from '@/lib/contract';


// Simplified contract operations hook
export const useContractOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBorrowETH = async (params: {
    preAuthAmountUSD: number;
    preAuthDurationMinutes: number;
    stripePaymentIntentId: string;
    stripeCustomerId: string;
    stripePaymentMethodId: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const receipt = await borrowETH(params);
      return receipt;
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRepayLoan = async (loanId: string) => {
    setLoading(true);
    setError(null);

    if (!loanId) {
      const errorMessage = "Loan ID is required for repayment";
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    try {
      const receipt = await repayLoan(loanId);
      return receipt;
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    borrowETH: handleBorrowETH,
    repayLoan: handleRepayLoan,
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

  const fetchLPValue = async () => {
    try {
      setLoading(true);
      // For demo mode, simulate some LP balance
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        // Simulate user having some LP tokens
        const mockLPBalance = localStorage.getItem('demo_lp_balance') || '1.2500';
        setLpValue(mockLPBalance);
      } else {
        // Use new contract function
        const lpBalance = await getMyLPBalance();
        setLpValue(lpBalance.value);
      }
    } catch (error) {
      console.error("Error fetching LP value:", error);
      setLpValue("0");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLPValue();
  }, []);

  return { lpValue, loading, refetch: fetchLPValue };
};

