import { useState, useEffect, useCallback, useRef } from 'react';
import { getPositionDetails } from '@/lib/contract';
import { useAccount } from 'wagmi';
import { Position } from '@/types';

interface PositionInfo {
  hasActivePosition: boolean;
  position: Position | null;
  // Real-time update tracking
  lastUpdated?: number;
  isUpdating?: boolean;
}

export const useLoanStatus = () => {
  const [positionInfo, setPositionInfo] = useState<PositionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();
  
  // Real-time polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const lastPollingTimeRef = useRef(0);

  const fetchPositionStatus = useCallback(async (isBackgroundUpdate = false) => {
    if (!address) {
      setPositionInfo({
        hasActivePosition: false,
        position: null,
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
        setPositionInfo(prev => prev ? { ...prev, isUpdating: true } : null);
        isPollingRef.current = true;
      }
      
      lastPollingTimeRef.current = now;
      
      const position = await getPositionDetails(address);
      
      if (position && position.isActive) {
        setPositionInfo({
          hasActivePosition: true,
          position: position,
          lastUpdated: Date.now(),
          isUpdating: false
        });
      } else {
        setPositionInfo({
          hasActivePosition: false,
          position: null,
          lastUpdated: Date.now(),
          isUpdating: false
        });
      }
    } catch (error) {
      console.error('Error fetching position status:', error);
      // Set default state on error
      setPositionInfo({
        hasActivePosition: false,
        position: null,
        lastUpdated: Date.now(),
        isUpdating: false
      });
    } finally {
      setLoading(false);
      isPollingRef.current = false;
    }
  }, [address]);

  // Start/stop real-time polling based on active position
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling
    
    pollingIntervalRef.current = setInterval(() => {
      fetchPositionStatus(true); // Background update
    }, 12000); // Poll every 12 seconds
    
    console.log('Started real-time polling for position updates');
  }, [fetchPositionStatus]);

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
      fetchPositionStatus();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [address, fetchPositionStatus]);

  // Start/stop polling based on position status
  useEffect(() => {
    if (positionInfo?.hasActivePosition) {
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup on unmount
    return stopPolling;
  }, [positionInfo?.hasActivePosition, startPolling, stopPolling]);

  return { 
    positionInfo, 
    loading, 
    refetch: () => fetchPositionStatus(false),
    isRealTimeActive: pollingIntervalRef.current !== null
  };
};