from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.claim import Claim, ClaimVersion
from app.schemas.claim import (
    ClaimResponse,
    ReverifyRequest,
    ReverifyResponse,
)
from app.schemas.evidence import EvidenceResponse

router = APIRouter(tags=["claims"])


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
    from app.models.evidence import Evidence
    stmt = (
        select(Evidence)
        .order_by(Evidence.retrieval_date.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    items = result.scalars().all()
    return [
        EvidenceResponse(
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
            search_query=e.search_query,
            created_at=e.created_at,
        )
        for e in items
    ]


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

    evidence_list = [
        EvidenceResponse(
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
            search_query=e.search_query,
            created_at=e.created_at,
        )
        for e in claim.evidence_items
    ]

    return ClaimResponse(
        id=claim.id,
        verification_job_id=claim.verification_job_id,
        claim_text=claim.claim_text,
        original_sentence=claim.original_sentence,
        position_in_text=claim.position_in_text,
        category=claim.category.value if claim.category else None,
        is_time_sensitive=claim.is_time_sensitive,
        is_historical=claim.is_historical,
        is_vague=claim.is_vague,
        status=claim.status.value if claim.status else None,
        freshness_score=claim.freshness_score,
        confidence_score=claim.confidence_score,
        explanation=claim.explanation,
        suggested_correction=claim.suggested_correction,
        evidence=evidence_list,
        created_at=claim.created_at,
        updated_at=claim.updated_at,
    )


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
