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
import { useInterval } from "@/hooks/useInterval";

interface LoanCardProps {
  loan: Loan;
  onRepay: (loanId: string) => void;
  isProcessing: boolean;
}

export const LoanCard = memo(
  function LoanCard({
    loan,
    onRepay,
    isProcessing,
  }: LoanCardProps) {
    const [showDetails, setShowDetails] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<string>("");
    const timeRemainingRef = useRef<string>("");

    // Memoize expiry timestamp to avoid repeated parsing
    const expiryTimestamp = useMemo(() => {
      return loan.preAuthExpiryTime ? loan.preAuthExpiryTime * 1000 : 0; // Convert seconds to milliseconds
    }, [loan.preAuthExpiryTime]);

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
      loan.status === "active" ? updateCountdown : () => {},
      loan.status === "active" ? 1000 : null
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
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign size={22} className="text-white" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-xl leading-tight">
                ${(parseFloat(loan.borrowedUSDC) / 1e6).toFixed(2)} USDC
              </h3>
              <div className="text-sm text-gray-300 space-y-0.5">
                <p>Collateral: {(parseFloat(loan.collateralLINK) / 1e18).toFixed(4)} LINK</p>
                <p>Leverage: {(loan.leverageRatio / 100).toFixed(1)}x</p>
                <p className="text-xs text-gray-400">
                  Entry Price: ${(parseFloat(loan.entryPrice) / 1e8).toFixed(2)}
                </p>
              </div>
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
            <p className="text-lg font-bold text-white">
              {(((parseFloat(loan.borrowedUSDC) / 1e6) / ((parseFloat(loan.suppliedLINK) / 1e18) * (parseFloat(loan.entryPrice) / 1e8))) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="glassmorphism rounded-xl p-4 border border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-green-400" />
              <p className="text-xs text-green-200 font-medium">Pre-Auth</p>
            </div>
            <p className="text-lg font-bold text-white">${(parseFloat(loan.preAuthAmount) / 1e6).toLocaleString()}</p>
          </div>
        </div>

        {loan.status === "active" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="glassmorphism rounded-xl p-4 border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/10">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-red-400" />
                  <span className="text-red-200 text-sm font-bold">
                    Supplied LINK
                  </span>
                </div>
                <div className="text-xl font-bold text-white">
                  {(parseFloat(loan.suppliedLINK) / 1e18).toFixed(4)}
                </div>
              </div>
              <div className="glassmorphism rounded-xl p-4 border border-blue-600/30 bg-gradient-to-br from-blue-600/10 to-blue-700/10">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={14} className="text-blue-600" />
                  <span className="text-blue-200 text-sm font-bold">
                    Pre-Auth Charged
                  </span>
                </div>
                <div className="text-xl font-bold text-white">
                  {loan.preAuthCharged ? "Yes" : "No"}
                </div>
              </div>
            </div>

            {loan.preAuthExpiryTime && (
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
                        ${loan.preAuthAmount ? (parseFloat(loan.preAuthAmount.toString()) / 1e6).toFixed(2) : 'N/A'}
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
                  {loan.stripePaymentIntentId.slice(0, 20)}...
                </p>
              </div>
              {loan.createdAt && (
                <div>
                  <p className="text-gray-400 mb-1">Pre-Auth Created</p>
                  <p className="text-white font-mono">
                    {formatDate(loan.createdAt)}
                  </p>
                </div>
              )}
              {loan.preAuthExpiryTime && (
                <div>
                  <p className="text-gray-400 mb-1">Pre-Auth Expires</p>
                  <p className="text-white font-mono">
                    {formatDate(new Date(loan.preAuthExpiryTime * 1000).toISOString())}
                  </p>
                </div>
              )}
              {loan.status === "repaid" && (
                <div>
                  <p className="text-gray-400 mb-1">Repaid</p>
                  <p className="text-white font-mono">
                    Position Closed
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
      prevProps.loan.isActive === nextProps.loan.isActive &&
      prevProps.loan.preAuthCharged === nextProps.loan.preAuthCharged &&
      prevProps.isProcessing === nextProps.isProcessing
    );
  }
);