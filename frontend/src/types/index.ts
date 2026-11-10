export type ClaimCategory = 'software_version' | 'api_info' | 'pricing' | 'company_info' | 'regulation' | 'scientific_fact' | 'statistic' | 'historical_fact' | 'tech_capability' | 'general_fact';

export type ClaimStatus = 'verified' | 'outdated' | 'contradicted' | 'partially_supported' | 'unsupported' | 'unverifiable' | 'historically_correct';

export type VerificationMode = 'standard' | 'adversarial' | 'time_travel';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VerificationJob {
  id: string;
  original_text: string;
  mode: VerificationMode;
  historical_date?: string;
  status: JobStatus;
  overall_freshness_score?: number;
  overall_confidence_score?: number;
  total_claims: number;
  verified_claims: number;
  outdated_claims: number;
  contradicted_claims: number;
  unsupported_claims: number;
  processing_time_ms?: number;
  claims: Claim[];
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: string;
  claim_text: string;
  original_sentence: string;
  position_in_text: number;
  category: ClaimCategory;
  is_time_sensitive: boolean;
  is_historical: boolean;
  is_vague: boolean;
  status: ClaimStatus;
  freshness_score?: number;
  confidence_score?: number;
  explanation?: string;
  suggested_correction?: string;
  evidence: Evidence[];
}

export interface Evidence {
  id: string;
  source_title: string;
  source_url: string;
  source_domain: string;
  publication_date?: string;
  retrieval_date: string;
  content_snippet: string;
  relevance_score: number;
  is_supporting: boolean;
  is_contradicting: boolean;
  is_primary_source: boolean;
  reliability_score: number;
}

export interface DashboardStats {
  total_jobs: number;
  total_claims: number;
  verified_count: number;
  outdated_count: number;
  contradicted_count: number;
  unsupported_count: number;
  avg_freshness_score: number;
  avg_confidence_score: number;
  avg_processing_time_ms: number;
}

export type ServiceStatusType = 'connected' | 'disconnected' | 'checking' | 'not_configured';

export interface ServiceHealth {
  status: ServiceStatusType;
  message?: string;
  error?: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  app_name?: string;
  database: ServiceHealth;
  tavily: ServiceHealth;
  bifrost: ServiceHealth;
  gemini: ServiceHealth;
  timestamp: string;
  uptime_seconds?: number;
}
