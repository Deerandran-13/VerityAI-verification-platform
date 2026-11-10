from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.schemas.verification import ModelStatusEntry, ModelsStatusResponse

router = APIRouter(tags=["models"])


@router.get(
    "/models/status",
    response_model=ModelsStatusResponse,
    summary="AI model status",
    description="Returns the configuration status of all AI models.",
)
async def get_models_status() -> ModelsStatusResponse:
    """Return the status of all configured AI models."""
    models: list[ModelStatusEntry] = []

    # Tavily (search API)
    tavily_configured = bool(
        settings.TAVILY_API_KEY and settings.TAVILY_API_KEY != "your_tavily_api_key_here"
    )
    models.append(
        ModelStatusEntry(
            provider="tavily",
            model_name="tavily-search",
            status="available" if tavily_configured else "not_configured",
            description="Tavily AI-powered web search for evidence gathering",
        )
    )

    # Bifrost (LLM gateway)
    bifrost_configured = bool(
        settings.BIFROST_API_KEY and settings.BIFROST_API_KEY != "your_bifrost_api_key_here"
    )
    models.append(
        ModelStatusEntry(
            provider="bifrost",
            model_name="bifrost-gateway",
            status="available" if bifrost_configured else "not_configured",
            description="Bifrost multi-model LLM gateway for verification",
        )
    )

    total_configured = sum(1 for m in models if m.status != "not_configured")
    total_available = sum(1 for m in models if m.status == "available")

    return ModelsStatusResponse(
        models=models,
        total_configured=total_configured,
        total_available=total_available,
    )
