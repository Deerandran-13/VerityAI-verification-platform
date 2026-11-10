import React from 'react';

interface EvidenceAgreementProps {
  supportingCount: number;
  contradictingCount: number;
  neutralCount: number;
}

export const EvidenceAgreement: React.FC<EvidenceAgreementProps> = ({
  supportingCount,
  contradictingCount,
  neutralCount,
}) => {
  const total = supportingCount + contradictingCount + neutralCount;
  if (total === 0) return null;

  const supportPct = Math.round((supportingCount / total) * 100);
  const contraPct = Math.round((contradictingCount / total) * 100);
  const neutralPct = 100 - supportPct - contraPct;

  return (
    <div className="space-y-2 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
        <span>Evidence Agreement Ratio</span>
        <span className="text-cyan-400">{supportPct}% Corroborated</span>
      </div>

      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
        <div style={{ width: `${supportPct}%` }} className="bg-emerald-500 transition-all" />
        <div style={{ width: `${contraPct}%` }} className="bg-red-500 transition-all" />
        <div style={{ width: `${neutralPct}%` }} className="bg-slate-600 transition-all" />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          Supporting ({supportingCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Contradicting ({contradictingCount})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
          Neutral ({neutralCount})
        </span>
      </div>
    </div>
  );
};

