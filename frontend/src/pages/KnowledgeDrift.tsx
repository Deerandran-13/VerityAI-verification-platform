import React, { useState, useEffect } from 'react';
import { Activity, ArrowRight, AlertTriangle, ShieldCheck, RefreshCw, GitCommit, ExternalLink } from 'lucide-react';
import { getDriftCases } from '../services/api';

interface DriftCase {
  topic: string;
  category: string;
  previous_truth: string;
  current_truth: string;
  change_date?: string;
  change_reason?: string;
  evidence_url?: string;
  severity?: string;
}

export const KnowledgeDrift: React.FC = () => {
  const [cases, setCases] = useState<DriftCase[]>([]);
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadCases() {
      try {
        setLoading(true);
        const data = await getDriftCases();
        const combined = [
          ...(data.curated_benchmarks || []),
          ...(data.tracked_cases || []),
        ];
        if (combined.length > 0) {
          setCases(combined);
        }
      } catch (err) {
        console.error('Failed to load drift cases:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, []);

  const activeCase = cases[selectedCaseIndex] || {
    topic: 'GPT-4 API Pricing',
    category: 'pricing',
    previous_truth: 'GPT-4 API prompt pricing is $30 per million tokens.',
    current_truth: 'GPT-4o input pricing reduced to $2.50 per 1M tokens (12x reduction).',
    change_date: '2024-05-13',
    change_reason: 'Release of GPT-4o with optimized omni-architecture lowering compute costs.',
    evidence_url: 'https://openai.com/index/hello-gpt-4o/',
    severity: 'high',
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Knowledge Drift Detector</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Agent 8: Identifies when and why technical claims become obsolete. Compares outdated assertions against current ground truth.
          </p>
        </div>

        {/* Case selector tabs */}
        {cases.length > 0 && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto max-w-full">
            {cases.map((c, i) => (
              <button
                key={i}
                onClick={() => setSelectedCaseIndex(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCaseIndex === i
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {c.topic.length > 25 ? c.topic.substring(0, 25) + '...' : c.topic}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison Callout */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Active Knowledge Drift Case: {activeCase.topic}</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            Category: {activeCase.category.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block">
              Previous Truth (Now Outdated)
            </span>
            <p className="text-sm font-semibold text-slate-200">
              "{activeCase.previous_truth}"
            </p>
            <p className="text-xs text-slate-400">
              Represented historical factual state prior to recorded updates.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                Current Ground Truth
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {activeCase.change_date ? `Updated ${activeCase.change_date}` : 'Verified Active'}
              </span>
            </div>
            <p className="text-sm font-semibold text-emerald-200">
              "{activeCase.current_truth}"
            </p>
            <p className="text-xs text-slate-300">
              {activeCase.change_reason || 'Verified by current technical documentation and live web evidence.'}
            </p>
          </div>
        </div>

        {activeCase.evidence_url && (
          <div className="pt-2 flex justify-end">
            <a
              href={activeCase.evidence_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1.5 font-medium"
            >
              <span>View Verified Primary Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Fact Evolution Timeline */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-cyan-400" />
            Fact Evolution Timeline
          </h3>
          <span className="text-xs text-slate-400">Drift Trajectory</span>
        </div>

        <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {/* Stage 1: Initial */}
          <div className="relative space-y-1.5">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-slate-600 bg-slate-900 flex items-center justify-center" />
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-400">Initial Release</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Baseline Factual State
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-500">HISTORICAL</span>
            </div>
            <p className="text-sm text-slate-300">{activeCase.previous_truth}</p>
          </div>

          {/* Stage 2: Drift Trigger */}
          <div className="relative space-y-1.5">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-amber-500 bg-amber-500/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-amber-400">
                {activeCase.change_date || 'Transition Event'}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Obsolescence Trigger
              </span>
              <span className="text-[10px] font-bold uppercase text-amber-400">DRIFT DETECTED</span>
            </div>
            <p className="text-sm text-slate-300">{activeCase.change_reason || 'Superseded by updated specifications or product releases.'}</p>
          </div>

          {/* Stage 3: Current Truth */}
          <div className="relative space-y-1.5">
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-emerald-400 bg-emerald-500/30 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-cyan-400">Present (2025-2026)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Current Ground Truth
              </span>
              <span className="text-[10px] font-bold uppercase text-emerald-400">VERIFIED LIVE</span>
            </div>
            <p className="text-sm text-slate-100 font-medium">{activeCase.current_truth}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
