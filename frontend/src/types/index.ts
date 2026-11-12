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
  page_number?: number | null;
  section_title?: string | null;
  category: ClaimCategory;
  is_time_sensitive: boolean;
  is_historical: boolean;
  is_vague: boolean;
  status: ClaimStatus;
  freshness_score?: number;
  confidence_score?: number;
  evidence_strength?: number | null;
  uncertainty_score?: number | null;
  uncertainty_level?: string | null;
  uncertainty_reason?: string | null;
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
  quality_score?: number | null;
  quality_breakdown?: {
    source_authority?: number;
    claim_relevance?: number;
    publication_recency?: number;
    directness?: number;
    independent_corroboration?: number;
    explanation?: string;
  } | null;
  bias_label?: string | null;
  bias_confidence?: number | null;
  bias_rationale?: string | null;
  conflict_of_interest?: string | null;
}

export interface ClaimGraphNode {
  id: string;
  type: 'claim' | 'evidence';
  label: string;
  text: string;
  verdict?: string | null;
  confidence?: number | null;
  freshness?: number | null;
  uncertainty_level?: string | null;
  impacted_by_dependency?: boolean;
  evidence_count?: number;
  url?: string | null;
  quality_score?: number | null;
  bias_label?: string | null;
}

export interface ClaimGraphEdge {
  source: string;
  target: string;
  relationship: string;
  confidence: number;
  explanation?: string | null;
}

export interface ClaimDependencyGraph {
  job_id: string;
  total_claims: number;
  relationship_count: number;
  impacted_claim_ids: string[];
  nodes: ClaimGraphNode[];
  edges: ClaimGraphEdge[];
}

export interface ClaimTimelineEvent {
  event_type: 'evidence' | 'version_snapshot';
  id: string;
  timestamp: string;
  publication_date?: string | null;
  retrieval_date?: string | null;
  updated_date?: string | null;
  source_title?: string | null;
  source_domain?: string | null;
  source_url?: string | null;
  stance?: string;
  quality_score?: number | null;
  bias_label?: string | null;
  content_snippet?: string | null;
  version_number?: number;
  status?: string | null;
  change_reason?: string | null;
}

export interface ClaimTimelineResponse {
  claim_id: string;
  claim_text: string;
  current_status?: string | null;
  timeline: ClaimTimelineEvent[];
  fact_changes: string[];
  historical_vs_current: {
    total_evidence: number;
    versions_count: number;
    earliest_source_date?: string | null;
    latest_source_date?: string | null;
  };
}

export interface ConflictCitation {
  id?: string;
  source_title?: string;
  source_domain?: string;
  source_url?: string;
  publication_date?: string | null;
  quality_score?: number | null;
  snippet?: string;
}

export interface ClaimConflictAnalysis {
  claim_id: string;
  claim_text: string;
  current_status?: string | null;
  has_conflict: boolean;
  conflict_reasons: string[];
  supporting_side: ConflictCitation[];
  contradicting_side: ConflictCitation[];
  summary: string;
}

export interface HumanFeedbackItem {
  id: string;
  claim_id: string;
  reviewer_email: string;
  reviewer_name?: string | null;
  decision: 'correct' | 'incorrect' | 'needs_review';
  explanation?: string | null;
  supporting_url?: string | null;
  is_verified_review: boolean;
  created_at: string;
}

export interface VerificationComparisonResponse {
  job_a: {
    id: string;
    created_at: string;
    mode: string;
    overall_freshness_score?: number | null;
    overall_confidence_score?: number | null;
    total_claims: number;
  };
  job_b: {
    id: string;
    created_at: string;
    mode: string;
    overall_freshness_score?: number | null;
    overall_confidence_score?: number | null;
    total_claims: number;
  };
  deltas: {
    freshness_delta: number;
    confidence_delta: number;
    claims_delta: number;
  };
  summary_counts: Record<string, number>;
  claim_diffs: Array<{
    claim_text_a?: string | null;
    claim_text_b?: string | null;
    change_type: string;
    verdict_a?: string | null;
    verdict_b?: string | null;
    confidence_a?: number | null;
    confidence_b?: number | null;
    freshness_a?: number | null;
    freshness_b?: number | null;
    evidence_count_a: number;
    evidence_count_b: number;
  }>;
}

export interface CollabUserSession {
  id: string;
  email: string;
  display_name?: string | null;
  role: 'admin' | 'reviewer' | 'member';
  access_token: string;
}

export interface SharedReportItem {
  id: string;
  verification_job_id: string;
  owner_email: string;
  member_email: string;
  member_role: 'admin' | 'reviewer' | 'member';
  assigned_reviewer_email?: string | null;
  created_at: string;
}

export interface ReportCommentItem {
  id: string;
  verification_job_id: string;
  claim_id?: string | null;
  author_email: string;
  author_role: string;
  comment_type: 'comment' | 'review_note' | 'assignment';
  content: string;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  verification_job_id?: string | null;
  actor_email: string;
  actor_role: string;
  action: string;
  details?: Record<string, unknown> | null;
  created_at: string;
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
