import React from 'react';
import { HeroSection } from '../components/landing/HeroSection';
import { HowItWorks } from '../components/landing/HowItWorks';
import { CoreCapabilities } from '../components/landing/CoreCapabilities';
import { InnovationFeatures } from '../components/landing/InnovationFeatures';
import { TechIntegrations } from '../components/landing/TechIntegrations';
import { Footer } from '../components/landing/Footer';
import { Logo } from '../components/common/Logo';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0a0e1a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-4">
            <Link
              to="/tour"
              className="hidden sm:inline-flex items-center text-xs font-semibold text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Judge&apos;s Tour
            </Link>
            <Link
              to="/trust"
              className="hidden sm:inline-flex items-center text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Trust &amp; Security
            </Link>
            <Link
              to="/workspace"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero & Sections */}
      <main className="flex-1">
        <HeroSection />
        <HowItWorks />
        <InnovationFeatures />
        <CoreCapabilities />
        <TechIntegrations />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

