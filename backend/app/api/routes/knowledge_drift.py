from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.claim import Claim, ClaimVersion
from app.schemas.claim import ClaimDriftEntry, ClaimDriftResponse
from app.services.knowledge_drift import KnowledgeDriftDetector

router = APIRouter(tags=["knowledge-drift"])
drift_detector = KnowledgeDriftDetector()


@router.get(
    "/drift/cases",
    summary="Get verified knowledge drift benchmarks",
    description="Returns curated and tracked real-world knowledge drift cases with previous vs current comparisons.",
)
async def get_drift_cases(
    db: AsyncSession = Depends(get_db),
):
    """Returns curated drift benchmarks and any database-tracked outdated claims."""
    # Also fetch recent claims marked outdated from DB
    stmt = (
        select(Claim)
        .where(Claim.status == "outdated")
        .order_by(Claim.created_at.desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    outdated_claims = result.scalars().all()

    tracked_cases = []
    for oc in outdated_claims:
        tracked_cases.append({
            "topic": f"Tracked Claim: {oc.claim_text[:40]}...",
            "category": oc.category.value if oc.category else "general_fact",
            "previous_truth": oc.claim_text,
            "current_truth": oc.suggested_correction or oc.explanation or "Updated information documented in evidence sources.",
            "change_date": oc.updated_at.strftime("%Y-%m-%d") if oc.updated_at else None,
            "change_reason": oc.explanation or "Observed change in live technical documentation.",
            "severity": "high",
        })

    benchmarks = drift_detector.get_curated_benchmarks()
    return {
        "curated_benchmarks": benchmarks,
        "tracked_cases": tracked_cases,
        "total_tracked": len(benchmarks) + len(tracked_cases),
    }


@router.get(
    "/knowledge-drift/{claim_id}",
    response_model=ClaimDriftResponse,
    summary="Get knowledge drift history",
    description="Returns the version history for a claim, showing how it has changed over time.",
)
async def get_knowledge_drift(
    claim_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ClaimDriftResponse:
    """Get the full drift (version) history for a specific claim."""
    stmt = (
        select(Claim)
        .where(Claim.id == claim_id)
        .options(selectinload(Claim.versions))
    )
    result = await db.execute(stmt)
    claim = result.scalar_one_or_none()

    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim {claim_id} not found",
        )

    sorted_versions = sorted(claim.versions, key=lambda v: v.version_number)
    version_entries = [
        ClaimDriftEntry(
            id=v.id,
            version_number=v.version_number,
            claim_text=v.claim_text,
            status=v.status,
            verified_at=v.verified_at,
            changed_fields=v.changed_fields,
            change_reason=v.change_reason,
            created_at=v.created_at,
        )
        for v in sorted_versions
    ]

    return ClaimDriftResponse(
        claim_id=claim.id,
        claim_text=claim.claim_text,
        current_status=claim.status.value if claim.status else None,
        versions=version_entries,
        total_versions=len(version_entries),
    )
