import React from 'react';
import type { VerificationMode } from '../../types';
import { Shield, Swords, History } from 'lucide-react';

interface ModeSelectorProps {
  mode: VerificationMode;
  onModeChange: (mode: VerificationMode) => void;
  historicalDate?: string;
  onDateChange?: (date: string) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  mode,
  onModeChange,
  historicalDate,
  onDateChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Standard Mode */}
        <button
          type="button"
          onClick={() => onModeChange('standard')}
          className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
            mode === 'standard'
              ? 'bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div
            className={`p-2 rounded-lg ${
              mode === 'standard' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-xs font-bold ${mode === 'standard' ? 'text-white' : 'text-slate-300'}`}>
              Standard Mode
            </div>
            <div className="text-[11px] text-slate-400">Balanced corroboration & fresh consensus</div>
          </div>
        </button>

        {/* Adversarial Mode */}
        <button
          type="button"
          onClick={() => onModeChange('adversarial')}
          className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
            mode === 'adversarial'
              ? 'bg-red-600/15 border-red-500/50 shadow-md shadow-red-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div
            className={`p-2 rounded-lg ${
              mode === 'adversarial' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-xs font-bold ${mode === 'adversarial' ? 'text-white' : 'text-slate-300'}`}>
              Adversarial Mode
            </div>
            <div className="text-[11px] text-slate-400">Actively probes counter-evidence & retractions</div>
          </div>
        </button>

        {/* Time-Travel Mode */}
        <button
          type="button"
          onClick={() => onModeChange('time_travel')}
          className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
            mode === 'time_travel'
              ? 'bg-purple-600/15 border-purple-500/50 shadow-md shadow-purple-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
          }`}
        >
          <div
            className={`p-2 rounded-lg ${
              mode === 'time_travel' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className={`text-xs font-bold ${mode === 'time_travel' ? 'text-white' : 'text-slate-300'}`}>
              Time-Travel Mode
            </div>
            <div className="text-[11px] text-slate-400">Ground against a historical point in time</div>
          </div>
        </button>
      </div>

      {/* Date Picker when Time-Travel selected */}
      {mode === 'time_travel' && (
        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div>
            <div className="text-xs font-bold text-purple-300">Select Historical Grounding Date</div>
            <div className="text-[11px] text-purple-200/70">
              Evidence will be filtered to sources published on or prior to this timestamp.
            </div>
          </div>
          <input
            type="date"
            value={historicalDate || '2023-01-01'}
            onChange={(e) => onDateChange && onDateChange(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-purple-400/40 rounded-lg text-white text-xs focus:ring-1 focus:ring-purple-400 outline-none"
          />
        </div>
      )}
    </div>
  );
};

