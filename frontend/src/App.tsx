import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { LandingPage } from './pages/LandingPage';
import { VerificationWorkspace } from './pages/VerificationWorkspace';
import { VerificationResults } from './pages/VerificationResults';
import { EvidenceExplorer } from './pages/EvidenceExplorer';
import { KnowledgeDrift } from './pages/KnowledgeDrift';
import { TimeTravelVerification } from './pages/TimeTravelVerification';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { VerificationHistory } from './pages/VerificationHistory';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard Pages with MainLayout */}
        <Route element={<MainLayout />}>
          <Route path="/workspace" element={<VerificationWorkspace />} />
          <Route path="/results" element={<VerificationResults />} />
          <Route path="/evidence" element={<EvidenceExplorer />} />
          <Route path="/drift" element={<KnowledgeDrift />} />
          <Route path="/time-travel" element={<TimeTravelVerification />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/history" element={<VerificationHistory />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

