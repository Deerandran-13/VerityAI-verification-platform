from __future__ import annotations

import uuid
from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ClaimRelationship(Base):
    """Directed or symmetric relationship between two claims within a verification job."""

    __tablename__ = "claim_relationships"

    verification_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relationship_type: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # supporting, contradicting, dependent, overlapping, unrelated
    confidence: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)


class HumanFeedback(Base):
    """Human reviewer feedback on a claim verdict (never auto-overrides unverified verdicts)."""

    __tablename__ = "human_feedback"

    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    reviewer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    decision: Mapped[str] = mapped_column(
        String(32), nullable=False
    )  # correct, incorrect, needs_review
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    supporting_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_verified_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class SharedReport(Base):
    """Team sharing & RBAC access grant for a verification report."""

    __tablename__ = "shared_reports"

    verification_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    member_email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    member_role: Mapped[str] = mapped_column(
        String(32), default="member", nullable=False
    )  # admin, reviewer, member
    assigned_reviewer_email: Mapped[str | None] = mapped_column(String(320), nullable=True)


class ReportComment(Base):
    """Collaborative review comments and notes on a verification report or claim."""

    __tablename__ = "report_comments"

    verification_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    claim_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    author_email: Mapped[str] = mapped_column(String(320), nullable=False)
    author_role: Mapped[str] = mapped_column(String(32), default="member", nullable=False)
    comment_type: Mapped[str] = mapped_column(
        String(32), default="comment", nullable=False
    )  # comment, review_note, assignment
    content: Mapped[str] = mapped_column(Text, nullable=False)


class AuditActivityLog(Base):
    """Immutable audit log of human feedback, report shares, and review actions."""

    __tablename__ = "audit_activity_logs"

    verification_job_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_jobs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    actor_email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    actor_role: Mapped[str] = mapped_column(String(32), default="member", nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

