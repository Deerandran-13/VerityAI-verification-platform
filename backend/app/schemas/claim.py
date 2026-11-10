from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.evidence import EvidenceResponse


class ClaimResponse(BaseModel):
    """Response model for a single claim."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    verification_job_id: uuid.UUID
    claim_text: str
    original_sentence: str | None = None
    position_in_text: int | None = None
    category: str | None = None
    is_time_sensitive: bool = False
    is_historical: bool = False
    is_vague: bool = False
    status: str | None = None
    freshness_score: float | None = None
    confidence_score: float | None = None
    explanation: str | None = None
    suggested_correction: str | None = None
    evidence: list[EvidenceResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ClaimBriefResponse(BaseModel):
    """Brief claim response without evidence (for listings)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    claim_text: str
    category: str | None = None
    status: str | None = None
    freshness_score: float | None = None
    confidence_score: float | None = None


class ReverifyRequest(BaseModel):
    """Request to mark a claim for re-verification."""

    reason: str | None = Field(
        default=None, max_length=1000, description="Reason for re-verification"
    )


class ReverifyResponse(BaseModel):
    """Response after marking claim for re-verification."""

    claim_id: uuid.UUID
    message: str
    new_version: int


class ClaimDriftEntry(BaseModel):
    """A single entry in the knowledge drift history."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version_number: int
    claim_text: str
    status: str | None = None
    verified_at: datetime | None = None
    changed_fields: dict | None = None
    change_reason: str | None = None
    created_at: datetime


class ClaimDriftResponse(BaseModel):
    """Full drift history for a claim."""

    claim_id: uuid.UUID
    claim_text: str
    current_status: str | None = None
    versions: list[ClaimDriftEntry] = Field(default_factory=list)
    total_versions: int = 0
