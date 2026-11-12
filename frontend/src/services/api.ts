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

// ---------------------------------------------------------------------------
// Advanced Intelligence & Collaboration APIs
// ---------------------------------------------------------------------------

export async function getClaimDependencyGraph(jobId: string): Promise<import('../types').ClaimDependencyGraph> {
  const { data } = await api.get(`/verify/${jobId}/graph`);
  return data;
}

export async function getJobConflicts(jobId: string): Promise<{
  job_id: string;
  total_claims: number;
  conflicted_claims_count: number;
  claims: import('../types').ClaimConflictAnalysis[];
}> {
  const { data } = await api.get(`/verify/${jobId}/conflicts`);
  return data;
}

export async function getClaimTimeline(claimId: string): Promise<import('../types').ClaimTimelineResponse> {
  const { data } = await api.get(`/claims/${claimId}/timeline`);
  return data;
}

export async function getClaimConflicts(claimId: string): Promise<import('../types').ClaimConflictAnalysis> {
  const { data } = await api.get(`/claims/${claimId}/conflicts`);
  return data;
}

export async function submitClaimFeedback(
  claimId: string,
  payload: {
    reviewer_email: string;
    reviewer_name?: string;
    decision: 'correct' | 'incorrect' | 'needs_review';
    explanation?: string;
    supporting_url?: string;
  }
): Promise<import('../types').HumanFeedbackItem> {
  const { data } = await api.post(`/claims/${claimId}/feedback`, payload);
  return data;
}

export async function listClaimFeedback(claimId: string): Promise<import('../types').HumanFeedbackItem[]> {
  const { data } = await api.get(`/claims/${claimId}/feedback`);
  return data;
}

export async function compareVerifications(
  jobA: string,
  jobB: string
): Promise<import('../types').VerificationComparisonResponse> {
  const { data } = await api.get('/compare', { params: { job_a: jobA, job_b: jobB } });
  return data;
}

export async function registerCollabUser(payload: {
  email: string;
  password: string;
  display_name?: string;
  role: 'admin' | 'reviewer' | 'member';
}): Promise<import('../types').CollabUserSession> {
  const { data } = await api.post('/collaboration/users/register', payload);
  return data;
}

export async function loginCollabUser(payload: {
  email: string;
  password: string;
}): Promise<import('../types').CollabUserSession> {
  const { data } = await api.post('/collaboration/login', payload);
  return data;
}

export async function shareVerificationReport(
  jobId: string,
  token: string,
  payload: {
    member_email: string;
    member_role: 'admin' | 'reviewer' | 'member';
    assigned_reviewer_email?: string;
  }
): Promise<import('../types').SharedReportItem> {
  const { data } = await api.post(`/collaboration/reports/${jobId}/share`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function listSharedReports(token: string): Promise<import('../types').SharedReportItem[]> {
  const { data } = await api.get('/collaboration/reports/shared', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function addReportComment(
  jobId: string,
  token: string,
  payload: {
    claim_id?: string;
    comment_type: 'comment' | 'review_note' | 'assignment';
    content: string;
  }
): Promise<import('../types').ReportCommentItem> {
  const { data } = await api.post(`/collaboration/reports/${jobId}/comments`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function listReportComments(
  jobId: string,
  token: string
): Promise<import('../types').ReportCommentItem[]> {
  const { data } = await api.get(`/collaboration/reports/${jobId}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function listReportAuditLog(
  jobId: string,
  token: string
): Promise<import('../types').AuditLogItem[]> {
  const { data } = await api.get(`/collaboration/reports/${jobId}/audit-log`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export default api;
