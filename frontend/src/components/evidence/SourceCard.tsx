import React from 'react';
import type { Evidence } from '../../types';
import { ExternalLink, ShieldCheck, Calendar, Globe } from 'lucide-react';

interface SourceCardProps {
  evidence: Evidence;
}

export const SourceCard: React.FC<SourceCardProps> = ({ evidence }) => {
  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <h4 className="text-sm font-bold text-white line-clamp-1">
            {evidence.source_title || evidence.source_domain}
          </h4>
        </div>
        <a
          href={evidence.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <p className="text-xs text-slate-300 italic line-clamp-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
        "{evidence.content_snippet}"
      </p>

      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-500">{evidence.source_domain}</span>
          {evidence.is_primary_source && (
            <span className="flex items-center gap-1 text-blue-400 font-semibold">
              <ShieldCheck className="w-3 h-3" /> Primary Source
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {evidence.publication_date && (
            <span className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3 h-3" /> {evidence.publication_date}
            </span>
          )}
          <span className="font-semibold text-white">
            Score: {Math.round(evidence.reliability_score)}/100
          </span>
        </div>
      </div>
    </div>
  );
};

