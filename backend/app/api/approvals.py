from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.entities import (
    ApprovalDecision,
    ContentVersion,
    ContentItem,
    BrandRule,
    User,
    AuditEvent
)
from app.schemas.schemas import ApprovalDecisionCreate, ApprovalDecisionResponse
from app.api.deps import get_current_user, require_roles

router = APIRouter(prefix="/approvals", tags=["Approval Workspace"])

@router.get("/versions/{version_id}", response_model=List[ApprovalDecisionResponse])
async def list_version_decisions(
    version_id: str,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ApprovalDecision)
        .where(ApprovalDecision.content_version_id == version_id)
        .options(selectinload(ApprovalDecision.approver))
        .order_by(ApprovalDecision.timestamp.desc())
    )
    decisions = res.scalars().all()
    out = []
    for d in decisions:
        out.append(ApprovalDecisionResponse(
            id=d.id,
            content_version_id=d.content_version_id,
            approver_id=d.approver_id,
            approver_name=d.approver.full_name if d.approver else "Authorized Approver",
            decision=d.decision,
            rationale=d.rationale,
            rule_versions_snapshot=d.rule_versions_snapshot or [],
            findings_summary_snapshot=d.findings_summary_snapshot or {},
            timestamp=d.timestamp
        ))
    return out

@router.post("/versions/{version_id}/decide", response_model=ApprovalDecisionResponse)
async def submit_approval_decision(
    version_id: str,
    decision_in: ApprovalDecisionCreate,
    user: User = Depends(require_roles(["APPROVER", "ORG_ADMIN", "LEGAL_COMPLIANCE"])),
    db: AsyncSession = Depends(get_db)
):
    if not decision_in.rationale or len(decision_in.rationale.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Mandatory decision rationale must be at least 10 characters explaining legal/brand justification."
        )

    res = await db.execute(
        select(ContentVersion)
        .where(ContentVersion.id == version_id)
        .options(
            selectinload(ContentVersion.content_item),
            selectinload(ContentVersion.findings)
        )
    )
    ver = res.scalars().first()
    if not ver:
        raise HTTPException(status_code=404, detail="Content version not found")

    item = ver.content_item
    open_findings = [f for f in ver.findings if f.status == "OPEN"]
    critical_findings = [f for f in open_findings if f.severity in ["CRITICAL", "HIGH"]]

    # Enforce review gate: cannot approve if unresolved critical findings exist unless rationale explicitly addresses them
    if decision_in.decision == "APPROVED" and critical_findings:
        if "OVERRIDE" not in decision_in.rationale.upper() and len(decision_in.rationale.split()) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve: version has {len(critical_findings)} unresolved high/critical findings. Detailed executive override justification required in rationale."
            )

    # Snapshot active rules for immutable governance record
    rules_res = await db.execute(
        select(BrandRule).where(BrandRule.organization_id == item.organization_id)
    )
    rules = rules_res.scalars().all()
    rule_snapshots = [
        {"rule_code": r.rule_code, "version": r.current_version, "category": r.category}
        for r in rules
    ]

    findings_summary = {
        "total_findings": len(ver.findings),
        "open_count": len(open_findings),
        "critical_count": len(critical_findings),
        "categories": sorted(list({f.category for f in ver.findings})) if ver.findings else []
    }

    # Record decision
    decision = ApprovalDecision(
        content_version_id=ver.id,
        approver_id=user.id,
        decision=decision_in.decision,
        rationale=decision_in.rationale,
        rule_versions_snapshot=rule_snapshots,
        findings_summary_snapshot=findings_summary
    )
    db.add(decision)
    await db.flush()

    # Update item status accordingly
    if decision_in.decision == "APPROVED":
        item.current_status = "APPROVED"
    elif decision_in.decision == "CHANGES_REQUESTED":
        item.current_status = "CHANGES_REQUESTED"
    elif decision_in.decision == "REJECTED":
        item.current_status = "REJECTED"

    # Audit Trail Entry
    audit = AuditEvent(
        organization_id=item.organization_id,
        user_id=user.id,
        action_type="APPROVAL_DECISION_RECORDED",
        entity_type="APPROVAL_DECISION",
        entity_id=decision.id,
        description=f"{user.full_name} issued formal decision: '{decision_in.decision}' on '{item.title}' v{ver.version_number}.",
        details_json={
            "decision": decision_in.decision,
            "rationale": decision_in.rationale,
            "findings_at_decision": findings_summary
        },
        actor_name=user.full_name,
        actor_role=user.memberships[0].role if user.memberships else "APPROVER"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(decision)

    return ApprovalDecisionResponse(
        id=decision.id,
        content_version_id=decision.content_version_id,
        approver_id=decision.approver_id,
        approver_name=user.full_name,
        decision=decision.decision,
        rationale=decision.rationale,
        rule_versions_snapshot=decision.rule_versions_snapshot,
        findings_summary_snapshot=decision.findings_summary_snapshot,
        timestamp=decision.timestamp
    )
