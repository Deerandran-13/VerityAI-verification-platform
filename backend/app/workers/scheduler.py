from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)


class VerificationScheduler:
    """Manages scheduled background verification tasks, expiration monitors, and notifications."""

    def __init__(self) -> None:
        self.is_running = False

    async def start(self) -> None:
        """Starts the scheduler polling loop."""
        self.is_running = True
        logger.info("VerificationScheduler started.")

    async def stop(self) -> None:
        """Stops the scheduler polling loop."""
        self.is_running = False
        logger.info("VerificationScheduler stopped.")

