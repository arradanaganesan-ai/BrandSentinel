from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.entities import (
    ContentVersion,
    ContentItem,
    ReviewJob,
    Finding,
    FindingEvidence,
    SourcePassage,
    SourceDocument,
    BrandRule,
    User,
    AuditEvent
)
from app.schemas.schemas import (
    ReviewExecuteRequest,
    ReviewJobResponse,
    FindingResponse,
    FindingEvidenceResponse,
    FindingStatusUpdate
)
from app.api.deps import get_current_user, get_current_organization
from app.services.review_engine import ReviewEngine

router = APIRouter(prefix="/review", tags=["Review Engine"])

@router.post("/versions/{version_id}/execute")
async def execute_review(
    version_id: str,
    req: ReviewExecuteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Fetch content version
    res = await db.execute(
        select(ContentVersion)
        .where(ContentVersion.id == version_id)
        .options(selectinload(ContentVersion.content_item))
    )
    ver = res.scalars().first()
    if not ver:
        raise HTTPException(status_code=404, detail="Content version not found")

    engine = ReviewEngine(db)
    job = await engine.execute_review(ver, analysis_mode=req.analysis_mode)

    # Log audit event
    audit = AuditEvent(
        organization_id=ver.content_item.organization_id,
        user_id=user.id,
        action_type="REVIEW_EXECUTED",
        entity_type="REVIEW_JOB",
        entity_id=job.id,
        description=f"{user.full_name} initiated brand review on '{ver.content_item.title}' v{ver.version_number}.",
        details_json={"analysis_mode": req.analysis_mode},
        actor_name=user.full_name,
        actor_role=user.memberships[0].role if user.memberships else "CONTENT_CREATOR"
    )
    db.add(audit)
    await db.commit()

    return {"message": "Review executed successfully", "job_id": job.id, "status": job.status}

@router.get("/versions/{version_id}/findings", response_model=List[FindingResponse])
async def get_version_findings(
    version_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Finding)
        .where(Finding.content_version_id == version_id)
        .options(
            selectinload(Finding.matched_rule),
            selectinload(Finding.evidence_items)
            .selectinload(FindingEvidence.source_passage)
            .selectinload(SourcePassage.document)
        )
        .order_by(Finding.start_offset.asc().nulls_last())
    )
    findings = res.scalars().all()

    output = []
    for f in findings:
        evidence_list = []
        for ev in f.evidence_items:
            passage = ev.source_passage
            doc = passage.document if passage else None
            evidence_list.append(FindingEvidenceResponse(
                id=ev.id,
                source_passage_id=ev.source_passage_id,
                rule_version_id=ev.rule_version_id,
                relevance_score=ev.relevance_score,
                citation_quote=ev.citation_quote,
                source_title=doc.title if doc else "Corporate Brand Directive",
                section_code=passage.section_code if passage else None,
                passage_content=passage.content if passage else None,
                source_version=doc.version if doc else "1.0.0"
            ))

        output.append(FindingResponse(
            id=f.id,
            content_version_id=f.content_version_id,
            category=f.category,
            severity=f.severity,
            affected_passage=f.affected_passage,
            start_offset=f.start_offset,
            end_offset=f.end_offset,
            matched_rule_id=f.matched_rule_id,
            matched_rule_code=f.matched_rule.rule_code if f.matched_rule else None,
            matched_rule_title=f.matched_rule.title if f.matched_rule else None,
            explanation=f.explanation,
            suggested_correction=f.suggested_correction,
            confidence_label=f.confidence_label,
            evidence_status=f.evidence_status,
            finding_type=f.finding_type,
            status=f.status,
            evidence_items=evidence_list,
            created_at=f.created_at
        ))

    return output

@router.patch("/findings/{finding_id}/status")
async def update_finding_status(
    finding_id: str,
    update: FindingStatusUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Finding)
        .where(Finding.id == finding_id)
        .options(selectinload(Finding.content_version).selectinload(ContentVersion.content_item))
    )
    finding = res.scalars().first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    finding.status = update.status

    audit = AuditEvent(
        organization_id=finding.content_version.content_item.organization_id,
        user_id=user.id,
        action_type="FINDING_STATUS_UPDATED",
        entity_type="FINDING",
        entity_id=finding.id,
        description=f"{user.full_name} set finding ({finding.category}) to '{update.status}'.",
        details_json={"affected_passage": finding.affected_passage, "new_status": update.status},
        actor_name=user.full_name,
        actor_role=user.memberships[0].role if user.memberships else "CONTENT_CREATOR"
    )
    db.add(audit)

    await db.commit()
    return {"message": "Finding status updated", "finding_id": finding.id, "status": finding.status}
