/* eslint-disable @typescript-eslint/no-unused-vars */
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
  const accruedInterest = dailyInterest * Math.max(1, daysActive);

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
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-yellow-400" />
            <span className="text-yellow-300 text-sm font-semibold">
              Interest Accrued
            </span>
          </div>
          <p className="text-yellow-100 text-sm">
            ${accruedInterest.toFixed(2)} (${dailyInterest.toFixed(2)}/day)
          </p>
        </div>
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
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
