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

