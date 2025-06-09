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
} from "lucide-react";

interface LoanDashboardProps {
  walletAddress: string;
}

interface LoanCardProps {
  loan: Loan;
  onCharge: (loanId: string) => void;
  onRelease: (loanId: string) => void;
  isProcessing: boolean;
}

// Individual loan card component
function LoanCard({ loan, onCharge, onRelease, isProcessing }: LoanCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [currentInterest, setCurrentInterest] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);

  // Calculate real-time countdown and interest
  useEffect(() => {
    if (loan.status === "active") {
      // Pre-calculate constants to avoid repeated calculations
      const annualRate = loan.interestRate / 100;
      const secondlyRate = annualRate / (365 * 24 * 60 * 60);
      const createdTime = new Date(loan.createdAt).getTime();
      
      const updateRealTimeData = () => {
        const now = new Date().getTime();

        // Calculate precise time elapsed since loan creation in milliseconds
        const timeElapsedMs = now - createdTime;
        const timeElapsedSeconds = timeElapsedMs / 1000;

        // Calculate real-time accrued interest with pre-calculated rate
        const realTimeInterest = loan.borrowAmount * secondlyRate * timeElapsedSeconds;
        setCurrentInterest(realTimeInterest);

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

            if (days > 0) {
              setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            } else if (hours > 0) {
              setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
            } else if (minutes > 0) {
              setTimeRemaining(`${minutes}m ${seconds}s`);
            } else {
              setTimeRemaining(`${seconds}s`);
            }

            // Simplified progress calculation as percentage of time REMAINING
            let progress = 0;
            const startTime = loan.preAuthCreatedAt 
              ? new Date(loan.preAuthCreatedAt).getTime()
              : createdTime;
            const totalDuration = expiry - startTime;

            if (totalDuration > 0 && timeDiff > 0) {
              progress = (timeDiff / totalDuration) * 100;
              // Ensure progress is within valid range (0.01% to 99.99%)
              progress = Math.max(Math.min(progress, 99.99), 0.01);
            } else if (timeDiff <= 0) {
              progress = 100; // Expired
            }

            setProgressPercentage(progress);

            // Animation trigger for smooth updates
          } else {
            setTimeRemaining("EXPIRED");
            setProgressPercentage(100);
          }
        }
      };

      // Update immediately
      updateRealTimeData();

      // Update every 1000ms (1 second) for better performance
      const interval = setInterval(updateRealTimeData, 1000);

      return () => clearInterval(interval);
    }
  }, [
    loan.status,
    loan.preAuthExpiresAt,
    loan.createdAt,
    loan.borrowAmount,
    loan.interestRate,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      case "charged":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "released":
        return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
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
    return (
      new Date(dateString).toLocaleDateString() +
      " " +
      new Date(dateString).toLocaleTimeString()
    );
  };

  const daysActive = Math.floor(
    (new Date().getTime() - new Date(loan.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const dailyInterest = (loan.borrowAmount * (loan.interestRate / 100)) / 365;
  const secondlyInterest = dailyInterest / (24 * 60 * 60); // Interest per second for display

  return (
    <div className="glassmorphism rounded-xl p-6 border border-white/20 card-hover">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <DollarSign size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">
              ${loan.borrowAmount.toLocaleString()} {loan.asset}
            </h3>
            <p className="text-sm text-gray-400">Loan #{loan.id.slice(-8)}</p>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-full border flex items-center gap-2 ${getStatusColor(
            loan.status
          )}`}
        >
          {getStatusIcon(loan.status)}
          <span className="text-sm font-medium capitalize">{loan.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Pre-Auth Amount</p>
          <p className="text-sm font-semibold text-white">
            ${loan.preAuthAmount.toLocaleString()}
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">LTV Ratio</p>
          <p className="text-sm font-semibold text-white">{loan.ltvRatio}%</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Interest Rate</p>
          <p className="text-sm font-semibold text-white">
            {loan.interestRate}%
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Days Active</p>
          <p className="text-sm font-semibold text-white">{daysActive}</p>
        </div>
      </div>

      {loan.status === "active" && (
        <>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-yellow-400 animate-pulse" />
              <span className="text-yellow-300 text-sm font-semibold">
                Interest Accrued (Real-Time)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-yellow-100 text-lg font-mono">
                ${currentInterest.toFixed(6)}
              </p>
              <p className="text-yellow-200 text-xs">
                +${secondlyInterest.toFixed(8)}/sec
              </p>
            </div>
            <p className="text-yellow-200 text-xs mt-1">
              Daily: ${dailyInterest.toFixed(4)} | Rate: {loan.interestRate}%
              APY
            </p>
          </div>

          {/* Chainlink Automation Countdown Display */}
          {loan.preAuthExpiresAt && (
            <div className="glassmorphism rounded-xl p-6 border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-purple-500/10 relative overflow-hidden mb-4">
              <div className="flex items-center gap-8">
                {/* Dynamic Circular Progress Credit Card Icon */}
                <div className="relative flex flex-col items-center">
                  {/* Main circular progress */}
                  <svg
                    className="w-24 h-24 transform -rotate-90 relative z-10"
                    viewBox="0 0 96 96"
                  >
                    {/* Background circle - light gray for full circle */}
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="6"
                      fill="none"
                    />

                    {/* Progress circle - shows countdown remaining time */}
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="url(#countdownGradient)"
                      strokeWidth="6"
                      fill="none"
                      strokeLinecap="round"
                      className="transition-all duration-100 ease-linear"
                      style={{
                        strokeDasharray: `${2 * Math.PI * 40}`,
                        strokeDashoffset: `${
                          2 * Math.PI * 40 * (1 - progressPercentage / 100)
                        }`,
                      }}
                    />

                    {/* Animated tip at the current progress point - always visible when not expired */}
                    {timeRemaining !== "EXPIRED" && (
                      <circle
                        cx={
                          48 +
                          40 *
                            Math.cos(
                              ((progressPercentage * 3.6 - 90) * Math.PI) / 180
                            )
                        }
                        cy={
                          48 +
                          40 *
                            Math.sin(
                              ((progressPercentage * 3.6 - 90) * Math.PI) / 180
                            )
                        }
                        r="3"
                        fill={
                          progressPercentage < 20
                            ? "#ef4444"
                            : progressPercentage < 50
                            ? "#fbbf24"
                            : "#22c55e"
                        }
                        className="animate-pulse"
                      />
                    )}

                    {/* Dynamic gradient based on time remaining */}
                    <defs>
                      <linearGradient
                        id="countdownGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        {progressPercentage < 20 ? (
                          // Red gradient for critical time
                          <>
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="50%" stopColor="#dc2626" />
                            <stop offset="100%" stopColor="#b91c1c" />
                          </>
                        ) : progressPercentage < 50 ? (
                          // Yellow gradient for medium time
                          <>
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="50%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#d97706" />
                          </>
                        ) : (
                          // Green gradient for plenty of time
                          <>
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="50%" stopColor="#16a34a" />
                            <stop offset="100%" stopColor="#15803d" />
                          </>
                        )}
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Credit Card Icon - perfectly centered */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    {timeRemaining === "EXPIRED" ? (
                      <AlertCircle className="w-8 h-8 text-red-400 animate-bounce" />
                    ) : (
                      <div className="w-8 h-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-sm relative border border-blue-400/50">
                        {/* EMV Chip */}
                        <div className="absolute top-0.5 left-0.5 w-1 h-0.5 bg-yellow-300 rounded-sm"></div>
                        {/* Card number */}
                        <div className="absolute bottom-0 right-0.5 text-white text-xs font-mono">
                          ••••
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress percentage display */}
                  <div
                    className={`mt-3 text-xs font-mono font-bold transition-colors duration-300 ${
                      progressPercentage < 20
                        ? "text-red-300"
                        : progressPercentage < 50
                        ? "text-yellow-300"
                        : "text-green-300"
                    }`}
                  >
                    {progressPercentage < 1 && progressPercentage > 0
                      ? progressPercentage.toFixed(3)
                      : progressPercentage < 10
                      ? progressPercentage.toFixed(2)
                      : progressPercentage >= 99
                      ? progressPercentage.toFixed(2)
                      : progressPercentage.toFixed(1)}
                    %
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-blue-300 text-lg font-bold">
                      Time Remaining
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-200 text-sm">
                        Until auto-charge:
                      </span>
                      <span className="text-blue-100 font-mono text-lg font-semibold">
                        {timeRemaining === "EXPIRED"
                          ? "EXPIRED"
                          : timeRemaining}
                      </span>
                    </div>

                    <div className="glassmorphism rounded-lg p-3 border border-white/10 bg-white/5">
                      <p className="text-blue-200 text-xs leading-relaxed">
                        💳 Your credit card will be charged automatically before
                        expiry. Repay early to cancel.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1 glassmorphism text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
        >
          <Eye size={14} />
          {showDetails ? "Hide" : "Show"} Details
        </button>
      </div>

      {showDetails && (
        <div className="space-y-3 p-4 bg-black/20 rounded-lg border border-white/10">
          <div className="grid grid-cols-2 gap-4 text-xs">
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
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onCharge(loan.id)}
            disabled={isProcessing}
            className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <Loader className="animate-spin" size={16} />
            ) : (
              <Zap size={16} />
            )}
            Charge Card
          </button>
          <button
            onClick={() => onRelease(loan.id)}
            disabled={isProcessing}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-lg font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <Loader className="animate-spin" size={16} />
            ) : (
              <Shield size={16} />
            )}
            Release
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
    <div className="glassmorphism rounded-xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <CreditCard size={20} />
        Credit Summary
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-blue-300 text-sm mb-1">Total Credit</p>
          <p className="text-white text-lg font-bold">
            ${summary.totalCreditLimit.toLocaleString()}
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-300 text-sm mb-1">Available</p>
          <p className="text-white text-lg font-bold">
            ${summary.availableCredit.toLocaleString()}
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
          <p className="text-purple-300 text-sm mb-1">Active Borrowed</p>
          <p className="text-white text-lg font-bold">
            ${summary.totalBorrowed.toLocaleString()}
          </p>
        </div>

        <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300 text-sm mb-1">Utilization</p>
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
  const [loans, setLoans] = useState<Loan[]>([]);
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [processingLoanId, setProcessingLoanId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchLoans = async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(
        `/api/loans?wallet=${encodeURIComponent(walletAddress)}`
      );
      const data = await response.json();

      if (data.success) {
        setLoans(data.loans);
        setCreditSummary(data.creditSummary);
      } else {
        setError(data.error || "Failed to fetch loans");
      }
    } catch {
      setError("Network error while fetching loans");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharge = async (loanId: string) => {
    if (
      !confirm(
        "Are you sure you want to charge this loan? This will capture the pre-authorization on the credit card."
      )
    ) {
      return;
    }

    setProcessingLoanId(loanId);
    try {
      const response = await fetch("/api/loans/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId,
          reason: "Manual charge from dashboard",
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Loan charged successfully! Charge ID: ${data.chargeId}`);
        await fetchLoans(); // Refresh data
      } else {
        alert(`Charge failed: ${data.error}`);
      }
    } catch {
      alert("Network error during charge operation");
    } finally {
      setProcessingLoanId(null);
    }
  };

  const handleRelease = async (loanId: string) => {
    if (
      !confirm(
        "Are you sure you want to release this loan? This will cancel the pre-authorization hold."
      )
    ) {
      return;
    }

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
        alert("Loan released successfully!");
        await fetchLoans(); // Refresh data
      } else {
        alert(`Release failed: ${data.error}`);
      }
    } catch {
      alert("Network error during release operation");
    } finally {
      setProcessingLoanId(null);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchLoans();
    }
  }, [walletAddress]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold gradient-text">Loan Management</h2>
        <button
          onClick={fetchLoans}
          disabled={isLoading}
          className="glassmorphism hover:bg-white/10 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2 border border-white/10"
        >
          <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-400" size={20} />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      <CreditSummaryCard summary={creditSummary} isLoading={isLoading} />

      {loans.length === 0 ? (
        <div className="glassmorphism rounded-xl p-8 text-center border border-white/20">
          <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No Loans Found
          </h3>
          <p className="text-gray-400">
            You haven't created any loans yet. Use the borrowing interface to
            get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onCharge={handleCharge}
              onRelease={handleRelease}
              isProcessing={processingLoanId === loan.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
