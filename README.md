# VerityAI

### Evidence-Driven AI Verification, Freshness & Hallucination Intelligence Platform

> **Don't Just Trust AI. Verify It.**

VerityAI audits AI-generated text, uploaded documents (PDF, DOCX, TXT), and live web pages against real-time web evidence. It decomposes responses into atomic claims, gathers primary sources via **Tavily**, cross-verifies them through **Bifrost AI Gateway** (**Gemini 2.5 Flash**), maps claim relationships into an interactive **Claim Dependency Graph**, quantifies uncertainty and source bias, and persists full audit-ready reports.

---

## Key Capabilities

### 1. Multi-Input Verification & Document Mapping
- **AI Text, Document & URL Inputs** — Paste LLM responses, upload `.pdf`, `.docx`, or `.txt` files, or verify live webpage URLs.
- **Page & Section Claim Mapping** — Extracts `page_number` and `section_title` metadata from uploaded documents so every claim traces back to its exact location.
- **Async Processing, Retries & Caching** — Supports synchronous or background `async_mode=true` execution with `GET /api/v1/verify/{job_id}/status` progress polling, bounded timeouts, and persistent database caching.
- **Verification Modes** — **Standard**, **Adversarial** (actively hunts for counter-evidence), and **Time-Travel** (audits claims against a historical date).

### 2. Advanced Verification Intelligence (10 Integrated Modules)
1. **Claim Dependency Graph (`/graph`)** — Interactive graph connecting claim nodes and evidence nodes (`supporting`, `contradicting`, `dependent`, `overlapping`), with click-to-inspect node details and upstream impact propagation alerts.
2. **Claim Relationship Analysis** — Automatically classifies pairwise claim relationships (`ClaimRelationship`) and highlights downstream claims affected by contradicted or outdated premises.
3. **Evidence Timeline** — Chronological timeline per claim combining source `publication_date`, `retrieval_date`, and `ClaimVersion` snapshots to highlight fact changes over time.
4. **5-Factor Evidence Quality Scoring** — Weighted `/100` score (`Source Authority` 25, `Claim Relevance` 25, `Publication Recency` 20, `Directness` 15, `Independent Corroboration` 15), explicitly kept distinct from claim correctness.
5. **Source Bias Detection** — Identifies commercial, promotional, or institutional bias signals and potential conflicts of interest with rationale (`auto_rejected=false`; never rejects a source on bias alone).
6. **Uncertainty Quantification** — Separates `confidence_score` (model confidence) from `evidence_strength`, surfaces `uncertainty_level` (`low`/`moderate`/`high`) and `uncertainty_reason`, and recommends `insufficient_evidence` when evidence is scarce, conflicting, or ambiguous.
7. **Fact Conflict Resolution** — Detects competing supporting vs. contradicting sources, explains why they diverge (dates, specs, definitions), and presents both sides with traceable citations.
8. **Human Review & Feedback Loop** — Reviewers can log `correct`, `incorrect`, or `needs_review` decisions with rationale and supporting URLs; persisted in `HumanFeedback` + `AuditActivityLog` without ever auto-mutating verdicts.
9. **Verification Comparison (`/compare`)** — Side-by-side comparison of two verification runs across verdicts, freshness, confidence, and evidence counts (`unchanged`, `newly_supported`, `newly_contradicted`, `newly_outdated`, `added`, `removed`).
10. **Team Collaboration & RBAC (`/collaborate`)** — Authenticated team accounts (PBKDF2-SHA256 + HS256 JWT), role-based access control (`admin`, `reviewer`, `member`), shared reports, reviewer assignments, comments/review notes, and immutable audit logs.

### 3. Monitoring, Exports, Security & Interactive Tour
- **Knowledge Drift & Expiry Monitoring** — Tracks time-sensitive claims (`/drift`) and schedules automated expiry checks (`/monitoring/track`, `/monitoring/check-expiries`).
- **Report Exports** — Export verification dossiers to **PDF**, **HTML**, **CSV**, and **JSON** (`/api/v1/verify/{job_id}/export`).
- **Security Guardrails (`/trust`)** — SSRF protection on URL fetches, prompt-injection detection & sanitization, per-IP sliding-window rate limiting, request size limits, API key auth, and masked secret diagnostics.
- **Judge's Tour & Interactive Walkthrough (`/tour`)** — 18-chapter interactive animated product walkthrough with live backend data hydration and synchronized English narration/subtitles.
- **Chrome Extension (`extension/`)** — Verify highlighted text on any webpage in one click.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async) |
| **Database** | SQLite (WAL mode local default) / PostgreSQL 16 |
| **AI Gateway** | Bifrost AI Gateway (`gemini/gemini-2.5-flash`) |
| **Web Research** | Tavily Search API |
| **Testing** | Pytest (29 unit & integration tests), TypeScript (`tsc -b`), Vite build |

---

## Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Configure TAVILY_API_KEY, BIFROST_BASE_URL, SECRET_KEY, etc. in backend/.env

uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Bifrost AI Gateway
```bash
npx --yes @maximhq/bifrost
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** (Frontend) and **http://localhost:8000/docs** (Swagger API Docs).

---

## Key API Routes (`/api/v1`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/verify` | Submit text/URL/mode for verification (`async_mode` supported) |
| `POST` | `/api/v1/verify/upload` | Upload PDF, DOCX, or TXT with page/section claim mapping |
| `GET` | `/api/v1/verify/{job_id}` | Retrieve full verification job, claims, evidence, quality & uncertainty |
| `GET` | `/api/v1/verify/{job_id}/status` | Poll asynchronous verification progress |
| `GET` | `/api/v1/verify/{job_id}/export` | Export report (`pdf`, `html`, `csv`, `json`) |
| `GET` | `/api/v1/verify/{job_id}/graph` | Get interactive Claim Dependency Graph & impact propagation |
| `GET` | `/api/v1/verify/{job_id}/conflicts` | Detect and compare competing evidence across all claims in a job |
| `GET` | `/api/v1/compare?job_a=...&job_b=...` | Side-by-side comparison of two verification jobs |
| `GET` | `/api/v1/claims/{claim_id}/timeline` | Chronological evidence + `ClaimVersion` timeline |
| `GET` | `/api/v1/claims/{claim_id}/conflicts` | Claim-level fact conflict analysis with citations |
| `POST` | `/api/v1/claims/{claim_id}/feedback` | Submit human reviewer feedback (audit-logged; never auto-overrides verdict) |
| `POST` | `/api/v1/collaboration/users/register` | Register collaboration user (`admin`, `reviewer`, `member`) |
| `POST` | `/api/v1/collaboration/login` | Authenticate and issue JWT |
| `POST` | `/api/v1/collaboration/reports/{job_id}/share` | Share report & assign reviewer (RBAC-protected) |
| `POST` | `/api/v1/collaboration/reports/{job_id}/comments` | Add comments or official review notes |
| `GET` | `/api/v1/collaboration/reports/{job_id}/audit-log` | Retrieve immutable audit activity log |
| `GET` | `/api/v1/dashboard/stats` | Aggregated verification & freshness analytics |
| `GET` | `/api/v1/health` | Service health check (Database, Tavily, Bifrost, Gemini) |

See [docs/API.md](docs/API.md) for full request/response documentation.

---

## Testing & Verification

```bash
# Backend test suite (29 unit & integration tests)
backend\.venv\Scripts\pytest backend/tests -v

# Frontend TypeScript check & production build
npm --prefix frontend run build
```

---

## Project Structure

```text
VerifyAI/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # verification, claims, intelligence, history, dashboard, monitoring, auth, health
│   │   ├── core/              # config, database (migrations), security (JWT, rate limit, SSRF, prompt shield)
│   │   ├── models/            # VerificationJob, Claim, Evidence, Collaboration, AuditActivityLog
│   │   ├── schemas/           # Pydantic v2 request/response models
│   │   └── services/          # orchestrator, claim_extractor, tavily, bifrost, freshness, reliability, intelligence_analyzer, report_generator
│   └── tests/                 # 29 automated pytest unit & integration tests
├── frontend/
│   ├── public/                # Pre-rendered 18-chapter MP4 walkthrough (verityai-demo-walkthrough.mp4)
│   └── src/
│       ├── components/        # results, evidence, dashboard charts, tour (DemoVideoPlayer), layout
│       ├── pages/             # Workspace, Results, EvidenceExplorer, ClaimGraph, Compare, Collaboration, Drift, TimeTravel, Analytics, Tour, Trust
│       ├── services/          # Typed Axios API client
│       └── types/             # TypeScript interfaces
├── extension/                 # Chrome Extension for 1-click webpage claim verification
├── docs/                      # API documentation
└── README.md
```

---

## License

MIT License
