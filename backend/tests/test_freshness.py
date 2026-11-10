from __future__ import annotations

import pytest
from app.services.freshness_engine import FreshnessEngine


def test_freshness_formula_calculation():
    engine = FreshnessEngine()
    # Weights: 0.45 agreement, 0.25 reliability, 0.20 temporal, 0.10 citation
    result = engine.calculate_freshness(
        evidence_agreement=100.0,
        source_reliability=100.0,
        temporal_relevance=100.0,
        citation_consistency=100.0,
    )
    assert result["score"] == 100.0
    assert result["tier"] == "high"

    partial = engine.calculate_freshness(
        evidence_agreement=50.0,
        source_reliability=50.0,
        temporal_relevance=50.0,
        citation_consistency=50.0,
    )
    assert partial["score"] == 50.0
    assert partial["tier"] == "moderate"


def test_confidence_calculation():
    engine = FreshnessEngine()
    # High confidence with official source and multiple sources
    conf = engine.calculate_confidence(
        evidence_count=5,
        supporting_ratio=1.0,
        avg_reliability=90.0,
        has_official_source=True,
    )
    assert conf > 80.0

    # Zero evidence yields zero confidence
    zero_conf = engine.calculate_confidence(
        evidence_count=0,
        supporting_ratio=0.0,
        avg_reliability=0.0,
    )
    assert zero_conf == 0.0

