import React from 'react';
import { History, Swords, Fingerprint, Activity } from 'lucide-react';

export const InnovationFeatures: React.FC = () => {
  const innovations = [
    {
      title: 'Knowledge Drift Detector',
      subtitle: 'Tracks how facts evolve across versions',
      desc: 'Stores historical claims, compares current evidence against past snapshots, and flags technical deprecations (e.g. API v2 deprecated in favor of v3).',
      badge: 'Signature Innovation',
      icon: <Activity className="w-6 h-6 text-cyan-400" />,
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30',
    },
    {
      title: 'Time-Travel Fact Verification',
      subtitle: 'Verify against a historical point in time',
      desc: 'Allows users to pick any historical date. VerityAI searches temporal evidence archives to distinguish historical truth from retrospective bias.',
      badge: 'Temporal Grounding',
      icon: <History className="w-6 h-6 text-purple-400" />,
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30',
    },
    {
      title: 'Adversarial Verification Mode',
      subtitle: 'Actively searches for counter-evidence',
      desc: 'Instead of searching for confirmations, adversarial mode generates targeted counter-argument queries to expose hidden deprecations, retractions, and controversies.',
      badge: 'Debiasing Engine',
      icon: <Swords className="w-6 h-6 text-red-400" />,
      color: 'from-red-500/20 to-amber-500/10 border-red-500/30',
    },
    {
      title: 'Hallucination Fingerprint',
      subtitle: 'Pattern analysis for synthetic falsehoods',
      desc: 'Recognizes tell-tale signs of LLM fabrication: nonexistent API methods, phantom libraries, fabricated DOI references, and mathematically impossible statistics.',
      badge: 'Safety Layer',
      icon: <Fingerprint className="w-6 h-6 text-emerald-400" />,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
    },
  ];

  return (
    <section className="py-20 border-t border-slate-800/80 bg-gradient-to-b from-transparent via-slate-950/60 to-transparent">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            Key Innovations
          </span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-white">
            Beyond Standard Fact-Checking
          </h2>
          <p className="mt-4 text-slate-400 text-sm sm:text-base">
            VerityAI introduces four proprietary algorithmic mechanisms designed to solve LLM hallucination and knowledge drift at scale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {innovations.map((item) => (
            <div
              key={item.title}
              className={`p-8 rounded-2xl bg-gradient-to-br ${item.color} border backdrop-blur-sm relative overflow-hidden group hover:border-slate-500/60 transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/60">
                  {item.icon}
                </div>
                <span className="text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 text-slate-300">
                  {item.badge}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-4">{item.title}</h3>
              <p className="text-xs font-semibold text-cyan-400 mb-3">{item.subtitle}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

