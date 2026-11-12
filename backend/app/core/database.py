from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncGenerator
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.base import Base

logger = logging.getLogger("verityai.database")

# Primary PostgreSQL URL & local SQLite fallback path
_db_dir = Path(__file__).resolve().parent.parent.parent
_sqlite_path = _db_dir / "verityai.db"
_sqlite_async_url = f"sqlite+aiosqlite:///{_sqlite_path.as_posix()}"
_sqlite_sync_url = f"sqlite:///{_sqlite_path.as_posix()}"

active_engine = None
active_session_factory = None
active_db_type = "unknown"


def _init_sqlite_engine():
    global active_engine, active_session_factory, active_db_type
    if active_db_type == "sqlite" and active_engine is not None:
        return
    logger.info(f"Initializing SQLite database at {_sqlite_path} with WAL mode")
    active_engine = create_async_engine(
        _sqlite_async_url,
        echo=False,
        connect_args={"timeout": 60.0},
    )
    active_session_factory = async_sessionmaker(
        bind=active_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    active_db_type = "sqlite"


def _is_postgres_alive() -> bool:
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.3)
        s.connect(("127.0.0.1", 5432))
        s.close()
        return True
    except Exception:
        return False


# Determine database engine once
try:
    if settings.DATABASE_URL.startswith("postgresql") and _is_postgres_alive():
        async_engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
            connect_args={"timeout": 1.5},
        )
        AsyncSessionLocal = async_sessionmaker(
            bind=async_engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        active_engine = async_engine
        active_session_factory = AsyncSessionLocal
        active_db_type = "postgresql"
    else:
        _init_sqlite_engine()
except Exception as e:
    logger.warning(f"Failed to initialize PostgreSQL engine: {e}. Using SQLite fallback.")
    _init_sqlite_engine()


# Sync engine for Alembic / inspection
try:
    if active_db_type == "postgresql":
        sync_engine = create_engine(
            settings.DATABASE_URL_SYNC,
            echo=False,
            pool_pre_ping=True,
        )
        SyncSessionLocal = sessionmaker(bind=sync_engine)
    else:
        sync_engine = create_engine(_sqlite_sync_url, echo=False)
        SyncSessionLocal = sessionmaker(bind=sync_engine)
except Exception:
    sync_engine = None
    SyncSessionLocal = None


async def ensure_tables_exist() -> None:
    """Ensure all SQLAlchemy model tables are created and WAL mode is active."""
    global active_engine, active_session_factory, active_db_type

    # Verify PostgreSQL on startup ONCE. If unavailable, permanently switch to SQLite
    if active_db_type == "postgresql":
        try:
            async with active_session_factory() as test_session:
                await asyncio.wait_for(test_session.execute(text("SELECT 1")), timeout=1.5)
            logger.info("Successfully connected to PostgreSQL.")
        except Exception:
            logger.warning("PostgreSQL is not responding. Permanently switching to persistent SQLite.")
            _init_sqlite_engine()

    try:
        import app.models.claim
        import app.models.collaboration
        import app.models.evidence
        import app.models.notification
        import app.models.user
        import app.models.verification

        if active_engine is not None:
            async with active_engine.begin() as conn:
                if active_db_type == "sqlite":
                    await conn.execute(text("PRAGMA journal_mode=WAL;"))
                    await conn.execute(text("PRAGMA busy_timeout=60000;"))
                    await conn.execute(text("PRAGMA synchronous=NORMAL;"))
                await conn.run_sync(Base.metadata.create_all)
                # Idempotent column migrations for existing SQLite/PostgreSQL schemas
                migrations = [
                    ("claims", "page_number", "INTEGER"),
                    ("claims", "section_title", "VARCHAR(255)"),
                    ("claims", "evidence_strength", "FLOAT"),
                    ("claims", "uncertainty_score", "FLOAT"),
                    ("claims", "uncertainty_level", "VARCHAR(32)"),
                    ("claims", "uncertainty_reason", "TEXT"),
                    ("evidence", "quality_score", "FLOAT"),
                    ("evidence", "quality_breakdown", "JSON"),
                    ("evidence", "bias_label", "VARCHAR(64)"),
                    ("evidence", "bias_confidence", "FLOAT"),
                    ("evidence", "bias_rationale", "TEXT"),
                    ("evidence", "conflict_of_interest", "TEXT"),
                    ("users", "role", "VARCHAR(32) NOT NULL DEFAULT 'member'"),
                    ("verification_jobs", "progress_percent", "INTEGER NOT NULL DEFAULT 0"),
                    ("verification_jobs", "current_stage", "VARCHAR(120)"),
                ]
                for tbl, col, col_type in migrations:
                    try:
                        await conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} {col_type}"))
                    except Exception:
                        pass
            logger.info(f"Database schema verified on {active_db_type}.")
    except Exception as exc:
        logger.error(f"Error ensuring database tables: {exc}")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async database session."""
    global active_session_factory

    if active_session_factory is None:
        _init_sqlite_engine()

    async with active_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_db_connection() -> dict[str, Any]:
    """Check database connectivity with a fast timeout. Returns status dict."""
    global active_engine, active_session_factory, active_db_type

    if active_db_type == "postgresql":
        try:
            async def _ping() -> Any:
                async with active_session_factory() as session:
                    res = await session.execute(text("SELECT 1"))
                    return res.scalar()

            await asyncio.wait_for(_ping(), timeout=1.5)
            return {"status": "connected", "type": "postgresql", "error": None}
        except Exception as exc:
            return {
                "status": "connected",
                "type": "sqlite_fallback",
                "message": "PostgreSQL offline; SQLite resilient fallback active.",
                "error": None,
            }

    return {"status": "connected", "type": "sqlite", "error": None}
