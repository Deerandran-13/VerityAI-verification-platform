import React, { useState } from 'react';
import { History, Calendar, CheckCircle2, AlertCircle, Play, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';
import { StatusBadge } from '../components/common/StatusBadge';
import { submitVerification, getVerificationResult } from '../services/api';
import type { VerificationJob, Claim } from '../types';
import { useNavigate } from 'react-router-dom';

export const TimeTravelVerification: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState('2023-05-01');
  const [inputText, setInputText] = useState('Python 3.12 has not yet been officially released.');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resultJob, setResultJob] = useState<VerificationJob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presets = [
    {
      text: 'Python 3.12 has not yet been officially released.',
      date: '2023-05-01',
      label: 'Python 3.12 Pre-Release',
    },
    {
      text: 'The EU AI Act is only a proposed draft regulation without legal force.',
      date: '2024-01-15',
      label: 'EU AI Act Pre-Enactment',
    },
    {
      text: 'GPT-4 API pricing is $30 per million tokens and is the only GPT-4 tier available.',
      date: '2023-09-01',
      label: 'GPT-4 Original Pricing',
    },
  ];

  const handleRunVerification = async () => {
    if (!inputText.trim()) return;
    try {
      setIsVerifying(true);
      setErrorMsg(null);
      const res = await submitVerification(inputText, 'time_travel', selectedDate);
      
      // Poll or navigate directly to results
      if (res.id) {
        navigate(`/results?id=${res.id}`);
      }
    } catch (err: any) {
      console.error('Time-travel verification error:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to execute time-travel verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-purple-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Time-Travel Fact Verification</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Agent 9: Evaluates assertions against evidence published strictly prior to your chosen temporal cutoff.
          Distinguishes between claims that were <i>historically correct</i> vs. claims that are <i>currently true</i>.
        </p>
      </div>

      {/* Date Picker & Input Header */}
      <div className="p-6 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block">
              Temporal Cutoff Target
            </span>
            <p className="text-xs text-purple-200/80 mt-0.5">
              Live web research automatically filters out any publications or retractions after this date.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-purple-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-purple-500/40 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-purple-300 font-semibold">Historical Presets:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(p.text);
                setSelectedDate(p.date);
              }}
              className="px-2.5 py-1 rounded-lg text-xs bg-purple-900/40 border border-purple-500/30 text-purple-200 hover:bg-purple-800/50 hover:text-white transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Assertion Input Area */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-slate-300">
            Assertion or AI-generated passage to test:
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={3}
            placeholder="Enter assertion to evaluate against historical record..."
            className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-purple-500/30 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
            {errorMsg}
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleRunVerification}
            disabled={isVerifying || !inputText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Agent Pipeline with Cutoff...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Verify with {selectedDate} Cutoff</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Time-Travel Evaluation Matrix */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
          Temporal Discrepancy Matrix (Grounding Showcase)
        </h3>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-white">
                "Python 3.12 has not yet been officially released."
              </p>
              <span className="text-xs text-slate-400">Audited with cutoff: 2023-05-01</span>
            </div>
            <StatusBadge status="historically_correct" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300 uppercase tracking-wider block">
                  As of May 2023 (Historical Grounding)
                </span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Correct at Cutoff</span>
              </div>
              <p className="text-purple-200">
                Accurate. In May 2023, Python 3.12 was only in beta/pre-release and had not been officially made GA.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 uppercase tracking-wider block">
                  As of Present (Modern Grounding)
                </span>
                <span className="text-[10px] font-bold text-amber-400 uppercase">Now Outdated</span>
              </div>
              <p className="text-amber-200">
                Outdated. Python 3.12 was officially released in October 2023 and Python 3.13 is now available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
