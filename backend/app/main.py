from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    auth,
    claims,
    dashboard,
    health,
    history,
    intelligence,
    knowledge_drift,
    models_status,
    monitoring,
    verification,
)
from app.core.config import settings
from app.core.database import ensure_tables_exist
from app.core.security import RateLimitMiddleware, RequestSizeLimitMiddleware, configure_cors

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("verityai")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown lifespan context."""
    logger.info("Initializing VerityAI verification engine...")
    await ensure_tables_exist()
    yield
    logger.info("Shutting down VerityAI...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent AI Information Verification & Freshness Engine",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/api/v1/openapi.json",
    lifespan=lifespan,
)

# Configure CORS & Security Middlewares
configure_cors(app)
app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RateLimitMiddleware)

# Include API Routers with /api/v1 prefix
app.include_router(auth.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
app.include_router(verification.router, prefix="/api/v1")
app.include_router(claims.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(models_status.router, prefix="/api/v1")
app.include_router(knowledge_drift.router, prefix="/api/v1")
app.include_router(monitoring.router, prefix="/api/v1")
app.include_router(intelligence.router, prefix="/api/v1")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler to prevent unhandled internal error leaks."""
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred.", "path": request.url.path},
    )


FRONTEND_DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if (FRONTEND_DIST_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="assets")


@app.get("/", tags=["root"])
async def root():
    """Serve frontend SPA if built, otherwise return API root metadata."""
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.is_file():
        return FileResponse(index_file)
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "tagline": "Don't Just Trust AI. Verify It.",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


if (FRONTEND_DIST_DIR / "index.html").is_file():
    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        """Serve static files from frontend/dist or fall back to index.html for SPA routes."""
        if full_path.startswith(("api/", "docs", "redoc", "openapi.json")):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = (FRONTEND_DIST_DIR / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(FRONTEND_DIST_DIR.resolve()):
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST_DIR / "index.html")

