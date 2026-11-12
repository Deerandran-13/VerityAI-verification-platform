from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import sanitize_input
from app.models.claim import Claim, ClaimVersion
from app.models.collaboration import AuditActivityLog, HumanFeedback
from app.models.evidence import Evidence
from app.schemas.claim import (
    ClaimResponse,
    ReverifyRequest,
    ReverifyResponse,
)
from app.schemas.evidence import EvidenceResponse
from app.services.contradiction_detector import ContradictionDetector

router = APIRouter(tags=["claims"])


def _to_evidence_response(e: Evidence) -> EvidenceResponse:
    return EvidenceResponse(
        id=e.id,
        claim_id=e.claim_id,
        source_title=e.source_title,
        source_url=e.source_url,
        source_domain=e.source_domain,
        publication_date=e.publication_date,
        retrieval_date=e.retrieval_date,
        content_snippet=e.content_snippet,
        relevance_score=e.relevance_score,
        is_supporting=e.is_supporting,
        is_contradicting=e.is_contradicting,
        is_primary_source=e.is_primary_source,
        reliability_score=e.reliability_score,
        quality_score=e.quality_score,
        quality_breakdown=e.quality_breakdown,
        bias_label=e.bias_label,
        bias_confidence=e.bias_confidence,
        bias_rationale=e.bias_rationale,
        conflict_of_interest=e.conflict_of_interest,
        search_query=e.search_query,
        created_at=e.created_at,
    )


def _to_claim_response(claim: Claim) -> ClaimResponse:
    evidence_list = [_to_evidence_response(e) for e in claim.evidence_items]
    return ClaimResponse(
        id=claim.id,
        verification_job_id=claim.verification_job_id,
        claim_text=claim.claim_text,
        original_sentence=claim.original_sentence,
        position_in_text=claim.position_in_text,
        page_number=claim.page_number,
        section_title=claim.section_title,
        category=claim.category.value if claim.category else None,
        is_time_sensitive=claim.is_time_sensitive,
        is_historical=claim.is_historical,
        is_vague=claim.is_vague,
        status=claim.status.value if claim.status else None,
        freshness_score=claim.freshness_score,
        confidence_score=claim.confidence_score,
        evidence_strength=claim.evidence_strength,
        uncertainty_score=claim.uncertainty_score,
        uncertainty_level=claim.uncertainty_level,
        uncertainty_reason=claim.uncertainty_reason,
        explanation=claim.explanation,
        suggested_correction=claim.suggested_correction,
        evidence=evidence_list,
        created_at=claim.created_at,
        updated_at=claim.updated_at,
    )


@router.get(
    "/evidence",
    response_model=list[EvidenceResponse],
    summary="List recent evidence items",
    description="Returns recent evidence items retrieved across verification jobs.",
)
async def list_recent_evidence(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
) -> list[EvidenceResponse]:
    """Retrieve recent evidence items across verified claims."""
    stmt = (
        select(Evidence)
        .order_by(Evidence.retrieval_date.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    return [_to_evidence_response(e) for e in items]


@router.get(
    "/claims/{claim_id}",
    response_model=ClaimResponse,
    summary="Get claim details",
    description="Returns a claim with its evidence items.",
)
async def get_claim(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ClaimResponse:
    """Retrieve a single claim by ID, including all evidence."""
    stmt = (
        select(Claim)
        .where(Claim.id == claim_id)
        .options(selectinload(Claim.evidence_items))
    )
    result = await db.execute(stmt)
    claim = result.scalar_one_or_none()

    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim {claim_id} not found",
        )

    return _to_claim_response(claim)


@router.post(
    "/claims/{claim_id}/reverify",
    response_model=ReverifyResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Mark claim for re-verification",
    description="Creates a new ClaimVersion snapshot and marks the claim for re-verification.",
)
async def reverify_claim(
    claim_id: uuid.UUID,
    body: ReverifyRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> ReverifyResponse:
    """Mark a claim for re-verification by creating a version snapshot."""
    stmt = select(Claim).where(Claim.id == claim_id)
    result = await db.execute(stmt)
    claim = result.scalar_one_or_none()

    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim {claim_id} not found",
        )

    # Determine the next version number
    max_version_stmt = (
        select(func.coalesce(func.max(ClaimVersion.version_number), 0))
        .where(ClaimVersion.claim_id == claim_id)
    )
    max_version_result = await db.execute(max_version_stmt)
    current_max = max_version_result.scalar() or 0
    new_version = current_max + 1

    # Create a version snapshot
    version = ClaimVersion(
        claim_id=claim.id,
        version_number=new_version,
        claim_text=claim.claim_text,
        status=claim.status.value if claim.status else None,
        evidence_snapshot=None,
        verified_at=claim.updated_at,
        changed_fields=None,
        change_reason=body.reason if body else "Manual re-verification requested",
    )
    db.add(version)

    # Reset claim status to trigger re-verification
    claim.status = None
    claim.freshness_score = None
    claim.confidence_score = None
    claim.explanation = None

    await db.flush()

    return ReverifyResponse(
        claim_id=claim.id,
        message="Claim marked for re-verification. Processing will begin shortly.",
        new_version=new_version,
    )


class HumanFeedbackRequest(BaseModel):
    reviewer_email: str = Field(..., min_length=3, max_length=320)
    reviewer_name: str | None = Field(default=None, max_length=255)
    decision: Literal["correct", "incorrect", "needs_review"]
    explanation: str | None = Field(default=None, max_length=4000)
    supporting_url: str | None = Field(default=None, max_length=2000)


@router.get(
    "/claims/{claim_id}/timeline",
    summary="Get chronological evidence & version timeline for a claim",
)
async def get_claim_timeline(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return chronological evidence entries, version snapshots, and fact drift highlights."""
    stmt = (
        select(Claim)
        .where(Claim.id == claim_id)
        .options(selectinload(Claim.evidence_items), selectinload(Claim.versions))
    )
    result = await db.execute(stmt)
    claim = result.scalar_one_or_none()
    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim {claim_id} not found",
        )

    evidence_sorted = sorted(
        claim.evidence_items,
        key=lambda e: (e.publication_date or e.retrieval_date or e.created_at),
    )
    events: list[dict] = []
    for ev in evidence_sorted:
        stance = "supporting" if ev.is_supporting else ("contradicting" if ev.is_contradicting else "neutral")
        events.append({
            "event_type": "evidence",
            "id": str(ev.id),
            "timestamp": (ev.publication_date or ev.retrieval_date or ev.created_at).isoformat(),
            "publication_date": ev.publication_date.isoformat() if ev.publication_date else None,
            "retrieval_date": ev.retrieval_date.isoformat() if ev.retrieval_date else None,
            "updated_date": ev.updated_at.isoformat() if ev.updated_at else None,
            "source_title": ev.source_title,
            "source_domain": ev.source_domain,
            "source_url": ev.source_url,
            "stance": stance,
            "quality_score": ev.quality_score,
            "bias_label": ev.bias_label,
            "content_snippet": ev.content_snippet,
        })

    versions_sorted = sorted(claim.versions, key=lambda v: v.version_number)
    for v in versions_sorted:
        events.append({
            "event_type": "version_snapshot",
            "id": str(v.id),
            "version_number": v.version_number,
            "timestamp": (v.verified_at or v.created_at).isoformat(),
            "status": v.status,
            "change_reason": v.change_reason,
            "changed_fields": v.changed_fields,
        })

    events.sort(key=lambda item: item["timestamp"])

    # Detect fact shifts over time
    fact_changes: list[str] = []
    if len(versions_sorted) >= 2:
        for prev, curr in zip(versions_sorted, versions_sorted[1:]):
            if prev.status != curr.status:
                fact_changes.append(
                    f"Version {prev.version_number} ({prev.status}) -> Version {curr.version_number} ({curr.status})"
                )
    dated_supporting = [e for e in evidence_sorted if e.is_supporting and e.publication_date]
    dated_contradicting = [e for e in evidence_sorted if e.is_contradicting and e.publication_date]
    if dated_supporting and dated_contradicting:
        earliest_sup = dated_supporting[0].publication_date
        latest_con = dated_contradicting[-1].publication_date
        if latest_con and earliest_sup and latest_con > earliest_sup:
            fact_changes.append(
                f"Contradicting evidence ({latest_con.date().isoformat()}) appeared after earlier supporting evidence ({earliest_sup.date().isoformat()})."
            )

    return {
        "claim_id": str(claim.id),
        "claim_text": claim.claim_text,
        "current_status": claim.status.value if claim.status else None,
        "timeline": events,
        "fact_changes": fact_changes,
        "historical_vs_current": {
            "total_evidence": len(evidence_sorted),
            "versions_count": len(versions_sorted),
            "earliest_source_date": evidence_sorted[0].publication_date.isoformat()
            if evidence_sorted and evidence_sorted[0].publication_date
            else None,
            "latest_source_date": evidence_sorted[-1].publication_date.isoformat()
            if evidence_sorted and evidence_sorted[-1].publication_date
            else None,
        },
    }


@router.get(
    "/claims/{claim_id}/conflicts",
    summary="Analyze conflicting evidence for a claim",
)
async def get_claim_conflicts(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Compare supporting and contradicting evidence with reasons and traceable citations."""
    stmt = (
        select(Claim)
        .where(Claim.id == claim_id)
        .options(selectinload(Claim.evidence_items))
    )
    result = await db.execute(stmt)
    claim = result.scalar_one_or_none()
    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim {claim_id} not found",
        )

    detector = ContradictionDetector()
    evidence_dicts = [
        {
            "id": str(e.id),
            "source_title": e.source_title,
            "source_url": e.source_url,
            "source_domain": e.source_domain,
            "publication_date": e.publication_date.isoformat() if e.publication_date else None,
            "content_snippet": e.content_snippet,
            "is_supporting": e.is_supporting,
            "is_contradicting": e.is_contradicting,
            "reliability_score": e.reliability_score,
            "quality_score": e.quality_score,
        }
        for e in claim.evidence_items
    ]
    analysis = detector.analyze_evidence_conflicts(claim.claim_text, evidence_dicts)
    return {
        "claim_id": str(claim.id),
        "claim_text": claim.claim_text,
        "current_status": claim.status.value if claim.status else None,
        **analysis,
    }


@router.post(
    "/claims/{claim_id}/feedback",
    status_code=status.HTTP_201_CREATED,
    summary="Submit human reviewer feedback for a claim verdict",
)
async def submit_claim_feedback(
    claim_id: uuid.UUID,
    body: HumanFeedbackRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Store human feedback and audit log without auto-overriding the claim verdict."""
    stmt = select(Claim).where(Claim.id == claim_id)
    result = await db.execute(stmt)
    claim = result.scalar_one_or_none()
    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim {claim_id} not found",
        )

    feedback = HumanFeedback(
        claim_id=claim.id,
        reviewer_email=sanitize_input(body.reviewer_email),
        reviewer_name=sanitize_input(body.reviewer_name) if body.reviewer_name else None,
        decision=body.decision,
        explanation=sanitize_input(body.explanation) if body.explanation else None,
        supporting_url=body.supporting_url.strip() if body.supporting_url else None,
        is_verified_review=False,
    )
    db.add(feedback)
    await db.flush()

    audit = AuditActivityLog(
        verification_job_id=claim.verification_job_id,
        actor_email=feedback.reviewer_email,
        actor_role="reviewer",
        action="human_feedback_submitted",
        details={
            "claim_id": str(claim.id),
            "feedback_id": str(feedback.id),
            "decision": feedback.decision,
            "verdict_auto_changed": False,
        },
    )
    db.add(audit)
    await db.flush()

    return {
        "id": str(feedback.id),
        "claim_id": str(claim.id),
        "reviewer_email": feedback.reviewer_email,
        "reviewer_name": feedback.reviewer_name,
        "decision": feedback.decision,
        "explanation": feedback.explanation,
        "supporting_url": feedback.supporting_url,
        "is_verified_review": feedback.is_verified_review,
        "claim_status_unchanged": claim.status.value if claim.status else None,
        "created_at": feedback.created_at.isoformat(),
    }


@router.get(
    "/claims/{claim_id}/feedback",
    summary="List human reviewer feedback history for a claim",
)
async def list_claim_feedback(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Retrieve audit history of human feedback submitted for a claim."""
    stmt = (
        select(HumanFeedback)
        .where(HumanFeedback.claim_id == claim_id)
        .order_by(HumanFeedback.created_at.desc())
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    return [
        {
            "id": str(f.id),
            "claim_id": str(f.claim_id),
            "reviewer_email": f.reviewer_email,
            "reviewer_name": f.reviewer_name,
            "decision": f.decision,
            "explanation": f.explanation,
            "supporting_url": f.supporting_url,
            "is_verified_review": f.is_verified_review,
            "created_at": f.created_at.isoformat(),
        }
        for f in items
    ]
