from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core import database as db_module
from app.main import app
from app.models.claim import Claim, ClaimCategory, ClaimStatus, ClaimVersion
from app.models.evidence import Evidence
from app.models.verification import JobStatus, VerificationJob, VerificationMode
from app.services.contradiction_detector import ContradictionDetector
from app.services.freshness_engine import FreshnessEngine
from app.services.intelligence_analyzer import IntelligenceAnalyzer
from app.services.source_reliability import SourceReliabilityAgent


def test_evidence_quality_and_bias_unit() -> None:
    agent = SourceReliabilityAgent()
    q = agent.score_evidence_quality(
        url="https://docs.python.org/3/whatsnew/3.12.html",
        title="Python 3.12 Release Notes",
        snippet="Python 3.12.0 was released on October 2, 2023 introducing subinterpreter support under PEP 684.",
        relevance_score=0.95,
        publication_date=datetime(2023, 10, 2, tzinfo=timezone.utc),
        corroboration_count=2,
    )
    assert q["quality_score"] > 60
    breakdown = q["quality_breakdown"]
    assert set(breakdown.keys()) >= {
        "source_authority",
        "claim_relevance",
        "publication_recency",
        "directness",
        "independent_corroboration",
    }

    bias = agent.detect_source_bias(
        url="https://example-vendor.com/blog/best-product",
        title="Sponsored Product Review",
        snippet="Our sponsored solution is the best and fastest platform, buy now for 50% discount.",
    )
    assert bias["auto_rejected"] is False
    assert bias["bias_label"] == "commercial_promotional"


def test_uncertainty_quantification_missing_conflicting_ambiguous() -> None:
    engine = FreshnessEngine()
    missing = engine.quantify_uncertainty(
        evidence_count=0,
        supporting_count=0,
        contradicting_count=0,
        avg_quality_score=0.0,
        model_confidence=85.0,
        is_vague_claim=False,
    )
    assert missing["uncertainty_level"] == "high"
    assert missing["recommend_insufficient_evidence"] is True
    assert missing["evidence_strength"] < 30.0

    conflicting = engine.quantify_uncertainty(
        evidence_count=2,
        supporting_count=1,
        contradicting_count=1,
        avg_quality_score=79.0,
        model_confidence=90.0,
        is_vague_claim=False,
    )
    assert conflicting["uncertainty_level"] in ("moderate", "high")
    assert "conflict" in conflicting["uncertainty_reason"].lower()

    ambiguous = engine.quantify_uncertainty(
        evidence_count=1,
        supporting_count=1,
        contradicting_count=0,
        avg_quality_score=75.0,
        model_confidence=70.0,
        is_vague_claim=True,
    )
    assert ambiguous["uncertainty_level"] in ("moderate", "high")


def test_fact_conflict_resolution_unit() -> None:
    detector = ContradictionDetector()
    analysis = detector.analyze_evidence_conflicts(
        "GPT-4 API costs $30 per million tokens.",
        [
            {
                "id": "e1",
                "source_title": "2023 Blog",
                "source_domain": "oldblog.example.com",
                "source_url": "https://oldblog.example.com",
                "publication_date": "2023-04-01T00:00:00+00:00",
                "content_snippet": "GPT-4 pricing is $30 per 1M input tokens.",
                "is_supporting": True,
                "is_contradicting": False,
                "quality_score": 65.0,
            },
            {
                "id": "e2",
                "source_title": "OpenAI Pricing 2024",
                "source_domain": "openai.com",
                "source_url": "https://openai.com/pricing",
                "publication_date": "2024-11-01T00:00:00+00:00",
                "content_snippet": "GPT-4o pricing is $2.50 per 1M input tokens.",
                "is_supporting": False,
                "is_contradicting": True,
                "quality_score": 92.0,
            },
        ],
    )
    assert analysis["has_conflict"] is True
    assert len(analysis["supporting_side"]) == 1
    assert len(analysis["contradicting_side"]) == 1
    assert len(analysis["conflict_reasons"]) >= 1


def _seed_two_jobs() -> tuple[str, str, str]:
    async def _seed() -> tuple[str, str, str]:
        await db_module.ensure_tables_exist()
        async with db_module.active_session_factory() as session:
            job_a = VerificationJob(
                original_text="Python 3.12 was released in October 2023. Therefore Python 3.12 supports PEP 684.",
                mode=VerificationMode.STANDARD,
                status=JobStatus.COMPLETED,
                overall_freshness_score=90.0,
                overall_confidence_score=92.0,
                total_claims=2,
                verified_claims=2,
            )
            job_b = VerificationJob(
                original_text="Python 3.12 was released in October 2023. GPT-4 API costs $30 per 1M tokens.",
                mode=VerificationMode.STANDARD,
                status=JobStatus.COMPLETED,
                overall_freshness_score=65.0,
                overall_confidence_score=80.0,
                total_claims=2,
                verified_claims=1,
                outdated_claims=1,
            )
            session.add_all([job_a, job_b])
            await session.flush()

            c1 = Claim(
                verification_job_id=job_a.id,
                claim_text="Python 3.12 was released in October 2023.",
                position_in_text=0,
                category=ClaimCategory.SOFTWARE_VERSION,
                status=ClaimStatus.VERIFIED,
                freshness_score=95.0,
                confidence_score=96.0,
                evidence_strength=88.0,
                uncertainty_score=12.0,
                uncertainty_level="low",
            )
            c2 = Claim(
                verification_job_id=job_a.id,
                claim_text="Therefore Python 3.12 supports PEP 684 subinterpreters.",
                position_in_text=1,
                category=ClaimCategory.SOFTWARE_VERSION,
                status=ClaimStatus.VERIFIED,
                freshness_score=92.0,
                confidence_score=90.0,
                evidence_strength=84.0,
                uncertainty_score=16.0,
                uncertainty_level="low",
            )
            c3 = Claim(
                verification_job_id=job_b.id,
                claim_text="Python 3.12 was released in October 2023.",
                position_in_text=0,
                category=ClaimCategory.SOFTWARE_VERSION,
                status=ClaimStatus.OUTDATED,
                freshness_score=60.0,
                confidence_score=85.0,
            )
            session.add_all([c1, c2, c3])
            await session.flush()

            ev1 = Evidence(
                claim_id=c1.id,
                source_title="PSF Release Notes",
                source_url="https://docs.python.org/3/whatsnew/3.12.html",
                source_domain="docs.python.org",
                publication_date=datetime(2023, 10, 2, tzinfo=timezone.utc),
                retrieval_date=datetime.now(timezone.utc),
                content_snippet="Python 3.12.0 released October 2, 2023.",
                is_supporting=True,
                is_primary_source=True,
                reliability_score=96.0,
                quality_score=91.0,
                bias_label="neutral_or_unclear",
            )
            ev2 = Evidence(
                claim_id=c1.id,
                source_title="Community Blog",
                source_url="https://blog.example.com/py312",
                source_domain="blog.example.com",
                publication_date=datetime(2024, 5, 1, tzinfo=timezone.utc),
                retrieval_date=datetime.now(timezone.utc),
                content_snippet="Python 3.12 actually shipped with PEP 684 in late 2023, though some notes conflict.",
                is_contradicting=True,
                is_primary_source=False,
                reliability_score=62.0,
                quality_score=58.0,
                bias_label="promotional",
            )
            ver = ClaimVersion(
                claim_id=c1.id,
                version_number=1,
                claim_text=c1.claim_text,
                status="verified",
                change_reason="Initial verification",
            )
            session.add_all([ev1, ev2, ver])
            await session.commit()
            return str(job_a.id), str(job_b.id), str(c1.id)

    return asyncio.run(_seed())


def test_graph_timeline_conflicts_feedback_compare_and_collaboration_routes() -> None:
    job_a_id, job_b_id, claim_id = _seed_two_jobs()
    client = TestClient(app)
    client.headers.update({"X-Forwarded-For": "10.99.0.1"})

    # 1. Claim Dependency Graph
    g_res = client.get(f"/api/v1/verify/{job_a_id}/graph")
    assert g_res.status_code == 200
    g_data = g_res.json()
    assert len(g_data["nodes"]) >= 3
    assert any(e["relationship"] == "dependent" for e in g_data["edges"])

    # 2. Evidence Timeline
    t_res = client.get(f"/api/v1/claims/{claim_id}/timeline")
    assert t_res.status_code == 200
    t_data = t_res.json()
    assert len(t_data["timeline"]) >= 3
    assert len(t_data["fact_changes"]) >= 1

    # 3. Fact Conflicts (claim & job)
    c_res = client.get(f"/api/v1/claims/{claim_id}/conflicts")
    assert c_res.status_code == 200
    assert c_res.json()["has_conflict"] is True

    jc_res = client.get(f"/api/v1/verify/{job_a_id}/conflicts")
    assert jc_res.status_code == 200
    assert jc_res.json()["conflicted_claims_count"] >= 1

    # 4. Human Review & Feedback Loop (never auto-overrides Claim.status)
    fb_res = client.post(
        f"/api/v1/claims/{claim_id}/feedback",
        json={
            "reviewer_email": "reviewer1@verityai.test",
            "decision": "incorrect",
            "explanation": "Needs manual check of PEP 684 notes.",
        },
    )
    assert fb_res.status_code == 201
    assert fb_res.json()["claim_status_unchanged"] == "verified"
    assert fb_res.json()["is_verified_review"] is False

    claim_after = client.get(f"/api/v1/claims/{claim_id}")
    assert claim_after.status_code == 200
    assert claim_after.json()["status"] == "verified"

    # 5. Verification Comparison
    cmp_res = client.get(f"/api/v1/compare?job_a={job_a_id}&job_b={job_b_id}")
    assert cmp_res.status_code == 200
    assert cmp_res.json()["summary_counts"]["newly_outdated"] >= 1

    # 6. Team Collaboration & RBAC
    suffix = uuid.uuid4().hex[:6]
    admin_email = f"admin_{suffix}@verityai.test"
    member_email = f"member_{suffix}@verityai.test"
    outsider_email = f"outsider_{suffix}@verityai.test"

    reg_admin = client.post(
        "/api/v1/collaboration/users/register",
        json={"email": admin_email, "password": "password123", "role": "admin"},
    )
    assert reg_admin.status_code == 201
    admin_token = reg_admin.json()["access_token"]

    reg_member = client.post(
        "/api/v1/collaboration/users/register",
        json={"email": member_email, "password": "password123", "role": "member"},
    )
    assert reg_member.status_code == 201
    member_token = reg_member.json()["access_token"]

    reg_outsider = client.post(
        "/api/v1/collaboration/users/register",
        json={"email": outsider_email, "password": "password123", "role": "member"},
    )
    assert reg_outsider.status_code == 201
    outsider_token = reg_outsider.json()["access_token"]

    # Share report with member
    share_res = client.post(
        f"/api/v1/collaboration/reports/{job_a_id}/share",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"member_email": member_email, "member_role": "member"},
    )
    assert share_res.status_code == 201

    # Outsider cannot read comments on private shared report -> 403
    outsider_read = client.get(
        f"/api/v1/collaboration/reports/{job_a_id}/comments",
        headers={"Authorization": f"Bearer {outsider_token}"},
    )
    assert outsider_read.status_code == 403

    # Member cannot post official review_note -> 403
    member_note = client.post(
        f"/api/v1/collaboration/reports/{job_a_id}/comments",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"comment_type": "review_note", "content": "Attempted official note"},
    )
    assert member_note.status_code == 403

    # Member CAN post regular comment -> 201
    member_comment = client.post(
        f"/api/v1/collaboration/reports/{job_a_id}/comments",
        headers={"Authorization": f"Bearer {member_token}"},
        json={"comment_type": "comment", "content": "Looks solid, please review source 2."},
    )
    assert member_comment.status_code == 201

    # Audit log contains share + comment actions
    audit_res = client.get(
        f"/api/v1/collaboration/reports/{job_a_id}/audit-log",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert audit_res.status_code == 200
    actions = [entry["action"] for entry in audit_res.json()]
    assert "report_shared" in actions
    assert "report_comment_added" in actions
