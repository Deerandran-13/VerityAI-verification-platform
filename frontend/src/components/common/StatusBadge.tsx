import React from 'react';
import type { ClaimStatus } from '../../types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  History,
  MinusCircle,
} from 'lucide-react';

interface StatusBadgeProps {
  status: ClaimStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs: Record<
    ClaimStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    verified: {
      label: 'VERIFIED',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />,
    },
    outdated: {
      label: 'OUTDATED',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: <Clock className="w-3.5 h-3.5 mr-1" />,
    },
    contradicted: {
      label: 'CONTRADICTED',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      icon: <XCircle className="w-3.5 h-3.5 mr-1" />,
    },
    partially_supported: {
      label: 'PARTIALLY SUPPORTED',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" />,
    },
    unsupported: {
      label: 'UNSUPPORTED',
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      icon: <MinusCircle className="w-3.5 h-3.5 mr-1" />,
    },
    unverifiable: {
      label: 'UNVERIFIABLE',
      bg: 'bg-slate-700/30',
      text: 'text-slate-400',
      border: 'border-slate-600/30',
      icon: <HelpCircle className="w-3.5 h-3.5 mr-1" />,
    },
    historically_correct: {
      label: 'HISTORICALLY CORRECT',
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/30',
      icon: <History className="w-3.5 h-3.5 mr-1" />,
    },
  };

  const config = configs[status] || configs.unverifiable;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border ${config.bg} ${config.text} ${config.border} ${padding} tracking-wider uppercase select-none`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

