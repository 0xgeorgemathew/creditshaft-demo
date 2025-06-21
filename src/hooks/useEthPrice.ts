import { useState, useEffect, useCallback } from 'react';

interface EthPriceData {
  price: number;
  source: string;
  timestamp: string;
  warning?: string;
}

export function useEthPrice() {
  const [ethPrice, setEthPrice] = useState(3500); // Fallback price
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('loading');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/eth-price');
      const data: EthPriceData = await response.json();
      
      if (data.price && typeof data.price === 'number') {
        setEthPrice(data.price);
        setSource(data.source);
        setLastUpdate(new Date(data.timestamp));
        
        if (data.warning) {
          setError(data.warning);
        }
      } else {
        throw new Error('Invalid price data received');
      }
    } catch (err) {
      console.warn('Failed to fetch ETH price:', err);
      setError('Failed to fetch current ETH price. Using cached/fallback value.');
      setSource('fallback');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrice();
    
    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return {
    ethPrice,
    loading,
    source,
    lastUpdate,
    error,
    refetch: fetchPrice
  };
}