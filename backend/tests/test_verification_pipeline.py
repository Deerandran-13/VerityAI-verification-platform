from __future__ import annotations

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient

from app.main import app
from app.services.adversarial_verification import AdversarialVerificationEngine
from app.services.citation_checker import CitationChecker
from app.services.consensus_engine import MultiSourceConsensusEngine
from app.services.hallucination_detector import HallucinationDetector


@pytest.fixture
def client():
    return TestClient(app)


def test_submit_and_get_verification(client: TestClient):
    """Test standard verification submission and fetching full results."""
    payload = {
        "text": "Python 3.12 was released in October 2023. The EU AI Act entered into force in 2024.",
        "mode": "standard",
    }
    resp = client.post("/api/v1/verify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    assert data["status"] in ("completed", "pending", "processing")
    assert data["total_claims"] >= 1

    job_id = data["id"]
    get_resp = client.get(f"/api/v1/verify/{job_id}")
    assert get_resp.status_code == 200
    job_data = get_resp.json()
    assert job_data["id"] == job_id
    assert len(job_data["claims"]) >= 1
    assert "status" in job_data["claims"][0]
    assert "evidence" in job_data["claims"][0]


def test_adversarial_verification(client: TestClient):
    """Test adversarial mode query generation and submission."""
    adv = AdversarialVerificationEngine()
    queries = adv.generate_adversarial_queries("API v2 is supported")
    assert len(queries) >= 2
    assert any("false" in q or "deprecated" in q for q in queries)

    payload = {
        "text": "Python 2.7 is currently the recommended Python version.",
        "mode": "adversarial",
    }
    resp = client.post("/api/v1/verify", json=payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


def test_time_travel_verification(client: TestClient):
    """Test time travel mode with historical date selector."""
    payload = {
        "text": "Python 3.10 is the latest stable release.",
        "mode": "time_travel",
        "historical_date": "2021-11-01T00:00:00Z",
    }
    resp = client.post("/api/v1/verify", json=payload)
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


def test_hallucination_detection():
    """Test detecting fabricated API patterns and untraced stats."""
    detector = HallucinationDetector()
    res = detector.analyze_claim("User can invoke antigravity.teleport_user(fast=True) immediately.", evidence_count=0)
    assert res["has_warnings"] is True
    assert res["label"] == "POTENTIAL HALLUCINATION"

    normal_res = detector.analyze_claim("Python was created by Guido van Rossum.", evidence_count=3)
    assert normal_res["has_warnings"] is False


def test_citation_checker():
    """Test citation extraction from text."""
    checker = CitationChecker()
    text = "Refer to https://docs.python.org/3/ and https://ec.europa.eu/ai-act [1] for details."
    urls = checker.extract_urls_and_references(text)
    assert len(urls) >= 2
    assert "https://docs.python.org/3/" in urls


def test_multi_source_consensus():
    """Test multi-source independent domain consensus calculation."""
    engine = MultiSourceConsensusEngine()
    sources = [
        {"domain": "docs.python.org", "is_supporting": True},
        {"domain": "docs.python.org", "is_supporting": True},  # Duplicate domain
        {"domain": "wikipedia.org", "is_supporting": True},
        {"domain": "reddit.com", "is_supporting": False},
    ]
    res = engine.calculate_consensus(sources)
    assert res["total_independent_sources"] == 3
    assert res["supporting_independent_sources"] == 2
    assert res["agreement_percentage"] == round(2 / 3 * 100.0, 2)


def test_ssrf_protection():
    """Test that SSRF attempts against localhost and private subnets are blocked."""
    import pytest
    from app.services.document_extractor import DocumentExtractorService

    with pytest.raises(ValueError, match="SSRF Protection"):
        DocumentExtractorService.validate_url_safety("http://localhost:8000/secret")

    with pytest.raises(ValueError, match="SSRF Protection"):
        DocumentExtractorService.validate_url_safety("http://127.0.0.1:22/admin")

    with pytest.raises(ValueError, match="SSRF Protection"):
        DocumentExtractorService.validate_url_safety("http://metadata.google.internal/computeMetadata")


def test_document_txt_extraction():
    """Test extracting clean text from document bytes."""
    from app.services.document_extractor import DocumentExtractorService

    raw = b"Sample document containing factual text regarding software release schedules."
    extracted = DocumentExtractorService.extract_from_txt(raw)
    assert "software release schedules" in extracted


def test_model_disagreement_analysis():
    """Test inter-model disagreement analysis calculations."""
    from app.services.model_disagreement import ModelDisagreementAnalyzer

    analyzer = ModelDisagreementAnalyzer()
    outputs = [
        {"verdict": "verified"},
        {"verdict": "verified"},
        {"verdict": "outdated"},
    ]
    res = analyzer.compare_verdicts(outputs)
    assert res["total_models"] == 3
    assert res["consensus_verdict"] == "verified"
    assert res["agreement_rate"] == round(2 / 3 * 100.0, 2)


def test_expiry_monitoring_tracking(client: TestClient):
    """Test scheduling a claim for automated expiry monitoring."""
    # First submit a quick verification
    payload = {"text": "Python 3.12 was released in October 2023.", "mode": "standard"}
    resp = client.post("/api/v1/verify", json=payload)
    job_id = resp.json()["id"]

    # Fetch claim id
    job_resp = client.get(f"/api/v1/verify/{job_id}")
    claims = job_resp.json()["claims"]
    assert len(claims) > 0
    claim_id = claims[0]["id"]

    # Track claim
    track_resp = client.post(
        "/api/v1/monitoring/track",
        json={"claim_id": claim_id, "interval_type": "weekly"},
    )
    assert track_resp.status_code == 200
    assert track_resp.json()["interval_hours"] == 168

    # List tracked
    list_resp = client.get("/api/v1/monitoring/tracked")
    assert list_resp.status_code == 200
    assert any(c["claim_id"] == claim_id for c in list_resp.json())


def test_csv_report_export(client: TestClient):
    """Test CSV report export endpoint."""
    payload = {"text": "Python 3.12 was released in October 2023.", "mode": "standard"}
    resp = client.post("/api/v1/verify", json=payload)
    job_id = resp.json()["id"]

    csv_resp = client.get(f"/api/v1/verify/{job_id}/export?format=csv")
    assert csv_resp.status_code == 200
    assert "Claim ID" in csv_resp.text
    assert "Verdict" in csv_resp.text
    assert "Python 3.12" in csv_resp.text


