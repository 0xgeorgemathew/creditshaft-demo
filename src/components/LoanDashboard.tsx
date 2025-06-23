// src/components/LoanDashboard.tsx
"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Loan } from "@/types";
import {
  DollarSign,
  Loader,
} from "lucide-react";
import { useLoanStatus } from "@/hooks/useLoan";
import { useContractOperations } from "@/hooks/useContract";
import { getLoanDetails } from "@/lib/contract";
import { ethers } from "ethers";
import { useToast } from "@/hooks/useToast";
import { LoanCard } from "@/components/loan/LoanCard";
import { ToastContainer } from "@/components/loan/ToastSystem";

interface LoanDashboardProps {
  walletAddress: string;
}



// Main dashboard component
export default function LoanDashboard({ walletAddress }: LoanDashboardProps) {
  const { loanInfo, loading: contractLoading, refetch, isRealTimeActive } = useLoanStatus();
  const { repayLoan } = useContractOperations();
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [detailedLoans, setDetailedLoans] = useState<Array<{
    loanId: string;
    details: {
      borrower: string;
      borrowedETH: ethers.BigNumber;
      preAuthAmountUSD: ethers.BigNumber;
      currentInterest: ethers.BigNumber;
      totalRepayAmount: ethers.BigNumber;
      createdAt: ethers.BigNumber;
      preAuthExpiry: ethers.BigNumber;
      isActive: boolean;
      isExpired: boolean;
    };
  }>>([]);

  // Fetch detailed loan data from blockchain
  useEffect(() => {
    async function fetchDetailedLoans() {
      if (!loanInfo?.hasLoan || !loanInfo.loanIds) {
        setDetailedLoans([]);
        return;
      }

      try {
        const detailsPromises = loanInfo.loanIds.map(async (loanId) => {
          const details = await getLoanDetails(loanId);
          return {
            loanId,
            details
          };
        });

        const results = await Promise.all(detailsPromises);
        setDetailedLoans(results);
      } catch (error) {
        console.error('Error fetching detailed loan data:', error);
        setDetailedLoans([]);
      }
    }

    fetchDetailedLoans();
  }, [loanInfo?.loanIds, loanInfo?.hasLoan]);

  // Memoize loan data with optimized calculations
  const loans: Loan[] = useMemo(() => {
    if (!loanInfo?.hasLoan || !detailedLoans.length) return [];

    return detailedLoans.map(({ loanId, details }) => {
      // Optimized calculations with memoized conversions
      const borrowedETH = parseFloat(details.borrowedETH.toString()) / 1e18;
      const preAuthAmountUSD = parseFloat(details.preAuthAmountUSD.toString());
      const ethPriceAtCreation = borrowedETH > 0 ? preAuthAmountUSD / (borrowedETH * 2) : 3500;
      
      const currentInterestETH = parseFloat(details.currentInterest.toString()) / 1e18;
      const currentInterestUSD = currentInterestETH * ethPriceAtCreation;
      
      const totalRepayAmountETH = parseFloat(details.totalRepayAmount.toString()) / 1e18;
      const totalRepayAmountUSD = totalRepayAmountETH * ethPriceAtCreation;
      const borrowAmountUSD = borrowedETH * ethPriceAtCreation;

      return {
        id: loanId,
        preAuthId: "contract_preauth",
        walletAddress,
        customerId: "",
        paymentMethodId: "",
        borrowAmount: borrowAmountUSD,
        borrowAmountETH: borrowedETH,
        ethPriceAtCreation: ethPriceAtCreation,
        asset: "ETH",
        interestRate: 10,
        ltvRatio: 50,
        originalCreditLimit: 5000,
        preAuthAmount: preAuthAmountUSD,
        status: !details.isActive ? "repaid" : (details.isExpired ? "defaulted" : "active"),
        createdAt: new Date(details.createdAt.toNumber() * 1000).toISOString(),
        preAuthCreatedAt: new Date(details.createdAt.toNumber() * 1000).toISOString(),
        preAuthExpiresAt: new Date(details.preAuthExpiry.toNumber() * 1000).toISOString(),
        txHash: "",
        blockchainInterest: Math.max(0, currentInterestUSD),
        blockchainRepayAmount: Math.max(borrowAmountUSD, totalRepayAmountUSD),
      };
    });
  }, [detailedLoans, walletAddress, loanInfo?.hasLoan]);

  // Memoize loan categories for better performance
  const { activeLoans, completedLoans } = useMemo(() => {
    const active = loans.filter((loan) => loan.status === "active");
    const completed = loans.filter((loan) => loan.status !== "active");
    return { activeLoans: active, completedLoans: completed };
  }, [loans]);


  const isLoading = contractLoading;

  // Debounced refresh function to prevent repeated calls
  const debouncedRefetch = useCallback(() => {
    if (isRefreshing) return; // Prevent multiple simultaneous calls
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    setIsRefreshing(true);
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        await refetch();
      } finally {
        setIsRefreshing(false);
        refreshTimeoutRef.current = null;
      }
    }, 300); // 300ms debounce
  }, [refetch, isRefreshing]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const handleRepay = useCallback(
    async (loanId: string) => {
      addToast(
        "info",
        "Processing...",
        "Repaying loan on blockchain."
      );

      setProcessingLoanId(loanId);
      try {
        // Repay the specific loan on blockchain
        const receipt = await repayLoan(loanId);

        addToast(
          "success",
          "Loan Repaid Successfully!",
          `Loan ID: ${loanId.substring(
            0,
            8
          )}... Transaction: ${receipt.transactionHash.substring(
            0,
            10
          )}...`
        );

        await refetch(); // Refresh blockchain data
      } catch (error) {
        addToast(
          "error",
          "Repayment Failed",
          (error as Error).message ||
            "Failed to repay the loan. Please try again."
        );
      } finally {
        setProcessingLoanId(null);
      }
    },
    [addToast, repayLoan, refetch]
  );


  useEffect(() => {
    if (walletAddress) {
      debouncedRefetch();
    }
  }, [walletAddress, debouncedRefetch]);

  if (isLoading && loans.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign size={32} className="text-blue-400" />
            <h2 className="text-3xl font-bold gradient-text">
              Loan Management
            </h2>
          </div>
          <div className="animate-pulse bg-white/10 rounded-lg h-10 w-20"></div>
        </div>

        <div className="glassmorphism rounded-2xl p-8 border border-white/20">
          <div className="flex items-center justify-center">
            <Loader className="animate-spin text-blue-400" size={32} />
            <span className="ml-3 text-white">Loading your loans...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <DollarSign size={32} className="text-blue-400" />
            <h2 className="text-3xl font-bold gradient-text">
              Loan Management
            </h2>
            {isRealTimeActive && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-300 text-sm font-medium">Live Updates</span>
              </div>
            )}
          </div>
        </div>

        {loans.length === 0 ? (
          <div className="glassmorphism rounded-2xl p-12 text-center border border-white/20 bg-gradient-to-br from-slate-900/40 to-gray-900/40">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
              <DollarSign className="text-blue-400" size={36} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 gradient-text">
              No Active Loans
            </h3>
            <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
              You haven&apos;t created any loans yet. Start borrowing against your
              credit card to see them here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeLoans.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full"></div>
                  <h3 className="text-xl font-bold text-white">Active Loans</h3>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium border border-emerald-500/30">
                    {activeLoans.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {activeLoans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onRepay={handleRepay}
                      isProcessing={processingLoanId === loan.id}
                      loanInfo={loanInfo ? {
                        lastUpdated: loanInfo.lastUpdated,
                        isUpdating: loanInfo.isUpdating
                      } : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedLoans.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-4 mt-8">
                  <div className="w-2 h-8 bg-gradient-to-b from-gray-500 to-slate-600 rounded-full"></div>
                  <h3 className="text-xl font-bold text-white">
                    Completed Loans
                  </h3>
                  <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-full text-sm font-medium border border-gray-500/30">
                    {completedLoans.length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {completedLoans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onRepay={handleRepay}
                      isProcessing={processingLoanId === loan.id}
                      loanInfo={loanInfo ? {
                        lastUpdated: loanInfo.lastUpdated,
                        isUpdating: loanInfo.isUpdating
                      } : undefined}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
