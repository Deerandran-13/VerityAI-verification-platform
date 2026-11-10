from __future__ import annotations

import asyncio
from app.services.claim_extractor import ClaimExtractor
from app.services.claim_classifier import ClaimClassifier
from app.models.claim import ClaimCategory


def test_claim_extraction_basic():
    extractor = ClaimExtractor()
    sample_text = (
        "Python 3.12 was released in October 2023. "
        "It introduces isolated subinterpreters with separate GILs. "
        "The current stable version is 3.12.2."
    )
    claims = asyncio.run(extractor.extract_claims(sample_text))
    assert len(claims) >= 3
    assert any(c["is_time_sensitive"] for c in claims)
    for c in claims:
        assert "claim_text" in c
        assert "original_sentence" in c
        assert "position_in_text" in c


def test_claim_classification():
    classifier = ClaimClassifier()
    assert (
        asyncio.run(classifier.classify("Python 3.12 was released in 2023"))
        == ClaimCategory.SOFTWARE_VERSION
    )
    assert (
        asyncio.run(classifier.classify("The REST API endpoint returns a JSON payload"))
        == ClaimCategory.API_INFO
    )
    assert (
        asyncio.run(classifier.classify("The enterprise tier costs $99 per month"))
        == ClaimCategory.PRICING
    )
