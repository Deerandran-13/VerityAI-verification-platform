# VerityAI

## Intelligent AI Information Verification & Freshness Engine

> **Don't Just Trust AI. Verify It.**

VerityAI identifies outdated, inaccurate, unsupported, contradictory, and potentially hallucinated claims in LLM-generated answers. It extracts individual factual claims, searches the live web for evidence, and produces comprehensive verification reports with freshness and confidence scores.

---

## 🚀 Features

### Core Verification
- **Claim Extraction** — Breaks AI answers into atomic, verifiable claims
- **Live Web Research** — Uses Tavily for real-time evidence gathering
- **Multi-Model Verification** — Routes through Bifrost AI Gateway
- **Freshness Scoring** — Configurable scoring engine with explainable metrics
- **Confidence Scoring** — Evidence-grounded confidence calculation

### Unique Innovations
- **Knowledge Drift Detection** — Tracks how facts change over time
- **Time-Travel Verification** — Verify claims against historical evidence
- **Adversarial Verification** — Actively searches for counter-evidence
- **Hallucination Fingerprinting** — Detects fabricated claims and citations
- **Citation Integrity Checking** — Validates references and URLs
- **Multi-Source Consensus** — Compares independent evidence sources
- **Model Disagreement Analysis** — Cross-validates with multiple AI models
- **Source Reliability Intelligence** — Evaluates evidence quality

---

## 🛠 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React |
| Backend | Python, FastAPI, Pydantic v2, SQLAlchemy 2.0 |
| Database | PostgreSQL 16 |
| AI Gateway | Bifrost → Gemini (configurable) |
| Research | Tavily Search API |
| Infrastructure | Docker, Docker Compose |

---

## 📦 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 16+ (or Docker)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd VerifyAI

# Copy environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Run database migrations
alembic upgrade head

# Start the backend
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Database

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name verityai-db \
  -e POSTGRES_USER=verityai \
  -e POSTGRES_PASSWORD=verityai \
  -e POSTGRES_DB=verityai \
  -p 5432:5432 \
  postgres:16-alpine
```

---

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL async connection string | Yes |
| `TAVILY_API_KEY` | Tavily Search API key | Yes (for research) |
| `BIFROST_API_KEY` | Bifrost AI Gateway key | Yes (for AI verification) |
| `BIFROST_BASE_URL` | Bifrost API base URL | Yes (for AI verification) |
| `SECRET_KEY` | Application secret for signing | Yes |
| `DEBUG` | Enable debug mode | No (default: false) |
| `CORS_ORIGINS` | Allowed CORS origins (JSON array) | No |

Get API keys:
- **Tavily**: [tavily.com](https://tavily.com)
- **Bifrost**: [bifrost.ai](https://bifrost.ai)

---

## 📚 API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

See [docs/API.md](docs/API.md) for detailed endpoint documentation.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/verify` | Submit text for verification |
| GET | `/api/v1/verify/{id}` | Get verification results |
| GET | `/api/v1/claims/{id}` | Get claim details with evidence |
| POST | `/api/v1/claims/{id}/reverify` | Re-verify a specific claim |
| GET | `/api/v1/history` | List verification history |
| GET | `/api/v1/dashboard/stats` | Get analytics statistics |
| GET | `/api/v1/knowledge-drift/{id}` | Get knowledge drift data |
| GET | `/api/v1/models/status` | Check AI model availability |
| GET | `/api/v1/health` | Health check |

---

## 🏗 Project Structure

```
VerityAI/
├── frontend/                  # React + TypeScript + Vite
│   └── src/
│       ├── components/        # Reusable UI components
│       ├── pages/             # Route pages
│       ├── services/          # API client
│       ├── hooks/             # Custom React hooks
│       ├── types/             # TypeScript interfaces
│       └── layouts/           # Page layouts
├── backend/                   # Python + FastAPI
│   ├── app/
│   │   ├── api/routes/        # API route handlers
│   │   ├── core/              # Config, DB, security
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── workers/           # Background tasks
│   ├── tests/                 # Automated tests
│   └── alembic/               # Database migrations
├── database/                  # DB init scripts
├── docs/                      # Documentation
├── docker-compose.yml
└── README.md
```

---

## 🧪 Testing

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_health.py -v
```

---

## 📋 Development Phases

- [x] **Phase 1**: Project initialization, frontend, backend, database, dashboard, health endpoint
- [ ] **Phase 2**: Tavily, Bifrost, and Gemini integrations
- [ ] **Phase 3**: Claim extraction and classification
- [ ] **Phase 4**: Live research and evidence collection
- [ ] **Phase 5**: Verification, contradiction detection, scoring
- [ ] **Phase 6**: Innovation modules (Drift, Time-Travel, Adversarial, Hallucination)
- [ ] **Phase 7**: Complete frontend integration
- [ ] **Phase 8**: Historical tracking, alerts, PDF export, analytics
- [ ] **Phase 9**: Testing, security, optimization, deployment

---

## 🏆 Built For

**Global AI Hackathon** — Theme: AI Agents & Intelligent Systems

Demonstrates practical integration of:
- **Tavily** — Real-time web research for evidence gathering
- **Bifrost** — AI Gateway for multi-model verification routing

---

## 📄 License

MIT License

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

