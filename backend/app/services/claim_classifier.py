from __future__ import annotations

import re
from typing import Any
from app.models.claim import ClaimCategory


class ClaimClassifier:
    """Classifies claims into meaningful categories."""

    def __init__(self) -> None:
        self.category_patterns: dict[ClaimCategory, list[str]] = {
            ClaimCategory.SOFTWARE_VERSION: [r"\bv?\d+\.\d+(\.\d+)?\b", r"version", r"release", r"update"],
            ClaimCategory.API_INFO: [r"\bapi\b", r"endpoint", r"method", r"parameter", r"payload", r"rest", r"graphql"],
            ClaimCategory.PRICING: [r"\$", r"€", r"£", r"price", r"cost", r"per month", r"subscription", r"tier", r"free plan"],
            ClaimCategory.COMPANY_INFO: [r"inc\.", r"corp\.", r"ltd\.", r"acquired", r"ceo", r"revenue", r"valuation"],
            ClaimCategory.REGULATION: [r"gdpr", r"compliance", r"law", r"act", r"regulatory", r"fcc", r"fda", r"sec"],
            ClaimCategory.SCIENTIFIC_FACT: [r"study", r"research", r"molecule", r"quantum", r"biology", r"physics", r"experiment"],
            ClaimCategory.STATISTIC: [r"%", r"percent", r"million", r"billion", r"increase of", r"decrease of", r"average"],
            ClaimCategory.HISTORICAL_FACT: [r"founded in", r"invented by", r"in \d{4}", r"century", r"historically"],
            ClaimCategory.TECH_CAPABILITY: [r"supports", r"compatible with", r"runs on", r"accelerated by", r"benchmarks"],
        }

    async def classify(self, claim_text: str) -> ClaimCategory:
        """Classify a claim text into its primary factual category."""
        text = claim_text.lower()
        for category, patterns in self.category_patterns.items():
            for pat in patterns:
                if re.search(pat, text):
                    return category
        return ClaimCategory.GENERAL_FACT

