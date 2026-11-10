from __future__ import annotations

import html
import re
from typing import Any

from fastapi import Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.core.config import settings


def configure_cors(app: Any) -> None:
    """Add CORS middleware to the FastAPI application."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to enforce maximum request body size."""

    def __init__(self, app: Any, max_size: int | None = None) -> None:
        super().__init__(app)
        self.max_size = max_size or settings.max_request_size_bytes

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            return JSONResponse(
                status_code=413,
                content={
                    "detail": f"Request body too large. Maximum size is {settings.MAX_REQUEST_SIZE_MB}MB."
                },
            )
        return await call_next(request)


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks.

    - Escapes HTML entities
    - Strips null bytes
    - Normalizes whitespace
    """
    # Remove null bytes
    text = text.replace("\x00", "")
    # Escape HTML entities
    text = html.escape(text, quote=True)
    # Normalize whitespace (collapse multiple spaces/newlines but preserve structure)
    text = re.sub(r"[ \t]+", " ", text)
    # Strip leading/trailing whitespace
    text = text.strip()
    return text


def sanitize_url(url: str) -> str:
    """Basic URL sanitization."""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        return ""
    # Remove any javascript: or data: schemes that may be embedded
    if re.search(r"javascript:|data:", url, re.IGNORECASE):
        return ""
    return url
