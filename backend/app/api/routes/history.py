from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.verification import JobStatus, VerificationJob
from app.schemas.common import PaginatedResponse
from app.schemas.verification import VerificationJobBrief

router = APIRouter(tags=["history"])


@router.get(
    "/history",
    response_model=PaginatedResponse[VerificationJobBrief],
    summary="List verification jobs",
    description="List verification jobs with pagination, optional status and mode filtering.",
)
async def list_history(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    status: str | None = Query(default=None, description="Filter by status"),
    mode: str | None = Query(default=None, description="Filter by mode"),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[VerificationJobBrief]:
    """List verification jobs with pagination and filtering."""
    base_query = select(VerificationJob)

    if status:
        try:
            status_enum = JobStatus(status)
            base_query = base_query.where(VerificationJob.status == status_enum)
        except ValueError:
            pass  # Ignore invalid status filter

    if mode:
        base_query = base_query.where(VerificationJob.mode == mode)

    # Count total
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * page_size
    items_query = (
        base_query
        .order_by(VerificationJob.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(items_query)
    jobs = result.scalars().all()

    items = [
        VerificationJobBrief(
            id=j.id,
            original_text=j.original_text,
            mode=j.mode.value,
            status=j.status.value,
            overall_freshness_score=j.overall_freshness_score,
            overall_confidence_score=j.overall_confidence_score,
            total_claims=j.total_claims,
            verified_claims=j.verified_claims,
            outdated_claims=j.outdated_claims,
            contradicted_claims=j.contradicted_claims,
            unsupported_claims=j.unsupported_claims,
            processing_time_ms=j.processing_time_ms,
            created_at=j.created_at,
        )
        for j in jobs
    ]

    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )
