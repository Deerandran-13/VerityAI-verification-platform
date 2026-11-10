import React from 'react';
import { ClipboardPaste, SplitSquareVertical, Globe, CheckCheck } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Paste AI Output',
      desc: 'Input any AI-generated response, doc, or LLM output into the verification workspace.',
      icon: <ClipboardPaste className="w-6 h-6 text-cyan-400" />,
    },
    {
      step: '02',
      title: 'Extract Atomic Claims',
      desc: 'Our engine parses complex paragraphs into individual, falsifiable factual assertions with categories.',
      icon: <SplitSquareVertical className="w-6 h-6 text-blue-400" />,
    },
    {
      step: '03',
      title: 'Tavily Live Research',
      desc: 'Autonomous multi-query web search retrieves authoritative primary evidence and publication timestamps.',
      icon: <Globe className="w-6 h-6 text-teal-400" />,
    },
    {
      step: '04',
      title: 'Multi-Model Verdict',
      desc: 'Cross-model verification through Bifrost AI Gateway computes freshness, confidence, and knowledge drift.',
      icon: <CheckCheck className="w-6 h-6 text-emerald-400" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 border-t border-slate-800/80 bg-slate-950/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            Verification Pipeline
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
            From Raw Generation to Verified Truth
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            Every sentence undergoes an automated 4-stage pipeline that guarantees transparency and eliminates hallucinations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {steps.map((s, index) => (
            <div
              key={s.step}
              className="relative p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 group-hover:border-cyan-500/40 transition-colors">
                    {s.icon}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    STEP {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

