// src/components/loan/LoanCard.tsx
"use client";

import {
  useState,
  useEffect,
  useCallback,
  memo,
  useRef,
  useMemo,
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
  CreditCard,
} from "lucide-react";
import { BlockchainDataDisplay } from "./BlockchainDataDisplay";
import { useInterval } from "@/hooks/useInterval";

interface LoanCardProps {
  loan: Loan;
  onRepay: (loanId: string) => void;
  isProcessing: boolean;
  loanInfo?: {
    lastUpdated?: number;
    isUpdating?: boolean;
  };
}

export const LoanCard = memo(
  function LoanCard({
    loan,
    onRepay,
    isProcessing,
    loanInfo,
  }: LoanCardProps) {
    const [showDetails, setShowDetails] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<string>("");
    const timeRemainingRef = useRef<string>("");

    // Memoize expiry timestamp to avoid repeated parsing
    const expiryTimestamp = useMemo(() => {
      return loan.preAuthExpiresAt ? new Date(loan.preAuthExpiresAt).getTime() : 0;
    }, [loan.preAuthExpiresAt]);

    // Optimized countdown calculation
    const updateCountdown = useCallback(() => {
      if (!expiryTimestamp) return;

      const now = Date.now();
      const timeDiff = expiryTimestamp - now;

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (timeDiff % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        const newTimeRemaining =
          days > 0
            ? `${days}d ${hours}h ${minutes}m`
            : hours > 0
            ? `${hours}h ${minutes}m`
            : `${minutes}m ${seconds}s`;

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
    }, [expiryTimestamp]);

    // Use centralized interval for countdown updates
    useInterval(
      loan.status === "active" ? updateCountdown : null,
      1000
    );

    // Initialize countdown on mount
    useEffect(() => {
      if (loan.status === "active") {
        updateCountdown();
      }
    }, [updateCountdown, loan.status]);

    // Memoized style functions
    const statusStyles = useMemo(() => {
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

      return {
        color: getStatusColor(loan.status),
        icon: getStatusIcon(loan.status),
      };
    }, [loan.status]);

    const formatDate = useCallback((dateString: string) => {
      const date = new Date(dateString);
      return date.toISOString().replace("T", " ").substring(0, 19);
    }, []);

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
            className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${statusStyles.color} shadow-sm`}
          >
            {statusStyles.icon}
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
    // Optimized comparison - only check essential props
    return (
      prevProps.loan.id === nextProps.loan.id &&
      prevProps.loan.status === nextProps.loan.status &&
      prevProps.loan.blockchainInterest === nextProps.loan.blockchainInterest &&
      prevProps.loan.blockchainRepayAmount === nextProps.loan.blockchainRepayAmount &&
      prevProps.isProcessing === nextProps.isProcessing &&
      prevProps.loanInfo?.lastUpdated === nextProps.loanInfo?.lastUpdated &&
      prevProps.loanInfo?.isUpdating === nextProps.loanInfo?.isUpdating
    );
  }
);