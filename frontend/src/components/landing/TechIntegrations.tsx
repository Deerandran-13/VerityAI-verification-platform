import React from 'react';
import { Cpu, Search, Sparkles, Layers } from 'lucide-react';

export const TechIntegrations: React.FC = () => {
  return (
    <section className="py-20 border-t border-slate-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
            Powered By Open Standards
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
            Core Technology Integrations
          </h2>
          <p className="mt-4 text-slate-400 text-sm">
            Leveraging industry-leading search infrastructure and multi-model AI routing gateways.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Tavily */}
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-6 text-blue-400">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Tavily Search API</h3>
            <span className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wider">
              Real-Time Web Intelligence
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Provides high-precision, low-latency live web search optimized for AI agent factual retrieval with source deduplication and publication date parsing.
            </p>
          </div>

          {/* Bifrost */}
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 text-cyan-400">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Bifrost AI Gateway</h3>
            <span className="text-xs font-semibold text-cyan-400 mb-3 uppercase tracking-wider">
              Multi-Model Intelligent Routing
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unified gateway routing structured verification tasks to Gemini 1.5 Pro and alternate providers with rate-limiting resilience and model consensus tracking.
            </p>
          </div>

          {/* Gemini */}
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6 text-emerald-400">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Gemini 1.5 Pro</h3>
            <span className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
              Reasoning & Factual Auditing
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Deep semantic evaluation comparing retrieved evidence against original AI statements to generate transparent, auditable explanations and suggested corrections.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

