import React from 'react';
import type { Claim } from '../../types';
import { ClaimCard } from './ClaimCard';

interface ClaimsListProps {
  claims: Claim[];
}

export const ClaimsList: React.FC<ClaimsListProps> = ({ claims }) => {
  if (!claims || claims.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400">
        No claims extracted yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim, index) => (
        <ClaimCard key={claim.id || index} claim={claim} index={index} />
      ))}
    </div>
  );
};

