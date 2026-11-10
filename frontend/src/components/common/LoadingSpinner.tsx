import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-3">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-cyan-400`} />
      {label && <p className="text-sm font-medium text-slate-300 animate-pulse">{label}</p>}
    </div>
  );
};

