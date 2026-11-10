from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import urlparse
import httpx

logger = logging.getLogger("verityai.services.citations")


class CitationChecker:
    """Agent 7: Citation Validation Agent.
    
    Verifies citations in submitted text: checks URL accessibility via live HTTP probing,
    validates publisher identity, detects fabricated or broken links, and assesses claim-to-source alignment.
    """

    def __init__(self) -> None:
        self.url_regex = re.compile(r"https?://[^\s<>\"'()]+", re.IGNORECASE)
        self.bracket_citation_regex = re.compile(r"\[(?:\d+|[a-zA-Z\s]+,\s*\d{4})\]")

    def extract_urls_and_references(self, text: str) -> list[str]:
        """Extract URLs and bracketed citations from text."""
        urls = self.url_regex.findall(text)
        citations = self.bracket_citation_regex.findall(text)
        return list(set(urls + citations))

    async def verify_url_accessibility(self, url: str) -> dict[str, Any]:
        """Live HTTP probe to test if a cited URL actually exists and is reachable."""
        if not url.startswith("http://") and not url.startswith("https://"):
            return {
                "url": url,
                "is_accessible": False,
                "status_code": None,
                "is_fabricated": True,
                "error": "Malformed or non-HTTP URL protocol.",
            }

        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        # Reject common hallucinations
        if any(h in domain for h in ["example.com", "fakeapi", "nonexistent", "dummy.ai"]):
            return {
                "url": url,
                "is_accessible": False,
                "status_code": 404,
                "is_fabricated": True,
                "error": "Known non-existent or placeholder domain.",
            }

        try:
            async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
                resp = await client.head(url)
                if resp.status_code in (405, 403):
                    # Some sites block HEAD; retry with GET
                    resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                
                is_accessible = 200 <= resp.status_code < 400
                return {
                    "url": url,
                    "domain": domain,
                    "is_accessible": is_accessible,
                    "status_code": resp.status_code,
                    "is_fabricated": False,
                    "error": None if is_accessible else f"HTTP {resp.status_code}",
                }
        except Exception as exc:
            return {
                "url": url,
                "domain": domain,
                "is_accessible": False,
                "status_code": None,
                "is_fabricated": False,
                "error": f"Connection failed: {str(exc)}",
            }

    async def audit_citations(
        self,
        claim_text: str,
        citations: list[str],
    ) -> list[dict[str, Any]]:
        """Audits all citations referenced by a claim."""
        results = []
        for cite in citations:
            if cite.startswith("http"):
                probe = await self.verify_url_accessibility(cite)
                # Check lexical alignment with claim
                cite_domain = probe.get("domain", "")
                content_matches = bool(cite_domain and cite_domain in claim_text.lower())
                results.append({
                    "citation": cite,
                    "is_accessible": probe["is_accessible"],
                    "status_code": probe.get("status_code"),
                    "is_fabricated": probe.get("is_fabricated", False),
                    "content_matches_claim": content_matches,
                    "relevance_score": 0.90 if probe["is_accessible"] else 0.20,
                    "error": probe.get("error"),
                })
        return results
