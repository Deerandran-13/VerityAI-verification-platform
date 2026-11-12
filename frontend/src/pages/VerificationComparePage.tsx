import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitCompare, ArrowRightLeft, RefreshCw } from 'lucide-react';
import { compareVerifications, getHistory } from '../services/api';
import type { VerificationComparisonResponse, VerificationJob } from '../types';

export const VerificationComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<VerificationJob[]>([]);
  const [jobA, setJobA] = useState(searchParams.get('job_a') || '');
  const [jobB, setJobB] = useState(searchParams.get('job_b') || '');
  const [result, setResult] = useState<VerificationComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHistory(1, 50)
      .then((res) => {
        const list: VerificationJob[] = res.items || res || [];
        setJobs(list);
        if (!jobA && list.length >= 2) {
          setJobA(list[1].id);
          setJobB(list[0].id);
        } else if (!jobA && list.length === 1) {
          setJobA(list[0].id);
          setJobB(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleCompare = async () => {
    if (!jobA || !jobB) return;
    setSearchParams({ job_a: jobA, job_b: jobB }, { replace: true });
    setLoading(true);
    setError(null);
    try {
      const data = await compareVerifications(jobA, jobB);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to compare verification jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobA && jobB) {
      handleCompare();
    }
  }, [jobA, jobB]);

  const badgeClass = (changeType: string) => {
    switch (changeType) {
      case 'newly_supported':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'newly_contradicted':
        return 'bg-red-500/10 text-red-300 border-red-500/30';
      case 'outdated':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'changed':
      case 'added':
      case 'removed':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-cyan-400" />
              Verification Comparison
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Compare claim extraction, verdict shifts, evidence counts, freshness, and confidence across two runs.
            </p>
          </div>
          <button
            onClick={handleCompare}
            disabled={loading || !jobA || !jobB}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
            Compare Runs
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Baseline Run (Job A)</label>
            <select
              value={jobA}
              onChange={(e) => setJobA(e.target.value)}
              className="w-full bg-[#0a0e1a] border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2"
            >
              <option value="">Select baseline job...</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {new Date(j.created_at).toLocaleString()} — {j.original_text.slice(0, 45)}...
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Comparison Run (Job B)</label>
            <select
              value={jobB}
              onChange={(e) => setJobB(e.target.value)}
              className="w-full bg-[#0a0e1a] border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2"
            >
              <option value="">Select comparison job...</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {new Date(j.created_at).toLocaleString()} — {j.original_text.slice(0, 45)}...
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(result.summary_counts).map(([key, value]) => (
              <div key={key} className="bg-[#111827] border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{value}</div>
                <div className="text-xs text-slate-400 capitalize">{key.replace('_', ' ')}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0a0e1a] text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Claim</th>
                    <th className="px-4 py-3">Change</th>
                    <th className="px-4 py-3">Job A Verdict</th>
                    <th className="px-4 py-3">Job B Verdict</th>
                    <th className="px-4 py-3">Evidence (A / B)</th>
                    <th className="px-4 py-3">Freshness (A / B)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {result.claim_diffs.map((diff, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-200 max-w-md">{diff.claim_text_b || diff.claim_text_a}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs border capitalize ${badgeClass(diff.change_type)}`}>
                          {diff.change_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{diff.verdict_a || '—'}</td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{diff.verdict_b || '—'}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {diff.evidence_count_a} / {diff.evidence_count_b}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {diff.freshness_a ?? '—'} / {diff.freshness_b ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

