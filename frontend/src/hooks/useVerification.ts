import { useState } from 'react';
import { submitVerification, getVerificationResult } from '../services/api';
import type { VerificationJob, VerificationMode } from '../types';

export function useVerification() {
  const [job, setJob] = useState<VerificationJob | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const startVerification = async (
    text: string,
    mode: VerificationMode,
    historicalDate?: string
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await submitVerification(text, mode, historicalDate);
      return res.id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification submission failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchJob = async (jobId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getVerificationResult(jobId);
      setJob(res);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch verification';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { job, isLoading, error, startVerification, fetchJob, setJob };
}

