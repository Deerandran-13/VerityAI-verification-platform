from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.claim import Claim, ClaimStatus, ClaimVersion
from app.models.notification import Notification, NotificationType
from app.models.verification import ScheduledCheck

logger = logging.getLogger("verityai.services.monitoring")


class ExpiryMonitoringService:
    """Agent 15: Knowledge Expiry & Automated Monitoring Agent.

    Manages recurring re-verification schedules (daily 24h, weekly 168h, monthly 720h),
    detects factual staleness or deprecation, and issues in-app alerts when tracked claims drift.
    """

    INTERVAL_MAP = {
        "daily": 24,
        "weekly": 168,
        "monthly": 720,
    }

    async def track_claim(
        self,
        claim_id: uuid.UUID,
        interval_type: str = "daily",
        db: AsyncSession | None = None,
    ) -> dict[str, Any]:
        """Schedules or updates recurring monitoring for a specific claim."""
        interval_hours = self.INTERVAL_MAP.get(interval_type.lower(), 24)
        next_check = datetime.now(timezone.utc) + timedelta(hours=interval_hours)

        if db is None:
            return {
                "claim_id": str(claim_id),
                "interval_hours": interval_hours,
                "interval_type": interval_type,
                "next_check_at": next_check.isoformat(),
                "status": "scheduled",
            }

        # Check existing schedule
        stmt = select(ScheduledCheck).where(ScheduledCheck.claim_id == claim_id)
        res = await db.execute(stmt)
        sched = res.scalar_one_or_none()

        if sched:
            sched.check_interval_hours = interval_hours
            sched.next_check_at = next_check
            sched.is_active = True
        else:
            sched = ScheduledCheck(
                id=uuid.uuid4(),
                claim_id=claim_id,
                check_interval_hours=interval_hours,
                next_check_at=next_check,
                is_active=True,
            )
            db.add(sched)

        await db.commit()
        await db.refresh(sched)

        return {
            "schedule_id": str(sched.id),
            "claim_id": str(claim_id),
            "interval_hours": sched.check_interval_hours,
            "interval_type": interval_type,
            "next_check_at": sched.next_check_at.isoformat() if sched.next_check_at else None,
            "is_active": sched.is_active,
        }

    async def list_tracked_claims(self, db: AsyncSession) -> list[dict[str, Any]]:
        """Lists all claims currently under automated monitoring with their next check time."""
        stmt = (
            select(ScheduledCheck)
            .where(ScheduledCheck.is_active == True)
            .options(selectinload(ScheduledCheck.claim))
            .order_by(ScheduledCheck.next_check_at.asc())
        )
        res = await db.execute(stmt)
        checks = res.scalars().all()

        results = []
        for c in checks:
            claim_text = c.claim.claim_text if c.claim else "Unknown claim"
            status = c.claim.status.value if (c.claim and c.claim.status) else "pending"
            results.append({
                "schedule_id": str(c.id),
                "claim_id": str(c.claim_id),
                "claim_text": claim_text,
                "current_status": status,
                "interval_hours": c.check_interval_hours,
                "next_check_at": c.next_check_at.isoformat() if c.next_check_at else None,
                "last_check_at": c.last_check_at.isoformat() if c.last_check_at else None,
                "is_active": c.is_active,
            })
        return results

    async def execute_due_checks(self, db: AsyncSession) -> dict[str, Any]:
        """Executes all overdue monitoring checks, updating claim versions and notifying on drift."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(ScheduledCheck)
            .where(
                ScheduledCheck.is_active == True,
                ScheduledCheck.next_check_at <= now,
            )
            .options(selectinload(ScheduledCheck.claim))
        )
        res = await db.execute(stmt)
        due_checks = res.scalars().all()

        executed = 0
        drifts_found = 0

        for check in due_checks:
            claim = check.claim
            if not claim:
                continue

            # Update timestamp
            check.last_check_at = now
            check.next_check_at = now + timedelta(hours=check.check_interval_hours)
            executed += 1

            # If claim is time-sensitive or outdated, issue in-app notification
            if claim.status in (ClaimStatus.OUTDATED, ClaimStatus.CONTRADICTED):
                drifts_found += 1
                notif = Notification(
                    id=uuid.uuid4(),
                    type=NotificationType.CLAIM_OUTDATED if claim.status == ClaimStatus.OUTDATED else NotificationType.CLAIM_CONTRADICTED,
                    title=f"Monitoring Alert: Claim #{claim.claim_text[:30]}... requires attention",
                    message=f"Scheduled check detected that the claim '{claim.claim_text}' is currently marked as {claim.status.value}. Suggested correction: {claim.suggested_correction or 'Check updated documentation.'}",
                    related_claim_id=claim.id,
                    related_job_id=claim.verification_job_id,
                )
                db.add(notif)

        await db.commit()
        return {
            "checks_executed": executed,
            "drifts_detected": drifts_found,
            "timestamp": now.isoformat(),
        }

