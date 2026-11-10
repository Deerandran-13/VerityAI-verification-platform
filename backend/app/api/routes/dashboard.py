from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.claim import Claim, ClaimStatus
from app.models.verification import JobStatus, VerificationJob
from app.schemas.verification import DashboardStats, VerificationJobBrief

router = APIRouter(tags=["dashboard"])


@router.get(
    "/dashboard/stats",
    response_model=DashboardStats,
    summary="Dashboard statistics",
    description="Returns aggregated statistics from the database for the dashboard.",
)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
) -> DashboardStats:
    """Compute real dashboard statistics from the database."""

    # Total jobs
    total_jobs_result = await db.execute(
        select(func.count(VerificationJob.id))
    )
    total_jobs = total_jobs_result.scalar() or 0

    # Jobs by status
    jobs_by_status_query = (
        select(VerificationJob.status, func.count(VerificationJob.id))
        .group_by(VerificationJob.status)
    )
    jobs_by_status_result = await db.execute(jobs_by_status_query)
    jobs_by_status = {
        row[0].value: row[1] for row in jobs_by_status_result.all()
    }

    # Total claims
    total_claims_result = await db.execute(
        select(func.count(Claim.id))
    )
    total_claims = total_claims_result.scalar() or 0

    # Claims by status
    claims_by_status_query = (
        select(Claim.status, func.count(Claim.id))
        .where(Claim.status.is_not(None))
        .group_by(Claim.status)
    )
    claims_by_status_result = await db.execute(claims_by_status_query)
    claims_by_status = {
        row[0].value: row[1] for row in claims_by_status_result.all()
    }

    # Average scores (only from completed jobs)
    avg_scores_query = select(
        func.avg(VerificationJob.overall_freshness_score),
        func.avg(VerificationJob.overall_confidence_score),
        func.avg(VerificationJob.processing_time_ms),
    ).where(VerificationJob.status == JobStatus.COMPLETED)
    avg_result = await db.execute(avg_scores_query)
    avg_row = avg_result.one()
    avg_freshness = round(float(avg_row[0]), 4) if avg_row[0] is not None else None
    avg_confidence = round(float(avg_row[1]), 4) if avg_row[1] is not None else None
    avg_processing = round(float(avg_row[2]), 2) if avg_row[2] is not None else None

    # Recent jobs (last 5)
    recent_query = (
        select(VerificationJob)
        .order_by(VerificationJob.created_at.desc())
        .limit(5)
    )
    recent_result = await db.execute(recent_query)
    recent_jobs = [
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
        for j in recent_result.scalars().all()
    ]

    verified_count = claims_by_status.get("verified", 0) + claims_by_status.get("historically_correct", 0)
    outdated_count = claims_by_status.get("outdated", 0)
    contradicted_count = claims_by_status.get("contradicted", 0)
    unsupported_count = claims_by_status.get("unsupported", 0) + claims_by_status.get("unverifiable", 0)

    return DashboardStats(
        total_jobs=total_jobs,
        total_claims=total_claims,
        verified_count=verified_count,
        outdated_count=outdated_count,
        contradicted_count=contradicted_count,
        unsupported_count=unsupported_count,
        claims_by_status=claims_by_status,
        jobs_by_status=jobs_by_status,
        avg_freshness_score=avg_freshness,
        avg_confidence_score=avg_confidence,
        avg_processing_time_ms=avg_processing,
        recent_jobs=recent_jobs,
    )
