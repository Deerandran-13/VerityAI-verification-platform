import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const FreshnessChart: React.FC = () => {
  const data = [
    { range: '0-39% (Low)', count: 2 },
    { range: '40-64% (Review)', count: 4 },
    { range: '65-84% (Moderate)', count: 9 },
    { range: '85-100% (Fresh)', count: 18 },
  ];

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
        Freshness Score Cohorts
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="range" stroke="#64748b" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-slate-500">Distribution of claims across freshness tiers</p>
    </div>
  );
};

