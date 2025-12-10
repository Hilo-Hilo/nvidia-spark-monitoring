'use client';

import { useEffect, useState } from 'react';
import { api, SystemMetrics } from '@/lib/api';

// Validate that metrics data has the required structure
function isValidMetrics(data: unknown): data is SystemMetrics {
  if (!data || typeof data !== 'object') return false;
  const metrics = data as Record<string, unknown>;
  return (
    metrics.cpu !== null &&
    typeof metrics.cpu === 'object' &&
    'percent' in (metrics.cpu as object) &&
    metrics.memory !== null &&
    typeof metrics.memory === 'object' &&
    'percent' in (metrics.memory as object) &&
    metrics.disk !== null &&
    typeof metrics.disk === 'object' &&
    'percent' in (metrics.disk as object) &&
    metrics.network !== null &&
    typeof metrics.network === 'object'
  );
}

export function useMetrics(interval: number = 2000) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchMetrics = async () => {
      try {
        const response = await api.metrics.getCurrent();
        if (isValidMetrics(response.data)) {
          setMetrics(response.data);
          setError(null);
        } else {
          console.error('Invalid metrics data received:', response.data);
          setError('Invalid metrics data received from server');
        }
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch metrics:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
        setError(errorMessage);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchMetrics();

    // Set up polling
    intervalId = setInterval(fetchMetrics, interval);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [interval]);

  return { metrics, loading, error };
}

