import React, { useState, useEffect } from 'react';
import { useHealth } from '../hooks/useHealth';
import type { ServiceHealth } from '../types';
import {
  Settings as SettingsIcon,
  Key,
  Sliders,
  Database,
  Globe,
  Layers,
  Sparkles,
  Bell,
  RefreshCw,
  Puzzle,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { getTrackedClaims, triggerDueChecks, getNotifications } from '../services/api';

export const Settings: React.FC = () => {
  const { health, isLoading } = useHealth();
  const [trackedClaims, setTrackedClaims] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isCheckingDue, setIsCheckingDue] = useState<boolean>(false);
  const [checkStatusMessage, setCheckStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadMonitoringData();
  }, []);

  const loadMonitoringData = async () => {
    try {
      const [claims, notifs] = await Promise.all([
        getTrackedClaims(),
        getNotifications(),
      ]);
      setTrackedClaims(claims || []);
      setNotifications(notifs || []);
    } catch (err) {
      console.error('Failed to load monitoring data:', err);
    }
  };

  const handleRunDueChecks = async () => {
    try {
      setIsCheckingDue(true);
      const res = await triggerDueChecks();
      setCheckStatusMessage(`Executed ${res.checks_executed} checks. Drifts detected: ${res.drifts_detected}.`);
      await loadMonitoringData();
      setTimeout(() => setCheckStatusMessage(null), 4000);
    } catch (err) {
      console.error('Failed to execute due checks:', err);
    } finally {
      setIsCheckingDue(false);
    }
  };

  const renderBadge = (service?: ServiceHealth) => {
    if (isLoading || !service) {
      return (
        <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold font-mono">
          CHECKING...
        </span>
      );
    }
    switch (service.status) {
      case 'connected':
        return (
          <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
            CONNECTED
          </span>
        );
      case 'disconnected':
        return (
          <span className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/30 font-semibold font-mono">
            DISCONNECTED
          </span>
        );
      case 'not_configured':
      default:
        return (
          <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700 font-semibold font-mono">
            NOT CONFIGURED
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white tracking-tight">System Configuration & Integrations</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Real-time external gateway integration status, automated knowledge expiry monitoring, and browser extension setup.
        </p>
      </div>

      {/* Integration Status Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Key className="w-4 h-4 text-cyan-400" />
          <span>Integration & External Services Status</span>
        </h3>

        <div className="space-y-3">
          {/* Tavily */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">Tavily Search API</span>
                <p className="text-[11px] text-slate-400">
                  {health?.tavily?.message || 'Live web research and primary source retrieval'}
                </p>
              </div>
            </div>
            {renderBadge(health?.tavily)}
          </div>

          {/* Bifrost */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">Bifrost AI Gateway</span>
                <p className="text-[11px] text-slate-400">
                  {health?.bifrost?.message || 'Multi-model consensus and structured LLM routing gateway'}
                </p>
              </div>
            </div>
            {renderBadge(health?.bifrost)}
          </div>

          {/* Gemini via Bifrost */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">Google Gemini 2.5 Flash (via Bifrost)</span>
                <p className="text-[11px] text-slate-400">
                  {health?.gemini?.message || 'Primary factual auditing and contradiction reasoner'}
                </p>
              </div>
            </div>
            {renderBadge(health?.gemini)}
          </div>

          {/* Database */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white">Database Persistence (PostgreSQL / SQLite fallback)</span>
                <p className="text-[11px] text-slate-400">
                  {health?.database?.message || 'Claims, evidence, and historical audit trail'}
                </p>
              </div>
            </div>
            {renderBadge(health?.database)}
          </div>
        </div>
      </div>

      {/* Automated Expiry Monitoring & Alerts */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Automated Knowledge Expiry Monitoring (Agent 15)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuously tracks saved claims and alerts when technical facts drift or become obsolete.
            </p>
          </div>

          <button
            onClick={handleRunDueChecks}
            disabled={isCheckingDue}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDue ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>{isCheckingDue ? 'Running Checks...' : 'Run Due Checks Now'}</span>
          </button>
        </div>

        {checkStatusMessage && (
          <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
            {checkStatusMessage}
          </p>
        )}

        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Active Tracked Claims ({trackedClaims.length})
          </span>
          {trackedClaims.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {trackedClaims.map((tc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5 flex-1 pr-3">
                    <p className="font-semibold text-slate-200 truncate">"{tc.claim_text}"</p>
                    <span className="text-[10px] text-slate-500">
                      Interval: {tc.interval_hours}h • Next Check: {tc.next_check_at ? new Date(tc.next_check_at).toLocaleDateString() : 'Pending'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-cyan-400">
                    {tc.current_status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-500 italic">
              No claims currently tracked. Click "Track Expiry" on any claim card or report to enable automated daily monitoring.
            </div>
          )}
        </div>
      </div>

      {/* Browser Extension Integration */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Puzzle className="w-4 h-4 text-cyan-400" />
          <span>Browser Extension Integration (Manifest V3)</span>
        </h3>
        <p className="text-xs text-slate-300">
          Verify selected web text or AI answers anywhere on the internet directly through the VerityAI Chrome/Edge Extension.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="font-bold text-cyan-400 block uppercase">How to Install:</span>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Open Chrome/Edge and go to <code className="text-cyan-300 font-mono">chrome://extensions</code></li>
              <li>Enable <strong>Developer mode</strong> in the top-right toggle.</li>
              <li>Click <strong>Load unpacked</strong>.</li>
              <li>Select the <code className="text-cyan-300 font-mono">VerifyAI/extension</code> folder.</li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="font-bold text-cyan-400 block uppercase">Features:</span>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Right-click any selected text $\to$ <i>"Verify with VerityAI"</i></li>
              <li>Instant popup report with Freshness & Confidence gauges</li>
              <li>Direct link opening full verification dossier in VerityAI</li>
              <li>Zero latency with asynchronous background pipeline</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Scoring Weight Configuration */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>Freshness Scoring Weights</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex justify-between font-semibold text-white">
              <span>Evidence Agreement</span>
              <span className="text-cyan-400">45%</span>
            </div>
            <p className="text-[11px] text-slate-500">Weight for consensus among independent sources</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex justify-between font-semibold text-white">
              <span>Source Reliability</span>
              <span className="text-cyan-400">25%</span>
            </div>
            <p className="text-[11px] text-slate-500">Weight for official documentation and high-authority domains</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex justify-between font-semibold text-white">
              <span>Temporal Relevance</span>
              <span className="text-cyan-400">20%</span>
            </div>
            <p className="text-[11px] text-slate-500">Decay penalty for aged evidence regarding time-sensitive facts</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex justify-between font-semibold text-white">
              <span>Citation Consistency</span>
              <span className="text-cyan-400">10%</span>
            </div>
            <p className="text-[11px] text-slate-500">Verification of explicit URL accessibility and cited text fidelity</p>
          </div>
        </div>
      </div>
    </div>
  );
};
