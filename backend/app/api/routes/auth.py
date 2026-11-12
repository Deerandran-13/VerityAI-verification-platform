from __future__ import annotations

import hmac
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.config import settings
from app.core.security import create_access_token, verify_api_auth

router = APIRouter(prefix="/auth", tags=["authentication"])


class TokenRequest(BaseModel):
    api_key: str = Field(..., min_length=4, description="Valid VerityAI public API key")
    client_name: str = Field(default="api-client", max_length=64)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="Exchange a valid API key for a signed Bearer JWT",
)
async def issue_token(payload: TokenRequest) -> TokenResponse:
    valid_keys = list(settings.PUBLIC_API_KEYS)
    if settings.SECRET_KEY and settings.SECRET_KEY != "change-this-to-a-random-secret-key":
        valid_keys.append(settings.SECRET_KEY)

    if not any(hmac.compare_digest(payload.api_key, k) for k in valid_keys if k):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key.",
        )

    token = create_access_token(subject=payload.client_name)
    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )


@router.get(
    "/me",
    summary="Inspect current authentication identity",
)
async def get_auth_identity(identity: str = Depends(verify_api_auth)) -> dict[str, str | bool]:
    return {
        "authenticated": identity != "anonymous",
        "identity": identity,
        "auth_required": settings.REQUIRE_API_AUTH,
    }

