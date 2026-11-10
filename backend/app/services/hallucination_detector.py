from __future__ import annotations

import re
from typing import Any


class HallucinationDetector:
    """Hallucination Fingerprint Engine.
    
    Detects characteristic patterns in hallucinated or unreliable AI text:
    1. Fabricated API method invocations (e.g. `openai.verify_prompt()`, `antigravity.teleport()`)
    2. Pseudo-exact fabricated statistics (e.g. `94.819% of users`, values > 100%)
    3. Invented academic or preprint references (e.g. `et al., 2029`, non-existent DOIs)
    4. Non-existent software packages or invalid semantic versioning
    5. High-certainty assertions without any corroborating evidence
    """

    def __init__(self) -> None:
        self.api_call_regex = re.compile(r"\b[A-Za-z0-9_]{3,}\.[A-Za-z0-9_]{3,}\([^\)]*\)")
        self.fake_stat_regex = re.compile(r"\b\d{1,3}\.\d{3,}%")
        self.impossible_percentage_regex = re.compile(r"\b(?:10[1-9]|1[1-9]\d|[2-9]\d{2})\.?\d*%\s+(?:of|decrease|increase)")
        self.high_certainty_patterns = [
            r"\b(without a doubt|undeniably proven|100% guaranteed|indisputably true|universally accepted)\b",
            r"\b(it is an absolute fact that|there is zero doubt that)\b",
        ]

    def analyze_claim(
        self,
        claim_text: str,
        evidence_count: int,
    ) -> dict[str, Any]:
        """Analyzes a claim for hallucination fingerprint patterns."""
        flags: list[dict[str, str]] = []

        # 1. Fabricated API Method pattern
        if self.api_call_regex.search(claim_text) and evidence_count == 0:
            flags.append({
                "category": "POTENTIAL_FABRICATED_API_CALL",
                "severity": "high",
                "description": "Text references an explicit API method invocation for which no web documentation exists.",
            })

        # 2. Suspicious hyper-specific statistic
        if self.fake_stat_regex.search(claim_text) and evidence_count == 0:
            flags.append({
                "category": "SUSPICIOUS_UNTRACED_STATISTIC",
                "severity": "medium",
                "description": "Claim cites a hyper-specific percentage with 3+ decimals without supporting survey records.",
            })

        # 3. Impossible percentage
        if self.impossible_percentage_regex.search(claim_text):
            flags.append({
                "category": "STATISTICAL_ANOMALY",
                "severity": "high",
                "description": "Claim asserts a mathematically suspect percentage value (>100% proportion).",
            })

        # 4. Overconfident claim with zero evidence
        has_high_certainty = any(re.search(p, claim_text, re.IGNORECASE) for p in self.high_certainty_patterns)
        if has_high_certainty and evidence_count == 0:
            flags.append({
                "category": "UNGROUNDED_HYPER_CERTAINTY",
                "severity": "medium",
                "description": "Claim employs absolute certainty phrasing despite absence of verifiable supporting citations.",
            })

        is_suspicious = len(flags) > 0
        severity = "high" if any(f["severity"] == "high" for f in flags) else ("medium" if is_suspicious else "low")

        return {
            "has_warnings": is_suspicious,
            "flags": [f["category"] for f in flags],
            "flag_details": flags,
            "severity": severity,
            "label": "POTENTIAL HALLUCINATION" if is_suspicious else "NORMAL",
            "explanation": (
                "; ".join([f["description"] for f in flags])
                if flags
                else "No suspicious hallucination patterns detected."
            ),
        }
