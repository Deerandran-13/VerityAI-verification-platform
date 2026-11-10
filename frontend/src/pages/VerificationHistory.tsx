import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getHistory } from '../services/api';
import type { VerificationJob } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Archive, Search, ArrowRight, RefreshCw, Calendar } from 'lucide-react';

const MOCK_HISTORY: VerificationJob[] = [
  {
    id: 'job-9821',
    original_text: 'Python 3.12 release notes and new GIL features summary...',
    mode: 'standard',
    status: 'completed',
    overall_freshness_score: 94.0,
    overall_confidence_score: 96.0,
    total_claims: 4,
    verified_claims: 3,
    outdated_claims: 1,
    contradicted_claims: 0,
    unsupported_claims: 0,
    claims: [],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'job-9820',
    original_text: 'EU AI Act compliance timeline and high-risk classifications...',
    mode: 'standard',
    status: 'completed',
    overall_freshness_score: 92.5,
    overall_confidence_score: 95.0,
    total_claims: 5,
    verified_claims: 4,
    outdated_claims: 1,
    contradicted_claims: 0,
    unsupported_claims: 0,
    claims: [],
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'job-9819',
    original_text: 'GPT-4 API pricing, token costs, and rate limit deprecations...',
    mode: 'adversarial',
    status: 'completed',
    overall_freshness_score: 48.0,
    overall_confidence_score: 89.0,
    total_claims: 3,
    verified_claims: 1,
    outdated_claims: 2,
    contradicted_claims: 0,
    unsupported_claims: 0,
    claims: [],
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const VerificationHistory: React.FC = () => {
  const [jobs, setJobs] = useState<VerificationJob[]>(MOCK_HISTORY);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPastJobs = async () => {
    setLoading(true);
    try {
      const data = await getHistory(1, 20);
      if (data && data.items && data.items.length > 0) {
        setJobs(data.items);
      }
    } catch {
      // Use fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastJobs();
  }, []);

  const filteredJobs = jobs.filter(
    (j) =>
      j.original_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Verification History</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Access previous verification jobs, review past freshness reports, and track temporal knowledge drift.
          </p>
        </div>

        <button
          onClick={fetchPastJobs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search historical jobs by ID or query text..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
      </div>

      {/* Jobs List */}
      {loading ? (
        <LoadingSpinner label="Retrieving historical logs..." />
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold text-cyan-400">{job.id}</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {job.mode} MODE
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                    <Calendar className="w-3 h-3" />
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-1">{job.original_text}</p>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6">
                <div className="text-right">
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">Freshness</div>
                  <div className="text-sm font-bold text-white">
                    {job.overall_freshness_score ? `${Math.round(job.overall_freshness_score)}%` : '—'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase text-slate-500 font-semibold">Claims</div>
                  <div className="text-sm font-bold text-slate-300">{job.total_claims}</div>
                </div>

                <Link
                  to={`/results?job_id=${job.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  <span>View</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

