from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.notification import Notification
from app.services.expiry_monitor import ExpiryMonitoringService

router = APIRouter(tags=["monitoring"])
monitoring_service = ExpiryMonitoringService()


class TrackClaimRequest(BaseModel):
    claim_id: uuid.UUID
    interval_type: str = Field(default="daily", description="'daily', 'weekly', or 'monthly'")


class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: str
    title: str
    message: str
    is_read: bool
    created_at: str
    related_claim_id: uuid.UUID | None = None
    related_job_id: uuid.UUID | None = None


@router.post(
    "/monitoring/track",
    summary="Track a claim for automated expiry monitoring",
    description="Schedules recurring re-verification checks (daily, weekly, monthly) for factual stability.",
)
async def track_claim(
    payload: TrackClaimRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await monitoring_service.track_claim(
        claim_id=payload.claim_id,
        interval_type=payload.interval_type,
        db=db,
    )


@router.get(
    "/monitoring/tracked",
    summary="List all tracked claims",
    description="Returns all active recurring monitoring schedules.",
)
async def list_tracked(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    return await monitoring_service.list_tracked_claims(db=db)


@router.post(
    "/monitoring/check-expiries",
    summary="Run due expiry checks",
    description="Executes any overdue re-verification checks and creates notifications for drifted claims.",
)
async def trigger_due_checks(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await monitoring_service.execute_due_checks(db=db)


@router.get(
    "/notifications",
    summary="Get in-app verification alerts",
    description="Returns recent system alerts and drift warnings for tracked claims.",
)
async def get_notifications(
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    stmt = select(Notification).order_by(desc(Notification.created_at)).limit(50)
    res = await db.execute(stmt)
    notifs = res.scalars().all()

    return [
        {
            "id": str(n.id),
            "type": n.type.value if hasattr(n.type, "value") else str(n.type),
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "related_claim_id": str(n.related_claim_id) if n.related_claim_id else None,
            "related_job_id": str(n.related_job_id) if n.related_job_id else None,
        }
        for n in notifs
    ]


@router.put(
    "/notifications/{notif_id}/read",
    summary="Mark notification as read",
)
async def mark_read(
    notif_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    stmt = select(Notification).where(Notification.id == notif_id)
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}

