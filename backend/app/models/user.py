from __future__ import annotations

import uuid

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class User(Base):
    """User account model."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(320), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(1024), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="member", nullable=False)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    verification_jobs: Mapped[list[VerificationJob]] = relationship(
        "VerificationJob", back_populates="user", lazy="selectin"
    )
    notifications: Mapped[list[Notification]] = relationship(
        "Notification", back_populates="user", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


# Avoid circular imports — these are resolved by SQLAlchemy via string names
from app.models.notification import Notification  # noqa: E402
from app.models.verification import VerificationJob  # noqa: E402
