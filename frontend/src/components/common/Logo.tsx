import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-blue-600/30 to-cyan-500/20 border border-blue-500/40 shadow-lg shadow-blue-500/20">
        <ShieldCheck className={`${iconSizes[size]} text-cyan-400`} />
        <div className="absolute inset-0 rounded-xl bg-cyan-400/10 blur-sm pointer-events-none" />
      </div>
      <div>
        <div className={`font-extrabold tracking-tight ${textSizes[size]}`}>
          <span className="text-white">Verity</span>
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
        </div>
        {showTagline && (
          <p className="text-xs text-slate-400 tracking-wide uppercase font-medium">
            AI Verification & Freshness Engine
          </p>
        )}
      </div>
    </div>
  );
};

