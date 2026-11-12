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

    def score_evidence_quality(
        self,
        url: str,
        title: str,
        snippet: str,
        domain: str | None = None,
        publication_date: Any = None,
        relevance_score: float | None = None,
        corroboration_count: int = 1,
    ) -> dict[str, Any]:
        """Feature 4: Evidence Quality Scoring (distinct from claim correctness)."""
        import re
        from datetime import datetime, timezone

        reliability = self.assess_source(url, title, snippet, domain, publication_date)
        authority = round((reliability["reliability_score"] / 100.0) * 25.0, 1)

        rel_val = relevance_score if relevance_score is not None else 0.75
        claim_relevance = round(max(0.0, min(1.0, rel_val)) * 25.0, 1)

        # Publication recency (max 20)
        recency = 11.0
        recency_note = "Publication date not explicitly provided; moderate baseline assigned."
        if publication_date:
            try:
                if isinstance(publication_date, str):
                    pub_dt = datetime.fromisoformat(publication_date.replace("Z", "+00:00"))
                else:
                    pub_dt = publication_date
                if pub_dt.tzinfo is None:
                    pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                age_days = max(0, (datetime.now(timezone.utc) - pub_dt).days)
                if age_days <= 180:
                    recency = 20.0
                    recency_note = f"Published within {age_days} days (highly recent)."
                elif age_days <= 730:
                    recency = 16.0
                    recency_note = f"Published {age_days // 30} months ago (current)."
                else:
                    recency = 10.0
                    recency_note = f"Published over 2 years ago ({age_days // 365}y); may lag recent changes."
            except Exception:
                pass

        # Directness of evidence (max 15): presence of concrete figures, dates, versions, or primary docs
        has_concrete = bool(re.search(r"\b\d+(?:\.\d+)?%?\b|v?\d+\.\d+", snippet or ""))
        directness = 14.0 if (reliability["is_primary"] or has_concrete) and len(snippet or "") >= 80 else 9.0

        # Independent corroboration (max 15)
        corroboration = round(min(1.0, max(1, corroboration_count) / 3.0) * 15.0, 1)

        quality_score = round(authority + claim_relevance + recency + directness + corroboration, 1)
        breakdown = {
            "source_authority": {"score": authority, "max": 25.0, "detail": reliability["rationale"]},
            "claim_relevance": {"score": claim_relevance, "max": 25.0, "detail": f"Semantic/search relevance {round(rel_val * 100)}%."},
            "publication_recency": {"score": recency, "max": 20.0, "detail": recency_note},
            "directness": {"score": directness, "max": 15.0, "detail": "Concrete figures/primary specification present." if directness >= 14.0 else "General narrative snippet."},
            "independent_corroboration": {"score": corroboration, "max": 15.0, "detail": f"Corroborated across {max(1, corroboration_count)} source(s)."},
            "note": "Evidence quality measures source rigor, not whether the user's claim is true.",
        }
        return {"quality_score": quality_score, "quality_breakdown": breakdown}

    def detect_source_bias(
        self,
        url: str,
        title: str,
        snippet: str,
        domain: str | None = None,
    ) -> dict[str, Any]:
        """Feature 3: Source Bias Detection (never auto-rejects solely on perceived bias)."""
        import re

        dom = (domain or urlparse(url).netloc).lower().replace("www.", "")
        combined = f"{title} {snippet} {url}".lower()

        signals: list[str] = []
        bias_label = "neutral_or_unclear"
        bias_confidence = 0.25
        coi: str | None = None

        if re.search(r"\b(sponsored|advertisement|affiliate|promo code|buy now|limited offer|partner content)\b", combined):
            bias_label = "commercial_promotional"
            bias_confidence = 0.82
            signals.append("Promotional or sponsored commercial language detected in content/URL.")
            coi = "Potential commercial/affiliate incentive."
        elif re.search(r"(/blog/|/press-release|/newsroom|/pricing|investor\.)", url.lower()):
            bias_label = "vendor_or_institutional_pr"
            bias_confidence = 0.68
            signals.append(f"First-party vendor blog, pricing, or press-release path on {dom}.")
            coi = f"First-party self-published material by {dom}; may emphasize favorable metrics."
        elif re.search(r"\b(opinion|editorial|commentary|op-ed|partisan|advocacy)\b", combined):
            bias_label = "editorial_or_advocacy"
            bias_confidence = 0.72
            signals.append("Opinion, commentary, or advocacy framing markers detected.")
        elif dom.endswith((".gov", ".edu")) or dom in self.official_primary_domains:
            bias_label = "institutional_official"
            bias_confidence = 0.55
            signals.append(f"Official/institutional publisher ({dom}); authoritative but reflects institutional scope.")
        else:
            signals.append("No overt promotional, advocacy, or conflict-of-interest markers detected.")

        return {
            "bias_label": bias_label,
            "bias_confidence": round(bias_confidence, 2),
            "bias_rationale": " ".join(signals) + " Potential bias does not automatically invalidate factual accuracy.",
            "conflict_of_interest": coi,
            "auto_rejected": False,
        }

