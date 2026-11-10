from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from pydantic import BaseModel, field_validator

# Automatically locate and load backend/.env
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    class BaseSettings(BaseModel):  # type: ignore[no-redef]
        def __init__(self, **kwargs: Any) -> None:
            env_vars: dict[str, Any] = {}
            for field in self.model_fields:
                if field in os.environ:
                    env_vars[field] = os.environ[field]
            env_vars.update(kwargs)
            super().__init__(**env_vars)

    SettingsConfigDict = dict  # type: ignore[assignment,misc]


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env file."""

    model_config = SettingsConfigDict(
        env_file=str(env_path),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://verityai:verityai@localhost:5432/verityai"
    DATABASE_URL_SYNC: str = "postgresql://verityai:verityai@localhost:5432/verityai"

    # API Keys
    TAVILY_API_KEY: str = ""
    BIFROST_API_KEY: str = ""
    BIFROST_BASE_URL: str = "http://127.0.0.1:8080/v1"
    BIFROST_MODEL: str = "gemini/gemini-2.5-flash"

    # Application
    APP_NAME: str = "VerityAI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    SECRET_KEY: str = "change-this-to-a-random-secret-key"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30
    MAX_REQUEST_SIZE_MB: int = 10

    # Freshness scoring weights
    EVIDENCE_AGREEMENT_WEIGHT: float = 0.45
    SOURCE_RELIABILITY_WEIGHT: float = 0.25
    TEMPORAL_RELEVANCE_WEIGHT: float = 0.20
    CITATION_CONSISTENCY_WEIGHT: float = 0.10

    # JWT / Auth
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v  # type: ignore[return-value]

    @property
    def max_request_size_bytes(self) -> int:
        return self.MAX_REQUEST_SIZE_MB * 1024 * 1024


settings = Settings()
