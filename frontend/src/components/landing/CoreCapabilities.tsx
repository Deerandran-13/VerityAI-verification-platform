import React from 'react';
import {
  FileSearch,
  Globe2,
  GitCompare,
  Gauge,
  Link2,
  Users2,
} from 'lucide-react';

export const CoreCapabilities: React.FC = () => {
  const capabilities = [
    {
      title: 'Atomic Claim Extraction',
      description:
        'Decomposes multi-clause answers into granular, falsifiable assertions with sentence mapping and categorization.',
      icon: <FileSearch className="w-5 h-5 text-blue-400" />,
    },
    {
      title: 'Live Web Research with Tavily',
      description:
        'Executes autonomous targeted searches, date-filtered lookups, and primary documentation prioritization in real-time.',
      icon: <Globe2 className="w-5 h-5 text-cyan-400" />,
    },
    {
      title: 'Evidence-to-Claim Matching',
      description:
        'Maps extracted snippets against statements using bidirectional semantic relevance and contradictory premise detection.',
      icon: <GitCompare className="w-5 h-5 text-emerald-400" />,
    },
    {
      title: 'Freshness & Confidence Scoring',
      description:
        'Calculates explainable scores combining evidence consensus (45%), source authority (25%), temporal decay (20%), and citation coherence (10%).',
      icon: <Gauge className="w-5 h-5 text-amber-400" />,
    },
    {
      title: 'Citation Integrity Checker',
      description:
        'Audits cited links for domain authenticity, live URL accessibility, and verifies whether cited text actually proves the claim.',
      icon: <Link2 className="w-5 h-5 text-purple-400" />,
    },
    {
      title: 'Multi-Source Consensus Engine',
      description:
        'Aggregates independent evidence clusters, detects syndication echo chambers, and grounds verdicts in true corroboration.',
      icon: <Users2 className="w-5 h-5 text-teal-400" />,
    },
  ];

  return (
    <section className="py-20 border-t border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
            Core Architecture
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
            Built for High-Stakes Enterprise Verification
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            Engineered with deep factual grounding to eliminate hallucinations across software docs, medical claims, APIs, and financial stats.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((c) => (
            <div
              key={c.title}
              className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/70 transition-all duration-200"
            >
              <div className="p-3 rounded-xl bg-slate-800/60 w-fit mb-4 border border-slate-700/40">
                {c.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{c.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{c.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

