import React, { useState, useEffect } from 'react';
import { SourceCard } from '../components/evidence/SourceCard';
import { EvidenceAgreement } from '../components/evidence/EvidenceAgreement';
import { Search, Filter, ShieldCheck, Globe, CheckCircle2 } from 'lucide-react';
import type { Evidence } from '../types';
import { getRecentEvidence } from '../services/api';

const SAMPLE_SOURCES: Evidence[] = [
  {
    id: 'ev-101',
    source_title: 'Python Software Foundation - What is New In Python 3.12',
    source_url: 'https://docs.python.org/3/whatsnew/3.12.html',
    source_domain: 'docs.python.org',
    publication_date: '2023-10-02',
    retrieval_date: new Date().toISOString(),
    content_snippet: 'Python 3.12 was officially released in October 2023 introducing subinterpreter support under PEP 684.',
    relevance_score: 0.98,
    is_supporting: true,
    is_contradicting: false,
    is_primary_source: true,
    reliability_score: 99.0,
  },
  {
    id: 'ev-102',
    source_title: 'European Union Official Journal - Artificial Intelligence Act',
    source_url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L_202401689',
    source_domain: 'eur-lex.europa.eu',
    publication_date: '2024-07-12',
    retrieval_date: new Date().toISOString(),
    content_snippet: 'Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence enters into force on 1 August 2024.',
    relevance_score: 0.99,
    is_supporting: true,
    is_contradicting: false,
    is_primary_source: true,
    reliability_score: 100.0,
  },
  {
    id: 'ev-103',
    source_title: 'OpenAI Developer Documentation - Models and Pricing Index',
    source_url: 'https://platform.openai.com/docs/pricing',
    source_domain: 'platform.openai.com',
    publication_date: '2024-11-15',
    retrieval_date: new Date().toISOString(),
    content_snippet: 'GPT-4 original is now superseded by GPT-4o with input pricing at $2.50 per 1M tokens.',
    relevance_score: 0.94,
    is_supporting: false,
    is_contradicting: true,
    is_primary_source: true,
    reliability_score: 96.0,
  },
];

export const EvidenceExplorer: React.FC = () => {
  const [sources, setSources] = useState<Evidence[]>(SAMPLE_SOURCES);
  const [query, setQuery] = useState('');
  const [filterOfficial, setFilterOfficial] = useState(false);

  useEffect(() => {
    getRecentEvidence()
      .then((data) => {
        if (data && data.length > 0) {
          setSources(data);
        }
      })
      .catch(() => {
        // Fall back to sample sources
      });
  }, []);

  const filtered = sources.filter((s) => {
    const matchesQuery =
      s.source_title.toLowerCase().includes(query.toLowerCase()) ||
      s.source_domain.toLowerCase().includes(query.toLowerCase()) ||
      s.content_snippet.toLowerCase().includes(query.toLowerCase());
    if (filterOfficial) return matchesQuery && s.is_primary_source;
    return matchesQuery;
  });

  const supportingCount = sources.filter((s) => s.is_supporting).length;
  const contradictingCount = sources.filter((s) => s.is_contradicting).length;
  const neutralCount = Math.max(0, sources.length - supportingCount - contradictingCount);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Evidence Explorer</h1>
        <p className="text-xs text-slate-400 mt-1">
          Inspect collected primary web evidence, verify source authority, and evaluate consensus distribution ({sources.length} active records).
        </p>
      </div>

      {/* Consensus Bar */}
      <EvidenceAgreement
        supportingCount={supportingCount}
        contradictingCount={contradictingCount}
        neutralCount={neutralCount}
      />

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search evidence by title, domain, or snippet keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        <button
          onClick={() => setFilterOfficial(!filterOfficial)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
            filterOfficial
              ? 'bg-blue-600/20 border-blue-500 text-cyan-300'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Official Sources Only</span>
        </button>
      </div>

      {/* Source Cards Grid */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <SourceCard key={item.id} evidence={item} />
        ))}
      </div>
    </div>
  );
};

