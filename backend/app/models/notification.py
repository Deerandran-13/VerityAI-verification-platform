from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class NotificationType(str, enum.Enum):
    CLAIM_OUTDATED = "claim_outdated"
    CLAIM_CONTRADICTED = "claim_contradicted"
    VERIFICATION_COMPLETE = "verification_complete"
    VERIFICATION_FAILED = "verification_failed"
    DRIFT_DETECTED = "drift_detected"
    SCHEDULED_CHECK = "scheduled_check"
    SYSTEM = "system"


class Notification(Base):
    """User-facing notification."""

    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type", create_constraint=True),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    related_claim_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    related_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    user: Mapped[User | None] = relationship("User", back_populates="notifications")
    claim: Mapped[Claim | None] = relationship("Claim", back_populates="notifications")
    verification_job: Mapped[VerificationJob | None] = relationship(
        "VerificationJob", back_populates="notifications"
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.type})>"


# Forward-ref imports
from app.models.claim import Claim  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.verification import VerificationJob  # noqa: E402
