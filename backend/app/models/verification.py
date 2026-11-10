from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class VerificationMode(str, enum.Enum):
    STANDARD = "standard"
    ADVERSARIAL = "adversarial"
    TIME_TRAVEL = "time_travel"


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class VerificationJob(Base):
    """A verification job submitted by a user."""

    __tablename__ = "verification_jobs"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[VerificationMode] = mapped_column(
        Enum(VerificationMode, name="verification_mode", create_constraint=True),
        default=VerificationMode.STANDARD,
        nullable=False,
    )
    historical_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status", create_constraint=True),
        default=JobStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Scoring
    overall_freshness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    overall_confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Counters
    total_claims: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    verified_claims: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    outdated_claims: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    contradicted_claims: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unsupported_claims: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Meta
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    user: Mapped[User | None] = relationship("User", back_populates="verification_jobs")
    claims: Mapped[list[Claim]] = relationship(
        "Claim", back_populates="verification_job", lazy="selectin",
        cascade="all, delete-orphan",
    )
    model_runs: Mapped[list[ModelRun]] = relationship(
        "ModelRun", back_populates="verification_job", lazy="selectin",
        cascade="all, delete-orphan",
    )
    history_entries: Mapped[list[VerificationHistory]] = relationship(
        "VerificationHistory", back_populates="verification_job", lazy="selectin",
        cascade="all, delete-orphan",
    )
    scheduled_checks: Mapped[list[ScheduledCheck]] = relationship(
        "ScheduledCheck", back_populates="verification_job", lazy="selectin",
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="verification_job", lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<VerificationJob(id={self.id}, status={self.status})>"


class ModelRun(Base):
    """Tracks individual AI model invocations within a job."""

    __tablename__ = "model_runs"

    verification_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_provider: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tokens_input: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tokens_output: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_estimate: Mapped[float | None] = mapped_column(Float, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    verification_job: Mapped[VerificationJob] = relationship(
        "VerificationJob", back_populates="model_runs"
    )

    def __repr__(self) -> str:
        return f"<ModelRun(id={self.id}, model={self.model_name})>"


class VerificationHistory(Base):
    """Audit log of actions taken during verification."""

    __tablename__ = "verification_history"

    verification_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    verification_job: Mapped[VerificationJob] = relationship(
        "VerificationJob", back_populates="history_entries"
    )

    def __repr__(self) -> str:
        return f"<VerificationHistory(id={self.id}, action={self.action})>"


class ScheduledCheck(Base):
    """Recurring re-verification schedule for claims or jobs."""

    __tablename__ = "scheduled_checks"

    claim_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    verification_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    check_interval_hours: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    next_check_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_check_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    claim: Mapped[Claim | None] = relationship("Claim", back_populates="scheduled_checks")
    verification_job: Mapped[VerificationJob | None] = relationship(
        "VerificationJob", back_populates="scheduled_checks"
    )

    def __repr__(self) -> str:
        return f"<ScheduledCheck(id={self.id}, active={self.is_active})>"


# Forward-ref imports (resolved at mapping time)
from app.models.claim import Claim  # noqa: E402
from app.models.notification import Notification  # noqa: E402
from app.models.user import User  # noqa: E402
