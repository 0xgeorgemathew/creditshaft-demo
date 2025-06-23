// src/components/loan/BlockchainDataDisplay.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useInterval } from "@/hooks/useInterval";

interface BlockchainDataDisplayProps { 
  value: number; 
  decimals?: number; 
  isUpdating?: boolean;
  lastUpdated?: number;
  loanCreatedAt?: string;
  principalAmount?: number;
  annualRate?: number;
  isRepaymentTotal?: boolean;
}

export function BlockchainDataDisplay({ 
  value, 
  decimals = 4, 
  isUpdating = false,
  lastUpdated,
  loanCreatedAt,
  principalAmount,
  annualRate = 10,
  isRepaymentTotal = false
}: BlockchainDataDisplayProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [hasUpdated, setHasUpdated] = useState(false);
  const [realTimeValue, setRealTimeValue] = useState(value);

  // Memoize creation timestamp to avoid repeated parsing
  const createdTimestamp = useMemo(() => {
    return loanCreatedAt ? new Date(loanCreatedAt).getTime() : 0;
  }, [loanCreatedAt]);

  // Memoize whether we should calculate real-time values
  const shouldCalculateRealTime = useMemo(() => {
    return !!(loanCreatedAt && principalAmount && principalAmount > 0);
  }, [loanCreatedAt, principalAmount]);

  // Optimized precise calculation function
  const calculatePreciseValue = useMemo(() => {
    if (!shouldCalculateRealTime) return () => realTimeValue;
    
    return () => {
      const now = Date.now();
      const timeElapsedSeconds = Math.max(0, (now - createdTimestamp) / 1000);
      
      // Calculate compound interest: A = P(1 + r/n)^(nt)
      const preciseInterest = principalAmount! * (Math.exp((annualRate / 100) * (timeElapsedSeconds / (365 * 24 * 60 * 60))) - 1);
      
      let calculatedValue;
      if (isRepaymentTotal) {
        calculatedValue = principalAmount! + preciseInterest;
      } else {
        calculatedValue = preciseInterest;
      }
      
      const minValue = isRepaymentTotal ? principalAmount! : 0;
      return Math.max(minValue, Math.max(realTimeValue, calculatedValue));
    };
  }, [shouldCalculateRealTime, createdTimestamp, principalAmount, annualRate, isRepaymentTotal, realTimeValue]);

  // Smooth transition to new values from blockchain
  useEffect(() => {
    if (Math.abs(value - displayValue) > 0.000001) {
      setDisplayValue(value);
      setHasUpdated(true);
      
      const timer = setTimeout(() => setHasUpdated(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  // Update real-time value using centralized interval
  useInterval(() => {
    if (shouldCalculateRealTime) {
      const newValue = calculatePreciseValue();
      if (newValue > realTimeValue || Math.abs(newValue - realTimeValue) < 0.000001) {
        setRealTimeValue(newValue);
      }
    } else {
      setRealTimeValue(displayValue);
    }
  }, 1000);

  // Handle blockchain data updates
  useEffect(() => {
    if (lastUpdated && displayValue > realTimeValue) {
      setRealTimeValue(displayValue);
    }
  }, [lastUpdated, displayValue, realTimeValue]);

  // Determine appropriate decimal places based on value magnitude
  const adaptiveDecimals = useMemo(() => {
    return realTimeValue < 0.01 ? Math.max(decimals, 8) : 
           realTimeValue < 0.1 ? Math.max(decimals, 6) : 
           realTimeValue < 1 ? Math.max(decimals, 4) : decimals;
  }, [realTimeValue, decimals]);

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