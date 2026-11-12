import type { VerificationMode } from '../types';

export interface TourPreset {
  id: string;
  title: string;
  badge: string;
  mode: VerificationMode;
  historicalDate?: string;
  description: string;
  text: string;
}

export const TOUR_PRESETS: TourPreset[] = [
  {
    id: 'hallucination',
    title: 'Hallucinated SDK & Outdated API',
    badge: 'Adversarial Audit',
    mode: 'adversarial',
    description:
      'Tests fabricated SDK methods, outdated framework versions, and unverified technical statistics using Adversarial Research.',
    text:
      'Python 3.10 is the latest stable release of Python as of 2026. In FastAPI, you can call app.enable_auto_hallucination_guard() built into fastapi.security to automatically fact-check all JSON responses. Additionally, OpenAI released GPT-4 in March 2023, and according to a 2024 Stanford study, 99.4% of enterprise APIs now run exclusively on GraphQL.',
  },
  {
    id: 'drift',
    title: 'Knowledge Drift & Current Facts',
    badge: 'Live Web Consensus',
    mode: 'standard',
    description:
      'Checks time-sensitive software versions, company facts, and technical claims against live Tavily web evidence.',
    text:
      'React 19 was officially released as stable in December 2024, introducing Actions and the useActionState hook. TypeScript 4.5 is currently the newest major release maintained by Microsoft, and Tailwind CSS v4 uses a CSS-first configuration approach with @import "tailwindcss".',
  },
  {
    id: 'timetravel',
    title: 'Historical Point-in-Time Check',
    badge: 'Time-Travel (2022-06-01)',
    mode: 'time_travel',
    historicalDate: '2022-06-01',
    description:
      'Evaluates whether claims were accurate as of June 1, 2022—distinguishing historically true statements from post-cutoff events.',
    text:
      'Python 3.10 is the latest major release of Python. GitHub Copilot is generally available to individual developers, and ChatGPT has already surpassed 100 million monthly active users.',
  },
];

