import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitBranch, AlertTriangle, CheckCircle2, Info, ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import { getClaimDependencyGraph, getHistory, getJobConflicts } from '../services/api';
import type { ClaimConflictAnalysis, ClaimDependencyGraph, ClaimGraphNode, VerificationJob } from '../types';

const DEMO_GRAPH: ClaimDependencyGraph = {
  job_id: 'demo-graph',
  total_claims: 3,
  relationship_count: 3,
  impacted_claim_ids: ['demo-c3'],
  nodes: [
    {
      id: 'demo-c1',
      type: 'claim',
      label: 'Claim #1',
      text: 'Python 3.12 was released in October 2023 with PEP 684 subinterpreters.',
      verdict: 'verified',
      confidence: 96,
      freshness: 95,
      uncertainty_level: 'low',
      impacted_by_dependency: false,
      evidence_count: 1,
    },
    {
      id: 'demo-c2',
      type: 'claim',
      label: 'Claim #2',
      text: 'GPT-4 API input pricing is $30 per 1M tokens in 2026.',
      verdict: 'outdated',
      confidence: 91,
      freshness: 38,
      uncertainty_level: 'moderate',
      impacted_by_dependency: false,
      evidence_count: 1,
    },
    {
      id: 'demo-c3',
      type: 'claim',
      label: 'Claim #3',
      text: 'Therefore, monthly inference cost for 10M tokens is $300.',
      verdict: 'outdated',
      confidence: 82,
      freshness: 40,
      uncertainty_level: 'moderate',
      impacted_by_dependency: true,
      evidence_count: 0,
    },
    {
      id: 'demo-ev1',
      type: 'evidence',
      label: 'docs.python.org',
      text: 'Python 3.12.0 Release Notes (Oct 2, 2023)',
      url: 'https://docs.python.org/3/whatsnew/3.12.html',
      quality_score: 94,
      bias_label: 'neutral_or_unclear',
    },
    {
      id: 'demo-ev2',
      type: 'evidence',
      label: 'openai.com',
      text: 'OpenAI API Pricing (GPT-4o: $2.50 / 1M input tokens)',
      url: 'https://openai.com/api/pricing/',
      quality_score: 96,
      bias_label: 'neutral_or_unclear',
    },
  ],
  edges: [
    {
      source: 'demo-ev1',
      target: 'demo-c1',
      relationship: 'supports_evidence',
      confidence: 0.96,
      explanation: 'Official PSF release notes confirm Python 3.12 release date and PEP 684.',
    },
    {
      source: 'demo-ev2',
      target: 'demo-c2',
      relationship: 'contradicts_evidence',
      confidence: 0.95,
      explanation: 'Current OpenAI pricing supersedes legacy $30/1M pricing.',
    },
    {
      source: 'demo-c2',
      target: 'demo-c3',
      relationship: 'dependent',
      confidence: 0.9,
      explanation: 'Claim #3 calculates cost directly from Claim #2 pricing.',
    },
    {
      source: 'demo-c1',
      target: 'demo-c3',
      relationship: 'overlapping',
      confidence: 0.65,
      explanation: 'Both claims belong to the same AI deployment cost summary.',
    },
  ],
};

const DEMO_CONFLICTS: ClaimConflictAnalysis[] = [
  {
    claim_id: 'demo-c2',
    claim_text: 'GPT-4 API input pricing is $30 per 1M tokens in 2026.',
    current_status: 'outdated',
    has_conflict: true,
    conflict_reasons: ['Different publication dates: 2023 launch pricing vs. 2024+ GPT-4o pricing'],
    supporting_side: [
      {
        source_domain: 'archive.blog.example',
        snippet: 'Original GPT-4 8K launched at $30 per million input tokens in 2023.',
      },
    ],
    contradicting_side: [
      {
        source_domain: 'openai.com',
        snippet: 'GPT-4o input tokens cost $2.50 per 1M tokens.',
      },
    ],
    summary: 'Historical launch pricing conflicts with current GPT-4o pricing.',
  },
];

export const ClaimGraphPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<VerificationJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(searchParams.get('job_id') || '');
  const [graph, setGraph] = useState<ClaimDependencyGraph | null>(null);
  const [conflicts, setConflicts] = useState<ClaimConflictAnalysis[]>([]);
  const [selectedNode, setSelectedNode] = useState<ClaimGraphNode | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDemoGraph = () => {
    setIsDemoMode(true);
    setError(null);
    setGraph(DEMO_GRAPH);
    setConflicts(DEMO_CONFLICTS);
    setSelectedNode(DEMO_GRAPH.nodes.find((n) => n.id === 'demo-c3') || DEMO_GRAPH.nodes[0]);
  };

  useEffect(() => {
    getHistory(1, 30)
      .then((res) => {
        const list = res.items || res || [];
        setJobs(list);
        if (!selectedJobId && list.length > 0) {
          setSelectedJobId(list[0].id);
        } else if (!selectedJobId && list.length === 0) {
          loadDemoGraph();
        }
      })
      .catch(() => {
        if (!selectedJobId) loadDemoGraph();
      });
  }, []);

  useEffect(() => {
    if (!selectedJobId) return;
    setIsDemoMode(false);
    setSearchParams({ job_id: selectedJobId }, { replace: true });
    setLoading(true);
    setError(null);
    Promise.all([getClaimDependencyGraph(selectedJobId), getJobConflicts(selectedJobId)])
      .then(([g, c]) => {
        setGraph(g);
        setConflicts(c.claims || []);
        const firstClaim = g.nodes.find((n) => n.type === 'claim') || null;
        setSelectedNode(firstClaim);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'Failed to load claim dependency graph. You can load the Demo Graph instead.');
      })
      .finally(() => setLoading(false));
  }, [selectedJobId]);

  const layout = useMemo(() => {
    if (!graph) return { positions: new Map<string, { x: number; y: number }>(), width: 860, height: 480 };
    const claimNodes = graph.nodes.filter((n) => n.type === 'claim');
    const evidenceNodes = graph.nodes.filter((n) => n.type === 'evidence');
    const positions = new Map<string, { x: number; y: number }>();

    const height = Math.max(460, Math.max(claimNodes.length, evidenceNodes.length) * 84 + 80);
    const width = 880;

    claimNodes.forEach((n, idx) => {
      const y = ((idx + 1) / (claimNodes.length + 1)) * (height - 40) + 20;
      const x = 180 + (idx % 2) * 140;
      positions.set(n.id, { x, y });
    });

    evidenceNodes.forEach((n, idx) => {
      const y = ((idx + 1) / (evidenceNodes.length + 1)) * (height - 40) + 20;
      const x = 660 + (idx % 2) * 90;
      positions.set(n.id, { x, y });
    });

    return { positions, width, height };
  }, [graph]);

  const edgeColor = (relType: string) => {
    switch (relType) {
      case 'supporting':
        return '#10b981';
      case 'contradicting':
        return '#ef4444';
      case 'dependent':
        return '#f59e0b';
      case 'overlapping':
        return '#06b6d4';
      default:
        return '#64748b';
    }
  };

  const nodeFill = (node: ClaimGraphNode) => {
    if (node.type === 'evidence') {
      return '#1e293b';
    }
    switch (node.verdict) {
      case 'verified':
      case 'historically_correct':
        return '#065f46';
      case 'contradicted':
        return '#7f1d1d';
      case 'outdated':
        return '#78350f';
      default:
        return '#1e3a5f';
    }
  };

  const conflictedClaims = conflicts.filter((c) => c.has_conflict);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] border border-slate-800 rounded-xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            Claim Dependency Graph & Conflict Map
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Inspect supporting, contradicting, dependent, and overlapping claim relationships alongside evidence links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-mono border ${
              isDemoMode
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {isDemoMode ? 'ILLUSTRATIVE DEMO GRAPH' : 'LIVE BACKEND GRAPH'}
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedJobId('');
              loadDemoGraph();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Demo Graph</span>
          </button>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="bg-[#0a0e1a] border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 max-w-xs"
          >
            <option value="">Select verification job...</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.original_text.slice(0, 48)}... ({new Date(j.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-12 text-center text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          Building Claim Dependency Graph...
        </div>
      ) : graph && graph.nodes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-xl p-4 overflow-x-auto">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mb-3">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Supporting</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Contradicting</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Dependent</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Overlapping</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> Evidence Link</span>
            </div>

            <svg width={layout.width} height={layout.height} className="bg-[#0a0e1a] rounded-lg border border-slate-800/80">
              {graph.edges.map((edge, idx) => {
                const p1 = layout.positions.get(edge.source);
                const p2 = layout.positions.get(edge.target);
                if (!p1 || !p2) return null;
                return (
                  <g key={`${edge.source}-${edge.target}-${idx}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={edgeColor(edge.relationship)}
                      strokeWidth={edge.relationship.includes('evidence') || edge.relationship === 'references' ? 1.2 : 2.2}
                      strokeDasharray={edge.relationship === 'dependent' ? '5 4' : undefined}
                      opacity={0.75}
                    />
                  </g>
                );
              })}

              {graph.nodes.map((node) => {
                const pos = layout.positions.get(node.id);
                if (!pos) return null;
                const isSelected = selectedNode?.id === node.id;
                const r = node.type === 'claim' ? 24 : 16;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer"
                  >
                    <circle
                      r={r}
                      fill={nodeFill(node)}
                      stroke={isSelected ? '#22d3ee' : '#475569'}
                      strokeWidth={isSelected ? 3 : 1.5}
                    />
                    <text
                      y={r + 14}
                      textAnchor="middle"
                      fill="#cbd5e1"
                      fontSize="11"
                      className="pointer-events-none select-none"
                    >
                      {node.text.length > 26 ? `${node.text.slice(0, 24)}...` : node.text}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Selected Node Inspector
            </h3>
            {selectedNode ? (
              <div className="space-y-3 text-sm">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {selectedNode.type === 'claim' ? `${selectedNode.label} (Claim)` : `Evidence (${selectedNode.label})`}
                </div>
                <p className="text-white font-medium leading-relaxed">{selectedNode.text}</p>

                {selectedNode.type === 'claim' ? (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Verdict</span>
                      <span className="text-slate-200 font-medium capitalize">{selectedNode.verdict || 'pending'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Model Confidence</span>
                      <span className="text-slate-200">{selectedNode.confidence ?? 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Freshness</span>
                      <span className="text-slate-200">{selectedNode.freshness ?? 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Uncertainty</span>
                      <span className="text-amber-300 capitalize">{selectedNode.uncertainty_level || 'N/A'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Domain</span>
                      <span className="text-slate-200">{selectedNode.label || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quality Score</span>
                      <span className="text-emerald-300">{selectedNode.quality_score ?? 'N/A'}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bias Assessment</span>
                      <span className="text-amber-300 capitalize">{selectedNode.bias_label || 'neutral_or_unclear'}</span>
                    </div>
                    {selectedNode.url && (
                      <a
                        href={selectedNode.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-xs pt-1"
                      >
                        Open Source <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {selectedNode.type === 'claim' && selectedNode.impacted_by_dependency && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Dependency Impact Alert
                    </p>
                    <p>
                      This claim depends on an upstream claim that is contradicted or outdated.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <Info className="w-4 h-4" /> Click any node in the graph to inspect details.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-10 text-center text-slate-400">
          Select a completed verification job to visualize its Claim Dependency Graph.
        </div>
      )}

      {/* Fact Conflict Resolution Summary */}
      {conflictedClaims.length > 0 && (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Fact Conflict Resolution ({conflictedClaims.length} claim(s) with competing evidence)
          </h3>
          <div className="space-y-4">
            {conflictedClaims.map((cc) => (
              <div key={cc.claim_id} className="bg-[#0a0e1a] border border-slate-800 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-white">{cc.claim_text}</p>
                <p className="text-xs text-amber-300">{cc.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                    <div className="font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Supporting Side ({cc.supporting_side.length})
                    </div>
                    {cc.supporting_side.map((s, idx) => (
                      <div key={idx} className="text-slate-300">
                        <span className="font-medium">{s.source_domain}</span>: {s.snippet?.slice(0, 120)}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20 space-y-1.5">
                    <div className="font-semibold text-red-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Contradicting Side ({cc.contradicting_side.length})
                    </div>
                    {cc.contradicting_side.map((c, idx) => (
                      <div key={idx} className="text-slate-300">
                        <span className="font-medium">{c.source_domain}</span>: {c.snippet?.slice(0, 120)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

