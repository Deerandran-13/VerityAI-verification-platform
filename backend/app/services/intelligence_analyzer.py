from __future__ import annotations

import re
from typing import Any

from app.models.claim import Claim
from app.models.collaboration import ClaimRelationship
from app.models.verification import VerificationJob

STOPWORDS = {
    "the", "and", "for", "that", "this", "with", "from", "are", "was", "were",
    "has", "have", "had", "been", "being", "into", "over", "under", "about",
    "which", "their", "there", "also", "more", "than", "such", "only", "most",
}


def _keywords(text: str) -> set[str]:
    tokens = re.findall(r"\b[a-zA-Z0-9\.\-]{3,}\b", (text or "").lower())
    return {t for t in tokens if t not in STOPWORDS}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


class IntelligenceAnalyzer:
    """Derives claim relationships, dependency graphs, and cross-run comparisons from real DB records."""

    def analyze_claim_relationships(self, claims: list[Claim]) -> list[dict[str, Any]]:
        """Feature 7: Identify supporting, contradicting, dependent, overlapping, or unrelated claim pairs."""
        relationships: list[dict[str, Any]] = []
        n = len(claims)
        if n < 2:
            return relationships

        kw_cache = [_keywords(c.claim_text) for c in claims]

        for i in range(n):
            for j in range(i + 1, n):
                c1, c2 = claims[i], claims[j]
                sim = _jaccard(kw_cache[i], kw_cache[j])
                shared = sorted(kw_cache[i] & kw_cache[j])

                rel_type = "unrelated"
                conf = round(sim, 2)
                explanation = "Claims address distinct topics."

                v1 = c1.status.value if c1.status else "unsupported"
                v2 = c2.status.value if c2.status else "unsupported"

                if sim >= 0.55:
                    rel_type = "overlapping"
                    conf = round(min(0.98, sim + 0.15), 2)
                    explanation = f"High lexical/semantic overlap ({round(sim * 100)}%) on terms: {', '.join(shared[:5])}."
                elif sim >= 0.18:
                    # Check opposing verdicts on shared subject
                    pos_verdicts = {"verified", "historically_correct"}
                    neg_verdicts = {"contradicted", "outdated"}
                    if (v1 in pos_verdicts and v2 in neg_verdicts) or (v2 in pos_verdicts and v1 in neg_verdicts):
                        rel_type = "contradicting"
                        conf = round(min(0.95, 0.5 + sim), 2)
                        explanation = (
                            f"Claims share subject ({', '.join(shared[:4])}) but diverge in verdict ({v1} vs. {v2})."
                        )
                    elif re.search(r"\b(therefore|thus|consequently|because|hence|as a result|so)\b", c2.claim_text, re.IGNORECASE):
                        rel_type = "dependent"
                        conf = round(min(0.9, 0.45 + sim), 2)
                        explanation = (
                            f"Claim #{j + 1} builds upon premise in Claim #{i + 1} ({', '.join(shared[:4])})."
                        )
                    elif v1 in pos_verdicts and v2 in pos_verdicts:
                        rel_type = "supporting"
                        conf = round(min(0.9, 0.4 + sim), 2)
                        explanation = f"Both claims corroborate shared topic ({', '.join(shared[:4])})."
                    else:
                        rel_type = "dependent"
                        conf = round(min(0.85, 0.35 + sim), 2)
                        explanation = f"Claims share context ({', '.join(shared[:4])}); verification of one informs the other."

                if rel_type != "unrelated":
                    relationships.append(
                        {
                            "source_claim_id": c1.id,
                            "target_claim_id": c2.id,
                            "relationship_type": rel_type,
                            "confidence": conf,
                            "explanation": explanation,
                        }
                    )
        return relationships

    def build_dependency_graph(
        self,
        job: VerificationJob,
        stored_relationships: list[ClaimRelationship] | None = None,
    ) -> dict[str, Any]:
        """Feature 1: Build interactive graph payload (claim nodes, evidence nodes, and typed edges)."""
        claims = list(job.claims or [])
        rels = stored_relationships or []
        if not rels and len(claims) >= 2:
            # Derive on the fly for older jobs created before ClaimRelationship persistence
            computed = self.analyze_claim_relationships(claims)
        else:
            computed = [
                {
                    "source_claim_id": r.source_claim_id,
                    "target_claim_id": r.target_claim_id,
                    "relationship_type": r.relationship_type,
                    "confidence": r.confidence,
                    "explanation": r.explanation,
                }
                for r in rels
            ]

        # Determine claims impacted by upstream contradicted/outdated premises
        impacted_ids: set[str] = set()
        claim_status_map = {str(c.id): (c.status.value if c.status else "unsupported") for c in claims}
        for r in computed:
            src, tgt = str(r["source_claim_id"]), str(r["target_claim_id"])
            if r["relationship_type"] in ("dependent", "supporting") and claim_status_map.get(src) in ("contradicted", "outdated"):
                impacted_ids.add(tgt)

        nodes: list[dict[str, Any]] = []
        edges: list[dict[str, Any]] = []

        for idx, c in enumerate(claims):
            cid = str(c.id)
            nodes.append(
                {
                    "id": cid,
                    "type": "claim",
                    "label": f"Claim #{idx + 1}",
                    "text": c.claim_text,
                    "verdict": c.status.value if c.status else "unsupported",
                    "confidence": c.confidence_score or 0.0,
                    "freshness": c.freshness_score or 0.0,
                    "uncertainty_level": getattr(c, "uncertainty_level", None) or "moderate",
                    "impacted_by_dependency": cid in impacted_ids,
                    "evidence_count": len(c.evidence_items or []),
                }
            )

            # Attach top 2 evidence nodes per claim
            for ev in (c.evidence_items or [])[:2]:
                ev_id = f"ev-{ev.id}"
                nodes.append(
                    {
                        "id": ev_id,
                        "type": "evidence",
                        "label": ev.source_domain or "Source",
                        "text": ev.source_title or ev.source_url or "Evidence source",
                        "url": ev.source_url,
                        "quality_score": getattr(ev, "quality_score", None) or ev.reliability_score,
                        "bias_label": getattr(ev, "bias_label", None),
                    }
                )
                edges.append(
                    {
                        "source": ev_id,
                        "target": cid,
                        "relationship": "supports_evidence" if ev.is_supporting else ("contradicts_evidence" if ev.is_contradicting else "references"),
                        "confidence": round((ev.relevance_score or 0.75), 2),
                        "explanation": (ev.content_snippet or "")[:160],
                    }
                )

        for r in computed:
            edges.append(
                {
                    "source": str(r["source_claim_id"]),
                    "target": str(r["target_claim_id"]),
                    "relationship": r["relationship_type"],
                    "confidence": r["confidence"],
                    "explanation": r["explanation"],
                }
            )

        return {
            "job_id": str(job.id),
            "total_claims": len(claims),
            "relationship_count": len(computed),
            "impacted_claim_ids": sorted(impacted_ids),
            "nodes": nodes,
            "edges": edges,
        }

    def compare_jobs(self, job_a: VerificationJob, job_b: VerificationJob) -> dict[str, Any]:
        """Feature 9: Side-by-side comparison of two verification jobs across time."""
        claims_a = list(job_a.claims or [])
        claims_b = list(job_b.claims or [])

        matched_b: set[int] = set()
        claim_diffs: list[dict[str, Any]] = []
        summary_counts = {"unchanged": 0, "changed": 0, "newly_supported": 0, "newly_contradicted": 0, "newly_outdated": 0, "added": 0, "removed": 0}

        kw_b = [_keywords(c.claim_text) for c in claims_b]

        for ca in claims_a:
            kwa = _keywords(ca.claim_text)
            best_idx = -1
            best_sim = 0.0
            for idx, kwb in enumerate(kw_b):
                if idx in matched_b:
                    continue
                sim = _jaccard(kwa, kwb)
                if sim > best_sim:
                    best_sim = sim
                    best_idx = idx

            va = ca.status.value if ca.status else "unsupported"
            if best_idx != -1 and best_sim >= 0.4:
                matched_b.add(best_idx)
                cb = claims_b[best_idx]
                vb = cb.status.value if cb.status else "unsupported"

                if va == vb:
                    change_type = "unchanged"
                    summary_counts["unchanged"] += 1
                else:
                    summary_counts["changed"] += 1
                    if vb in ("verified", "historically_correct"):
                        change_type = "newly_supported"
                        summary_counts["newly_supported"] += 1
                    elif vb == "contradicted":
                        change_type = "newly_contradicted"
                        summary_counts["newly_contradicted"] += 1
                    elif vb == "outdated":
                        change_type = "newly_outdated"
                        summary_counts["newly_outdated"] += 1
                    else:
                        change_type = "changed"

                claim_diffs.append(
                    {
                        "claim_text_a": ca.claim_text,
                        "claim_text_b": cb.claim_text,
                        "change_type": change_type,
                        "verdict_a": va,
                        "verdict_b": vb,
                        "freshness_a": ca.freshness_score,
                        "freshness_b": cb.freshness_score,
                        "confidence_a": ca.confidence_score,
                        "confidence_b": cb.confidence_score,
                        "evidence_count_a": len(ca.evidence_items or []),
                        "evidence_count_b": len(cb.evidence_items or []),
                    }
                )
            else:
                summary_counts["removed"] += 1
                claim_diffs.append(
                    {
                        "claim_text_a": ca.claim_text,
                        "claim_text_b": None,
                        "change_type": "removed",
                        "verdict_a": va,
                        "verdict_b": None,
                        "freshness_a": ca.freshness_score,
                        "freshness_b": None,
                        "confidence_a": ca.confidence_score,
                        "confidence_b": None,
                        "evidence_count_a": len(ca.evidence_items or []),
                        "evidence_count_b": 0,
                    }
                )

        for idx, cb in enumerate(claims_b):
            if idx not in matched_b:
                summary_counts["added"] += 1
                vb = cb.status.value if cb.status else "unsupported"
                claim_diffs.append(
                    {
                        "claim_text_a": None,
                        "claim_text_b": cb.claim_text,
                        "change_type": "added",
                        "verdict_a": None,
                        "verdict_b": vb,
                        "freshness_a": None,
                        "freshness_b": cb.freshness_score,
                        "confidence_a": None,
                        "confidence_b": cb.confidence_score,
                        "evidence_count_a": 0,
                        "evidence_count_b": len(cb.evidence_items or []),
                    }
                )

        fresh_a = job_a.overall_freshness_score or 0.0
        fresh_b = job_b.overall_freshness_score or 0.0
        conf_a = job_a.overall_confidence_score or 0.0
        conf_b = job_b.overall_confidence_score or 0.0

        return {
            "job_a": {
                "id": str(job_a.id),
                "created_at": job_a.created_at.isoformat(),
                "mode": job_a.mode.value,
                "total_claims": job_a.total_claims,
                "overall_freshness_score": fresh_a,
                "overall_confidence_score": conf_a,
            },
            "job_b": {
                "id": str(job_b.id),
                "created_at": job_b.created_at.isoformat(),
                "mode": job_b.mode.value,
                "total_claims": job_b.total_claims,
                "overall_freshness_score": fresh_b,
                "overall_confidence_score": conf_b,
            },
            "deltas": {
                "freshness_delta": round(fresh_b - fresh_a, 1),
                "confidence_delta": round(conf_b - conf_a, 1),
                "claims_delta": job_b.total_claims - job_a.total_claims,
            },
            "summary_counts": summary_counts,
            "claim_diffs": claim_diffs,
        }

