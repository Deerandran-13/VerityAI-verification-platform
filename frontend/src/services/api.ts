import axios from 'axios';
import type { VerificationJob, DashboardStats, HealthStatus, VerificationMode, Claim } from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function checkHealth(): Promise<HealthStatus> {
  const { data } = await api.get<HealthStatus>('/health');
  return data;
}

export async function submitVerification(
  text: string,
  mode: VerificationMode,
  historicalDate?: string
): Promise<{ id: string; status: string; message: string }> {
  const payload: Record<string, unknown> = { text, mode };
  if (historicalDate) payload.historical_date = historicalDate;
  const { data } = await api.post<{ id: string; status: string; message: string }>('/verify', payload);
  return data;
}

export async function getVerificationResult(id: string): Promise<VerificationJob> {
  const { data } = await api.get<VerificationJob>(`/verify/${id}`);
  return data;
}

export async function getClaimDetails(id: string): Promise<Claim> {
  const { data } = await api.get<Claim>(`/claims/${id}`);
  return data;
}

export async function reverifyClaim(id: string): Promise<Claim> {
  const { data } = await api.post<Claim>(`/claims/${id}/reverify`);
  return data;
}

export async function getHistory(
  page: number = 1,
  pageSize: number = 20
): Promise<{ items: VerificationJob[]; total: number; page: number; total_pages: number }> {
  const { data } = await api.get('/history', { params: { page, page_size: pageSize } });
  return data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
}

export async function getKnowledgeDrift(claimId: string): Promise<unknown> {
  const { data } = await api.get(`/knowledge-drift/${claimId}`);
  return data;
}

export async function getModelsStatus(): Promise<unknown> {
  const { data } = await api.get('/models/status');
  return data;
}

export async function getRecentEvidence(): Promise<any[]> {
  const { data } = await api.get<any[]>('/evidence');
  return data;
}

export async function getDriftCases(): Promise<any> {
  const { data } = await api.get('/drift/cases');
  return data;
}

export function getExportUrl(jobId: string, format: 'json' | 'html' | 'csv' = 'json'): string {
  return `/api/v1/verify/${jobId}/export?format=${format}`;
}

export async function submitDocumentVerification(
  file: File,
  mode: VerificationMode = 'standard',
  historicalDate?: string
): Promise<{ id: string; status: string; message: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('mode', mode);
  if (historicalDate) formData.append('historical_date', historicalDate);

  const { data } = await api.post<{ id: string; status: string; message: string }>(
    '/verify/document',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

export async function submitUrlVerification(
  url: string,
  mode: VerificationMode = 'standard',
  historicalDate?: string
): Promise<{ id: string; status: string; message: string }> {
  const payload: Record<string, unknown> = { url, mode };
  if (historicalDate) payload.historical_date = historicalDate;
  const { data } = await api.post<{ id: string; status: string; message: string }>('/verify/url', payload);
  return data;
}

export async function trackClaim(claimId: string, intervalType: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<any> {
  const { data } = await api.post('/monitoring/track', { claim_id: claimId, interval_type: intervalType });
  return data;
}

export async function getTrackedClaims(): Promise<any[]> {
  const { data } = await api.get('/monitoring/tracked');
  return data;
}

export async function triggerDueChecks(): Promise<any> {
  const { data } = await api.post('/monitoring/check-expiries');
  return data;
}

export async function getNotifications(): Promise<any[]> {
  const { data } = await api.get('/notifications');
  return data;
}

export async function getModelDisagreement(jobId: string): Promise<any> {
  const { data } = await api.get(`/models/disagreement/${jobId}`);
  return data;
}

export default api;
