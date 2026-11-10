import React, { useEffect, useState } from 'react';
import { Loader2, Search, CheckCircle2, SplitSquareVertical, Cpu } from 'lucide-react';

interface VerificationProgressProps {
  status: string;
}

export const VerificationProgress: React.FC<VerificationProgressProps> = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { label: 'Extracting individual factual assertions...', icon: <SplitSquareVertical className="w-4 h-4" /> },
    { label: 'Querying Tavily Search API across authoritative domains...', icon: <Search className="w-4 h-4" /> },
    { label: 'Filtering duplicate syndications & assessing source authority...', icon: <Cpu className="w-4 h-4" /> },
    { label: 'Synthesizing evidence & calculating freshness matrix...', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
        <h3 className="text-sm font-bold text-white tracking-wide">
          VerityAI Engine In Progress
        </h3>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                isCurrent
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-semibold'
                  : isDone
                  ? 'bg-slate-800/40 border-slate-700/60 text-emerald-400'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  step.icon
                )}
              </div>
              <span className="flex-1">{step.label}</span>
              {isCurrent && <span className="text-[10px] animate-pulse">Running...</span>}
              {isDone && <span className="text-[10px] font-bold">Done</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

