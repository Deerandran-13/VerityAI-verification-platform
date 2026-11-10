from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ServiceHealth(BaseModel):
    """Detailed health status for an individual service or external integration."""

    status: str  # "connected" | "disconnected" | "checking" | "not_configured"
    message: str | None = None
    error: str | None = None


class HealthResponse(BaseModel):
    """Response model for the health check endpoint."""

    model_config = ConfigDict(from_attributes=True)

    status: str  # "healthy" | "degraded"
    version: str
    app_name: str
    timestamp: datetime
    uptime_seconds: float | None = None
    database: ServiceHealth
    tavily: ServiceHealth
    bifrost: ServiceHealth
    gemini: ServiceHealth


# Rebuild model to resolve references
HealthResponse.model_rebuild()
