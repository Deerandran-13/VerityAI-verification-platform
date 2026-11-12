import React, { useEffect, useState } from 'react';
import type {
  Claim,
  ClaimConflictAnalysis,
  ClaimTimelineResponse,
  HumanFeedbackItem,
} from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lightbulb,
  Clock,
  Globe,
  AlertTriangle,
  RefreshCw,
  Check,
  MessageSquarePlus,
  GitFork,
} from 'lucide-react';
import {
  getClaimConflicts,
  getClaimTimeline,
  listClaimFeedback,
  reverifyClaim,
  submitClaimFeedback,
} from '../../services/api';

interface ClaimCardProps {
  claim: Claim;
  index: number;
}

export const ClaimCard: React.FC<ClaimCardProps> = ({ claim, index }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'conflicts' | 'review'>('overview');
  const [isReverifying, setIsReverifying] = useState<boolean>(false);
  const [reverifiedSuccess, setReverifiedSuccess] = useState<boolean>(false);

  const [timeline, setTimeline] = useState<ClaimTimelineResponse | null>(null);
  const [conflicts, setConflicts] = useState<ClaimConflictAnalysis | null>(null);
  const [feedbackList, setFeedbackList] = useState<HumanFeedbackItem[]>([]);
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [decision, setDecision] = useState<'correct' | 'incorrect' | 'needs_review'>('needs_review');
  const [feedbackExplanation, setFeedbackExplanation] = useState('');
  const [feedbackUrl, setFeedbackUrl] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isExpanded || claim.id.startsWith('c-')) return;
    if (activeTab === 'timeline' && !timeline) {
      getClaimTimeline(claim.id).then(setTimeline).catch(() => {});
    } else if (activeTab === 'conflicts' && !conflicts) {
      getClaimConflicts(claim.id).then(setConflicts).catch(() => {});
    } else if (activeTab === 'review') {
      listClaimFeedback(claim.id).then(setFeedbackList).catch(() => {});
    }
  }, [isExpanded, activeTab, claim.id]);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerEmail.trim() || claim.id.startsWith('c-')) return;
    setFeedbackMsg(null);
    try {
      const created = await submitClaimFeedback(claim.id, {
        reviewer_email: reviewerEmail.trim(),
        decision,
        explanation: feedbackExplanation.trim() || undefined,
        supporting_url: feedbackUrl.trim() || undefined,
      });
      setFeedbackList((prev) => [created, ...prev]);
      setFeedbackExplanation('');
      setFeedbackUrl('');
      setFeedbackMsg('Feedback logged for audit. Original verdict remains unchanged until verified.');
    } catch {
      setFeedbackMsg('Failed to submit feedback.');
    }
  };

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
              {claim.page_number != null && (
                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono text-[10px]">
                  Page {claim.page_number}
                </span>
              )}
              {claim.section_title && (
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 font-mono text-[10px] truncate max-w-[200px]">
                  § {claim.section_title}
                </span>
              )}
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
              {claim.uncertainty_level && claim.uncertainty_level !== 'low' && (
                <span
                  className="flex items-center gap-1 text-[10px] text-purple-300 font-medium px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/25 capitalize"
                  title={claim.uncertainty_reason || 'Evidence uncertainty'}
                >
                  Uncertainty: {claim.uncertainty_level}
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
          {/* Sub-navigation tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
            {[
              { id: 'overview', label: 'Overview & Evidence' },
              { id: 'timeline', label: 'Evidence Timeline' },
              { id: 'conflicts', label: 'Fact Conflicts' },
              { id: 'review', label: 'Human Review' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Uncertainty Quantification Box */}
          {(claim.uncertainty_reason || claim.evidence_strength !== undefined) && activeTab === 'overview' && (
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <span className="font-bold text-purple-300 uppercase tracking-wider block">
                  Uncertainty & Evidence Strength ({claim.uncertainty_level || 'low'})
                </span>
                {claim.uncertainty_reason && (
                  <p className="text-slate-300">{claim.uncertainty_reason}</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-right font-mono shrink-0">
                <div>
                  <div className="text-[10px] text-slate-400">Model Conf.</div>
                  <div className="text-cyan-300 font-bold">{claim.confidence_score ?? '—'}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Evidence Str.</div>
                  <div className="text-purple-300 font-bold">
                    {claim.evidence_strength != null ? `${Math.round(claim.evidence_strength)}%` : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {timeline ? (
                <>
                  {timeline.fact_changes.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                      <strong className="block mb-1">Fact Changes Over Time:</strong>
                      {timeline.fact_changes.map((fc, i) => (
                        <div key={i}>• {fc}</div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2 border-l-2 border-slate-700 pl-4">
                    {timeline.timeline.map((ev) => (
                      <div key={ev.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span className="font-mono text-cyan-300">{new Date(ev.timestamp).toLocaleDateString()}</span>
                          <span className="uppercase text-[10px]">{ev.event_type === 'version_snapshot' ? `Version #${ev.version_number}` : ev.stance}</span>
                        </div>
                        <div className="text-slate-200 font-medium">{ev.source_title || ev.change_reason || 'Snapshot'}</div>
                        {ev.content_snippet && <p className="text-slate-400 mt-1">{ev.content_snippet}</p>}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-slate-400">Timeline is available for persisted verification jobs.</p>
              )}
            </div>
          )}

          {activeTab === 'conflicts' && (
            <div className="space-y-3">
              {conflicts ? (
                <div className="space-y-3">
                  <p className="text-slate-200 flex items-center gap-1.5">
                    <GitFork className="w-3.5 h-3.5 text-amber-400" />
                    {conflicts.summary}
                  </p>
                  {conflicts.conflict_reasons.length > 0 && (
                    <ul className="list-disc pl-5 text-amber-300 space-y-0.5">
                      {conflicts.conflict_reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <div className="font-semibold text-emerald-400 mb-1">Supporting ({conflicts.supporting_side.length})</div>
                      {conflicts.supporting_side.map((s, i) => (
                        <div key={i} className="text-slate-300 mb-1">• {s.source_domain}: {s.snippet?.slice(0, 110)}</div>
                      ))}
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                      <div className="font-semibold text-red-400 mb-1">Contradicting ({conflicts.contradicting_side.length})</div>
                      {conflicts.contradicting_side.map((c, i) => (
                        <div key={i} className="text-slate-300 mb-1">• {c.source_domain}: {c.snippet?.slice(0, 110)}</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400">Conflict analysis is available for persisted verification jobs.</p>
              )}
            </div>
          )}

          {activeTab === 'review' && (
            <div className="space-y-4">
              <form onSubmit={handleFeedbackSubmit} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <MessageSquarePlus className="w-3.5 h-3.5 text-cyan-400" /> Submit Human Review Feedback
                </div>
                <p className="text-[11px] text-slate-400">
                  Feedback is recorded in the audit log and evaluated for quality review; unverified feedback never auto-changes a verdict.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Reviewer email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    className="bg-[#0a0e1a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value as any)}
                    className="bg-[#0a0e1a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="correct">Verdict is Correct</option>
                    <option value="incorrect">Verdict is Incorrect</option>
                    <option value="needs_review">Requires Further Review</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Explanation or reviewer rationale"
                  value={feedbackExplanation}
                  onChange={(e) => setFeedbackExplanation(e.target.value)}
                  className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
                <input
                  type="url"
                  placeholder="Supporting evidence URL (optional)"
                  value={feedbackUrl}
                  onChange={(e) => setFeedbackUrl(e.target.value)}
                  className="w-full bg-[#0a0e1a] border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold"
                >
                  Log Feedback
                </button>
                {feedbackMsg && <p className="text-emerald-300 text-[11px]">{feedbackMsg}</p>}
              </form>

              {feedbackList.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-400 uppercase text-[10px]">Feedback Audit History</div>
                  {feedbackList.map((f) => (
                    <div key={f.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="flex justify-between text-slate-400">
                        <span>{f.reviewer_email} • <strong className="text-cyan-300">{f.decision}</strong></span>
                        <span>{new Date(f.created_at).toLocaleString()}</span>
                      </div>
                      {f.explanation && <p className="text-slate-300 mt-1">{f.explanation}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
          <>
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
          </>
          )}
        </div>
      )}
    </div>
  );
};
