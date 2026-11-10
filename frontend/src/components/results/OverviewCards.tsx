import React from 'react';
import { ScoreGauge } from '../common/ScoreGauge';
import { CheckCircle2, Clock, XCircle, MinusCircle, ShieldCheck } from 'lucide-react';
import type { VerificationJob } from '../../types';

interface OverviewCardsProps {
  job: VerificationJob;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({ job }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Freshness Gauge Card */}
      <div className="md:col-span-1 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center">
        <ScoreGauge
          score={job.overall_freshness_score || 0}
          label="Overall Freshness"
          size={110}
        />
      </div>

      {/* Confidence Gauge Card */}
      <div className="md:col-span-1 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center">
        <ScoreGauge
          score={job.overall_confidence_score || 0}
          label="Evidence Confidence"
          size={110}
        />
      </div>

      {/* Claim Breakdown Stats Card */}
      <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Verification Breakdown
            </h4>
          </div>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
            {job.total_claims} Total Claims
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-lg font-bold">{job.verified_claims}</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-300 uppercase">Verified</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-lg font-bold">{job.outdated_claims}</span>
            </div>
            <span className="text-[10px] font-semibold text-amber-300 uppercase">Outdated</span>
          </div>

          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-lg font-bold">{job.contradicted_claims}</span>
            </div>
            <span className="text-[10px] font-semibold text-red-300 uppercase">Contradicted</span>
          </div>

          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <MinusCircle className="w-4 h-4" />
              <span className="text-lg font-bold">{job.unsupported_claims}</span>
            </div>
            <span className="text-[10px] font-semibold text-orange-300 uppercase">Unsupported</span>
          </div>
        </div>
      </div>
    </div>
  );
};

