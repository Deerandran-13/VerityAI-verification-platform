import { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';
import type { HealthStatus } from '../types';

export function useHealth(pollIntervalMs: number = 30000) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const data = await checkHealth();
      setHealth(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Health check failed';
      setError(msg);
      setHealth(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  return { health, isLoading, error, refetch: fetchHealth };
}

