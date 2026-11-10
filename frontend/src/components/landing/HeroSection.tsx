import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles, CheckCircle2, AlertTriangle, XCircle, Search } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <div className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-cyan-300 text-xs font-semibold tracking-wide uppercase mb-6 shadow-sm shadow-blue-500/20">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Global AI Hackathon 2026 • AI Agents & Intelligent Systems</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1]">
          Don't Just Trust AI.{' '}
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-300 bg-clip-text text-transparent">
            Verify It.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          VerityAI is the enterprise intelligence engine that extracts atomic factual claims, gathers multi-source live web evidence with Tavily, cross-verifies via Bifrost AI Gateway, and detects knowledge drift & hallucinations.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/workspace"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-base shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <span>Verify Your AI Answer</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-medium text-base transition-colors"
          >
            How It Works
          </a>
        </div>

        {/* Floating Decorative Status Badges */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3 backdrop-blur-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Claim Verified</div>
              <div className="text-xs text-slate-300">Live evidence agreement at 98.4%</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3 backdrop-blur-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Drift Detected</div>
              <div className="text-xs text-slate-300">API version deprecated 3 months ago</div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center gap-3 backdrop-blur-sm">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider">Hallucination Flagged</div>
              <div className="text-xs text-slate-300">Method does not exist in SDK spec</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

