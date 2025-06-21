// src/components/LoanDashboard.tsx
"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useRef,
} from "react";
import { Loan } from "@/types";
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Eye,
  Zap,
  X,
  CreditCard,
} from "lucide-react";
import { useLoanStatus } from "@/hooks/useLoan";
import { useContractOperations } from "@/hooks/useContract";
import { getLoanDetails } from "@/lib/contract";
import { ethers } from "ethers";

interface LoanDashboardProps {
  walletAddress: string;
}

interface LoanCardProps {
  loan: Loan;
  onRepay: (loanId: string) => void;
  isProcessing: boolean;
  loanInfo?: {
    lastUpdated?: number;
    isUpdating?: boolean;
  }; // For real-time status
}

interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

interface ToastProps {
  toast: ToastNotification;
  onClose: (id: string) => void;
}

// Toast component
function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getToastStyles = (type: string) => {
    switch (type) {
      case "success":
        return "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-200";
      case "error":
        return "border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-red-500/10 text-rose-200";
      case "info":
        return "border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-200";
      default:
        return "border-gray-500/30 bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-200";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} className="text-emerald-300" />;
      case "error":
        return <XCircle size={20} className="text-rose-300" />;
      case "info":
        return <AlertCircle size={20} className="text-blue-300" />;
      default:
        return <AlertCircle size={20} className="text-gray-300" />;
    }
  };

  return (
    <div
      className={`glassmorphism rounded-xl p-4 border ${getToastStyles(
        toast.type
      )} transform transition-all duration-300 animate-slide-in shadow-xl`}
    >
      <div className="flex items-start gap-3">
        {getIcon(toast.type)}
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm mb-1">
            {toast.title}
          </h4>
          <p className="text-xs leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// Toast container component
function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastNotification[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Real-time blockchain data display component with precise calculations
function BlockchainDataDisplay({ 
  value, 
  decimals = 4, 
  isUpdating = false,
  lastUpdated,
  loanCreatedAt,
  principalAmount,
  annualRate = 10,
  isRepaymentTotal = false
}: { 
  value: number; 
  decimals?: number; 
  isUpdating?: boolean;
  lastUpdated?: number;
  loanCreatedAt?: string;
  principalAmount?: number;
  annualRate?: number;
  isRepaymentTotal?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [hasUpdated, setHasUpdated] = useState(false);
  const [realTimeValue, setRealTimeValue] = useState(value);

  // Smooth transition to new values from blockchain
  useEffect(() => {
    if (Math.abs(value - displayValue) > 0.000001) {
      setDisplayValue(value);
      setHasUpdated(true);
      
      // Reset animation flag after transition
      const timer = setTimeout(() => setHasUpdated(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  // Precise real-time interest calculation
  useEffect(() => {
    if (!loanCreatedAt || !principalAmount || principalAmount <= 0) {
      setRealTimeValue(displayValue);
      return;
    }
    
    const calculatePreciseValue = () => {
      const now = Date.now();
      const createdTime = new Date(loanCreatedAt).getTime();
      const timeElapsedSeconds = Math.max(0, (now - createdTime) / 1000);
      
      // Calculate compound interest: A = P(1 + r/n)^(nt)
      // For more precise calculation, use continuous compounding for seconds
      const preciseInterest = principalAmount * (Math.exp((annualRate / 100) * (timeElapsedSeconds / (365 * 24 * 60 * 60))) - 1);
      
      let calculatedValue;
      if (isRepaymentTotal) {
        // For repayment total: principal + interest
        calculatedValue = principalAmount + preciseInterest;
      } else {
        // For interest only
        calculatedValue = preciseInterest;
      }
      
      // Ensure smooth one-directional updates: always use the higher value between current and calculated
      // This prevents fluctuation while ensuring values only increase over time
      const minValue = isRepaymentTotal ? principalAmount : 0;
      const newValue = Math.max(minValue, Math.max(realTimeValue, calculatedValue));
      
      // Only update if the new value is actually higher (prevents backward movement)
      if (newValue > realTimeValue || Math.abs(newValue - realTimeValue) < 0.000001) {
        setRealTimeValue(newValue);
      }
    };

    // Initial calculation
    calculatePreciseValue();

    // Update every second for smooth real-time display
    const interval = setInterval(calculatePreciseValue, 1000);

    return () => clearInterval(interval);
  }, [displayValue, loanCreatedAt, principalAmount, annualRate, isRepaymentTotal, realTimeValue]);

  // Handle blockchain data updates - only update if blockchain value is higher
  useEffect(() => {
    if (lastUpdated && displayValue > realTimeValue) {
      setRealTimeValue(displayValue);
    }
  }, [lastUpdated, displayValue, realTimeValue]);

  // Determine appropriate decimal places based on value magnitude
  const adaptiveDecimals = realTimeValue < 0.01 ? Math.max(decimals, 8) : 
                          realTimeValue < 0.1 ? Math.max(decimals, 6) : 
                          realTimeValue < 1 ? Math.max(decimals, 4) : decimals;

  return (
    <div className="relative">
      <span className={`font-mono text-white transition-all duration-300 ${
        hasUpdated ? 'text-green-300' : ''
      } ${isUpdating ? 'opacity-75' : ''}`}>
        ${realTimeValue.toFixed(adaptiveDecimals)}
      </span>
      {isUpdating && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
      )}
    </div>
  );
}

// Individual loan card component (memoized to prevent unnecessary re-renders)
const LoanCard = memo(
  function LoanCard({
    loan,
    onRepay,
    isProcessing,
    loanInfo,
  }: LoanCardProps) {
    const [showDetails, setShowDetails] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<string>("");

    // Simplified refs for countdown timer only
    const timeRemainingRef = useRef<string>("");

    // Simplified countdown timer update function
    const updateCountdown = useCallback(() => {
      if (!loan.preAuthExpiresAt) return;

      const now = Date.now();
      const expiry = new Date(loan.preAuthExpiresAt).getTime();
      const timeDiff = expiry - now;

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        // Only show seconds if less than 1 hour remaining
        const newTimeRemaining =
          days > 0
            ? `${days}d ${hours}h ${minutes}m`
            : hours > 0
            ? `${hours}h ${minutes}m`
            : `${minutes}m ${seconds}s`;

        // Only update if time display changes
        if (newTimeRemaining !== timeRemainingRef.current) {
          timeRemainingRef.current = newTimeRemaining;
          setTimeRemaining(newTimeRemaining);
        }
      } else {
        if (timeRemainingRef.current !== "EXPIRED") {
          timeRemainingRef.current = "EXPIRED";
          setTimeRemaining("EXPIRED");
        }
      }
    }, [loan.preAuthExpiresAt]);

    // Update countdown timer every second
    useEffect(() => {
      if (loan.status !== "active") return;

      // Initial update
      updateCountdown();

      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    }, [updateCountdown, loan.status]);

    const getStatusColor = (status: string) => {
      switch (status) {
        case "active":
          return "text-emerald-300 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/20 glassmorphism";
        case "repaid":
          return "text-cyan-300 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20 glassmorphism";
        case "defaulted":
          return "text-rose-300 bg-gradient-to-r from-rose-500/10 to-red-500/10 border-rose-500/20 glassmorphism";
        default:
          return "text-slate-300 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-slate-500/20 glassmorphism";
      }
    };

    const getStatusIcon = (status: string) => {
      switch (status) {
        case "active":
          return <Clock size={16} />;
        case "repaid":
          return <CheckCircle size={16} />;
        case "defaulted":
          return <XCircle size={16} />;
        default:
          return <AlertCircle size={16} />;
      }
    };

    const formatDate = (dateString: string) => {
      // Use stable UTC formatting to prevent hydration mismatches
      const date = new Date(dateString);
      return date.toISOString().replace("T", " ").substring(0, 19);
    };


    return (
      <div
        className="glassmorphism rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-xl"
        style={{ minHeight: "400px", willChange: "transform" }}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign size={22} className="text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-xl leading-tight">
                {loan.borrowAmountETH
                  ? `${loan.borrowAmountETH.toFixed(4)} ${loan.asset}`
                  : `${loan.borrowAmount.toLocaleString()} ${loan.asset}`}
              </h3>
              {loan.borrowAmountETH && (
                <div className="text-sm text-gray-300 space-y-0.5">
                  <p>≈ ${loan.borrowAmount.toLocaleString()} USD</p>
                  {loan.ethPriceAtCreation && (
                    <p className="text-xs text-gray-400">
                      ETH @ ${loan.ethPriceAtCreation.toLocaleString()}
                    </p>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-400 font-mono">
                Loan #{loan.id.slice(-8)}
              </p>
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${getStatusColor(
              loan.status
            )} shadow-sm`}
          >
            {getStatusIcon(loan.status)}
            <span className="text-sm font-semibold capitalize">
              {loan.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="glassmorphism rounded-xl p-4 border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-blue-400" />
              <p className="text-xs text-blue-200 font-medium">LTV Ratio</p>
            </div>
            <p className="text-lg font-bold text-white">{loan.ltvRatio}%</p>
          </div>
          <div className="glassmorphism rounded-xl p-4 border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-green-400" />
              <p className="text-xs text-green-200 font-medium">APY Rate</p>
            </div>
            <p className="text-lg font-bold text-white">{loan.interestRate}%</p>
          </div>
        </div>

        {loan.status === "active" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="glassmorphism rounded-xl p-4 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-amber-300" />
                  <span className="text-amber-100 text-sm font-bold">
                    Interest Accrued
                  </span>
                </div>
                <div className="text-xl font-bold">
                  <BlockchainDataDisplay 
                    value={loan.blockchainInterest || 0} 
                    decimals={4}
                    isUpdating={loanInfo?.isUpdating || false}
                    lastUpdated={loanInfo?.lastUpdated}
                    loanCreatedAt={loan.createdAt}
                    principalAmount={loan.borrowAmount}
                    annualRate={loan.interestRate}
                  />
                </div>
              </div>
              <div className="glassmorphism rounded-xl p-4 border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-violet-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={14} className="text-purple-300" />
                  <span className="text-purple-100 text-sm font-bold">
                    Total Repayment
                  </span>
                </div>
                <div className="text-xl font-bold">
                  <BlockchainDataDisplay 
                    value={loan.blockchainRepayAmount || loan.borrowAmount} 
                    decimals={2}
                    isUpdating={loanInfo?.isUpdating || false}
                    lastUpdated={loanInfo?.lastUpdated}
                    loanCreatedAt={loan.createdAt}
                    principalAmount={loan.borrowAmount}
                    annualRate={loan.interestRate}
                    isRepaymentTotal={true}
                  />
                </div>
              </div>
            </div>

            {loan.preAuthExpiresAt && (
              <div className="glassmorphism rounded-xl p-4 border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-blue-300" />
                    <div>
                      <p className="font-semibold text-blue-300 text-sm">
                        Time Remaining
                      </p>
                      <p className="font-bold text-white text-lg">
                        {timeRemaining}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1"></div>
                  <div className="flex items-center gap-3">
                    <div className="glassmorphism rounded-lg p-2 border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
                      <CreditCard size={18} className="text-blue-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-300 text-sm">
                        Pre-Auth Amount
                      </p>
                      <p className="font-bold text-white text-lg">
                        ${loan.preAuthAmount?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-1 glassmorphism text-white py-3 px-4 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
          >
            <Eye size={16} />
            {showDetails ? "Hide" : "Show"} Details
          </button>
        </div>

        {showDetails && (
          <div className="glassmorphism rounded-xl p-5 border border-white/10 bg-gradient-to-br from-black/20 to-gray-900/20 mb-6">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              Loan Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Created</p>
                <p className="text-white font-mono">
                  {formatDate(loan.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Pre-Auth ID</p>
                <p className="text-white font-mono break-all">
                  {loan.preAuthId.slice(0, 20)}...
                </p>
              </div>
              {loan.preAuthCreatedAt && (
                <div>
                  <p className="text-gray-400 mb-1">Pre-Auth Created</p>
                  <p className="text-white font-mono">
                    {formatDate(loan.preAuthCreatedAt)}
                  </p>
                </div>
              )}
              {loan.preAuthExpiresAt && (
                <div>
                  <p className="text-gray-400 mb-1">Pre-Auth Expires</p>
                  <p className="text-white font-mono">
                    {formatDate(loan.preAuthExpiresAt)}
                  </p>
                </div>
              )}
              {loan.repaidAt && (
                <div>
                  <p className="text-gray-400 mb-1">Repaid</p>
                  <p className="text-white font-mono">
                    {formatDate(loan.repaidAt)}
                  </p>
                </div>
              )}
              {loan.txHash && (
                <div className="col-span-2">
                  <p className="text-gray-400 mb-1">Transaction Hash</p>
                  <p className="text-white font-mono text-xs break-all">
                    {loan.txHash}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {loan.status === "active" && (
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onRepay(loan.id)}
              disabled={isProcessing}
              className="w-full glassmorphism border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 text-blue-300 hover:text-blue-200 py-4 px-6 rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              {isProcessing ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                <Zap size={18} />
              )}
              Repay Loan
            </button>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.loan.id === nextProps.loan.id &&
      prevProps.loan.status === nextProps.loan.status &&
      prevProps.loan.borrowAmount === nextProps.loan.borrowAmount &&
      prevProps.loan.interestRate === nextProps.loan.interestRate &&
      prevProps.loan.createdAt === nextProps.loan.createdAt &&
      prevProps.loan.preAuthExpiresAt === nextProps.loan.preAuthExpiresAt &&
      prevProps.loan.blockchainInterest === nextProps.loan.blockchainInterest &&
      prevProps.loan.blockchainRepayAmount === nextProps.loan.blockchainRepayAmount &&
      prevProps.isProcessing === nextProps.isProcessing &&
      prevProps.loanInfo?.lastUpdated === nextProps.loanInfo?.lastUpdated &&
      prevProps.loanInfo?.isUpdating === nextProps.loanInfo?.isUpdating
    );
  }
);


// Main dashboard component
export default function LoanDashboard({ walletAddress }: LoanDashboardProps) {
  const { loanInfo, loading: contractLoading, refetch, isRealTimeActive } = useLoanStatus();
  const { repayLoan } = useContractOperations();
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
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

  // Memoize loan data using blockchain details
  const loans: Loan[] = useMemo(() => {
    if (!loanInfo?.hasLoan || !detailedLoans.length) return [];

    return detailedLoans.map(({ loanId, details }) => {
      // Calculate ETH price from blockchain data: preAuthAmountUSD / borrowedETH / 2 (200% collateral)
      const borrowedETH = parseFloat(details.borrowedETH.toString()) / 1e18; // Convert from wei
      const preAuthAmountUSD = parseFloat(details.preAuthAmountUSD.toString());
      
      // ETH price calculation: preAuth amount represents 200% collateral, so actual ETH value is preAuth/2
      const ethPriceAtCreation = borrowedETH > 0 ? preAuthAmountUSD / (borrowedETH * 2) : 3500; // fallback to $3500
      
      // Fix blockchain value scaling for interest calculations
      // Interest is calculated in ETH wei, need to convert to USD
      const currentInterestETH = parseFloat(details.currentInterest.toString()) / 1e18;
      const currentInterestUSD = currentInterestETH * ethPriceAtCreation;
      
      // Total repay amount is in ETH wei, convert to USD
      const totalRepayAmountETH = parseFloat(details.totalRepayAmount.toString()) / 1e18;
      const totalRepayAmountUSD = totalRepayAmountETH * ethPriceAtCreation;
      
      // Calculate borrowed amount in USD (ETH amount * price)
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
        blockchainInterest: Math.max(0, currentInterestUSD), // Ensure non-negative
        blockchainRepayAmount: Math.max(borrowAmountUSD, totalRepayAmountUSD), // Ensure repay >= borrow
      };
    });
  }, [detailedLoans, walletAddress, loanInfo?.hasLoan]);


  const isLoading = contractLoading;

  // Toast management functions with stable ID generation
  const addToast = useCallback(
    (type: "success" | "error" | "info", title: string, message: string) => {
      const id = Math.random().toString(36).substring(2, 11); // Use stable random ID instead of Date.now()
      const newToast: ToastNotification = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

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
            {loans.filter((loan) => loan.status === "active").length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full"></div>
                  <h3 className="text-xl font-bold text-white">Active Loans</h3>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium border border-emerald-500/30">
                    {loans.filter((loan) => loan.status === "active").length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {loans
                    .filter((loan) => loan.status === "active")
                    .map((loan) => (
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

            {loans.filter((loan) => loan.status !== "active").length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 mb-4 mt-8">
                  <div className="w-2 h-8 bg-gradient-to-b from-gray-500 to-slate-600 rounded-full"></div>
                  <h3 className="text-xl font-bold text-white">
                    Completed Loans
                  </h3>
                  <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-full text-sm font-medium border border-gray-500/30">
                    {loans.filter((loan) => loan.status !== "active").length}
                  </span>
                </div>
                <div className="grid gap-4">
                  {loans
                    .filter((loan) => loan.status !== "active")
                    .map((loan) => (
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
