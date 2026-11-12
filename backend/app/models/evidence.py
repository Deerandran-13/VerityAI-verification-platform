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


class ReliabilityTier(str, enum.Enum):
    OFFICIAL = "official"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class Evidence(Base):
    """A piece of evidence gathered for a claim."""

    __tablename__ = "evidence"

    claim_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("claims.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    source_title: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_domain: Mapped[str | None] = mapped_column(String(512), nullable=True, index=True)
    publication_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    retrieval_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    content_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    relevance_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_supporting: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_contradicting: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_primary_source: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reliability_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_breakdown: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    bias_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    bias_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    bias_rationale: Mapped[str | None] = mapped_column(Text, nullable=True)
    conflict_of_interest: Mapped[str | None] = mapped_column(Text, nullable=True)
    search_query: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    claim: Mapped[Claim] = relationship("Claim", back_populates="evidence_items")

    def __repr__(self) -> str:
        return f"<Evidence(id={self.id}, domain={self.source_domain})>"


class SourceMetadata(Base):
    """Cached metadata about a source domain's reliability."""

    __tablename__ = "source_metadata"

    domain: Mapped[str] = mapped_column(
        String(512), unique=True, index=True, nullable=False
    )
    is_official: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reliability_tier: Mapped[ReliabilityTier] = mapped_column(
        Enum(ReliabilityTier, name="reliability_tier", create_constraint=True),
        default=ReliabilityTier.UNKNOWN,
        nullable=False,
    )
    total_citations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_evaluated: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<SourceMetadata(domain={self.domain}, tier={self.reliability_tier})>"


# Forward-ref import
from app.models.claim import Claim  # noqa: E402
