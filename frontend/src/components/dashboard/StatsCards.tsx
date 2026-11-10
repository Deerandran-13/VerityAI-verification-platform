import React from 'react';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { ShieldCheck, Layers, Gauge, Clock } from 'lucide-react';
import type { DashboardStats } from '../../types';

interface StatsCardsProps {
  stats: DashboardStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Verifications
          </span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter value={stats.total_jobs} />
        </div>
        <p className="text-[11px] text-slate-500">Processed across all active jobs</p>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Claims Analyzed
          </span>
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter value={stats.total_claims} />
        </div>
        <p className="text-[11px] text-slate-500">
          <span className="text-emerald-400 font-semibold">{stats.verified_count} verified</span> •{' '}
          <span className="text-amber-400 font-semibold">{stats.outdated_count} outdated</span>
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Avg Freshness
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter value={stats.avg_freshness_score} decimals={1} suffix="%" />
        </div>
        <p className="text-[11px] text-slate-500">Weighted against live Tavily evidence</p>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Avg Latency
          </span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter value={stats.avg_processing_time_ms} decimals={0} suffix=" ms" />
        </div>
        <p className="text-[11px] text-slate-500">Per complete verification cycle</p>
      </div>
    </div>
  );
};

