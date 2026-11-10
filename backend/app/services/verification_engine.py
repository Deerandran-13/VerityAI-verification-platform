from __future__ import annotations

from typing import Any
from app.models.claim import ClaimStatus


class VerificationEngine:
    """Core verification engine matching claims to evidence and deriving verdicts."""

    def __init__(self) -> None:
        pass

    async def verify_claim(
        self,
        claim_text: str,
        supporting_evidence: list[dict[str, Any]],
        contradicting_evidence: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Derives claim status based on supporting and contradicting evidence."""
        num_support = len(supporting_evidence)
        num_contra = len(contradicting_evidence)

        if num_contra > 0 and num_support == 0:
            status = ClaimStatus.CONTRADICTED
            explanation = "Evidence directly refutes this claim."
        elif num_support > 0 and num_contra == 0:
            status = ClaimStatus.VERIFIED
            explanation = "Multiple authoritative sources corroborate this claim."
        elif num_support > 0 and num_contra > 0:
            status = ClaimStatus.PARTIALLY_SUPPORTED
            explanation = "Mixed evidence found; some sources support while others disagree."
        else:
            status = ClaimStatus.UNSUPPORTED
            explanation = "Insufficient verifiable evidence found to substantiate the claim."

        return {
            "status": status,
            "explanation": explanation,
            "suggested_correction": None,
        }

