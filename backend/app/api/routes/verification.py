from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import sanitize_input
from app.models.claim import Claim
from app.models.evidence import Evidence
from app.models.verification import JobStatus, VerificationJob, VerificationMode
from app.schemas.claim import ClaimResponse
from app.schemas.evidence import EvidenceResponse
from app.schemas.verification import (
    ExtensionVerifyRequest,
    UrlVerificationRequest,
    VerificationRequest,
    VerificationResponse,
    VerificationSubmitResponse,
)
from app.services.document_extractor import DocumentExtractorService
from app.services.model_disagreement import ModelDisagreementAnalyzer
from app.services.verification_orchestrator import VerificationOrchestrator

logger = logging.getLogger("verityai.routes.verification")
router = APIRouter(tags=["verification"])
orchestrator = VerificationOrchestrator()


@router.post(
    "/verify",
    response_model=VerificationSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit text for verification and execute verification pipeline",
    description="Extracts claims, searches live web via Tavily, verifies via Bifrost/Gemini, and records metrics.",
)
async def submit_verification(
    request: VerificationRequest,
    db: AsyncSession = Depends(get_db),
) -> VerificationSubmitResponse:
    """Submit AI-generated text and execute complete verification pipeline."""
    sanitized_text = sanitize_input(request.text)

    try:
        mode = VerificationMode(request.mode)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode: {request.mode}. Must be one of: standard, adversarial, time_travel",
        )

    job = VerificationJob(
        original_text=sanitized_text,
        mode=mode,
        historical_date=request.historical_date,
        status=JobStatus.PENDING,
        total_claims=0,
        verified_claims=0,
        outdated_claims=0,
        contradicted_claims=0,
        unsupported_claims=0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Execute verification pipeline immediately
    try:
        completed_job = await orchestrator.execute_verification(job.id, db)
        return VerificationSubmitResponse(
            id=completed_job.id,
            status=completed_job.status.value,
            message=f"Verification completed: {completed_job.total_claims} claims audited with live evidence.",
            total_claims=completed_job.total_claims,
        )
    except Exception as exc:
        logger.error(f"Verification pipeline failed for job {job.id}: {exc}", exc_info=True)
        # Even if partial error, return job id so user can view status
        return VerificationSubmitResponse(
            id=job.id,
            status="failed",
            message=f"Verification encountered an error: {str(exc)}",
            total_claims=0,
        )


@router.get(
    "/verify/{job_id}",
    response_model=VerificationResponse,
    summary="Get verification job details with full claims and evidence",
    description="Return a verification job with its complete claims, evidence snippets, and credibility scores.",
)
async def get_verification(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> VerificationResponse:
    """Retrieve a verification job by ID, including its full claims and evidence items."""
    stmt = (
        select(VerificationJob)
        .where(VerificationJob.id == job_id)
        .options(
            selectinload(VerificationJob.claims).selectinload(Claim.evidence_items)
        )
    )
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification job {job_id} not found",
        )

    claims_response: list[ClaimResponse] = []
    for c in job.claims:
        evidence_list = [
            EvidenceResponse(
                id=ev.id,
                claim_id=ev.claim_id,
                source_title=ev.source_title,
                source_url=ev.source_url,
                source_domain=ev.source_domain,
                publication_date=ev.publication_date,
                retrieval_date=ev.retrieval_date,
                content_snippet=ev.content_snippet,
                relevance_score=ev.relevance_score,
                is_supporting=ev.is_supporting,
                is_contradicting=ev.is_contradicting,
                is_primary_source=ev.is_primary_source,
                reliability_score=ev.reliability_score,
                search_query=ev.search_query,
                created_at=ev.created_at,
            )
            for ev in c.evidence_items
        ]
        claims_response.append(
            ClaimResponse(
                id=c.id,
                verification_job_id=c.verification_job_id,
                claim_text=c.claim_text,
                original_sentence=c.original_sentence,
                position_in_text=c.position_in_text,
                category=c.category.value if c.category else None,
                is_time_sensitive=c.is_time_sensitive,
                is_historical=c.is_historical,
                is_vague=c.is_vague,
                status=c.status.value if c.status else None,
                freshness_score=c.freshness_score,
                confidence_score=c.confidence_score,
                explanation=c.explanation,
                suggested_correction=c.suggested_correction,
                evidence=evidence_list,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )

    return VerificationResponse(
        id=job.id,
        original_text=job.original_text,
        mode=job.mode.value,
        historical_date=job.historical_date,
        status=job.status.value,
        overall_freshness_score=job.overall_freshness_score,
        overall_confidence_score=job.overall_confidence_score,
        total_claims=job.total_claims,
        verified_claims=job.verified_claims,
        outdated_claims=job.outdated_claims,
        contradicted_claims=job.contradicted_claims,
        unsupported_claims=job.unsupported_claims,
        error_message=job.error_message,
        processing_time_ms=job.processing_time_ms,
        claims=claims_response,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get(
    "/verify/{job_id}/export",
    summary="Export comprehensive verification report",
    description="Export full verification report in JSON or HTML format.",
)
async def export_verification_report(
    job_id: uuid.UUID,
    format: str = "json",
    db: AsyncSession = Depends(get_db),
):
    """Generates and exports verification dossier as JSON or standalone HTML."""
    from fastapi.responses import HTMLResponse, JSONResponse

    stmt = (
        select(VerificationJob)
        .where(VerificationJob.id == job_id)
        .options(
            selectinload(VerificationJob.claims).selectinload(Claim.evidence_items)
        )
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification job {job_id} not found",
        )

    if format.lower() == "html":
        html_content = orchestrator.report_generator.generate_html_report(job)
        return HTMLResponse(
            content=html_content,
            headers={
                "Content-Disposition": f"attachment; filename=verityai_report_{job.id}.html",
            },
        )
    elif format.lower() == "csv":
        csv_content = orchestrator.report_generator.generate_csv_report(job)
        return PlainTextResponse(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=verityai_report_{job.id}.csv",
            },
        )

    json_report = orchestrator.report_generator.generate_json_report(job)
    return JSONResponse(
        content=json_report,
        headers={
            "Content-Disposition": f"attachment; filename=verityai_report_{job.id}.json",
        },
    )


@router.post(
    "/verify/document",
    response_model=VerificationSubmitResponse,
    summary="Verify claims extracted from uploaded document (PDF, DOCX, TXT)",
    description="Uploads a PDF, DOCX, or TXT document, extracts text content, and initiates verification.",
)
async def verify_document(
    file: UploadFile = File(...),
    mode: str = Form("standard"),
    historical_date: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
) -> VerificationSubmitResponse:
    content = await file.read()
    filename = (file.filename or "").lower()

    try:
        if filename.endswith(".pdf"):
            extracted_text = DocumentExtractorService.extract_from_pdf(content)
        elif filename.endswith(".docx"):
            extracted_text = DocumentExtractorService.extract_from_docx(content)
        elif filename.endswith(".txt") or filename.endswith(".md"):
            extracted_text = DocumentExtractorService.extract_from_txt(content)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format for '{file.filename}'. Supported formats: .pdf, .docx, .txt, .md",
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting text from document '{file.filename}': {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to extract text from '{file.filename}': {e}",
        )

    parsed_date = None
    if historical_date:
        try:
            parsed_date = datetime.fromisoformat(historical_date)
        except Exception:
            pass

    job = VerificationJob(
        id=uuid.uuid4(),
        original_text=extracted_text[:25000],
        mode=VerificationMode(mode) if mode in ("standard", "adversarial", "time_travel") else VerificationMode.STANDARD,
        historical_date=parsed_date,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()

    completed_job = await orchestrator.execute_verification(job.id, db)
    return VerificationSubmitResponse(
        id=completed_job.id,
        status=completed_job.status.value,
        message=f"Document '{file.filename}' processed: {completed_job.total_claims} claims audited with live research.",
        total_claims=completed_job.total_claims,
    )


@router.post(
    "/verify/url",
    response_model=VerificationSubmitResponse,
    summary="Verify claims from a live webpage URL",
    description="Fetches webpage safely (with SSRF protection), parses text, and verifies factual assertions.",
)
async def verify_url(
    payload: UrlVerificationRequest,
    db: AsyncSession = Depends(get_db),
) -> VerificationSubmitResponse:
    try:
        page_data = await DocumentExtractorService.extract_from_url(payload.url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to extract webpage content: {e}",
        )

    job = VerificationJob(
        id=uuid.uuid4(),
        original_text=page_data["text"][:25000],
        mode=VerificationMode(payload.mode),
        historical_date=payload.historical_date,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()

    completed_job = await orchestrator.execute_verification(job.id, db)
    return VerificationSubmitResponse(
        id=completed_job.id,
        status=completed_job.status.value,
        message=f"Webpage '{page_data['title'][:50]}' audited: {completed_job.total_claims} claims verified against live web.",
        total_claims=completed_job.total_claims,
    )


@router.post(
    "/extension/verify",
    summary="Browser Extension fast verification endpoint",
    description="Provides rapid verification for text selected in a browser.",
)
async def extension_verify(
    payload: ExtensionVerifyRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    job = VerificationJob(
        id=uuid.uuid4(),
        original_text=payload.text,
        mode=VerificationMode.STANDARD,
        status=JobStatus.PENDING,
    )
    db.add(job)
    await db.commit()

    completed_job = await orchestrator.execute_verification(job.id, db)
    claims_brief = [
        {
            "id": str(c.id),
            "text": c.claim_text,
            "verdict": c.status.value if c.status else "unsupported",
            "freshness": c.freshness_score,
            "confidence": c.confidence_score,
            "correction": c.suggested_correction,
        }
        for c in completed_job.claims
    ]

    return {
        "job_id": str(completed_job.id),
        "overall_freshness_score": completed_job.overall_freshness_score,
        "overall_confidence_score": completed_job.overall_confidence_score,
        "total_claims": completed_job.total_claims,
        "verified_claims": completed_job.verified_claims,
        "outdated_claims": completed_job.outdated_claims,
        "contradicted_claims": completed_job.contradicted_claims,
        "claims": claims_brief,
        "full_report_url": f"http://localhost:5173/results?id={completed_job.id}",
    }


@router.get(
    "/models/disagreement/{job_id}",
    summary="Multi-model disagreement analysis for a verification job",
    description="Compares primary model (Gemini 2.5 Flash) verdicts against secondary auditor perspectives.",
)
async def analyze_job_disagreement(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = (
        select(VerificationJob)
        .where(VerificationJob.id == job_id)
        .options(
            selectinload(VerificationJob.claims).selectinload(Claim.evidence_items)
        )
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    disagreement_agent = ModelDisagreementAnalyzer(bifrost_service=orchestrator.bifrost)
    analyses = []
    total_disagreement = 0.0

    for c in job.claims:
        snippets = [ev.content_snippet for ev in c.evidence_items]
        analysis = await disagreement_agent.analyze_claim_disagreement(
            claim_text=c.claim_text,
            evidence_snippets=snippets,
            primary_verdict=c.status.value if c.status else "unsupported",
            primary_explanation=c.explanation or "",
        )
        analyses.append({
            "claim_id": str(c.id),
            "claim_text": c.claim_text,
            **analysis,
        })
        total_disagreement += analysis.get("disagreement_score", 0.0)

    avg_disagreement = round(total_disagreement / max(len(analyses), 1), 1)

    return {
        "job_id": str(job.id),
        "total_claims": len(analyses),
        "average_disagreement_score": avg_disagreement,
        "consensus_status": "High Model Alignment" if avg_disagreement < 25.0 else ("Moderate Divergence" if avg_disagreement < 60.0 else "Sharp Disagreement"),
        "primary_model": "gemini-2.5-flash",
        "secondary_evaluator": "bifrost-adversarial-auditor",
        "claims_comparison": analyses,
    }

