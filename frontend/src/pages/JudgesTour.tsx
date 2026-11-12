import React from 'react';
import { Link } from 'react-router-dom';
import { useHealth } from '../hooks/useHealth';
import { TOUR_PRESETS } from '../data/tourPresets';
import { DemoVideoPlayer } from '../components/tour/DemoVideoPlayer';
import {
  Compass,
  Play,
  ShieldCheck,
  Activity,
  History,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
} from 'lucide-react';

const VERDICT_RULES = [
  {
    label: 'Verified',
    tone: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    desc: 'Multiple independent live sources corroborate the claim.',
  },
  {
    label: 'Outdated',
    tone: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    desc: 'Claim was previously true, but newer evidence shows it has drifted.',
  },
  {
    label: 'Contradicted',
    tone: 'text-red-400 border-red-500/30 bg-red-500/10',
    desc: 'Authoritative evidence directly refutes the statement or figure.',
  },
  {
    label: 'Partially Supported',
    tone: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    desc: 'Core premise holds, but key qualifiers, dates, or scope are inaccurate.',
  },
  {
    label: 'Unsupported / Unverifiable',
    tone: 'text-slate-300 border-slate-600/50 bg-slate-800/60',
    desc: 'No credible primary source substantiates the claim (or hallucinated ref).',
  },
];

export const JudgesTour: React.FC = () => {
  const { health, isLoading } = useHealth(20000);

  const isEngineReady =
    health?.database?.status === 'connected' &&
    health?.tavily?.status === 'connected' &&
    health?.bifrost?.status === 'connected';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5" />
          <span>Evaluator Walkthrough</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Judge&apos;s Tour
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
          Evaluate VerityAI&apos;s end-to-end multi-agent verification pipeline in under 3 minutes. Launch any pre-built scenario below—no manual prompt setup required.
        </p>
      </div>

      {/* Live System Readiness Banner */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-[#111827] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse flex-shrink-0" />
          ) : isEngineReady ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          )}
          <div>
            <div className="text-sm font-semibold text-white">
              {isLoading
                ? 'Checking live verification engine status...'
                : isEngineReady
                ? 'Live Verification Engine Ready'
                : 'Partial Service Availability'}
            </div>
            <div className="text-xs text-slate-400">
              Database: <span className="text-slate-200">{health?.database?.status ?? 'checking'}</span> • Tavily:{' '}
              <span className="text-slate-200">{health?.tavily?.status ?? 'checking'}</span> • Bifrost:{' '}
              <span className="text-slate-200">{health?.bifrost?.status ?? 'checking'}</span> • Gemini:{' '}
              <span className="text-slate-200">{health?.gemini?.status ?? 'checking'}</span>
            </div>
          </div>
        </div>
        <Link
          to="/settings"
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
        >
          Inspect Health &amp; Monitoring →
        </Link>
      </div>

      {/* Interactive Demo Video Walkthrough */}
      <DemoVideoPlayer />

      {/* Step 1: 1-Click Scenarios */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center">
            1
          </span>
          <h2 className="text-xl font-bold text-white">
            Launch a 1-Click Verification Scenario
          </h2>
        </div>
        <p className="text-sm text-slate-400">
          Each preset loads curated AI-generated text with deliberate traps (hallucinated APIs, drifted version numbers, and time-bound milestones) directly into the Workspace.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOUR_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="p-5 rounded-2xl border border-slate-800 bg-[#111827] hover:border-cyan-500/40 transition-colors flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/15 text-cyan-300 border border-blue-500/30">
                  {preset.badge}
                </span>
                <h3 className="text-base font-bold text-white">{preset.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {preset.description}
                </p>
              </div>
              <Link
                to={`/workspace?preset=${preset.id}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold transition-all min-h-[44px]"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Load in Workspace</span>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Steps 2, 3, 4 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#111827] space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <FileText className="w-4 h-4 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Inspect the Report</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Review atomic claim verdicts, Evidence Agreement scores, Hallucination Fingerprints, Multi-Model Disagreement analysis, and export to HTML, CSV, or JSON.
            </p>
          </div>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            <span>Browse Verification History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#111827] space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <Activity className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-bold text-white">Drift &amp; Time-Travel</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore how facts change over time with Knowledge Drift timelines, or re-evaluate claims against historical dates in Time-Travel Verification.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/drift"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              <span>Drift</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/time-travel"
              className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              <History className="w-3.5 h-3.5" />
              <span>Time-Travel</span>
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#111827] space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/40 text-cyan-300 text-xs font-bold flex items-center justify-center">
                4
              </span>
              <Lock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Trust &amp; Boundaries</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inspect VerityAI&apos;s security guardrails: SSRF protection, zero-secret frontend isolation, and our multi-agent evidence boundary matrix.
            </p>
          </div>
          <Link
            to="/trust"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            <span>View Trust &amp; Security</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Upfront Verdict Standards ("Rules before you verify") */}
      <section className="p-6 rounded-2xl border border-slate-800 bg-[#111827] space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">
            Verdict Standards (Shown Upfront)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VERDICT_RULES.map((rule) => (
            <div
              key={rule.label}
              className="p-3.5 rounded-xl border border-slate-800/90 bg-slate-900/60 space-y-1.5"
            >
              <span
                className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${rule.tone}`}
              >
                {rule.label}
              </span>
              <p className="text-xs text-slate-400 leading-relaxed">{rule.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

