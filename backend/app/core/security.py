from __future__ import annotations

import base64
import hashlib
import hmac
import html
import json
import re
import time
from collections import defaultdict, deque
from typing import Any

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

PROMPT_INJECTION_PATTERNS = [
    (r"ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?", "instruction_override"),
    (r"disregard\s+(?:all\s+)?(?:previous|prior|system)\s+(?:instructions?|prompts?)", "system_prompt_bypass"),
    (r"you\s+are\s+now\s+(?:a|an)\s+(?:unrestricted|jailbroken|dan)", "persona_hijack"),
    (r"(?:reveal|print|output|show)\s+(?:your|the)\s+system\s+prompt", "prompt_exfiltration"),
    (r"<\|(?:im_start|im_end|system|endoftext)\|>", "special_token_injection"),
    (r"\[INST\]|\[/INST\]|<<SYS>>|<</SYS>>", "delimiter_injection"),
]


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


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window per-IP rate limiter enforcing RATE_LIMIT_PER_MINUTE."""

    def __init__(self, app: Any, limit_per_minute: int | None = None) -> None:
        super().__init__(app)
        self.limit = limit_per_minute or settings.RATE_LIMIT_PER_MINUTE
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if not settings.ENABLE_RATE_LIMIT:
            return await call_next(request)

        # Skip rate limiting for health checks and OpenAPI docs
        path = request.url.path
        if path in ("/", "/docs", "/redoc", "/api/v1/health", "/api/v1/openapi.json"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - 60.0
        bucket = self._hits[client_ip]

        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= self.limit:
            retry_after = max(1, int(60 - (now - bucket[0])))
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Rate limit exceeded ({self.limit} requests/minute). Retry after {retry_after}s."
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.limit),
                    "X-RateLimit-Remaining": "0",
                },
            )

        bucket.append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.limit - len(bucket)))
        return response


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks."""
    text = text.replace("\x00", "")
    text = html.escape(text, quote=True)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def detect_and_sanitize_prompt_injection(text: str) -> tuple[str, list[str]]:
    """Detect and neutralize prompt-injection / jailbreak patterns in untrusted content."""
    flags: list[str] = []
    cleaned = text
    for pattern, flag_name in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            flags.append(flag_name)
            cleaned = re.sub(pattern, "[REDACTED_CONTROL_DIRECTIVE]", cleaned, flags=re.IGNORECASE)
    return cleaned, flags


def sanitize_url(url: str) -> str:
    """Basic URL sanitization."""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        return ""
    if re.search(r"javascript:|data:", url, re.IGNORECASE):
        return ""
    return url


def mask_secret(value: str) -> str:
    """Safely mask an API key or token for logs and diagnostics."""
    if not value or len(value) < 8:
        return "****"
    return f"{value[:4]}...{value[-4:]}"


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    """Create a signed HS256 JWT token."""
    ttl = (expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES) * 60
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": subject, "iat": int(time.time()), "exp": int(time.time()) + ttl}
    h_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h_b64}.{p_b64}".encode("ascii")
    sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{h_b64}.{p_b64}.{_b64url_encode(sig)}"


def verify_access_token(token: str) -> dict[str, Any]:
    """Verify and decode an HS256 JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token format")
        h_b64, p_b64, s_b64 = parts
        signing_input = f"{h_b64}.{p_b64}".encode("ascii")
        expected_sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        if not hmac.compare_digest(_b64url_decode(s_b64), expected_sig):
            raise ValueError("Invalid token signature")
        payload = json.loads(_b64url_decode(p_b64).decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            raise ValueError("Token expired")
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired bearer token: {exc}",
        )


async def verify_api_auth(
    api_key: str | None = Depends(api_key_header),
    bearer: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Authenticate requests via X-API-Key or Authorization: Bearer <JWT>.

    If REQUIRE_API_AUTH is False (default local dev), anonymous requests are permitted,
    but any supplied X-API-Key or Bearer token is still strictly validated.
    """
    if api_key:
        valid_keys = set(settings.PUBLIC_API_KEYS)
        if settings.SECRET_KEY and settings.SECRET_KEY != "change-this-to-a-random-secret-key":
            valid_keys.add(settings.SECRET_KEY)
        if not any(hmac.compare_digest(api_key, k) for k in valid_keys if k):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid X-API-Key.",
            )
        return f"apikey:{mask_secret(api_key)}"

    if bearer and bearer.credentials:
        payload = verify_access_token(bearer.credentials)
        return str(payload.get("sub", "bearer-user"))

    if settings.REQUIRE_API_AUTH:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide X-API-Key or Authorization: Bearer <token>.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return "anonymous"
