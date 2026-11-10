from __future__ import annotations

import re
from typing import Any


class AdversarialVerificationEngine:
    """Agent 6: Adversarial Research Agent.
    
    Actively constructs counter-argument searches, probes for edge-cases,
    deprecations, and opposing evidence to challenge initial verification conclusions.
    """

    def generate_adversarial_queries(self, claim_text: str) -> list[str]:
        """Generates targeted counter-queries (e.g. deprecation notices, debunking)."""
        clean_claim = re.sub(r"[^\w\s\.\-\$]", " ", claim_text).strip()
        words = clean_claim.split()
        core_query = " ".join(words[:10])

        return [
            f"{core_query} controversy false debunked",
            f"{core_query} deprecated discontinued obsolete",
            f"why {core_query} is incorrect or misleading",
            f"{core_query} criticism problems limitations",
        ]

    def evaluate_adversarial_findings(
        self,
        claim_text: str,
        initial_verdict: str,
        counter_evidence: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Evaluates whether adversarial research discovers valid refutations or exceptions."""
        if not counter_evidence:
            return {
                "initial_verdict": initial_verdict,
                "counter_evidence_found": False,
                "opposing_sources_count": 0,
                "final_verdict": initial_verdict,
                "verdict_changed": False,
                "reasoning": "Adversarial counter-query yielded no reliable opposing evidence.",
            }

        combined_counter_text = " ".join([e.get("content", "").lower() for e in counter_evidence])

        # Check for confirmed deprecations or debunking
        has_deprecation = any(w in combined_counter_text for w in ["deprecated", "discontinued", "no longer supported", "sunset"])
        has_debunking = any(w in combined_counter_text for w in ["false", "debunked", "inaccurate", "incorrect statement", "myth"])

        if has_deprecation and initial_verdict != "outdated":
            return {
                "initial_verdict": initial_verdict,
                "counter_evidence_found": True,
                "opposing_sources_count": len(counter_evidence),
                "final_verdict": "outdated",
                "verdict_changed": True,
                "reasoning": "Adversarial probing identified deprecation and obsolescence notices across authoritative documentation.",
            }
        elif has_debunking and initial_verdict in ("verified", "supported"):
            return {
                "initial_verdict": initial_verdict,
                "counter_evidence_found": True,
                "opposing_sources_count": len(counter_evidence),
                "final_verdict": "contradicted",
                "verdict_changed": True,
                "reasoning": "Adversarial counter-search uncovered direct refutations from credible fact-checking or technical sources.",
            }

        return {
            "initial_verdict": initial_verdict,
            "counter_evidence_found": False,
            "opposing_sources_count": len(counter_evidence),
            "final_verdict": initial_verdict,
            "verdict_changed": False,
            "reasoning": "Adversarial testing challenged the claim, but available evidence remains supportive.",
        }
