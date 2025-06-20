/* eslint-disable react/no-unescaped-entities */
// src/components/LoanDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { Loan, CreditSummary } from "@/types";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
  Eye,
  Zap,
  Shield,
  RefreshCw,
  X,
} from "lucide-react";
import { useLoanStatus } from "@/hooks/useLoan";
import { useContractOperations } from "@/hooks/useContract";

interface LoanDashboardProps {
  walletAddress: string;
}

interface LoanCardProps {
  loan: Loan;
  onCharge: (loanId: string) => void;
  onRelease: (loanId: string) => void;
  isProcessing: boolean;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
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
      case 'success':
        return 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-200';
      case 'error':
        return 'border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-red-500/10 text-rose-200';
      case 'info':
        return 'border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-200';
      default:
        return 'border-gray-500/30 bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-200';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-emerald-300" />;
      case 'error':
        return <XCircle size={20} className="text-rose-300" />;
      case 'info':
        return <AlertCircle size={20} className="text-blue-300" />;
      default:
        return <AlertCircle size={20} className="text-gray-300" />;
    }
  };

  return (
    <div className={`glassmorphism rounded-xl p-4 border ${getToastStyles(toast.type)} transform transition-all duration-300 animate-slide-in shadow-xl`}>
      <div className="flex items-start gap-3">
        {getIcon(toast.type)}
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm mb-1">{toast.title}</h4>
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
function ToastContainer({ toasts, onClose }: { toasts: ToastNotification[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// Individual loan card component
function LoanCard({ loan, onCharge, onRelease, isProcessing }: LoanCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [currentInterest, setCurrentInterest] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Calculate real-time countdown and interest
  useEffect(() => {
    if (loan.status === "active") {
      // Pre-calculate constants to avoid repeated calculations
      const annualRate = loan.interestRate / 100;
      const secondlyRate = annualRate / (365 * 24 * 60 * 60);
      const createdTime = new Date(loan.createdAt).getTime();
      
      const updateRealTimeData = () => {
        if (isUpdating) return; // Prevent overlapping updates
        
        setIsUpdating(true);
        const now = Date.now();

        // Calculate precise time elapsed since loan creation in milliseconds
        const timeElapsedMs = now - createdTime;
        const timeElapsedSeconds = timeElapsedMs / 1000;

        // Calculate real-time accrued interest with pre-calculated rate
        const realTimeInterest = loan.borrowAmount * secondlyRate * timeElapsedSeconds;
        
        // Only update if there's a meaningful change (reduce re-renders)
        if (Math.abs(realTimeInterest - currentInterest) > 0.01) {
          setCurrentInterest(realTimeInterest);
        }

        // Update countdown timer if expiry date exists
        if (loan.preAuthExpiresAt) {
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

            const newTimeRemaining = days > 0 
              ? `${days}d ${hours}h ${minutes}m`
              : hours > 0 
              ? `${hours}h ${minutes}m`
              : minutes > 0 
              ? `${minutes}m ${seconds}s`
              : `${seconds}s`;

            // Only update if time display changes
            if (newTimeRemaining !== timeRemaining) {
              setTimeRemaining(newTimeRemaining);
            }

            // Simplified progress calculation as percentage of time REMAINING
            let progress = 0;
            const startTime = loan.preAuthCreatedAt 
              ? new Date(loan.preAuthCreatedAt).getTime()
              : createdTime;
            const totalDuration = expiry - startTime;

            if (totalDuration > 0 && timeDiff > 0) {
              progress = (timeDiff / totalDuration) * 100;
              progress = Math.max(Math.min(progress, 99.99), 0.01);
            } else if (timeDiff <= 0) {
              progress = 100;
            }

            // Only update progress if it changed by more than 1%
            if (Math.abs(progress - progressPercentage) > 1) {
              setProgressPercentage(progress);
            }
          } else {
            if (timeRemaining !== "EXPIRED") {
              setTimeRemaining("EXPIRED");
              setProgressPercentage(100);
            }
          }
        }
        
        setTimeout(() => setIsUpdating(false), 100);
      };

      // Update immediately
      updateRealTimeData();

      // Update every 10000ms (10 seconds) to reduce stuttering
      const interval = setInterval(updateRealTimeData, 10000);

      return () => clearInterval(interval);
    }
  }, [
    loan.status,
    loan.preAuthExpiresAt,
    loan.preAuthCreatedAt,
    loan.createdAt,
    loan.borrowAmount,
    loan.interestRate,
    // Exclude frequently changing values to prevent constant re-renders
    // currentInterest, progressPercentage, timeRemaining, isUpdating
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-300 bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-500/20 glassmorphism";
      case "charged":
        return "text-rose-300 bg-gradient-to-r from-rose-500/10 to-red-500/10 border-rose-500/20 glassmorphism";
      case "released":
        return "text-cyan-300 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/20 glassmorphism";
      default:
        return "text-slate-300 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-slate-500/20 glassmorphism";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock size={16} />;
      case "charged":
        return <XCircle size={16} />;
      case "released":
        return <CheckCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const formatDate = (dateString: string) => {
    // Use stable UTC formatting to prevent hydration mismatches
    const date = new Date(dateString);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  };

  // Use stable calculation that doesn't depend on current time during render
  const [daysActive, setDaysActive] = useState(0);
  
  useEffect(() => {
    const calculateDaysActive = () => {
      const now = new Date().getTime();
      const created = new Date(loan.createdAt).getTime();
      return Math.floor((now - created) / (1000 * 60 * 60 * 24));
    };
    
    setDaysActive(calculateDaysActive());
    
    // Update every 5 minutes to reduce re-renders
    const interval = setInterval(() => {
      setDaysActive(calculateDaysActive());
    }, 300000);
    
    return () => clearInterval(interval);
  }, [loan.createdAt]);

  const dailyInterest = (loan.borrowAmount * (loan.interestRate / 100)) / 365; // Interest calculated on USD value
  const secondlyInterest = dailyInterest / (24 * 60 * 60); // Interest per second for display

  return (
    <div className="glassmorphism rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 shadow-lg hover:shadow-xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <DollarSign size={22} className="text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-white text-xl leading-tight">
              {loan.borrowAmountETH ? `${loan.borrowAmountETH.toFixed(4)} ${loan.asset}` : `${loan.borrowAmount.toLocaleString()} ${loan.asset}`}
            </h3>
            {loan.borrowAmountETH && (
              <div className="text-sm text-gray-300 space-y-0.5">
                <p>≈ ${loan.borrowAmount.toLocaleString()} USD</p>
                {loan.ethPriceAtCreation && (
                  <p className="text-xs text-gray-400">ETH @ ${loan.ethPriceAtCreation.toLocaleString()}</p>
                )}
              </div>
            )}
            <p className="text-sm text-gray-400 font-mono">Loan #{loan.id.slice(-8)}</p>
          </div>
        </div>

        <div
          className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${getStatusColor(
            loan.status
          )} shadow-sm`}
        >
          {getStatusIcon(loan.status)}
          <span className="text-sm font-semibold capitalize">{loan.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="glassmorphism rounded-xl p-4 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 hover:border-yellow-500/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <DollarSign size={14} className="text-yellow-400" />
            </div>
            <p className="text-xs text-yellow-200 font-medium">Collateral</p>
          </div>
          <p className="text-lg font-bold text-white">
            ${loan.preAuthAmount.toLocaleString()}
          </p>
        </div>
        <div className="glassmorphism rounded-xl p-4 border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:border-blue-500/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp size={14} className="text-blue-400" />
            </div>
            <p className="text-xs text-blue-200 font-medium">LTV Ratio</p>
          </div>
          <p className="text-lg font-bold text-white">{loan.ltvRatio}%</p>
        </div>
        <div className="glassmorphism rounded-xl p-4 border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:border-green-500/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-green-400" />
            </div>
            <p className="text-xs text-green-200 font-medium">APY Rate</p>
          </div>
          <p className="text-lg font-bold text-white">
            {loan.interestRate}%
          </p>
        </div>
        <div className="glassmorphism rounded-xl p-4 border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-violet-500/10 hover:border-purple-500/30 transition-all">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Clock size={14} className="text-purple-400" />
            </div>
            <p className="text-xs text-purple-200 font-medium">Days Active</p>
          </div>
          <p className="text-lg font-bold text-white">{daysActive}</p>
        </div>
      </div>

      {loan.status === "active" && (
        <>
          <div className="glassmorphism rounded-xl p-5 mb-6 border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-amber-300 animate-pulse" />
              </div>
              <span className="text-amber-100 text-lg font-bold">
                Interest Accrued
              </span>
              <span className="px-2 py-1 bg-amber-500/20 text-amber-200 rounded-full text-xs font-medium">
                REAL-TIME
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-white text-2xl font-mono font-bold min-w-[140px]">
                    ${currentInterest.toFixed(6)}
                  </p>
                  <p className="text-amber-200 text-sm min-w-[120px]">
                    +${secondlyInterest.toFixed(8)}/second
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-amber-200 text-sm">Daily Rate</p>
                  <p className="text-white font-semibold">${dailyInterest.toFixed(4)}</p>
                </div>
              </div>
              <div className="w-full h-1 bg-amber-900/30 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 w-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Time Remaining Display - Clean Style */}
          {loan.preAuthExpiresAt && (
            <div
              className={`flex items-start gap-3 p-4 rounded-xl border mb-4 ${
                progressPercentage < 20
                  ? "text-red-300 bg-red-500/10 border-red-500/30"
                  : progressPercentage < 50
                  ? "text-orange-300 bg-orange-500/10 border-orange-500/30"
                  : timeRemaining === "EXPIRED"
                  ? "text-red-300 bg-red-500/10 border-red-500/30"
                  : "text-blue-300 bg-blue-500/10 border-blue-500/30"
              }`}
            >
              <Clock size={20} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold flex items-center gap-2 mb-2">
                  Time Remaining
                  <span
                    className={`px-2 py-1 rounded text-xs font-mono ${
                      progressPercentage < 20
                        ? "bg-red-500/20 text-red-200"
                        : progressPercentage < 50
                        ? "bg-orange-500/20 text-orange-200"
                        : timeRemaining === "EXPIRED"
                        ? "bg-red-500/20 text-red-200"
                        : "bg-blue-500/20 text-blue-200"
                    }`}
                  >
                    {timeRemaining === "EXPIRED" ? "EXPIRED" : timeRemaining}
                  </span>
                </p>
                <p className="text-sm mb-3">
                  {timeRemaining === "EXPIRED" 
                    ? "Pre-authorization has expired. Loan may be liquidated."
                    : "Automated charge protection active until expiry"}
                </p>
                <div className="glassmorphism rounded-lg p-3 border border-white/10 bg-white/5">
                  <div className="flex items-start gap-2">
                    <CreditCard size={14} className="text-blue-300 mt-0.5 flex-shrink-0" />
                    <p className="text-xs leading-relaxed opacity-90">
                      Your credit card will be charged automatically before expiry. 
                      Repay early to cancel the automation and release the hold.
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
            {loan.chargedAt && (
              <div>
                <p className="text-gray-400 mb-1">Charged</p>
                <p className="text-white font-mono">
                  {formatDate(loan.chargedAt)}
                </p>
              </div>
            )}
            {loan.releasedAt && (
              <div>
                <p className="text-gray-400 mb-1">Released</p>
                <p className="text-white font-mono">
                  {formatDate(loan.releasedAt)}
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
            onClick={() => onCharge(loan.id)}
            disabled={isProcessing}
            className="flex-1 glassmorphism border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 text-blue-300 hover:text-blue-200 py-4 px-6 rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
          >
            {isProcessing ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <Zap size={18} />
            )}
            Repay Loan
          </button>
          <button
            onClick={() => onRelease(loan.id)}
            disabled={isProcessing}
            className="flex-1 glassmorphism border border-green-500/30 bg-gradient-to-r from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 text-green-300 hover:text-green-200 py-4 px-6 rounded-xl font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
          >
            {isProcessing ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <Shield size={18} />
            )}
            Release Loan
          </button>
        </div>
      )}
    </div>
  );
}

// Credit summary component
function CreditSummaryCard({
  summary,
  isLoading,
}: {
  summary: CreditSummary | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="glassmorphism rounded-xl p-6 border border-white/20">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/20 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-white/10 rounded"></div>
            <div className="h-16 bg-white/10 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="glassmorphism rounded-xl p-6 border border-white/20 hover:border-white/30 transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-blue-500 rounded-lg flex items-center justify-center">
          <CreditCard size={20} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-white">Credit Summary</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glassmorphism rounded-lg p-4 border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-blue-500/10 hover:border-sky-500/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} className="text-sky-400" />
            <p className="text-sky-300 text-sm">Total Credit</p>
          </div>
          <p className="text-white text-lg font-bold">
            ${summary.totalCreditLimit.toLocaleString()}
          </p>
        </div>

        <div className="glassmorphism rounded-lg p-4 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-green-500/10 hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={16} className="text-emerald-400" />
            <p className="text-emerald-300 text-sm">Available</p>
          </div>
          <p className="text-white text-lg font-bold">
            ${summary.availableCredit.toLocaleString()}
          </p>
        </div>

        <div className="glassmorphism rounded-lg p-4 border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-purple-500/10 hover:border-violet-500/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-violet-400" />
            <p className="text-violet-300 text-sm">Active Borrowed</p>
          </div>
          <p className="text-white text-lg font-bold">
            ${summary.totalBorrowed.toLocaleString()}
          </p>
        </div>

        <div className="glassmorphism rounded-lg p-4 border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-pink-500/10 hover:border-rose-500/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={16} className="text-rose-400" />
            <p className="text-rose-300 text-sm">Utilization</p>
          </div>
          <p className="text-white text-lg font-bold">
            {summary.utilizationPercentage.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-4 bg-white/5 rounded-lg p-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-300">
            Active Loans: {summary.activeLoans}
          </span>
          <span className="text-gray-300">
            Total Charged: ${summary.totalCharged.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Main dashboard component
export default function LoanDashboard({ walletAddress }: LoanDashboardProps) {
  const { loanInfo, loading: contractLoading, refetch } = useLoanStatus();
  const { repayLoan } = useContractOperations();
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Convert simplified loan data to our Loan interface
  const loans: Loan[] = loanInfo?.hasLoan && loanInfo.loanIds ? 
    loanInfo.loanIds.map((loanId, index) => ({
      id: loanId,
      preAuthId: "contract_preauth",
      walletAddress,
      customerId: "",
      paymentMethodId: "",
      borrowAmount: parseFloat(loanInfo.principal) * 3500, // Convert ETH to USD using mock price
      borrowAmountETH: parseFloat(loanInfo.principal),
      ethPriceAtCreation: 3500,
      asset: "ETH",
      interestRate: 10,
      ltvRatio: 50,
      originalCreditLimit: 5000,
      preAuthAmount: parseFloat(loanInfo.principal) * 3500 * 2, // 200% collateral
      status: loanInfo.expired ? "defaulted" : "active",
      createdAt: new Date().toISOString(),
      preAuthCreatedAt: new Date().toISOString(),
      preAuthExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      txHash: ""
    })) : [];

  const creditSummary: CreditSummary | null = loanInfo?.hasLoan ? {
    totalCreditLimit: 5000,
    totalBorrowed: parseFloat(loanInfo.principal) * 3500,
    totalCharged: 0,
    totalReleased: 0,
    availableCredit: 5000 - (parseFloat(loanInfo.principal) * 3500),
    utilizationPercentage: (parseFloat(loanInfo.principal) * 3500 / 5000) * 100,
    activeLoans: 1
  } : null;

  const isLoading = contractLoading;
  const error = ""; // Simplified error handling

  // Toast management functions with stable ID generation
  const addToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 11); // Use stable random ID instead of Date.now()
    const newToast: ToastNotification = { id, type, title, message };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleCharge = async (loanId: string) => {
    addToast('info', 'Processing...', 'Repaying loan and releasing pre-authorization.');
    
    setProcessingLoanId(loanId);
    try {
      // Step 1: Repay the specific loan on blockchain (now requires loan ID)
      const receipt = await repayLoan(loanId);
      
      // Step 2: Release the Stripe pre-authorization (already handled in repayLoan function)
      addToast('success', 'Loan Repaid Successfully!', `Loan ID: ${loanId.substring(0, 8)}... Transaction: ${receipt.transactionHash.substring(0, 10)}... Pre-authorization has been released.`);
      
      await refetch(); // Refresh blockchain data
    } catch (error) {
      addToast('error', 'Repayment Failed', (error as Error).message || 'Failed to repay the loan. Please try again.');
    } finally {
      setProcessingLoanId(null);
    }
  };

  const handleRelease = async (loanId: string) => {
    addToast('info', 'Processing...', 'Releasing loan and canceling pre-authorization hold.');
    
    setProcessingLoanId(loanId);
    try {
      const response = await fetch("/api/loans/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId,
          reason: "Manual release from dashboard",
        }),
      });

      const data = await response.json();

      if (data.success) {
        addToast('success', 'Loan Released Successfully!', 'Pre-authorization hold has been canceled. No charges will occur.');
        await refetch(); // Refresh data
      } else {
        addToast('error', 'Release Failed', data.error || 'Failed to release the loan. Please try again.');
      }
    } catch {
      addToast('error', 'Network Error', 'Unable to process release operation. Check your connection and try again.');
    } finally {
      setProcessingLoanId(null);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      refetch();
    }
  }, [walletAddress, refetch]);

  if (isLoading && loans.length === 0) {
    return (
      <div className="glassmorphism rounded-2xl p-8 border border-white/20">
        <div className="flex items-center justify-center">
          <Loader className="animate-spin text-blue-400" size={32} />
          <span className="ml-3 text-white">Loading your loans...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard size={32} className="text-blue-400" />
          <h2 className="text-3xl font-bold gradient-text">Loan Management</h2>
        </div>
        <button
          onClick={refetch}
          disabled={isLoading}
          className="glassmorphism hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-white/10"
        >
          <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="glassmorphism rounded-xl p-4 border border-rose-500/20 bg-gradient-to-r from-rose-500/10 to-red-500/10 flex items-center gap-3">
          <AlertCircle className="text-rose-300" size={20} />
          <span className="text-rose-200">{error}</span>
        </div>
      )}

      <CreditSummaryCard summary={creditSummary} isLoading={isLoading} />

      {loans.length === 0 ? (
        <div className="glassmorphism rounded-2xl p-12 text-center border border-white/20 bg-gradient-to-br from-slate-900/40 to-gray-900/40">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
            <DollarSign className="text-blue-400" size={36} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 gradient-text">
            No Active Loans
          </h3>
          <p className="text-gray-400 text-lg max-w-md mx-auto leading-relaxed">
            You haven't created any loans yet. Start borrowing against your credit card to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Loans Section */}
          {loans.filter(loan => loan.status === 'active').length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-green-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-white">Active Loans</h3>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium border border-emerald-500/30">
                  {loans.filter(loan => loan.status === 'active').length}
                </span>
              </div>
              <div className="grid gap-4">
                {loans.filter(loan => loan.status === 'active').map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    onCharge={handleCharge}
                    onRelease={handleRelease}
                    isProcessing={processingLoanId === loan.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Loans Section */}
          {loans.filter(loan => loan.status !== 'active').length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4 mt-8">
                <div className="w-2 h-8 bg-gradient-to-b from-gray-500 to-slate-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-white">Completed Loans</h3>
                <span className="px-3 py-1 bg-gray-500/20 text-gray-300 rounded-full text-sm font-medium border border-gray-500/30">
                  {loans.filter(loan => loan.status !== 'active').length}
                </span>
              </div>
              <div className="grid gap-4">
                {loans.filter(loan => loan.status !== 'active').map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    onCharge={handleCharge}
                    onRelease={handleRelease}
                    isProcessing={processingLoanId === loan.id}
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
