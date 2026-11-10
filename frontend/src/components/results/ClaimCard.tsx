import React, { useState } from 'react';
import type { Claim } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  Clock,
  Globe,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Check,
} from 'lucide-react';
import { reverifyClaim } from '../../services/api';

interface ClaimCardProps {
  claim: Claim;
  index: number;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim, index }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isReverifying, setIsReverifying] = useState<boolean>(false);
  const [reverifiedSuccess, setReverifiedSuccess] = useState<boolean>(false);

  const handleReverify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsReverifying(true);
      await reverifyClaim(claim.id);
      setReverifiedSuccess(true);
      setTimeout(() => setReverifiedSuccess(false), 3000);
    } catch (err) {
      console.error('Re-verification failed:', err);
    } finally {
      setIsReverifying(false);
    }
  };

  // Hallucination risk heuristic
  const isHighRisk =
    claim.status === 'contradicted' ||
    claim.status === 'unsupported' ||
    claim.status === 'unverifiable';
  const isModerateRisk = claim.status === 'outdated' || claim.status === 'partially_supported';

  // Consensus calculation from evidence
  const totalEvidence = claim.evidence ? claim.evidence.length : 0;
  const supportingCount = claim.evidence ? claim.evidence.filter((e) => e.is_supporting).length : 0;
  const contradictingCount = claim.evidence
    ? claim.evidence.filter((e) => e.is_contradicting).length
    : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:border-slate-700 transition-all duration-200">
      {/* Header Row */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-slate-900/40 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-start gap-3 flex-1">
          <span className="text-xs font-mono font-bold text-slate-500 mt-1">
            #{index + 1}
          </span>
          <div className="space-y-1.5 flex-1">
            <p className="text-sm font-semibold text-white leading-relaxed">
              {claim.claim_text}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                {claim.category ? claim.category.replace('_', ' ').toUpperCase() : 'GENERAL FACT'}
              </span>
              {claim.is_time_sensitive && (
                <span className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                  <Clock className="w-3 h-3" /> Time-Sensitive
                </span>
              )}
              {isHighRisk && (
                <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-3 h-3" /> Hallucination Alert
                </span>
              )}
              {isModerateRisk && (
                <span className="flex items-center gap-1 text-[10px] text-amber-300 font-medium px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3" /> Knowledge Drift
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4">
          <StatusBadge status={claim.status} size="sm" />
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Freshness</div>
              <div className="text-sm font-bold text-white">
                {claim.freshness_score !== undefined ? `${Math.round(claim.freshness_score)}%` : '—'}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-slate-400 font-semibold">Confidence</div>
              <div className="text-sm font-bold text-cyan-400">
                {claim.confidence_score !== undefined ? `${Math.round(claim.confidence_score)}%` : '—'}
              </div>
            </div>
            <div className="text-slate-500 p-1">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-4 text-xs animate-fadeIn">
          {/* Explanation */}
          {claim.explanation && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-bold text-slate-300 uppercase tracking-wider block mb-1">
                Verification Analysis & Evidence Synthesis
              </span>
              <p className="text-slate-300 leading-relaxed">{claim.explanation}</p>
            </div>
          )}

          {/* Suggested Correction */}
          {claim.suggested_correction && (
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 flex items-start gap-3">
              <Lightbulb className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold text-cyan-300 uppercase tracking-wider block mb-1">
                  Suggested Factual Correction
                </span>
                <p className="leading-relaxed">{claim.suggested_correction}</p>
              </div>
            </div>
          )}

          {/* Consensus & Hallucination Assessment Bar */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                Multi-Source Consensus:
              </span>
              <span className="text-slate-200 font-mono">
                {supportingCount} Supporting vs {contradictingCount} Contradicting
              </span>
              {totalEvidence > 0 && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    supportingCount >= 2 && contradictingCount === 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : contradictingCount > 0
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {supportingCount >= 2 && contradictingCount === 0
                    ? 'High Consensus'
                    : contradictingCount > 0
                    ? 'Conflicting Consensus'
                    : 'Partial Consensus'}
                </span>
              )}
            </div>

            {/* Re-verify action button */}
            <button
              onClick={handleReverify}
              disabled={isReverifying || reverifiedSuccess}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 disabled:opacity-50"
            >
              {isReverifying ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                  <span>Re-verifying...</span>
                </>
              ) : reverifiedSuccess ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Re-verification Queued</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3 text-cyan-400" />
                  <span>Trigger Re-verification</span>
                </>
              )}
            </button>
          </div>

          {/* Evidence Sources */}
          {claim.evidence && claim.evidence.length > 0 ? (
            <div>
              <span className="font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Independent Evidence Citations ({claim.evidence.length})
              </span>
              <div className="space-y-2">
                {claim.evidence.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-200">
                          {ev.source_title || ev.source_domain}
                        </span>
                        {ev.is_primary_source && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-300 font-bold uppercase">
                            Primary Authority
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            ev.is_supporting
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : ev.is_contradicting
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-slate-700/50 text-slate-300'
                          }`}
                        >
                          {ev.is_supporting
                            ? 'Supports'
                            : ev.is_contradicting
                            ? 'Contradicts'
                            : 'Context'}
                        </span>
                        {ev.reliability_score !== undefined && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Quality: {Math.round(ev.reliability_score)}%
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 italic">"{ev.content_snippet}"</p>
                    </div>

                    <a
                      href={ev.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex-shrink-0"
                      title="Open source URL"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 italic">No external web evidence attached yet.</p>
          )}
        </div>
      )}
    </div>
  );
};
