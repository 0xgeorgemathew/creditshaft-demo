import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContract, getMyActiveLoans, getLoanDetails, doIHaveActiveLoan } from '@/lib/contract';

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
}

export const useLoanStatus = () => {
  const [loanInfo, setLoanInfo] = useState<LoanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLoanStatus = async () => {
    try {
      setLoading(true);
      
      // Use new contract functions
      const hasLoan = await doIHaveActiveLoan();
      
      if (hasLoan) {
        // Get active loans for current user
        const { activeLoans, count } = await getMyActiveLoans();
        
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
            activeLoanCount: count
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
            activeLoanCount: 0
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
          activeLoanCount: 0
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
        activeLoanCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanStatus();
  }, []);

  return { loanInfo, loading, refetch: fetchLoanStatus };
};