from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EvidenceResponse(BaseModel):
    """Response model for a piece of evidence."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    claim_id: uuid.UUID
    source_title: str | None = None
    source_url: str | None = None
    source_domain: str | None = None
    publication_date: datetime | None = None
    retrieval_date: datetime
    content_snippet: str | None = None
    relevance_score: float | None = None
    is_supporting: bool = False
    is_contradicting: bool = False
    is_primary_source: bool = False
    reliability_score: float | None = None
    search_query: str | None = None
    created_at: datetime
