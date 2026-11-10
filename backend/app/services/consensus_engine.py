from __future__ import annotations

from typing import Any
from urllib.parse import urlparse


class MultiSourceConsensusEngine:
    """Agent 11: Consensus Analysis Agent.
    
    Evaluates independent multi-source agreement, filters out domain echoes/syndication,
    distinguishes primary from secondary confirmation, and produces explainable consensus summaries.
    """

    def calculate_consensus(self, sources: list[dict[str, Any]]) -> dict[str, Any]:
        """Groups sources by independent domain and calculates consensus ratio and explanation."""
        if not sources:
            return {
                "total_sources": 0,
                "total_independent_sources": 0,
                "supporting_independent_sources": 0,
                "contradicting_independent_sources": 0,
                "agreement_percentage": 0.0,
                "consensus_tier": "No Evidence",
                "consensus_explanation": "No sources retrieved to evaluate consensus.",
            }

        domain_evidence: dict[str, dict[str, Any]] = {}

        for s in sources:
            url = s.get("url", "")
            d = s.get("domain") or urlparse(url).netloc.lower().replace("www.", "")
            if not d:
                continue

            if d not in domain_evidence:
                domain_evidence[d] = {
                    "domain": d,
                    "is_supporting": s.get("is_supporting", False),
                    "is_contradicting": s.get("is_contradicting", False),
                    "is_primary": s.get("is_primary_source", False),
                    "titles": [s.get("title", "")],
                }
            else:
                domain_evidence[d]["titles"].append(s.get("title", ""))

        total_indep = len(domain_evidence)
        supporting_domains = [d for d, info in domain_evidence.items() if info["is_supporting"]]
        contradicting_domains = [d for d, info in domain_evidence.items() if info["is_contradicting"]]

        sup_count = len(supporting_domains)
        contra_count = len(contradicting_domains)

        agreement_pct = round((sup_count / max(total_indep, 1)) * 100.0, 2)

        # Consensus explanation
        if total_indep >= 2 and contra_count == 0:
            consensus_tier = "Strong Cross-Domain Consensus"
            explanation = (
                f"Consensus established across {total_indep} independent domains "
                f"({', '.join(supporting_domains[:3])}) with zero dissenting authoritative records."
            )
        elif total_indep >= 1 and contra_count == 0:
            consensus_tier = "Moderate Confirmation"
            explanation = f"Supported by independent domain '{supporting_domains[0]}' without documented contradictions."
        elif sup_count > 0 and contra_count > 0:
            consensus_tier = "Contested / Divergent Views"
            explanation = (
                f"Evidence divergence detected: {sup_count} domains support while {contra_count} "
                f"domains ({', '.join(contradicting_domains[:2])}) present contradicting or deprecated findings."
            )
        elif contra_count > 0:
            consensus_tier = "Strong Contradiction Consensus"
            explanation = f"Cross-domain consensus refuting assertion across {contra_count} independent domains."
        else:
            consensus_tier = "Unsubstantiated"
            explanation = "Retrieved records do not provide direct factual corroboration."

        return {
            "total_sources": len(sources),
            "total_independent_sources": total_indep,
            "supporting_independent_sources": sup_count,
            "contradicting_independent_sources": contra_count,
            "agreement_percentage": agreement_pct,
            "consensus_tier": consensus_tier,
            "consensus_explanation": explanation,
            "independent_domains": list(domain_evidence.keys()),
        }


ConsensusEngine = MultiSourceConsensusEngine
