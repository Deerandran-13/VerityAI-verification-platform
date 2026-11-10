from __future__ import annotations

from typing import Any
from app.core.config import settings


class FreshnessEngine:
    """Calculates freshness, confidence, and reliability scores for claims and evidence.

    Formula:
        Freshness = 0.45 * Evidence Agreement
                  + 0.25 * Source Reliability
                  + 0.20 * Temporal Relevance
                  + 0.10 * Citation Consistency
    """

    def __init__(
        self,
        agreement_weight: float | None = None,
        reliability_weight: float | None = None,
        temporal_weight: float | None = None,
        citation_weight: float | None = None,
    ) -> None:
        self.w_agreement = (
            agreement_weight
            if agreement_weight is not None
            else settings.EVIDENCE_AGREEMENT_WEIGHT
        )
        self.w_reliability = (
            reliability_weight
            if reliability_weight is not None
            else settings.SOURCE_RELIABILITY_WEIGHT
        )
        self.w_temporal = (
            temporal_weight
            if temporal_weight is not None
            else settings.TEMPORAL_RELEVANCE_WEIGHT
        )
        self.w_citation = (
            citation_weight
            if citation_weight is not None
            else settings.CITATION_CONSISTENCY_WEIGHT
        )

    def calculate_freshness(
        self,
        evidence_agreement: float,
        source_reliability: float,
        temporal_relevance: float,
        citation_consistency: float,
    ) -> dict[str, Any]:
        """Compute the weighted freshness score and explain the components.

        All inputs are expected in the 0.0 - 100.0 range.
        Returns score (0-100), label, and detailed breakdown.
        """
        # Clamp inputs
        ea = max(0.0, min(100.0, float(evidence_agreement)))
        sr = max(0.0, min(100.0, float(source_reliability)))
        tr = max(0.0, min(100.0, float(temporal_relevance)))
        cc = max(0.0, min(100.0, float(citation_consistency)))

        score = (
            self.w_agreement * ea
            + self.w_reliability * sr
            + self.w_temporal * tr
            + self.w_citation * cc
        )
        score = round(score, 2)

        # Interpretation tiers
        if score >= 85.0:
            interpretation = "Strongly supported and current"
            tier = "high"
        elif score >= 65.0:
            interpretation = "Mostly current"
            tier = "moderate_high"
        elif score >= 40.0:
            interpretation = "Requires further verification"
            tier = "moderate"
        else:
            interpretation = "Potentially outdated or contradicted"
            tier = "low"

        return {
            "score": score,
            "interpretation": interpretation,
            "tier": tier,
            "weights": {
                "evidence_agreement": self.w_agreement,
                "source_reliability": self.w_reliability,
                "temporal_relevance": self.w_temporal,
                "citation_consistency": self.w_citation,
            },
            "components": {
                "evidence_agreement": ea,
                "source_reliability": sr,
                "temporal_relevance": tr,
                "citation_consistency": cc,
            },
        }

    def calculate_confidence(
        self,
        evidence_count: int,
        supporting_ratio: float,
        avg_reliability: float,
        has_official_source: bool = False,
    ) -> float:
        """Calculate confidence score (0-100) based on evidence breadth and quality."""
        if evidence_count == 0:
            return 0.0

        # Base confidence from supporting ratio and reliability
        base = (supporting_ratio * 0.6) + ((avg_reliability / 100.0) * 0.4)
        
        # Scaling factor based on number of independent sources (max effect at 5 sources)
        breadth_multiplier = min(1.0, evidence_count / 5.0)
        
        # Official source boost
        official_boost = 0.15 if has_official_source else 0.0
        
        raw_score = (base * 0.85 + official_boost) * breadth_multiplier * 100.0
        return round(max(0.0, min(100.0, raw_score)), 2)

