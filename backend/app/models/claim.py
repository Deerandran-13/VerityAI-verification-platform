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


class ClaimCategory(str, enum.Enum):
    SOFTWARE_VERSION = "software_version"
    API_INFO = "api_info"
    PRICING = "pricing"
    COMPANY_INFO = "company_info"
    REGULATION = "regulation"
    SCIENTIFIC_FACT = "scientific_fact"
    STATISTIC = "statistic"
    HISTORICAL_FACT = "historical_fact"
    TECH_CAPABILITY = "tech_capability"
    GENERAL_FACT = "general_fact"


class ClaimStatus(str, enum.Enum):
    VERIFIED = "verified"
    OUTDATED = "outdated"
    CONTRADICTED = "contradicted"
    PARTIALLY_SUPPORTED = "partially_supported"
    UNSUPPORTED = "unsupported"
    UNVERIFIABLE = "unverifiable"
    HISTORICALLY_CORRECT = "historically_correct"


class Claim(Base):
    """An individual factual claim extracted from submitted text."""

    __tablename__ = "claims"

    verification_job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    original_sentence: Mapped[str | None] = mapped_column(Text, nullable=True)
    position_in_text: Mapped[int | None] = mapped_column(Integer, nullable=True)

    category: Mapped[ClaimCategory | None] = mapped_column(
        Enum(ClaimCategory, name="claim_category", create_constraint=True),
        nullable=True,
    )

    is_time_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_historical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_vague: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    status: Mapped[ClaimStatus | None] = mapped_column(
        Enum(ClaimStatus, name="claim_status", create_constraint=True),
        nullable=True,
        index=True,
    )

    freshness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_correction: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    verification_job: Mapped[VerificationJob] = relationship(
        "VerificationJob", back_populates="claims"
    )
    evidence_items: Mapped[list[Evidence]] = relationship(
        "Evidence", back_populates="claim", lazy="selectin",
        cascade="all, delete-orphan",
    )
    verification_results: Mapped[list[VerificationResult]] = relationship(
        "VerificationResult", back_populates="claim", lazy="selectin",
        cascade="all, delete-orphan",
    )
    versions: Mapped[list[ClaimVersion]] = relationship(
        "ClaimVersion", back_populates="claim", lazy="selectin",
        cascade="all, delete-orphan",
    )
    citation_checks: Mapped[list[CitationCheck]] = relationship(
        "CitationCheck", back_populates="claim", lazy="selectin",
        cascade="all, delete-orphan",
    )
    scheduled_checks: Mapped[list[ScheduledCheck]] = relationship(
        "ScheduledCheck", back_populates="claim", lazy="selectin",
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="claim", lazy="selectin",
    )

    @property
    def evidence(self) -> list[Evidence]:
        return self.evidence_items

    def __repr__(self) -> str:
        return f"<Claim(id={self.id}, status={self.status})>"


class VerificationResult(Base):
    """Result from a single AI model verification of a claim."""

    __tablename__ = "verification_results"

    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    model_provider: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    verdict: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    processing_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    claim: Mapped[Claim] = relationship("Claim", back_populates="verification_results")

    def __repr__(self) -> str:
        return f"<VerificationResult(id={self.id}, verdict={self.verdict})>"


class ClaimVersion(Base):
    """Historical snapshot of a claim's state across re-verifications."""

    __tablename__ = "claim_versions"

    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    evidence_snapshot: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    changed_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    change_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    claim: Mapped[Claim] = relationship("Claim", back_populates="versions")

    def __repr__(self) -> str:
        return f"<ClaimVersion(id={self.id}, version={self.version_number})>"


class CitationCheck(Base):
    """Tracks whether a cited URL is accessible and content-matched."""

    __tablename__ = "citation_checks"

    class CheckStatus(str, enum.Enum):
        PENDING = "pending"
        CHECKED = "checked"
        FAILED = "failed"

    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    citation_url: Mapped[str] = mapped_column(Text, nullable=False)
    citation_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_accessible: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    content_matches_claim: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    relevance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    check_status: Mapped[CheckStatus] = mapped_column(
        Enum(CheckStatus, name="citation_check_status", create_constraint=True),
        default=CheckStatus.PENDING,
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    claim: Mapped[Claim] = relationship("Claim", back_populates="citation_checks")

    def __repr__(self) -> str:
        return f"<CitationCheck(id={self.id}, status={self.check_status})>"


# Forward-ref imports
from app.models.evidence import Evidence  # noqa: E402
from app.models.notification import Notification  # noqa: E402
from app.models.verification import ScheduledCheck, VerificationJob  # noqa: E402
