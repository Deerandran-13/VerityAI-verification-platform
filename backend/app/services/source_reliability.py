from __future__ import annotations

from typing import Any
from urllib.parse import urlparse


class SourceReliabilityAgent:
    """Agent 10: Source Reliability Intelligence Agent.
    
    Evaluates source credibility based on an explicit, documented rubric:
    1. Institutional Domain Authority (TLD and verified publishers): 40%
    2. Primary Documentation Status (specifications, RFCs, official PRs): 25%
    3. Editorial & Author Accountability (recognized news/peer-reviewed): 15%
    4. Publication Freshness & Currency: 10%
    5. Direct Lexical Relevance to assertion: 10%
    """

    def __init__(self) -> None:
        self.official_primary_domains = {
            "docs.python.org", "python.org", "openai.com", "platform.openai.com",
            "commission.europa.eu", "eur-lex.europa.eu", "github.com",
            "developer.mozilla.org", "w3.org", "ietf.org", "iso.org",
        }
        self.trusted_journalism = {
            "reuters.com", "bloomberg.com", "nature.com", "science.org",
            "bbc.com", "apnews.com", "wsj.com", "nytimes.com",
        }

    def assess_source(
        self,
        url: str,
        title: str,
        snippet: str,
        domain: str | None = None,
        publication_date: Any = None,
    ) -> dict[str, Any]:
        """Calculates transparent reliability score and produces explanatory rationale."""
        if not domain:
            domain = urlparse(url).netloc.lower().replace("www.", "")
        else:
            domain = domain.lower().replace("www.", "")

        rubric_breakdown = {}
        rationale_points = []

        # 1. Domain Authority (Max 40)
        if domain in self.official_primary_domains:
            da_score = 40.0
            rationale_points.append(f"Official canonical documentation domain ({domain}).")
        elif domain.endswith(".gov"):
            da_score = 39.0
            rationale_points.append(f"Government institutional registry ({domain}).")
        elif domain.endswith(".edu"):
            da_score = 36.0
            rationale_points.append(f"Academic accredited institution ({domain}).")
        elif domain.endswith((".org", ".eu")):
            da_score = 32.0
            rationale_points.append(f"Non-profit or regional governance domain ({domain}).")
        elif domain in self.trusted_journalism:
            da_score = 34.0
            rationale_points.append(f"Established major investigative news/peer-review organization ({domain}).")
        else:
            da_score = 24.0
            rationale_points.append(f"Commercial or general web domain ({domain}).")
        rubric_breakdown["domain_authority"] = da_score

        # 2. Primary Status (Max 25)
        is_primary = domain in self.official_primary_domains or domain.endswith((".gov", ".eu"))
        primary_score = 25.0 if is_primary else 15.0
        rubric_breakdown["primary_source_status"] = primary_score
        if is_primary:
            rationale_points.append("Source serves as a primary authoritative record.")
        else:
            rationale_points.append("Source serves as a secondary or reporting record.")

        # 3. Editorial & Attribution (Max 15)
        editorial_score = 14.0 if (domain in self.trusted_journalism or is_primary) else 10.0
        rubric_breakdown["editorial_accountability"] = editorial_score

        # 4. Publication Currency (Max 10)
        currency_score = 9.0 if publication_date else 7.0
        rubric_breakdown["publication_currency"] = currency_score

        # 5. Direct Relevance & Length (Max 10)
        relevance_score = 9.0 if len(snippet) > 80 else 6.0
        rubric_breakdown["evidence_richness"] = relevance_score

        total_score = round(da_score + primary_score + editorial_score + currency_score + relevance_score, 1)

        # Tiering
        if total_score >= 90.0:
            tier = "Tier 1 — Authoritative Primary"
        elif total_score >= 75.0:
            tier = "Tier 2 — High Credibility"
        elif total_score >= 60.0:
            tier = "Tier 3 — Moderate Credibility"
        else:
            tier = "Tier 4 — Unverified / Low Credibility"

        return {
            "reliability_score": total_score,
            "tier": tier,
            "domain": domain,
            "is_primary": is_primary,
            "rubric_breakdown": rubric_breakdown,
            "rationale": " ".join(rationale_points),
        }

