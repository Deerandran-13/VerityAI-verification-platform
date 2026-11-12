export interface DemoChapter {
  id: string;
  number: number;
  title: string;
  startSec: number;
  endSec: number;
  badge: string;
  routeHint: string;
  narration: string;
}

export const DEMO_CHAPTERS: DemoChapter[] = [
  {
    id: 'overview',
    number: 1,
    title: '1. What is VerityAI?',
    startSec: 0,
    endSec: 16,
    badge: 'WHAT IS VERITYAI',
    routeHint: '/',
    narration:
      'What is VerityAI? VerityAI is an evidence-driven AI verification intelligence platform. It audits AI-generated text, documents, and web pages against live web sources so teams catch hallucinations, outdated facts, and fabricated citations before shipping.',
  },
  {
    id: 'inputs',
    number: 2,
    title: '2. How to Use VerityAI (Step-by-Step)',
    startSec: 16,
    endSec: 34,
    badge: 'HOW TO USE',
    routeHint: '/workspace',
    narration:
      'How to use VerityAI in four steps: First, open Workspace and paste AI text, upload a PDF, DOCX, or TXT file, or enter a URL. Second, pick Standard, Adversarial, or Time-Travel mode. Third, click Start Verification. Fourth, explore Verdicts, the Claim Graph, and Export.',
  },
  {
    id: 'pipeline',
    number: 3,
    title: '3. End-to-End Verification Pipeline',
    startSec: 34,
    endSec: 54,
    badge: 'DATA FLOW',
    routeHint: '/workspace',
    narration:
      'When you click Start Verification, POST /api/v1/verify extracts atomic claims, queries Tavily for primary web evidence, evaluates reliability and bias, computes freshness and uncertainty, and persists the full graph to the database.',
  },
  {
    id: 'async_cache',
    number: 4,
    title: '4. Async Processing, Caching & Retries',
    startSec: 54,
    endSec: 70,
    badge: 'ASYNC & RELIABILITY',
    routeHint: '/workspace',
    narration:
      'Long audits run asynchronously with live status polling via GET /verify/{job_id}/status, bounded timeouts, automatic retries, and database persistence so completed reports load instantaneously.',
  },
  {
    id: 'extraction',
    number: 5,
    title: '5. Claim Extraction & Document Mapping',
    startSec: 70,
    endSec: 88,
    badge: 'CLAIM PARSING',
    routeHint: '/results',
    narration:
      'Complex AI paragraphs are decomposed into atomic claims tagged by category—such as software version, pricing, or regulation—alongside time-sensitivity flags and exact PDF page and section locations.',
  },
  {
    id: 'verdicts',
    number: 6,
    title: '6. Verdicts & Hallucination Fingerprint',
    startSec: 88,
    endSec: 106,
    badge: 'VERDICTS & RISKS',
    routeHint: '/results',
    narration:
      'Each claim receives an evidence-backed verdict: Verified, Outdated, Contradicted, Partially Supported, or Unsupported. Hallucination Fingerprint flags fabricated SDK methods and non-existent URLs.',
  },
  {
    id: 'claim_graph',
    number: 7,
    title: '7. Claim Dependency Graph (Deep Dive)',
    startSec: 106,
    endSec: 130,
    badge: 'INTERACTIVE GRAPH',
    routeHint: '/graph',
    narration:
      'The Claim Dependency Graph maps claim nodes and evidence nodes together. Green edges mark supporting links, red marks contradictions, dashed amber shows dependent premises, and cyan highlights overlapping claims. Click any node to inspect impact propagation.',
  },
  {
    id: 'relationships',
    number: 8,
    title: '8. Claim Relationship Analysis',
    startSec: 130,
    endSec: 148,
    badge: 'RELATIONSHIPS',
    routeHint: '/graph',
    narration:
      'IntelligenceAnalyzer classifies claim pairs as supporting, contradicting, dependent, overlapping, or unrelated, persists them in ClaimRelationship, and alerts you when an upstream premise fails.',
  },
  {
    id: 'quality_scoring',
    number: 9,
    title: '9. 5-Factor Evidence Quality Scoring',
    startSec: 148,
    endSec: 168,
    badge: 'QUALITY SCORE',
    routeHint: '/evidence',
    narration:
      'Evidence Quality Scoring evaluates five weighted factors out of 100: Source Authority 25, Claim Relevance 25, Publication Recency 20, Directness 15, and Independent Corroboration 15—kept distinct from whether a claim is true.',
  },
  {
    id: 'bias_agreement',
    number: 10,
    title: '10. Source Bias & Evidence Agreement',
    startSec: 168,
    endSec: 186,
    badge: 'BIAS & CONSENSUS',
    routeHint: '/evidence',
    narration:
      'The Evidence Agreement bar visualizes Supporting, Contradicting, and Neutral ratios, while Source Bias Detection flags commercial or institutional bias with rationale—never auto-rejecting a source on bias alone.',
  },
  {
    id: 'uncertainty',
    number: 11,
    title: '11. Uncertainty Quantification',
    startSec: 186,
    endSec: 206,
    badge: 'UNCERTAINTY',
    routeHint: '/results',
    narration:
      'VerityAI separates Model Confidence from Evidence Strength. When sources conflict, are scarce, or a claim is vague, Uncertainty Quantification raises the uncertainty level and can recommend insufficient evidence.',
  },
  {
    id: 'conflicts',
    number: 12,
    title: '12. Fact Conflict Resolution',
    startSec: 206,
    endSec: 226,
    badge: 'CONFLICT RESOLUTION',
    routeHint: '/results',
    narration:
      'When reliable sources disagree on dates, pricing, or specs, Fact Conflict Resolution presents both supporting and contradicting sides with traceable citations and explains why they diverge.',
  },
  {
    id: 'timeline',
    number: 13,
    title: '13. Evidence Timeline & Fact Changes',
    startSec: 226,
    endSec: 244,
    badge: 'TIMELINE',
    routeHint: '/results',
    narration:
      'Every claim includes a chronological Evidence Timeline combining source publication dates, retrieval timestamps, and ClaimVersion snapshots to highlight exactly when facts changed over time.',
  },
  {
    id: 'drift_timetravel',
    number: 14,
    title: '14. Knowledge Drift, Time-Travel & Expiry',
    startSec: 244,
    endSec: 264,
    badge: 'DRIFT & TIME-TRAVEL',
    routeHint: '/drift',
    narration:
      'Track Knowledge Drift as APIs and prices evolve, run Time-Travel Verification against any historical date, and schedule automated Expiry Monitoring to catch stale claims before users see them.',
  },
  {
    id: 'analytics_charts',
    number: 15,
    title: '15. Analytics Dashboard & Charts Explained',
    startSec: 264,
    endSec: 284,
    badge: 'ANALYTICS CHARTS',
    routeHint: '/analytics',
    narration:
      'The Analytics Dashboard pulls live database aggregates from /dashboard/stats. The Donut Chart shows claim verdict proportions, while the Freshness Bar Chart buckets claims into 0–39%, 40–64%, 65–84%, and 85–100% cohorts.',
  },
  {
    id: 'compare',
    number: 16,
    title: '16. Verification Comparison',
    startSec: 284,
    endSec: 300,
    badge: 'SIDE-BY-SIDE DIFF',
    routeHint: '/compare',
    narration:
      'Compare any two verification runs side by side via GET /compare. Immediately spot newly supported, newly contradicted, newly outdated, added, or removed claims alongside freshness and confidence deltas.',
  },
  {
    id: 'collaboration',
    number: 17,
    title: '17. Human Review, Team Collaboration & RBAC',
    startSec: 300,
    endSec: 318,
    badge: 'RBAC & AUDIT',
    routeHint: '/collaborate',
    narration:
      'Reviewers log feedback without auto-overriding verdicts. Teams share reports with Admin, Reviewer, and Member permissions, post review notes, assign reviewers, and inspect an immutable audit activity log.',
  },
  {
    id: 'exports_security',
    number: 18,
    title: '18. Exports, Public API, Security & Trust',
    startSec: 318,
    endSec: 336,
    badge: 'EXPORTS & TRUST',
    routeHint: '/trust',
    narration:
      'Finally, export dossiers to PDF, HTML, CSV, or JSON, integrate via the versioned REST API, verify pages with the Chrome Extension, and audit our SSRF, rate-limiting, and prompt-injection guardrails.',
  },
];

export const TOTAL_DEMO_DURATION = 336;

