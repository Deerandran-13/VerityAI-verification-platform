import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { DashboardStats } from '../../types';

interface ClaimDistributionChartProps {
  stats: DashboardStats;
}

export const ClaimDistributionChart: React.FC<ClaimDistributionChartProps> = ({ stats }) => {
  const data = [
    { name: 'Verified', value: stats.verified_count || 5, color: '#10b981' },
    { name: 'Outdated', value: stats.outdated_count || 2, color: '#f59e0b' },
    { name: 'Contradicted', value: stats.contradicted_count || 1, color: '#ef4444' },
    { name: 'Unsupported', value: stats.unsupported_count || 1, color: '#f97316' },
  ];

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
        Claim Status Distribution
      </h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-slate-400">{item.name}:</span>
            <span className="font-semibold text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

