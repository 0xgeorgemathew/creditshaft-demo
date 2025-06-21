import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { getContract, getActiveLoansForUser, getLoanDetails, hasActiveLoan } from '@/lib/contract';
import { useAccount } from 'wagmi';

interface LoanInfo {
  hasLoan: boolean;
  principal: string;
  interest: string;
  total: string;
  expired: boolean;
  repayAmount: string;
  // New fields for multiple loans
  loanId?: string;
  loanIds?: string[];
  activeLoanCount?: number;
  // Real-time update tracking
  lastUpdated?: number;
  isUpdating?: boolean;
}

export const useLoanStatus = () => {
  const [loanInfo, setLoanInfo] = useState<LoanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();
  
  // Real-time polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const lastPollingTimeRef = useRef(0);

  const fetchLoanStatus = useCallback(async (isBackgroundUpdate = false) => {
    if (!address) {
      setLoanInfo({
        hasLoan: false,
        principal: '0',
        interest: '0',
        total: '0',
        expired: false,
        repayAmount: '0',
        loanIds: [],
        activeLoanCount: 0,
        lastUpdated: Date.now(),
        isUpdating: false
      });
      setLoading(false);
      return;
    }

    // Prevent concurrent polling requests
    if (isBackgroundUpdate && isPollingRef.current) {
      return;
    }

    // Rate limiting: minimum 5 seconds between requests
    const now = Date.now();
    if (isBackgroundUpdate && (now - lastPollingTimeRef.current) < 5000) {
      return;
    }

    try {
      if (!isBackgroundUpdate) {
        setLoading(true);
      } else {
        // Set updating flag for background updates
        setLoanInfo(prev => prev ? { ...prev, isUpdating: true } : null);
        isPollingRef.current = true;
      }
      
      lastPollingTimeRef.current = now;
      
      // Use address-based contract functions (convenience functions removed for size optimization)
      const hasLoan = await hasActiveLoan(address);
      
      if (hasLoan) {
        // Get active loans for current user
        const { activeLoans, count } = await getActiveLoansForUser(address);
        
        if (activeLoans.length > 0) {
          // Get details for the first active loan (for backward compatibility)
          const firstLoanId = activeLoans[0];
          const contract = getContract();
          const repayAmount = await contract.getRepayAmount(ethers.BigNumber.from(firstLoanId));
          const loanDetails = await getLoanDetails(firstLoanId);
          
          setLoanInfo({
            hasLoan: true,
            principal: ethers.utils.formatEther(loanDetails.borrowedETH),
            interest: ethers.utils.formatEther(loanDetails.currentInterest),
            total: ethers.utils.formatEther(loanDetails.totalRepayAmount),
            expired: loanDetails.isExpired,
            repayAmount: ethers.utils.formatEther(repayAmount),
            loanId: firstLoanId,
            loanIds: activeLoans,
            activeLoanCount: count,
            lastUpdated: Date.now(),
            isUpdating: false
          });
        } else {
          // Edge case: hasLoan true but no active loans found
          setLoanInfo({
            hasLoan: false,
            principal: '0',
            interest: '0',
            total: '0',
            expired: false,
            repayAmount: '0',
            loanIds: [],
            activeLoanCount: 0,
            lastUpdated: Date.now(),
            isUpdating: false
          });
        }
      } else {
        setLoanInfo({
          hasLoan: false,
          principal: '0',
          interest: '0',
          total: '0',
          expired: false,
          repayAmount: '0',
          loanIds: [],
          activeLoanCount: 0,
          lastUpdated: Date.now(),
          isUpdating: false
        });
      }
    } catch (error) {
      console.error('Error fetching loan status:', error);
      // Set default state on error
      setLoanInfo({
        hasLoan: false,
        principal: '0',
        interest: '0',
        total: '0',
        expired: false,
        repayAmount: '0',
        loanIds: [],
        activeLoanCount: 0,
        lastUpdated: Date.now(),
        isUpdating: false
      });
    } finally {
      setLoading(false);
      isPollingRef.current = false;
    }
  }, [address]);

  // Start/stop real-time polling based on active loans
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling
    
    pollingIntervalRef.current = setInterval(() => {
      fetchLoanStatus(true); // Background update
    }, 12000); // Poll every 12 seconds
    
    console.log('Started real-time polling for loan updates');
  }, [fetchLoanStatus]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('Stopped real-time polling');
    }
  }, []);

  // Initial fetch and polling setup
  useEffect(() => {
    // Add debouncing to prevent rapid refetches
    const timeoutId = setTimeout(() => {
      fetchLoanStatus();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [address, fetchLoanStatus]);

  // Start/stop polling based on loan status
  useEffect(() => {
    if (loanInfo?.hasLoan && loanInfo.activeLoanCount! > 0) {
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup on unmount
    return stopPolling;
  }, [loanInfo?.hasLoan, loanInfo?.activeLoanCount, startPolling, stopPolling]);

  return { 
    loanInfo, 
    loading, 
    refetch: () => fetchLoanStatus(false),
    isRealTimeActive: pollingIntervalRef.current !== null
  };
};