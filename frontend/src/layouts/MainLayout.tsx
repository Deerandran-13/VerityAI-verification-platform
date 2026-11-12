import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { useHealth } from '../hooks/useHealth';
import type { ServiceHealth } from '../types';
import {
  FileCheck2,
  FileText,
  Search,
  Activity,
  History,
  BarChart3,
  Archive,
  Settings,
  Menu,
  X,
  ExternalLink,
  Compass,
  ShieldCheck,
  GitBranch,
  GitCompare,
  Users,
} from 'lucide-react';

export const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { health, isLoading } = useHealth(15000);
  const location = useLocation();

  const navItems = [
    { name: 'Workspace', path: '/workspace', icon: <FileCheck2 className="w-4 h-4" /> },
    { name: 'Results', path: '/results', icon: <FileText className="w-4 h-4" /> },
    { name: 'Evidence Explorer', path: '/evidence', icon: <Search className="w-4 h-4" /> },
    { name: 'Knowledge Drift', path: '/drift', icon: <Activity className="w-4 h-4" /> },
    { name: 'Time-Travel', path: '/time-travel', icon: <History className="w-4 h-4" /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { name: 'History', path: '/history', icon: <Archive className="w-4 h-4" /> },
    { name: 'Claim Graph', path: '/graph', icon: <GitBranch className="w-4 h-4" /> },
    { name: 'Compare Runs', path: '/compare', icon: <GitCompare className="w-4 h-4" /> },
    { name: 'Team Review', path: '/collaborate', icon: <Users className="w-4 h-4" /> },
    { name: "Judge's Tour", path: '/tour', icon: <Compass className="w-4 h-4" /> },
    { name: 'Trust & Security', path: '/trust', icon: <ShieldCheck className="w-4 h-4" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const getPageTitle = () => {
    const item = navItems.find((i) => i.path === location.pathname);
    return item ? item.name : 'VerityAI Intelligence';
  };

  const getStatusDisplay = (service?: ServiceHealth) => {
    if (isLoading || !service) {
      return {
        label: 'Checking...',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400',
      };
    }
    switch (service.status) {
      case 'connected':
        return {
          label: 'Connected',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dotClass: 'bg-emerald-400',
        };
      case 'disconnected':
        return {
          label: 'Disconnected',
          badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
          dotClass: 'bg-red-400',
        };
      case 'not_configured':
      default:
        return {
          label: 'Not Configured',
          badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
          dotClass: 'bg-slate-500',
        };
    }
  };

  const tavilyStatus = getStatusDisplay(health?.tavily);
  const bifrostStatus = getStatusDisplay(health?.bifrost);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-[#111827]">
        <Logo size="sm" />
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111827] border-r border-[#1e3a5f] p-5 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          <div className="pb-4 border-b border-slate-800">
            <NavLink to="/">
              <Logo size="md" showTagline />
            </NavLink>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30 shadow-md shadow-blue-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer with Health Status */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isLoading
                      ? 'bg-amber-400'
                      : health
                      ? health.status === 'healthy'
                        ? 'bg-emerald-400'
                        : 'bg-cyan-400'
                      : 'bg-red-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isLoading
                      ? 'bg-amber-500'
                      : health
                      ? health.status === 'healthy'
                        ? 'bg-emerald-500'
                        : 'bg-cyan-500'
                      : 'bg-red-500'
                  }`}
                />
              </span>
              <span className="text-[11px] font-mono text-slate-300">
                {isLoading ? 'Checking...' : health ? 'API Online' : 'Disconnected'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">v{health?.version || '0.1.0'}</span>
          </div>

          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 hover:text-cyan-400 transition-colors w-full"
          >
            <span>FastAPI OpenAPI Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#1e3a5f] bg-[#0d1322] px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white tracking-tight">{getPageTitle()}</h2>
          </div>

          {/* Genuine Dynamic Service Status Indicators */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium transition-all ${tavilyStatus.badgeClass}`}
              title={health?.tavily?.message || 'Tavily Search API status'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${tavilyStatus.dotClass}`} />
              <span className="hidden sm:inline text-slate-400">Tavily:</span>
              <span>{tavilyStatus.label}</span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-medium transition-all ${bifrostStatus.badgeClass}`}
              title={health?.bifrost?.message || 'Bifrost AI Gateway status'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${bifrostStatus.dotClass}`} />
              <span className="hidden sm:inline text-slate-400">Bifrost:</span>
              <span>{bifrostStatus.label}</span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
