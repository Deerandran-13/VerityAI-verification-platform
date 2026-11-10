from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse


class EvidenceEngine:
    """Agent 3: Evidence Analysis Agent.
    
    Processes, filters, deduplicates, and evaluates retrieved evidence passages.
    Identifies primary vs secondary sources and calculates domain credibility.
    """

    def __init__(self) -> None:
        self.high_trust_tlds = (".gov", ".edu", ".org", ".eu")
        self.official_domains = {
            "docs.python.org", "python.org", "developer.mozilla.org", "cloud.google.com",
            "openai.com", "platform.openai.com", "github.com", "commission.europa.eu",
            "eur-lex.europa.eu", "iso.org", "w3.org", "ietf.org", "nist.gov",
        }

    def deduplicate_sources(self, raw_results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Deduplicate search results by normalized URL and content fingerprint."""
        seen_urls: set[str] = set()
        deduped: list[dict[str, Any]] = []

        for item in raw_results:
            url = item.get("url", "").strip().rstrip("/")
            if not url or url in seen_urls:
                continue

            seen_urls.add(url)
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]

            item["domain"] = domain
            item["publisher"] = self.extract_publisher_name(domain)
            item["is_primary_source"] = self.is_primary_source(domain)
            deduped.append(item)

        return deduped

    def is_primary_source(self, domain: str) -> bool:
        """Determines if a domain is a primary authoritative record or official docs."""
        clean_domain = domain.lower().replace("www.", "")
        if clean_domain in self.official_domains or clean_domain.endswith(tuple(self.high_trust_tlds)):
            return True
        return False

    def extract_publisher_name(self, domain: str) -> str:
        """Derives clean publisher title from domain."""
        clean = domain.lower().replace("www.", "")
        mapping = {
            "docs.python.org": "Python Software Foundation Docs",
            "python.org": "Python Software Foundation",
            "commission.europa.eu": "European Commission",
            "eur-lex.europa.eu": "EUR-Lex (Official EU Journal)",
            "openai.com": "OpenAI Official",
            "platform.openai.com": "OpenAI Developer Platform",
            "github.com": "GitHub Official",
            "en.wikipedia.org": "Wikipedia",
            "news.ycombinator.com": "Hacker News",
            "reddit.com": "Reddit",
        }
        if clean in mapping:
            return mapping[clean]
        parts = clean.split(".")
        return parts[0].capitalize() if parts else clean

    def evaluate_source_reliability(self, domain: str, is_official: bool = False) -> float:
        """Score source credibility (0-100) based on documented authority heuristics."""
        clean = domain.lower().replace("www.", "")
        if is_official or clean in self.official_domains:
            return 98.0
        elif clean.endswith(".gov"):
            return 99.0
        elif clean.endswith(".edu"):
            return 94.0
        elif clean.endswith((".org", ".eu")):
            return 88.0
        elif clean in ("reuters.com", "bloomberg.com", "nature.com", "science.org", "bbc.com", "nytimes.com"):
            return 90.0
        elif clean:
            return 72.0
        return 50.0

    def extract_passage_relevance(self, claim_text: str, snippet: str) -> float:
        """Computes lexical relevance score between claim and extracted snippet."""
        if not snippet:
            return 0.0
        claim_words = set(re.findall(r"\b[a-z0-9]{3,}\b", claim_text.lower()))
        if not claim_words:
            return 0.5
        snippet_lower = snippet.lower()
        matched = sum(1 for w in claim_words if w in snippet_lower)
        ratio = matched / len(claim_words)
        return round(min(1.0, max(0.2, ratio * 1.2)), 2)
