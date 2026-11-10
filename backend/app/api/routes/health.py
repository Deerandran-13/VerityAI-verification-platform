from __future__ import annotations

import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter

from app.core.config import settings
from app.core.database import check_db_connection
from app.schemas.health import HealthResponse, ServiceHealth

router = APIRouter(tags=["health"])

_startup_time: float = time.time()


async def check_tavily_connection() -> ServiceHealth:
    """Test Tavily Search API connectivity without exposing credentials."""
    api_key = settings.TAVILY_API_KEY.strip()
    if not api_key or api_key == "your_tavily_api_key_here":
        return ServiceHealth(
            status="not_configured",
            message="TAVILY_API_KEY is not configured in environment.",
        )

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={"api_key": api_key, "query": "ping", "max_results": 1},
            )
            if resp.status_code == 200:
                return ServiceHealth(status="connected", message="Tavily Search API active.")
            elif resp.status_code in (401, 403):
                return ServiceHealth(
                    status="disconnected",
                    message="Tavily authentication failed (invalid API key).",
                    error=f"HTTP {resp.status_code}",
                )
            else:
                return ServiceHealth(
                    status="disconnected",
                    message=f"Tavily returned status {resp.status_code}.",
                    error=f"HTTP {resp.status_code}",
                )
    except Exception as exc:
        return ServiceHealth(
            status="disconnected",
            message="Failed to connect to Tavily Search API.",
            error=str(exc),
        )


async def check_bifrost_connection() -> ServiceHealth:
    """Test Bifrost AI Gateway connectivity without exposing credentials."""
    api_key = settings.BIFROST_API_KEY.strip()
    base_url = settings.BIFROST_BASE_URL.rstrip("/")
    if not api_key or api_key == "your_bifrost_api_key_here":
        return ServiceHealth(
            status="not_configured",
            message="BIFROST_API_KEY is not configured in environment.",
        )

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            headers = {"Authorization": f"Bearer {api_key}", "x-bf-vk": api_key}
            resp = await client.get(f"{base_url}/models", headers=headers)
            if resp.status_code in (200, 204):
                return ServiceHealth(status="connected", message="Bifrost AI Gateway connected.")
            elif resp.status_code in (401, 403):
                return ServiceHealth(
                    status="disconnected",
                    message="Bifrost authentication failed (invalid API key).",
                    error=f"HTTP {resp.status_code}",
                )
            else:
                return ServiceHealth(
                    status="disconnected",
                    message=f"Bifrost returned status {resp.status_code}.",
                    error=f"HTTP {resp.status_code}",
                )
    except Exception as exc:
        return ServiceHealth(
            status="disconnected",
            message="Failed to connect to Bifrost AI Gateway.",
            error=str(exc),
        )


def check_gemini_status(bifrost_health: ServiceHealth) -> ServiceHealth:
    """Check Gemini status based on Bifrost gateway routing."""
    if bifrost_health.status == "connected":
        return ServiceHealth(
            status="connected",
            message=f"Gemini available via Bifrost gateway routing ({settings.BIFROST_MODEL}).",
        )
    elif bifrost_health.status == "not_configured":
        return ServiceHealth(
            status="not_configured",
            message="Gemini routing requires Bifrost API credentials.",
        )
    else:
        return ServiceHealth(
            status="disconnected",
            message="Bifrost gateway unavailable.",
            error=bifrost_health.error,
        )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns real-time health and integration status for database, Tavily, Bifrost, and Gemini.",
)
async def health_check() -> HealthResponse:
    """Check application health and all external service integrations."""
    # 1. Database check
    db_status_info = await check_db_connection()
    db_health = ServiceHealth(
        status=db_status_info["status"],
        message="Database connected." if db_status_info["status"] == "connected" else "PostgreSQL connection inactive.",
        error=db_status_info["error"],
    )

    # 2. Tavily check
    tavily_health = await check_tavily_connection()

    # 3. Bifrost check
    bifrost_health = await check_bifrost_connection()

    # 4. Gemini check
    gemini_health = check_gemini_status(bifrost_health)

    # Overall system status
    overall_status = (
        "healthy"
        if (db_health.status == "connected" and tavily_health.status == "connected" and bifrost_health.status == "connected")
        else "degraded"
    )

    return HealthResponse(
        status=overall_status,
        version=settings.APP_VERSION,
        app_name=settings.APP_NAME,
        timestamp=datetime.now(timezone.utc),
        uptime_seconds=round(time.time() - _startup_time, 2),
        database=db_health,
        tavily=tavily_health,
        bifrost=bifrost_health,
        gemini=gemini_health,
    )
