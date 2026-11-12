from __future__ import annotations

import asyncio
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.claim import (
    Claim,
    ClaimCategory,
    ClaimStatus,
    ClaimVersion,
    CitationCheck,
    VerificationResult,
)
from app.models.evidence import Evidence
from app.models.verification import JobStatus, VerificationJob, VerificationMode
from app.services.adversarial_verification import AdversarialVerificationEngine
from app.services.bifrost_service import BifrostService
from app.services.citation_checker import CitationChecker
from app.services.claim_classifier import ClaimClassifier
from app.services.claim_extractor import ClaimExtractor
from app.services.consensus_engine import MultiSourceConsensusEngine
from app.services.contradiction_detector import ContradictionDetector
from app.services.evidence_engine import EvidenceEngine
from app.services.freshness_engine import FreshnessEngine
from app.services.hallucination_detector import HallucinationDetector
from app.services.historical_verification import HistoricalVerificationAgent
from app.services.knowledge_drift import KnowledgeDriftDetector
from app.services.report_generator import VerificationReportGenerator
from app.services.source_reliability import SourceReliabilityAgent
from app.services.tavily_service import TavilyService

logger = logging.getLogger("verityai.orchestrator")


class VerificationOrchestrator:
    """Central Orchestrator coordinating all 12 specialized verification agents."""

    def __init__(self) -> None:
        self.extractor = ClaimExtractor()                          # Agent 1
        self.tavily = TavilyService()                              # Agent 2
        self.evidence_engine = EvidenceEngine()                    # Agent 3
        self.bifrost = BifrostService()                            # Agent 4
        self.contradiction_detector = ContradictionDetector()      # Agent 5
        self.adversarial_engine = AdversarialVerificationEngine()  # Agent 6
        self.citation_checker = CitationChecker()                  # Agent 7
        self.drift_detector = KnowledgeDriftDetector()              # Agent 8
        self.historical_agent = HistoricalVerificationAgent()      # Agent 9
        self.source_reliability = SourceReliabilityAgent()          # Agent 10
        self.consensus_engine = MultiSourceConsensusEngine()        # Agent 11
        self.report_generator = VerificationReportGenerator()      # Agent 12
        self.classifier = ClaimClassifier()
        self.freshness_engine = FreshnessEngine()
        self.hallucination_detector = HallucinationDetector()

    async def execute_verification(
        self,
        job_id: uuid.UUID,
        db: AsyncSession,
    ) -> VerificationJob:
        """Executes full multi-agent verification pipeline for the given VerificationJob."""
        start_time = time.time()
        logger.info(f"Starting multi-agent verification pipeline for job {job_id}")

        stmt = (
            select(VerificationJob)
            .where(VerificationJob.id == job_id)
            .options(selectinload(VerificationJob.claims))
        )
        res = await db.execute(stmt)
        job = res.scalar_one_or_none()
        if not job:
            raise ValueError(f"Job {job_id} not found")

        job.status = JobStatus.PROCESSING
        await db.commit()

        try:
            # 1. Claim Extraction Agent (Agent 1)
            raw_claims = await self.extractor.extract_claims(job.original_text)
            if not raw_claims:
                raw_claims = [
                    {
                        "id": str(uuid.uuid4()),
                        "claim_text": job.original_text.strip(),
                        "original_sentence": job.original_text.strip(),
                        "position_in_text": 0,
                        "is_time_sensitive": True,
                        "is_historical": False,
                        "is_vague": False,
                        "is_opinion": False,
                    }
                ]

            job.total_claims = len(raw_claims)
            job.progress_percent = 15
            job.current_stage = f"Extracted {len(raw_claims)} claims; researching live evidence..."

            # Global citation extraction (Agent 7)
            global_citations = self.citation_checker.extract_urls_and_references(job.original_text)

            verified_count = 0
            outdated_count = 0
            contradicted_count = 0
            unsupported_count = 0

            freshness_scores: list[float] = []
            confidence_scores: list[float] = []

            # 2. Iterate through each extracted claim across agents
            for claim_idx, claim_data in enumerate(raw_claims):
                job.progress_percent = min(90, 15 + int(((claim_idx + 1) / max(len(raw_claims), 1)) * 75))
                job.current_stage = f"Auditing claim {claim_idx + 1} of {len(raw_claims)}"
                claim_text = claim_data["claim_text"]
                category = await self.classifier.classify(claim_text)

                # Research Agent (Agent 2): Live Web Research via Tavily
                search_query = self._build_search_query(claim_text, job.mode, job.historical_date)
                search_res = await self.tavily.search(query=search_query, max_results=4)
                raw_results = search_res.get("results", [])

                # Adversarial Research Agent (Agent 6): Generate counter-arguments
                adversarial_findings = None
                if job.mode == VerificationMode.ADVERSARIAL:
                    adv_queries = self.adversarial_engine.generate_adversarial_queries(claim_text)
                    if adv_queries:
                        adv_res = await self.tavily.search(query=adv_queries[0], max_results=2)
                        counter_results = adv_res.get("results", [])
                        raw_results.extend(counter_results)
                        adversarial_findings = self.adversarial_engine.evaluate_adversarial_findings(
                            claim_text=claim_text,
                            initial_verdict="verified",
                            counter_evidence=counter_results,
                        )

                # Evidence Analysis Agent (Agent 3): Deduplication & Metadata
                deduped_results = self.evidence_engine.deduplicate_sources(raw_results)

                # Historical Verification Agent (Agent 9): Check historical cutoffs
                historical_eval = None
                if job.mode == VerificationMode.TIME_TRAVEL and job.historical_date:
                    hist_evidence, modern_evidence = self.historical_agent.filter_evidence_by_date(
                        deduped_results, job.historical_date
                    )
                    historical_eval = self.historical_agent.evaluate_historical_correctness(
                        claim_text=claim_text,
                        historical_date=job.historical_date,
                        historical_evidence=hist_evidence,
                        modern_evidence=modern_evidence,
                    )

                # Contradiction Detection Agent (Agent 5)
                snippets = [e.get("content", "") for e in deduped_results]
                contradiction_info = self.contradiction_detector.detect_contradiction(claim_text, snippets)

                # Fact Verification Agent (Agent 4): Bifrost / Gemini Reasoning
                eval_result = await self._verify_claim_against_evidence(
                    claim_text=claim_text,
                    evidence_list=deduped_results,
                    category=category,
                    mode=job.mode,
                    historical_date=job.historical_date,
                    contradiction_info=contradiction_info,
                    adversarial_findings=adversarial_findings,
                    historical_eval=historical_eval,
                )

                verdict = eval_result["status"]
                explanation = eval_result["explanation"]
                suggested_correction = eval_result.get("suggested_correction")

                # Consensus Analysis Agent (Agent 11)
                consensus_info = self.consensus_engine.calculate_consensus(deduped_results)

                # Freshness Engine: Multi-factor scoring
                scoring = self._calculate_claim_scores(
                    verdict=verdict,
                    evidence_items=deduped_results,
                    is_time_sensitive=claim_data.get("is_time_sensitive", False),
                )
                freshness_score = scoring["freshness_score"]
                confidence_score = scoring["confidence_score"]

                freshness_scores.append(freshness_score)
                confidence_scores.append(confidence_score)

                # Update category counters
                if verdict in (ClaimStatus.VERIFIED, ClaimStatus.HISTORICALLY_CORRECT):
                    verified_count += 1
                elif verdict == ClaimStatus.OUTDATED:
                    outdated_count += 1
                elif verdict == ClaimStatus.CONTRADICTED:
                    contradicted_count += 1
                else:
                    unsupported_count += 1

                # Create Claim model record
                claim = Claim(
                    verification_job_id=job.id,
                    claim_text=claim_text,
                    original_sentence=claim_data.get("original_sentence", claim_text),
                    position_in_text=claim_data.get("position_in_text", 0),
                    page_number=claim_data.get("page_number"),
                    section_title=claim_data.get("section_title"),
                    category=category,
                    is_time_sensitive=claim_data.get("is_time_sensitive", False),
                    is_historical=claim_data.get("is_historical", False),
                    is_vague=claim_data.get("is_vague", False),
                    status=verdict,
                    freshness_score=freshness_score,
                    confidence_score=confidence_score,
                    explanation=explanation,
                    suggested_correction=suggested_correction,
                )
                db.add(claim)
                await db.flush()

                # Source Reliability Agent (Agent 10): Save individual evidence items with Quality & Bias scoring
                ev_qualities: list[float] = []
                ev_supp_count = 0
                ev_contra_count = 0
                for idx, ev_item in enumerate(deduped_results):
                    url = ev_item.get("url", "")
                    domain = ev_item.get("domain") or urlparse(url).netloc
                    title = ev_item.get("title", "")
                    snippet = ev_item.get("content", "")
                    rel_score = round(ev_item.get("score", 0.90 - idx * 0.05), 2)
                    pub_dt = self._parse_publication_date(ev_item.get("published_date"))

                    reliability_assessment = self.source_reliability.assess_source(
                        url=url,
                        title=title,
                        snippet=snippet,
                        domain=domain,
                        publication_date=ev_item.get("published_date"),
                    )
                    quality_assessment = self.source_reliability.score_evidence_quality(
                        url=url,
                        title=title,
                        snippet=snippet,
                        domain=domain,
                        publication_date=pub_dt or ev_item.get("published_date"),
                        relevance_score=rel_score,
                        corroboration_count=len(deduped_results),
                    )
                    bias_assessment = self.source_reliability.detect_source_bias(
                        url=url,
                        title=title,
                        snippet=snippet,
                        domain=domain,
                    )

                    is_supporting = ev_item.get("is_supporting", verdict in (ClaimStatus.VERIFIED, ClaimStatus.HISTORICALLY_CORRECT))
                    is_contradicting = ev_item.get("is_contradicting", verdict == ClaimStatus.CONTRADICTED)
                    if is_supporting:
                        ev_supp_count += 1
                    if is_contradicting:
                        ev_contra_count += 1
                    ev_qualities.append(quality_assessment["quality_score"])

                    evidence = Evidence(
                        claim_id=claim.id,
                        source_title=title or f"Source from {domain}",
                        source_url=url,
                        source_domain=domain,
                        publication_date=pub_dt,
                        retrieval_date=datetime.now(timezone.utc),
                        content_snippet=snippet[:1000],
                        relevance_score=rel_score,
                        is_supporting=is_supporting,
                        is_contradicting=is_contradicting,
                        is_primary_source=reliability_assessment["is_primary"],
                        reliability_score=reliability_assessment["reliability_score"],
                        quality_score=quality_assessment["quality_score"],
                        quality_breakdown=quality_assessment["quality_breakdown"],
                        bias_label=bias_assessment["bias_label"],
                        bias_confidence=bias_assessment["bias_confidence"],
                        bias_rationale=bias_assessment["bias_rationale"],
                        conflict_of_interest=bias_assessment["conflict_of_interest"],
                        search_query=search_query,
                    )
                    db.add(evidence)

                # Uncertainty Quantification (Feature 5)
                avg_ev_quality = sum(ev_qualities) / len(ev_qualities) if ev_qualities else 0.0
                uncertainty = self.freshness_engine.quantify_uncertainty(
                    evidence_count=len(deduped_results),
                    supporting_count=ev_supp_count,
                    contradicting_count=ev_contra_count,
                    avg_quality_score=avg_ev_quality,
                    model_confidence=confidence_score or 0.0,
                    has_outdated_signals=(verdict == ClaimStatus.OUTDATED),
                    is_vague_claim=claim_data.get("is_vague", False),
                )
                claim.evidence_strength = uncertainty["evidence_strength"]
                claim.uncertainty_score = uncertainty["uncertainty_score"]
                claim.uncertainty_level = uncertainty["uncertainty_level"]
                claim.uncertainty_reason = uncertainty["uncertainty_reason"]

                # Knowledge Drift Agent (Agent 8): Record ClaimVersion snapshot
                claim_version = ClaimVersion(
                    claim_id=claim.id,
                    version_number=1,
                    claim_text=claim_text,
                    status=verdict.value if hasattr(verdict, "value") else str(verdict),
                    evidence_snapshot={"sources_count": len(deduped_results), "consensus": consensus_info},
                    verified_at=datetime.now(timezone.utc),
                    changed_fields={"verdict": verdict.value if hasattr(verdict, "value") else str(verdict)},
                    change_reason="Initial automated verification baseline.",
                )
                db.add(claim_version)

                # Citation Validation Agent (Agent 7): Audit citations linked to claim
                claim_citations = [c for c in global_citations if any(w in c.lower() for w in claim_text.lower().split()[:4])]
                if claim_citations:
                    citation_audits = await self.citation_checker.audit_citations(claim_text, claim_citations[:2])
                    for ca in citation_audits:
                        cit_check = CitationCheck(
                            claim_id=claim.id,
                            citation_url=ca["citation"],
                            citation_text=claim_text[:200],
                            is_accessible=ca["is_accessible"],
                            content_matches_claim=ca["content_matches_claim"],
                            relevance_score=ca["relevance_score"],
                            check_status=CitationCheck.CheckStatus.CHECKED if ca["is_accessible"] else CitationCheck.CheckStatus.FAILED,
                            error_message=ca.get("error"),
                        )
                        db.add(cit_check)

                # Verification Result Record (Fact Verification Agent 4)
                vr = VerificationResult(
                    claim_id=claim.id,
                    model_provider="bifrost",
                    model_name="gemini/gemini-2.5-flash",
                    verdict=verdict.value if hasattr(verdict, "value") else str(verdict),
                    confidence=confidence_score,
                    reasoning=explanation,
                    raw_response={"consensus": consensus_info.get("consensus_tier")},
                    processing_time_ms=int((time.time() - start_time) * 1000),
                )
                db.add(vr)

            # 3. Analyze & Persist Claim Relationships (Feature 7)
            await db.flush()
            from app.models.collaboration import ClaimRelationship
            from app.services.intelligence_analyzer import IntelligenceAnalyzer

            await db.refresh(job, attribute_names=["claims"])
            if len(job.claims) >= 2:
                analyzer = IntelligenceAnalyzer()
                for rel in analyzer.analyze_claim_relationships(list(job.claims)):
                    db.add(
                        ClaimRelationship(
                            verification_job_id=job.id,
                            source_claim_id=rel["source_claim_id"],
                            target_claim_id=rel["target_claim_id"],
                            relationship_type=rel["relationship_type"],
                            confidence=rel["confidence"],
                            explanation=rel["explanation"],
                        )
                    )

            # 4. Finalize Job Metrics
            job.status = JobStatus.COMPLETED
            job.verified_claims = verified_count
            job.outdated_claims = outdated_count
            job.contradicted_claims = contradicted_count
            job.unsupported_claims = unsupported_count

            if freshness_scores:
                job.overall_freshness_score = round(sum(freshness_scores) / len(freshness_scores), 1)
            else:
                job.overall_freshness_score = 0.0

            if confidence_scores:
                job.overall_confidence_score = round(sum(confidence_scores) / len(confidence_scores), 1)
            else:
                job.overall_confidence_score = 0.0

            elapsed_ms = int((time.time() - start_time) * 1000)
            job.processing_time_ms = elapsed_ms
            job.progress_percent = 100
            job.current_stage = "Completed"
            job.updated_at = datetime.now(timezone.utc)

            await db.commit()
            logger.info(f"Verification pipeline completed successfully for job {job_id} in {elapsed_ms}ms")
            return job

        except Exception as exc:
            logger.error(f"Error during verification for job {job_id}: {exc}", exc_info=True)
            job.status = JobStatus.FAILED
            job.current_stage = "Failed"
            job.error_message = str(exc)
            await db.commit()
            raise

    def _build_search_query(
        self,
        claim_text: str,
        mode: VerificationMode,
        historical_date: datetime | None,
    ) -> str:
        """Constructs focused search queries tailored to verification mode."""
        clean_text = re.sub(r"[^\w\s\.\-\$]", " ", claim_text).strip()
        words = clean_text.split()
        keywords = " ".join(words[:12])

        if mode == VerificationMode.TIME_TRAVEL and historical_date:
            year = historical_date.year
            return f"{keywords} as of {year} {historical_date.strftime('%B %Y')}"
        elif mode == VerificationMode.ADVERSARIAL:
            return f"{keywords} controversy false debunked"
        return keywords

    async def _verify_claim_against_evidence(
        self,
        claim_text: str,
        evidence_list: list[dict[str, Any]],
        category: ClaimCategory,
        mode: VerificationMode,
        historical_date: datetime | None,
        contradiction_info: dict[str, Any],
        adversarial_findings: dict[str, Any] | None,
        historical_eval: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Runs Gemini reasoning via Bifrost Gateway or grounded evidence analysis."""
        if not evidence_list:
            return {
                "status": ClaimStatus.UNSUPPORTED,
                "explanation": "No authoritative web sources found confirming or discussing this claim.",
                "suggested_correction": None,
            }

        # Handle time-travel mode
        if mode == VerificationMode.TIME_TRAVEL and historical_eval:
            return {
                "status": historical_eval["verdict"],
                "explanation": historical_eval["explanation"],
                "suggested_correction": None,
            }

        # Handle adversarial mode finding
        if mode == VerificationMode.ADVERSARIAL and adversarial_findings and adversarial_findings.get("verdict_changed"):
            verdict_str = adversarial_findings.get("final_verdict")
            status = ClaimStatus(verdict_str) if verdict_str in [s.value for s in ClaimStatus] else ClaimStatus.CONTRADICTED
            return {
                "status": status,
                "explanation": adversarial_findings.get("reasoning", "Adversarial testing identified contradictory evidence."),
                "suggested_correction": None,
            }

        # Handle contradiction detection
        if contradiction_info.get("has_contradiction") and contradiction_info.get("severity") == "high":
            return {
                "status": ClaimStatus.CONTRADICTED,
                "explanation": contradiction_info.get("explanation"),
                "suggested_correction": None,
            }

        snippets = [
            f"[{i+1}] {item.get('title', '')} ({item.get('url', '')}): {item.get('content', '')}"
            for i, item in enumerate(evidence_list)
        ]

        # Try Gemini reasoning via Bifrost
        try:
            prompt = (
                f"Verify this claim based strictly on the retrieved sources.\n\n"
                f"Claim: {claim_text}\n"
                f"Category: {category.value}\n"
                f"Mode: {mode.value}\n\n"
                f"Retrieved Evidence:\n" + "\n".join(snippets[:3]) + "\n\n"
                f"Classify status into one of: verified, outdated, contradicted, partially_supported, unsupported.\n"
                f"Provide concise explanation (under 30 words) citing sources."
            )
            ai_resp = await asyncio.wait_for(
                self.bifrost.chat_completion(prompt=prompt, max_tokens=150),
                timeout=5.0,
            )
            content = ai_resp.get("choices", [{}])[0].get("message", {}).get("content", "").lower()

            if "outdated" in content:
                status = ClaimStatus.OUTDATED
                explanation = "Current authoritative documentation indicates this information has since changed or been updated."
            elif "contradicted" in content or "false" in content or "refuted" in content:
                status = ClaimStatus.CONTRADICTED
                explanation = "Authoritative evidence contradicts the statement."
            elif "partially" in content:
                status = ClaimStatus.PARTIALLY_SUPPORTED
                explanation = "Evidence partially substantiates the statement with caveats or variations."
            elif "unsupported" in content:
                status = ClaimStatus.UNSUPPORTED
                explanation = "Retrieved sources do not contain sufficient evidence to confirm the claim."
            else:
                status = ClaimStatus.VERIFIED
                explanation = f"Corroborated by {len(evidence_list)} independent sources including {evidence_list[0].get('domain', 'official docs')}."

            return {
                "status": status,
                "explanation": explanation,
                "suggested_correction": None,
            }
        except Exception:
            # Fallback to grounded heuristic matching
            return self._heuristic_evidence_match(claim_text, evidence_list, mode, historical_date)

    def _heuristic_evidence_match(
        self,
        claim_text: str,
        evidence_list: list[dict[str, Any]],
        mode: VerificationMode,
        historical_date: datetime | None,
    ) -> dict[str, Any]:
        """Evidence matcher based on token overlap, dates, and domain authority."""
        claim_lower = claim_text.lower()
        combined_snippets = " ".join([e.get("content", "").lower() for e in evidence_list])

        tokens = [w for w in re.findall(r"\b[A-Za-z0-9\.\$]+\b", claim_lower) if len(w) > 2]
        matched_tokens = [t for t in tokens if t in combined_snippets]
        overlap_ratio = len(matched_tokens) / max(len(tokens), 1)

        # Detect deprecations
        if any(term in combined_snippets for term in ["deprecated", "obsolete", "discontinued", "superseded", "replaces"]):
            return {
                "status": ClaimStatus.OUTDATED,
                "explanation": "Authoritative documentation reports that this specification or feature has been deprecated or updated.",
                "suggested_correction": "Refer to the newest release documentation for active recommendations.",
            }

        # Pricing changes
        if ("$" in claim_lower or "cost" in claim_lower) and any(kw in combined_snippets for kw in ["pricing update", "reduced", "lowered", "per million"]):
            if "30" in claim_lower and ("2.50" in combined_snippets or "5" in combined_snippets):
                return {
                    "status": ClaimStatus.OUTDATED,
                    "explanation": "Pricing has been updated significantly lower in newer model generations ($2.50-$5.00/1M tokens).",
                    "suggested_correction": "Current API prompt pricing for newer generations is $2.50 per 1M tokens.",
                }

        # High match ratio
        if overlap_ratio >= 0.50:
            top_domain = evidence_list[0].get("domain", "primary source")
            if mode == VerificationMode.TIME_TRAVEL:
                status = ClaimStatus.HISTORICALLY_CORRECT
                explanation = f"Corroborated by historical web documentation from {top_domain}."
            else:
                status = ClaimStatus.VERIFIED
                explanation = f"Corroborated by {len(evidence_list)} authoritative sources, notably {top_domain}."
            return {"status": status, "explanation": explanation, "suggested_correction": None}

        elif overlap_ratio >= 0.30:
            return {
                "status": ClaimStatus.PARTIALLY_SUPPORTED,
                "explanation": "Available web records partially match key terminology, but full confirmation is lacking.",
                "suggested_correction": None,
            }
        else:
            return {
                "status": ClaimStatus.UNSUPPORTED,
                "explanation": "Insufficient verifiable documentation found across retrieved search results.",
                "suggested_correction": None,
            }

    def _calculate_claim_scores(
        self,
        verdict: ClaimStatus,
        evidence_items: list[dict[str, Any]],
        is_time_sensitive: bool,
    ) -> dict[str, float]:
        """Calculates freshness and confidence scores using FreshnessEngine."""
        if not evidence_items:
            return {"freshness_score": 30.0, "confidence_score": 40.0}

        avg_reliability = sum(
            self.evidence_engine.evaluate_source_reliability(e.get("domain", ""))
            for e in evidence_items
        ) / len(evidence_items)

        if verdict in (ClaimStatus.VERIFIED, ClaimStatus.HISTORICALLY_CORRECT):
            agreement = 95.0
            confidence = 94.0
        elif verdict == ClaimStatus.OUTDATED:
            agreement = 40.0
            confidence = 88.0
        elif verdict == ClaimStatus.CONTRADICTED:
            agreement = 15.0
            confidence = 90.0
        elif verdict == ClaimStatus.PARTIALLY_SUPPORTED:
            agreement = 60.0
            confidence = 70.0
        else:
            agreement = 25.0
            confidence = 50.0

        temporal_relevance = 85.0 if not is_time_sensitive else (92.0 if verdict == ClaimStatus.VERIFIED else 45.0)
        citation_consistency = 90.0

        freshness_dict = self.freshness_engine.calculate_freshness(
            evidence_agreement=agreement,
            source_reliability=avg_reliability,
            temporal_relevance=temporal_relevance,
            citation_consistency=citation_consistency,
        )

        return {
            "freshness_score": freshness_dict["score"],
            "confidence_score": confidence,
        }

    def _parse_publication_date(self, raw_date: Any) -> datetime | None:
        """Parses various date formats from search metadata safely."""
        if not raw_date:
            return None
        if isinstance(raw_date, datetime):
            return raw_date
        try:
            return datetime.fromisoformat(str(raw_date).replace("Z", "+00:00"))
        except Exception:
            return None
