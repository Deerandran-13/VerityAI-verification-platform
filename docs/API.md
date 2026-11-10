# VerityAI Comprehensive API Reference

## Base URL
```
http://localhost:8000/api/v1
```

---

## 1. Health & External Integrations

### `GET /health`
Checks connection status to Database, Tavily Search API, Bifrost AI Gateway, and Google Gemini 2.5 Flash.

**Response 200:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "app_name": "VerityAI",
  "database": { "status": "connected", "message": "Database connected." },
  "tavily": { "status": "connected", "message": "Tavily Search API active." },
  "bifrost": { "status": "connected", "message": "Bifrost AI Gateway connected." },
  "gemini": { "status": "connected", "message": "Gemini available via Bifrost gateway routing." }
}
```

---

## 2. Information Verification

### `POST /verify`
Submits raw text for factual claim extraction, Tavily live web research, and Gemini verification via Bifrost.

**Request Payload:**
```json
{
  "text": "Python 3.12 was released in October 2023. GPT-4 API pricing is $30 per 1M tokens.",
  "mode": "standard",
  "historical_date": null
}
```
*Modes:* `standard`, `adversarial`, `time_travel`.

**Response 200:**
```json
{
  "id": "e98d61e9-ecca-45e3-81f3-58db51039cf7",
  "status": "completed",
  "message": "Verification completed: 2 claims audited with live evidence.",
  "total_claims": 2
}
```

### `GET /verify/{id}`
Returns complete verification dossier including all claims, supporting/contradicting evidence, citations, freshness, and confidence scores.

### `POST /verify/document`
Multipart form upload supporting `.pdf`, `.docx`, `.txt`, and `.md` documents up to 15MB.
- `file`: Document file bytes
- `mode`: `"standard"` | `"adversarial"` | `"time_travel"`
- `historical_date`: Optional ISO date cutoff

### `POST /verify/url`
Fetches and extracts primary article text from any public webpage with built-in SSRF protection against private subnets.
```json
{
  "url": "https://openai.com/index/hello-gpt-4o/",
  "mode": "standard"
}
```

### `POST /extension/verify`
Fast verification endpoint designed for the VerityAI Chrome/Edge extension.
```json
{
  "text": "Highlight snippet selected in browser..."
}
```

---

## 3. Multi-Model Disagreement Analysis

### `GET /models/disagreement/{job_id}`
Compares primary evaluator (Gemini 2.5 Flash) verdicts against secondary auditor perspectives routed through Bifrost to detect inter-model ambiguity or divergence.

**Response 200:**
```json
{
  "job_id": "c5c91787-bf1f-450b-a470-75fc6f96807d",
  "total_claims": 2,
  "average_disagreement_score": 0.0,
  "consensus_status": "High Model Alignment",
  "primary_model": "gemini-2.5-flash",
  "secondary_evaluator": "bifrost-adversarial-auditor",
  "claims_comparison": [...]
}
```

---

## 4. Knowledge Expiry & Automated Monitoring

### `POST /monitoring/track`
Schedules recurring factual checks for a claim.
```json
{
  "claim_id": "4f09c78e-5ccf-4a0e-a503-a75179efcaeb",
  "interval_type": "daily"
}
```
*Intervals:* `daily` (24h), `weekly` (168h), `monthly` (720h).

### `GET /monitoring/tracked`
Lists all active tracked claims, intervals, current status, and scheduled next check time.

### `POST /monitoring/check-expiries`
Executes due recurring checks on-demand, detects factual drift, and creates in-app notifications.

### `GET /notifications`
Retrieves in-app drift alerts and system notifications.

---

## 5. Report Generation & Export

### `GET /verify/{job_id}/export?format={json|html|csv}`
- `format=json`: Comprehensive structured JSON report.
- `format=html`: Standalone, self-contained printable HTML verification dossier (ready for Print to PDF).
- `format=csv`: RFC 4180 compliant CSV spreadsheet export with claims, verdicts, scores, and primary sources.

---

## 6. Claims & Historical Audits

- `GET /claims/{id}`: Detailed claim information with associated evidence citations.
- `POST /claims/{id}/reverify`: Re-triggers live verification of a single claim.
- `GET /evidence`: Recent stream of collected web evidence citations across verified jobs.
- `GET /history`: Paginated verification jobs history with search and filtering.
- `GET /dashboard/stats`: Platform-wide verification analytics and freshness metrics.
- `GET /drift/cases`: Curated benchmarks and database-tracked knowledge drift case studies.
