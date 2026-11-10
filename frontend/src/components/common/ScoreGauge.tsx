import React from 'react';

interface ScoreGaugeProps {
  score: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  label,
  size = 120,
  strokeWidth = 10,
}) => {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  let colorClass = 'text-red-500';
  let badgeColor = 'bg-red-500/10 text-red-400 border-red-500/30';
  if (normalizedScore >= 85) {
    colorClass = 'text-emerald-400';
    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  } else if (normalizedScore >= 65) {
    colorClass = 'text-blue-400';
    badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  } else if (normalizedScore >= 40) {
    colorClass = 'text-amber-400';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-slate-800"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className={`${colorClass} transition-all duration-700 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold tracking-tight text-white`}>
            {normalizedScore}
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400">/ 100</span>
        </div>
      </div>
      {label && (
        <div className="mt-2 text-center">
          <span className="text-sm font-medium text-slate-300">{label}</span>
          <div className={`mt-1 text-xs px-2 py-0.5 rounded-full border ${badgeColor} inline-block font-semibold`}>
            {normalizedScore >= 85
              ? 'Fresh & Current'
              : normalizedScore >= 65
              ? 'Mostly Current'
              : normalizedScore >= 40
              ? 'Needs Review'
              : 'Outdated / Flagged'}
          </div>
        </div>
      )}
    </div>
  );
};

