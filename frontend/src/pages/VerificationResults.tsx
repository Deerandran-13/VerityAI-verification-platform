import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { OverviewCards } from '../components/results/OverviewCards';
import { ClaimsList } from '../components/results/ClaimsList';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useVerification } from '../hooks/useVerification';
import { ArrowLeft, Download, RefreshCw, Search, Cpu, Bell, Check, FileSpreadsheet } from 'lucide-react';
import { getModelDisagreement, trackClaim } from '../services/api';
import type { VerificationJob } from '../types';

// Mock sample job when no ID provided to let user see rich results immediately
const MOCK_JOB: VerificationJob = {
  id: 'demo-sample-job',
  original_text:
    'Python 3.12 was released in October 2023. The EU AI Act entered into force in 2024. GPT-4 API costs $30 per 1M tokens.',
  mode: 'standard',
  status: 'completed',
  overall_freshness_score: 91.5,
  overall_confidence_score: 88.0,
  total_claims: 3,
  verified_claims: 2,
  outdated_claims: 1,
  contradicted_claims: 0,
  unsupported_claims: 0,
  processing_time_ms: 1840,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  claims: [
    {
      id: 'c-1',
      claim_text: 'Python 3.12 was released in October 2023 with isolated subinterpreters.',
      original_sentence: 'Python 3.12 was released in October 2023 with isolated subinterpreters.',
      position_in_text: 0,
      category: 'software_version',
      is_time_sensitive: true,
      is_historical: true,
      is_vague: false,
      status: 'verified',
      freshness_score: 96.0,
      confidence_score: 98.0,
      explanation: 'Official Python Software Foundation release notes verify version 3.12 was released on October 2, 2023.',
      suggested_correction: undefined,
      evidence: [
        {
          id: 'ev-1',
          source_title: 'Python 3.12 Release Notes - PSF',
          source_url: 'https://docs.python.org/3/whatsnew/3.12.html',
          source_domain: 'docs.python.org',
          publication_date: '2023-10-02',
          retrieval_date: new Date().toISOString(),
          content_snippet: 'Python 3.12.0 is the newest major release of the Python programming language, released on October 2, 2023.',
          relevance_score: 0.99,
          is_supporting: true,
          is_contradicting: false,
          is_primary_source: true,
          reliability_score: 100.0,
        },
      ],
    },
    {
      id: 'c-2',
      claim_text: 'GPT-4 API prompt pricing is $30 per million prompt tokens.',
      original_sentence: 'GPT-4 API prompt pricing is $30 per million prompt tokens.',
      position_in_text: 1,
      category: 'pricing',
      is_time_sensitive: true,
      is_historical: false,
      is_vague: false,
      status: 'outdated',
      freshness_score: 42.0,
      confidence_score: 90.0,
      explanation: 'OpenAI has since reduced GPT-4 pricing with GPT-4o / GPT-4 Turbo models costing significantly less ($2.50-$5.00/1M tokens).',
      suggested_correction: 'GPT-4o API prompt tokens now cost $2.50 per 1M tokens as of late 2024 pricing updates.',
      evidence: [
        {
          id: 'ev-2',
          source_title: 'OpenAI Pricing Page',
          source_url: 'https://openai.com/api/pricing/',
          source_domain: 'openai.com',
          publication_date: '2024-11-01',
          retrieval_date: new Date().toISOString(),
          content_snippet: 'GPT-4o: $2.50 / 1M input tokens, $10.00 / 1M output tokens.',
          relevance_score: 0.95,
          is_supporting: false,
          is_contradicting: true,
          is_primary_source: true,
          reliability_score: 95.0,
        },
      ],
    },
    {
      id: 'c-3',
      claim_text: 'The EU AI Act entered into force in 2024.',
      original_sentence: 'The EU AI Act entered into force in 2024.',
      position_in_text: 2,
      category: 'regulation',
      is_time_sensitive: true,
      is_historical: true,
      is_vague: false,
      status: 'verified',
      freshness_score: 94.0,
      confidence_score: 95.0,
      explanation: 'The European Union AI Act officially entered into force on August 1, 2024.',
      suggested_correction: undefined,
      evidence: [
        {
          id: 'ev-3',
          source_title: 'European Commission - European Artificial Intelligence Act',
          source_url: 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
          source_domain: 'ec.europa.eu',
          publication_date: '2024-08-01',
          retrieval_date: new Date().toISOString(),
          content_snippet: 'The European AI Act entered into force on 1 August 2024, setting out harmonised rules on artificial intelligence.',
          relevance_score: 0.98,
          is_supporting: true,
          is_contradicting: false,
          is_primary_source: true,
          reliability_score: 100.0,
        },
      ],
    },
  ],
};

export const VerificationResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id') || searchParams.get('id');
  const { job, isLoading, error, fetchJob, setJob } = useVerification();

  useEffect(() => {
    if (jobId) {
      fetchJob(jobId);
    } else {
      setJob(MOCK_JOB);
    }
  }, [jobId]);

  // Auto-poll if job is still in progress
  useEffect(() => {
    if (!jobId || !job) return;
    if (job.status === 'pending' || job.status === 'processing') {
      const timer = setTimeout(() => {
        fetchJob(jobId);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [jobId, job?.status]);

  const [showDisagreement, setShowDisagreement] = useState<boolean>(false);
  const [disagreementData, setDisagreementData] = useState<any>(null);
  const [loadingDisagreement, setLoadingDisagreement] = useState<boolean>(false);
  const [trackedScheduled, setTrackedScheduled] = useState<boolean>(false);

  const handleFetchDisagreement = async () => {
    if (!jobId) return;
    try {
      setLoadingDisagreement(true);
      const data = await getModelDisagreement(jobId);
      setDisagreementData(data);
      setShowDisagreement(true);
    } catch (err) {
      console.error('Failed to load disagreement analysis:', err);
    } finally {
      setLoadingDisagreement(false);
    }
  };

  const handleTrackAllClaims = async () => {
    if (!activeJob.claims || activeJob.claims.length === 0) return;
    try {
      for (const claim of activeJob.claims) {
        await trackClaim(claim.id, 'daily');
      }
      setTrackedScheduled(true);
      setTimeout(() => setTrackedScheduled(false), 3500);
    } catch (err) {
      console.error('Failed to schedule tracking:', err);
    }
  };

  const activeJob = job || MOCK_JOB;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/workspace"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Verification Intelligence Report
            </h1>
            <span className="text-xs font-mono text-slate-500">
              JOB ID: {activeJob.id} • {new Date(activeJob.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/evidence"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-semibold transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Explore Evidence</span>
          </Link>
          {jobId && (
            <>
              <Link
                to={`/graph?job_id=${jobId}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-semibold transition-colors"
              >
                <span>Claim Graph</span>
              </Link>
              <Link
                to={`/compare?job_a=${jobId}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-semibold transition-colors"
              >
                <span>Compare</span>
              </Link>
              <Link
                to={`/collaborate?job_id=${jobId}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-semibold transition-colors"
              >
                <span>Team Review</span>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              if (jobId) fetchJob(jobId);
            }}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Refresh verification results"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
            <button
              type="button"
              onClick={handleTrackAllClaims}
              disabled={trackedScheduled}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-amber-400 text-xs font-semibold transition-colors"
              title="Schedule automated expiry monitoring for these claims"
            >
              {trackedScheduled ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Monitoring Active</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span>Track Expiry</span>
                </>
              )}
            </button>

            {jobId && (
              <button
                type="button"
                onClick={handleFetchDisagreement}
                disabled={loadingDisagreement}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-400 text-xs font-semibold transition-colors"
                title="Evaluate inter-model disagreement via Bifrost"
              >
                <Cpu className={`w-3.5 h-3.5 ${loadingDisagreement ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
                <span>{loadingDisagreement ? 'Comparing...' : 'Model Consensus'}</span>
              </button>
            )}

            <div className="flex items-center gap-1.5">
              <a
                href={jobId ? `/api/v1/verify/${jobId}/export?format=html` : '#'}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  if (!jobId) {
                    e.preventDefault();
                    window.print();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>HTML / PDF</span>
              </a>
              {jobId && (
                <>
                  <a
                    href={`/api/v1/verify/${jobId}/export?format=pdf`}
                    download
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-cyan-400 text-xs font-semibold transition-colors"
                    title="Download verification report as PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-rose-400" />
                    <span>PDF</span>
                  </a>
                  <a
                    href={`/api/v1/verify/${jobId}/export?format=csv`}
                    download
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-cyan-400 text-xs font-semibold transition-colors"
                    title="Download verification results as CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CSV</span>
                  </a>
                  <a
                    href={`/api/v1/verify/${jobId}/export?format=json`}
                    download
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-cyan-400 text-xs font-semibold transition-colors"
                    title="Download raw verification JSON payload"
                  >
                    <span>JSON</span>
                  </a>
                </>
              )}
            </div>
        </div>
      </div>

      {isLoading && <LoadingSpinner label="Loading verification results..." />}
      {error && <ErrorMessage message={error} />}

      {/* Overview Cards Row */}
      <OverviewCards job={activeJob} />

      {/* Multi-Model Disagreement Analysis Panel */}
      {showDisagreement && disagreementData && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Multi-Model Disagreement Analysis (Bifrost Gateway)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {disagreementData.consensus_status}
              </span>
              <button
                onClick={() => setShowDisagreement(false)}
                className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1"
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Primary Evaluator</span>
              <p className="font-bold text-cyan-300 mt-0.5">{disagreementData.primary_model}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Secondary Auditor</span>
              <p className="font-bold text-purple-300 mt-0.5">{disagreementData.secondary_evaluator}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Average Disagreement Index</span>
              <p className="font-bold text-emerald-400 mt-0.5">{disagreementData.average_disagreement_score}% (Low)</p>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Cross-Model Claim Comparisons:</span>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {(disagreementData.claims_comparison || []).map((item: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">"{item.claim_text}"</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.divergence_level}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span>Primary: <strong className="text-cyan-300">{item.primary_verdict}</strong></span>
                    <span>Secondary: <strong className="text-purple-300">{item.secondary_verdict}</strong></span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Extracted Claims Section */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Audited Claims ({activeJob.claims.length})
          </h3>
          <span className="text-xs text-slate-500">Click any claim to inspect evidence snippets</span>
        </div>

        <ClaimsList claims={activeJob.claims} />
      </div>
    </div>
  );
};

