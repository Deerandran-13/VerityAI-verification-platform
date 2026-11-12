from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import create_access_token, sanitize_input, verify_access_token
from app.models.claim import Claim
from app.models.collaboration import (
    AuditActivityLog,
    ClaimRelationship,
    ReportComment,
    SharedReport,
)
from app.models.user import User
from app.models.verification import VerificationJob
from app.services.contradiction_detector import ContradictionDetector
from app.services.intelligence_analyzer import IntelligenceAnalyzer

router = APIRouter(tags=["intelligence"])


# ---------------------------------------------------------------------------
# Password hashing helpers (PBKDF2-SHA256)
# ---------------------------------------------------------------------------

def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
    return f"pbkdf2_sha256${salt}${dk.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        scheme, salt, digest = stored_hash.split("$", 2)
        if scheme != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
        return hmac.compare_digest(dk.hex(), digest)
    except Exception:
        return False


async def _get_current_collab_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer token",
        )
    token = authorization.split(" ", 1)[1].strip()
    payload = verify_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
        )
    email = str(payload["sub"]).lower()
    stmt = select(User).where(User.email == email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


async def _check_report_access(
    db: AsyncSession,
    job_id: uuid.UUID,
    user: User,
    require_write_share: bool = False,
) -> list[SharedReport]:
    stmt = select(SharedReport).where(SharedReport.verification_job_id == job_id)
    res = await db.execute(stmt)
    shares = list(res.scalars().all())

    if user.role == "admin":
        return shares

    user_email = user.email.lower()
    is_owner = any(s.owner_email.lower() == user_email for s in shares)
    matching_member = next(
        (
            s
            for s in shares
            if s.member_email.lower() == user_email
            or (s.assigned_reviewer_email and s.assigned_reviewer_email.lower() == user_email)
        ),
        None,
    )

    if require_write_share:
        # Allowed if no shares exist yet (first owner claims it), or user is owner/admin
        if shares and not is_owner and not (matching_member and matching_member.member_role == "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only report owners or administrators can share or assign reviewers.",
            )
        return shares

    # Read / comment access: if shares exist, user must be owner, member, or assigned reviewer
    if shares and not is_owner and matching_member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this shared verification report.",
        )
    return shares


# ---------------------------------------------------------------------------
# 1. Claim Dependency Graph & Claim Relationship Analysis
# ---------------------------------------------------------------------------

@router.get(
    "/verify/{job_id}/graph",
    summary="Get interactive Claim Dependency Graph for a verification job",
)
async def get_claim_dependency_graph(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = (
        select(VerificationJob)
        .where(VerificationJob.id == job_id)
        .options(selectinload(VerificationJob.claims).selectinload(Claim.evidence_items))
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification job {job_id} not found",
        )

    rel_stmt = select(ClaimRelationship).where(ClaimRelationship.verification_job_id == job_id)
    rel_res = await db.execute(rel_stmt)
    stored_rels = list(rel_res.scalars().all())

    analyzer = IntelligenceAnalyzer()
    return analyzer.build_dependency_graph(job, stored_relationships=stored_rels or None)


# ---------------------------------------------------------------------------
# 2. Job-level Fact Conflict Resolution
# ---------------------------------------------------------------------------

@router.get(
    "/verify/{job_id}/conflicts",
    summary="Detect and compare conflicting evidence across all claims in a job",
)
async def get_job_conflicts(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt = (
        select(VerificationJob)
        .where(VerificationJob.id == job_id)
        .options(selectinload(VerificationJob.claims).selectinload(Claim.evidence_items))
    )
    res = await db.execute(stmt)
    job = res.scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification job {job_id} not found",
        )

    detector = ContradictionDetector()
    claim_conflicts: list[dict] = []
    for claim in job.claims:
        ev_dicts = [
            {
                "id": str(e.id),
                "source_title": e.source_title,
                "source_url": e.source_url,
                "source_domain": e.source_domain,
                "publication_date": e.publication_date.isoformat() if e.publication_date else None,
                "content_snippet": e.content_snippet,
                "is_supporting": e.is_supporting,
                "is_contradicting": e.is_contradicting,
                "reliability_score": e.reliability_score,
                "quality_score": e.quality_score,
            }
            for e in claim.evidence_items
        ]
        analysis = detector.analyze_evidence_conflicts(claim.claim_text, ev_dicts)
        claim_conflicts.append({
            "claim_id": str(claim.id),
            "claim_text": claim.claim_text,
            "status": claim.status.value if claim.status else None,
            **analysis,
        })

    conflicted_count = sum(1 for c in claim_conflicts if c.get("has_conflict"))
    return {
        "job_id": str(job.id),
        "total_claims": len(claim_conflicts),
        "conflicted_claims_count": conflicted_count,
        "claims": claim_conflicts,
    }


# ---------------------------------------------------------------------------
# 3. Verification Comparison
# ---------------------------------------------------------------------------

@router.get(
    "/compare",
    summary="Compare two verification jobs side-by-side",
)
async def compare_verifications(
    job_a: uuid.UUID = Query(..., description="Baseline verification job UUID"),
    job_b: uuid.UUID = Query(..., description="Comparison verification job UUID"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    stmt_a = (
        select(VerificationJob)
        .where(VerificationJob.id == job_a)
        .options(selectinload(VerificationJob.claims).selectinload(Claim.evidence_items))
    )
    stmt_b = (
        select(VerificationJob)
        .where(VerificationJob.id == job_b)
        .options(selectinload(VerificationJob.claims).selectinload(Claim.evidence_items))
    )
    res_a = await db.execute(stmt_a)
    res_b = await db.execute(stmt_b)
    verification_a = res_a.scalar_one_or_none()
    verification_b = res_b.scalar_one_or_none()

    if verification_a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_a} not found")
    if verification_b is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_b} not found")

    analyzer = IntelligenceAnalyzer()
    return analyzer.compare_jobs(verification_a, verification_b)


# ---------------------------------------------------------------------------
# 4. Team Collaboration & RBAC
# ---------------------------------------------------------------------------

class RegisterUserRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str | None = Field(default=None, max_length=255)
    role: Literal["admin", "reviewer", "member"] = "member"


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    password: str = Field(..., min_length=1, max_length=128)


class ShareReportRequest(BaseModel):
    member_email: str = Field(..., min_length=3, max_length=320)
    member_role: Literal["admin", "reviewer", "member"] = "member"
    assigned_reviewer_email: str | None = Field(default=None, max_length=320)


class ReportCommentRequest(BaseModel):
    claim_id: uuid.UUID | None = None
    comment_type: Literal["comment", "review_note", "assignment"] = "comment"
    content: str = Field(..., min_length=1, max_length=4000)


@router.post(
    "/collaboration/users/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a team collaboration user",
)
async def register_collaboration_user(
    body: RegisterUserRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    email = sanitize_input(body.email).lower()
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    user = User(
        email=email,
        hashed_password=_hash_password(body.password),
        display_name=sanitize_input(body.display_name) if body.display_name else email.split("@")[0],
        role=body.role,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    token = create_access_token(subject=user.email)
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
        "access_token": token,
        "token_type": "bearer",
    }


@router.post(
    "/collaboration/login",
    summary="Authenticate a team collaboration user and issue a JWT",
)
async def login_collaboration_user(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    email = sanitize_input(body.email).lower()
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if user is None or not _verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    token = create_access_token(subject=user.email)
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "role": user.role,
        "access_token": token,
        "token_type": "bearer",
    }


@router.post(
    "/collaboration/reports/{job_id}/share",
    status_code=status.HTTP_201_CREATED,
    summary="Share a verification report with a team member and/or assign a reviewer",
)
async def share_verification_report(
    job_id: uuid.UUID,
    body: ShareReportRequest,
    current_user: User = Depends(_get_current_collab_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job_res = await db.execute(select(VerificationJob).where(VerificationJob.id == job_id))
    job = job_res.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")

    await _check_report_access(db, job_id, current_user, require_write_share=True)

    member_email = sanitize_input(body.member_email).lower()
    assigned_reviewer = (
        sanitize_input(body.assigned_reviewer_email).lower()
        if body.assigned_reviewer_email
        else None
    )

    if body.member_role == "admin" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can grant admin access.",
        )

    share = SharedReport(
        verification_job_id=job_id,
        owner_email=current_user.email.lower(),
        member_email=member_email,
        member_role=body.member_role,
        assigned_reviewer_email=assigned_reviewer,
    )
    db.add(share)
    await db.flush()

    db.add(
        AuditActivityLog(
            verification_job_id=job_id,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action="report_shared",
            details={
                "member_email": member_email,
                "member_role": body.member_role,
                "assigned_reviewer_email": assigned_reviewer,
            },
        )
    )
    await db.flush()

    return {
        "id": str(share.id),
        "verification_job_id": str(share.verification_job_id),
        "owner_email": share.owner_email,
        "member_email": share.member_email,
        "member_role": share.member_role,
        "assigned_reviewer_email": share.assigned_reviewer_email,
        "created_at": share.created_at.isoformat(),
    }


@router.get(
    "/collaboration/reports/shared",
    summary="List verification reports shared with or owned by the current user",
)
async def list_shared_reports(
    current_user: User = Depends(_get_current_collab_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    if current_user.role == "admin":
        stmt = select(SharedReport).order_by(SharedReport.created_at.desc())
    else:
        email = current_user.email.lower()
        stmt = (
            select(SharedReport)
            .where(
                or_(
                    SharedReport.owner_email == email,
                    SharedReport.member_email == email,
                    SharedReport.assigned_reviewer_email == email,
                )
            )
            .order_by(SharedReport.created_at.desc())
        )
    res = await db.execute(stmt)
    shares = res.scalars().all()
    return [
        {
            "id": str(s.id),
            "verification_job_id": str(s.verification_job_id),
            "owner_email": s.owner_email,
            "member_email": s.member_email,
            "member_role": s.member_role,
            "assigned_reviewer_email": s.assigned_reviewer_email,
            "created_at": s.created_at.isoformat(),
        }
        for s in shares
    ]


@router.post(
    "/collaboration/reports/{job_id}/comments",
    status_code=status.HTTP_201_CREATED,
    summary="Add a comment, review note, or assignment note to a shared report",
)
async def add_report_comment(
    job_id: uuid.UUID,
    body: ReportCommentRequest,
    current_user: User = Depends(_get_current_collab_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    job_res = await db.execute(select(VerificationJob).where(VerificationJob.id == job_id))
    if job_res.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")

    await _check_report_access(db, job_id, current_user, require_write_share=False)

    if body.comment_type == "review_note" and current_user.role not in ("admin", "reviewer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only reviewers or administrators can post official review notes.",
        )

    comment = ReportComment(
        verification_job_id=job_id,
        claim_id=body.claim_id,
        author_email=current_user.email,
        author_role=current_user.role,
        comment_type=body.comment_type,
        content=sanitize_input(body.content),
    )
    db.add(comment)
    await db.flush()

    db.add(
        AuditActivityLog(
            verification_job_id=job_id,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action=f"report_{body.comment_type}_added",
            details={
                "comment_id": str(comment.id),
                "claim_id": str(body.claim_id) if body.claim_id else None,
            },
        )
    )
    await db.flush()

    return {
        "id": str(comment.id),
        "verification_job_id": str(comment.verification_job_id),
        "claim_id": str(comment.claim_id) if comment.claim_id else None,
        "author_email": comment.author_email,
        "author_role": comment.author_role,
        "comment_type": comment.comment_type,
        "content": comment.content,
        "created_at": comment.created_at.isoformat(),
    }


@router.get(
    "/collaboration/reports/{job_id}/comments",
    summary="List comments and review notes for a verification report",
)
async def list_report_comments(
    job_id: uuid.UUID,
    current_user: User = Depends(_get_current_collab_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await _check_report_access(db, job_id, current_user, require_write_share=False)
    stmt = (
        select(ReportComment)
        .where(ReportComment.verification_job_id == job_id)
        .order_by(ReportComment.created_at.desc())
    )
    res = await db.execute(stmt)
    comments = res.scalars().all()
    return [
        {
            "id": str(c.id),
            "verification_job_id": str(c.verification_job_id),
            "claim_id": str(c.claim_id) if c.claim_id else None,
            "author_email": c.author_email,
            "author_role": c.author_role,
            "comment_type": c.comment_type,
            "content": c.content,
            "created_at": c.created_at.isoformat(),
        }
        for c in comments
    ]


@router.get(
    "/collaboration/reports/{job_id}/audit-log",
    summary="List audit activity log for a verification report",
)
async def list_report_audit_log(
    job_id: uuid.UUID,
    current_user: User = Depends(_get_current_collab_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    await _check_report_access(db, job_id, current_user, require_write_share=False)
    stmt = (
        select(AuditActivityLog)
        .where(AuditActivityLog.verification_job_id == job_id)
        .order_by(AuditActivityLog.created_at.desc())
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return [
        {
            "id": str(log.id),
            "verification_job_id": str(log.verification_job_id) if log.verification_job_id else None,
            "actor_email": log.actor_email,
            "actor_role": log.actor_role,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]

