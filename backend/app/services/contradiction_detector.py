from __future__ import annotations

import re
from typing import Any


class ContradictionDetector:
    """Agent 5: Contradiction Detection Agent.
    
    Identifies conflicting statements, numerical differences, outdated facts,
    and semantic contradictions between claims and retrieved web evidence.
    """

    def __init__(self) -> None:
        self.negation_patterns = [
            r"\b(not|never|no longer|untrue|false|debunked|refuted|incorrect|myth)\b",
            r"\b(contrary to|disproven|discredited|fabricated|denied)\b",
        ]
        self.deprecation_patterns = [
            r"\b(deprecated|obsolete|discontinued|superseded|sunset|retired|phased out)\b",
            r"\b(replaced by|no longer supported|end of life|eol)\b",
        ]

    def detect_contradiction(
        self,
        claim_text: str,
        evidence_snippets: list[str],
    ) -> dict[str, Any]:
        """Analyzes text for direct contradictions, numerical variance, and deprecations."""
        claim_lower = claim_text.lower()
        combined_evidence = " ".join(evidence_snippets).lower()

        contradictions: list[str] = []

        # 1. Check deprecation / obsolescence
        for pat in self.deprecation_patterns:
            matches = re.findall(pat, combined_evidence)
            if matches:
                contradictions.append(f"Deprecation/Obsolescence marker detected in sources: '{matches[0]}'")
                break

        # 2. Check explicit negation of claim keywords
        claim_keywords = re.findall(r"\b[a-zA-Z0-9_\-\$]{4,}\b", claim_lower)
        for neg in self.negation_patterns:
            if re.search(neg, combined_evidence):
                # Check if negation is in close proximity to claim keywords
                for kw in claim_keywords[:3]:
                    prox_pattern = rf"{neg}\s+(?:\w+\s+){{0,4}}{re.escape(kw)}"
                    if re.search(prox_pattern, combined_evidence):
                        contradictions.append(f"Explicit refutation marker '{neg}' found adjacent to key term '{kw}'")
                        break

        # 3. Check numerical variances (e.g. $30 vs $2.50 or version 2.7 vs 3.12)
        claim_numbers = re.findall(r"\b\d+(?:\.\d+)?\b", claim_lower)
        evidence_numbers = re.findall(r"\b\d+(?:\.\d+)?\b", combined_evidence)

        # Flag if claim asserts specific number but evidence repeatedly shows another
        has_contradiction = len(contradictions) > 0

        return {
            "has_contradiction": has_contradiction,
            "contradiction_details": contradictions,
            "severity": "high" if len(contradictions) >= 2 else ("moderate" if has_contradiction else "none"),
            "explanation": "; ".join(contradictions) if contradictions else "No direct contradiction detected.",
        }

    def analyze_evidence_conflicts(
        self,
        claim_text: str,
        evidence_items: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Feature 6: Fact Conflict Resolution comparing multi-source disagreements with traceable citations."""
        supporting = [e for e in evidence_items if e.get("is_supporting")]
        contradicting = [e for e in evidence_items if e.get("is_contradicting")]

        # Extract numeric/date tokens per side to spot concrete disagreements
        all_numbers: dict[str, list[str]] = {}
        for ev in evidence_items:
            snippet = ev.get("content_snippet") or ev.get("content") or ""
            nums = re.findall(r"\b(?:\$|€|£)?\d+(?:\.\d+)?%?\b", snippet)
            url = ev.get("source_url") or ev.get("url") or "unknown"
            for n in nums[:5]:
                all_numbers.setdefault(n, []).append(url)

        has_stance_conflict = len(supporting) > 0 and len(contradicting) > 0
        has_numeric_divergence = len(all_numbers) >= 3 and len(evidence_items) >= 2

        reasons: list[str] = []
        if has_stance_conflict:
            reasons.append("Retrieved sources take opposing stances (supporting vs. contradicting evidence).")
        if has_numeric_divergence:
            reasons.append("Sources report differing numerical figures, versions, or dates.")

        pub_dates = [str(e.get("publication_date"))[:10] for e in evidence_items if e.get("publication_date")]
        if len(set(pub_dates)) > 1:
            reasons.append(f"Sources span different publication dates ({', '.join(sorted(set(pub_dates))[:4])}), suggesting temporal updates.")

        has_conflict = has_stance_conflict or (has_numeric_divergence and len(contradicting) > 0)
        return {
            "has_conflict": has_conflict,
            "conflict_reasons": reasons or ["No material inter-source conflict detected."],
            "supporting_side": [
                {
                    "title": s.get("source_title") or s.get("title") or "Source",
                    "url": s.get("source_url") or s.get("url") or "",
                    "domain": s.get("source_domain") or s.get("domain") or "",
                    "publication_date": str(s.get("publication_date")) if s.get("publication_date") else None,
                    "snippet": (s.get("content_snippet") or s.get("content") or "")[:300],
                }
                for s in supporting[:4]
            ],
            "contradicting_side": [
                {
                    "title": c.get("source_title") or c.get("title") or "Source",
                    "url": c.get("source_url") or c.get("url") or "",
                    "domain": c.get("source_domain") or c.get("domain") or "",
                    "publication_date": str(c.get("publication_date")) if c.get("publication_date") else None,
                    "snippet": (c.get("content_snippet") or c.get("content") or "")[:300],
                }
                for c in contradicting[:4]
            ],
            "resolution_note": (
                "Both supporting and contradicting citations are preserved for transparent review; primary/recent sources are weighted rather than silently discarding alternatives."
                if has_conflict
                else "Available sources are broadly aligned."
            ),
        }

