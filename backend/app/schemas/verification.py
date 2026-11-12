from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.claim import ClaimBriefResponse, ClaimResponse


class VerificationRequest(BaseModel):
    """Request model for submitting text for verification."""

    text: str = Field(
        ..., min_length=10, max_length=50000,
        description="The text content to verify",
    )
    mode: str = Field(
        default="standard",
        pattern=r"^(standard|adversarial|time_travel)$",
        description="Verification mode",
    )
    historical_date: datetime | None = Field(
        default=None,
        description="Target date for time-travel mode",
    )
    async_mode: bool = Field(
        default=False,
        description="If true, execute verification in a background task and return immediately for status polling.",
    )


class UrlVerificationRequest(BaseModel):
    """Request model for verifying a public webpage URL."""

    url: str = Field(..., description="The HTTP or HTTPS URL of the webpage to verify")
    mode: str = Field(
        default="standard",
        pattern=r"^(standard|adversarial|time_travel)$",
    )
    historical_date: datetime | None = None


class ExtensionVerifyRequest(BaseModel):
    """Lightweight request payload from browser extension."""

    text: str = Field(..., min_length=5, max_length=10000)
    url: str | None = None



class VerificationSubmitResponse(BaseModel):
    """Response after submitting a verification request."""

    id: uuid.UUID
    status: str
    message: str
    total_claims: int = 0
    progress_percent: int = 0
    current_stage: str | None = None


class VerificationStatusResponse(BaseModel):
    """Lightweight status polling response for async background verification jobs."""

    id: uuid.UUID
    status: str
    progress_percent: int = 0
    current_stage: str | None = None
    total_claims: int = 0
    error_message: str | None = None


class VerificationResponse(BaseModel):
    """Full verification job response with claims and scores."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_text: str
    mode: str
    historical_date: datetime | None = None
    status: str
    overall_freshness_score: float | None = None
    overall_confidence_score: float | None = None
    total_claims: int = 0
    verified_claims: int = 0
    outdated_claims: int = 0
    contradicted_claims: int = 0
    unsupported_claims: int = 0
    error_message: str | None = None
    processing_time_ms: int | None = None
    progress_percent: int = 0
    current_stage: str | None = None
    claims: list[ClaimResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class VerificationJobBrief(BaseModel):
    """Brief verification job for history listings."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_text: str
    mode: str
    status: str
    overall_freshness_score: float | None = None
    overall_confidence_score: float | None = None
    total_claims: int = 0
    verified_claims: int = 0
    outdated_claims: int = 0
    contradicted_claims: int = 0
    unsupported_claims: int = 0
    processing_time_ms: int | None = None
    created_at: datetime

    @property
    def text_preview(self) -> str:
        if len(self.original_text) > 200:
            return self.original_text[:200] + "..."
        return self.original_text


class DashboardStats(BaseModel):
    """Dashboard statistics aggregated from DB."""

    total_jobs: int = 0
    total_claims: int = 0
    verified_count: int = 0
    outdated_count: int = 0
    contradicted_count: int = 0
    unsupported_count: int = 0
    claims_by_status: dict[str, int] = Field(default_factory=dict)
    jobs_by_status: dict[str, int] = Field(default_factory=dict)
    avg_freshness_score: float | None = None
    avg_confidence_score: float | None = None
    avg_processing_time_ms: float | None = None
    recent_jobs: list[VerificationJobBrief] = Field(default_factory=list)


class ModelStatusEntry(BaseModel):
    """Status info for a single AI model."""

    provider: str
    model_name: str
    status: str  # "available", "unavailable", "not_configured"
    description: str | None = None


class ModelsStatusResponse(BaseModel):
    """Response with status of all configured AI models."""

    models: list[ModelStatusEntry] = Field(default_factory=list)
    total_configured: int = 0
    total_available: int = 0
