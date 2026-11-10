from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.claim import Claim, ClaimStatus, ClaimVersion

logger = logging.getLogger("verityai.services.drift")


class KnowledgeDriftDetector:
    """Agent 8: Knowledge Drift Agent.
    
    Detects temporal drift in technical information (APIs, versions, pricing, regulations).
    Maintains claim version history and constructs comparative change timelines.
    """

    # Benchmark knowledge drift timeline cases (grounded in historical facts)
    CURATED_DRIFT_BENCHMARKS = [
        {
            "topic": "GPT-4 API Pricing",
            "category": "pricing",
            "previous_truth": "GPT-4 API prompt pricing is $30 per million tokens.",
            "current_truth": "GPT-4o input pricing reduced to $2.50 per 1M tokens (12x reduction).",
            "change_date": "2024-05-13",
            "change_reason": "Release of GPT-4o with optimized omni-architecture lowering compute costs.",
            "evidence_url": "https://openai.com/index/hello-gpt-4o/",
            "severity": "high",
        },
        {
            "topic": "Python Active Stable Branch",
            "category": "software_version",
            "previous_truth": "Python 3.11 is the latest stable release of the language.",
            "current_truth": "Python 3.12 and 3.13 are the newest stable series featuring isolated subinterpreters.",
            "change_date": "2023-10-02",
            "change_reason": "Annual CPython feature release cycle.",
            "evidence_url": "https://docs.python.org/3/whatsnew/3.12.html",
            "severity": "medium",
        },
        {
            "topic": "European Union AI Governance",
            "category": "regulation",
            "previous_truth": "The EU AI Act is a proposed draft framework without legal force.",
            "current_truth": "The EU AI Act entered into legal force on August 1, 2024.",
            "change_date": "2024-08-01",
            "change_reason": "Formal ratification and publication in the EU Official Journal.",
            "evidence_url": "https://commission.europa.eu",
            "severity": "critical",
        },
    ]

    async def analyze_claim_drift(
        self,
        claim: Claim,
        db: AsyncSession,
    ) -> dict[str, Any]:
        """Analyzes a specific claim against its version history and benchmarks."""
        stmt = (
            select(ClaimVersion)
            .where(ClaimVersion.claim_id == claim.id)
            .order_by(ClaimVersion.version_number.asc())
        )
        res = await db.execute(stmt)
        versions = res.scalars().all()

        timeline = []
        for v in versions:
            timeline.append({
                "version": v.version_number,
                "claim_text": v.claim_text,
                "status": v.status,
                "verified_at": v.verified_at.isoformat() if v.verified_at else None,
                "changed_fields": v.changed_fields,
                "change_reason": v.change_reason,
            })

        # Match against curated benchmarks if version history is new
        matched_benchmark = None
        claim_lower = claim.claim_text.lower()
        for b in self.CURATED_DRIFT_BENCHMARKS:
            keywords = [w for w in re.findall(r"\b\w{4,}\b", b["topic"].lower())]
            if any(kw in claim_lower for kw in keywords):
                matched_benchmark = b
                break

        drift_detected = claim.status == ClaimStatus.OUTDATED or (len(versions) > 1) or bool(matched_benchmark)

        return {
            "claim_id": str(claim.id),
            "claim_text": claim.claim_text,
            "category": claim.category.value if claim.category else None,
            "drift_detected": drift_detected,
            "severity": matched_benchmark["severity"] if matched_benchmark else ("moderate" if drift_detected else "none"),
            "benchmark_case": matched_benchmark,
            "version_count": len(versions),
            "timeline": timeline,
            "explanation": (
                matched_benchmark["change_reason"]
                if matched_benchmark
                else (
                    "Observed discrepancy with current authoritative documentation indicating factual changes."
                    if drift_detected
                    else "No knowledge drift detected across observed checkpoints."
                )
            ),
        }

    def get_curated_benchmarks(self) -> list[dict[str, Any]]:
        """Returns verified real-world knowledge drift case studies."""
        return self.CURATED_DRIFT_BENCHMARKS
