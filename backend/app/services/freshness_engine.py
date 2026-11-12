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

    def quantify_uncertainty(
        self,
        evidence_count: int,
        supporting_count: int,
        contradicting_count: int,
        avg_quality_score: float,
        model_confidence: float,
        has_outdated_signals: bool = False,
        is_vague_claim: bool = False,
    ) -> dict[str, Any]:
        """Feature 5: Uncertainty Quantification distinguishing model confidence from evidence strength."""
        reasons: list[str] = []

        if evidence_count == 0:
            return {
                "evidence_strength": 0.0,
                "uncertainty_score": 95.0,
                "uncertainty_level": "high",
                "uncertainty_reason": "No retrieved web evidence; cannot reach a definitive conclusion (insufficient evidence).",
                "recommend_insufficient_evidence": True,
            }

        # Evidence strength depends on breadth, quality, and directional clarity
        breadth = min(1.0, evidence_count / 4.0)
        consensus_margin = abs(supporting_count - contradicting_count) / max(evidence_count, 1)
        evidence_strength = round(
            max(0.0, min(100.0, (avg_quality_score * 0.55) + (breadth * 25.0) + (consensus_margin * 20.0))),
            1,
        )

        uncertainty = 100.0 - evidence_strength
        if supporting_count > 0 and contradicting_count > 0:
            uncertainty = min(100.0, uncertainty + 18.0)
            reasons.append(
                f"Conflicting sources ({supporting_count} supporting vs. {contradicting_count} contradicting)."
            )
        if evidence_count < 2:
            uncertainty = min(100.0, uncertainty + 15.0)
            reasons.append("Limited independent source coverage (fewer than 2 sources).")
        if has_outdated_signals:
            uncertainty = min(100.0, uncertainty + 12.0)
            reasons.append("Temporal/version drift signals indicate facts may have changed.")
        if is_vague_claim:
            uncertainty = min(100.0, uncertainty + 12.0)
            reasons.append("Claim phrasing is ambiguous or lacks concrete qualifiers.")
        if abs(model_confidence - evidence_strength) > 25.0:
            reasons.append(
                f"Model confidence ({round(model_confidence, 1)}%) diverges from underlying evidence strength ({evidence_strength}%)."
            )

        uncertainty_score = round(max(5.0, min(98.0, uncertainty)), 1)
        if uncertainty_score >= 60.0:
            level = "high"
        elif uncertainty_score >= 30.0:
            level = "moderate"
        else:
            level = "low"

        if not reasons:
            reasons.append("Multiple consistent, high-quality sources corroborate the assessment.")

        return {
            "evidence_strength": evidence_strength,
            "uncertainty_score": uncertainty_score,
            "uncertainty_level": level,
            "uncertainty_reason": " ".join(reasons),
            "recommend_insufficient_evidence": evidence_count < 2 and evidence_strength < 45.0,
        }

