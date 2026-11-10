import React from 'react';
import { Logo } from '../common/Logo';
import { ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <Logo size="sm" showTagline />
            <p className="mt-2 text-xs text-slate-500 max-w-sm text-center md:text-left">
              VerityAI identifies outdated, inaccurate, unsupported, contradictory, and hallucinated claims in AI-generated answers.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">
              How It Works
            </a>
            <a href="/workspace" className="hover:text-cyan-400 transition-colors">
              Workspace
            </a>
            <a href="/analytics" className="hover:text-cyan-400 transition-colors">
              Analytics
            </a>
            <a href="/settings" className="hover:text-cyan-400 transition-colors">
              Settings
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Built for Global AI Hackathon • Track: AI Agents & Intelligent Systems
          </div>
          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <span className="text-slate-300 font-semibold">Tavily</span>
            <span>&</span>
            <span className="text-slate-300 font-semibold">Bifrost</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

