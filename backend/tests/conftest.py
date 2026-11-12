from __future__ import annotations

import asyncio
import pytest

from app.core.database import ensure_tables_exist
from app.core.security import RateLimitMiddleware
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _init_test_db() -> None:
    """Ensure SQLite/PostgreSQL schema and new columns exist before test session."""
    asyncio.run(ensure_tables_exist())


@pytest.fixture(scope="module", autouse=True)
def _reset_rate_limit_between_modules() -> None:
    """Prevent cross-module rate-limit bucket bleed during fast pytest runs."""
    yield
    stack = app.middleware_stack
    while stack is not None:
        if isinstance(stack, RateLimitMiddleware):
            stack._hits.clear()
        stack = getattr(stack, "app", None)
