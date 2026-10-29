import difflib
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.entities import (
    Organization,
    User,
    ContentItem,
    ContentVersion,
    Finding,
    AuditEvent
)
from app.schemas.schemas import (
    ContentItemResponse,
    ContentItemCreate,
    ContentVersionResponse,
    ContentVersionCreate
)
from app.api.deps import get_current_user, get_current_organization

router = APIRouter(prefix="/content", tags=["Content Review Studio"])

@router.get("/items", response_model=List[ContentItemResponse])
async def list_content_items(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ContentItem)
        .where(ContentItem.organization_id == org.id)
        .options(selectinload(ContentItem.versions))
        .order_by(ContentItem.created_at.desc())
    )
    items = res.scalars().all()
    results = []
    for item in items:
        resp = ContentItemResponse(
            id=item.id,
            organization_id=item.organization_id,
            title=item.title,
            content_type=item.content_type,
            campaign=item.campaign,
            target_audience=item.target_audience,
            current_status=item.current_status,
            creator_id=item.creator_id,
            created_at=item.created_at,
            updated_at=item.updated_at,
            versions_count=len(item.versions),
            latest_version=ContentVersionResponse(
                id=item.versions[-1].id,
                content_item_id=item.id,
                version_number=item.versions[-1].version_number,
                raw_text=item.versions[-1].raw_text,
                parent_version_id=item.versions[-1].parent_version_id,
                created_by_id=item.versions[-1].created_by_id,
                created_at=item.versions[-1].created_at
            ) if item.versions else None
        )
        results.append(resp)
    return results

@router.post("/items", response_model=ContentItemResponse)
async def create_content_item(
    item_in: ContentItemCreate,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    item = ContentItem(
        organization_id=org.id,
        title=item_in.title,
        content_type=item_in.content_type,
        campaign=item_in.campaign,
        target_audience=item_in.target_audience,
        current_status="SUBMITTED",
        creator_id=user.id
    )
    db.add(item)
    await db.flush()

    ver = ContentVersion(
        content_item_id=item.id,
        version_number=1,
        raw_text=item_in.raw_text,
        created_by_id=user.id
    )
    db.add(ver)

    audit = AuditEvent(
        organization_id=org.id,
        user_id=user.id,
        action_type="CONTENT_CREATED",
        entity_type="CONTENT_ITEM",
        entity_id=item.id,
        description=f"{user.full_name} created '{item.title}' (Version 1).",
        actor_name=user.full_name,
        actor_role=user.memberships[0].role if user.memberships else "CONTENT_CREATOR"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(item)
    return ContentItemResponse(
        id=item.id,
        organization_id=item.organization_id,
        title=item.title,
        content_type=item.content_type,
        campaign=item.campaign,
        target_audience=item.target_audience,
        current_status=item.current_status,
        creator_id=item.creator_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
        versions_count=1,
        latest_version=ContentVersionResponse(
            id=ver.id,
            content_item_id=item.id,
            version_number=ver.version_number,
            raw_text=ver.raw_text,
            parent_version_id=None,
            created_by_id=user.id,
            created_at=ver.created_at
        )
    )

@router.get("/items/{item_id}")
async def get_content_item_detail(
    item_id: str,
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ContentItem)
        .where(ContentItem.id == item_id, ContentItem.organization_id == org.id)
        .options(
            selectinload(ContentItem.versions).selectinload(ContentVersion.findings),
            selectinload(ContentItem.creator)
        )
    )
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    versions_data = []
    for v in item.versions:
        versions_data.append({
            "id": v.id,
            "version_number": v.version_number,
            "raw_text": v.raw_text,
            "parent_version_id": v.parent_version_id,
            "created_at": v.created_at.isoformat(),
            "findings_count": len(v.findings)
        })

    return {
        "id": item.id,
        "title": item.title,
        "content_type": item.content_type,
        "campaign": item.campaign,
        "target_audience": item.target_audience,
        "current_status": item.current_status,
        "creator": item.creator.full_name if item.creator else "Unknown",
        "created_at": item.created_at.isoformat(),
        "versions": versions_data
    }

@router.post("/items/{item_id}/versions", response_model=ContentVersionResponse)
async def create_revision(
    item_id: str,
    ver_in: ContentVersionCreate,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ContentItem)
        .where(ContentItem.id == item_id, ContentItem.organization_id == org.id)
        .options(selectinload(ContentItem.versions))
    )
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    new_version_num = len(item.versions) + 1
    parent_id = ver_in.parent_version_id or (item.versions[-1].id if item.versions else None)

    new_ver = ContentVersion(
        content_item_id=item.id,
        version_number=new_version_num,
        raw_text=ver_in.raw_text,
        parent_version_id=parent_id,
        created_by_id=user.id
    )
    db.add(new_ver)
    item.current_status = "RESUBMITTED"

    audit = AuditEvent(
        organization_id=org.id,
        user_id=user.id,
        action_type="CONTENT_REVISED",
        entity_type="CONTENT_VERSION",
        entity_id=item.id,
        description=f"{user.full_name} created revision v{new_version_num} for '{item.title}'.",
        details_json={"parent_version_id": parent_id},
        actor_name=user.full_name,
        actor_role=user.memberships[0].role if user.memberships else "CONTENT_CREATOR"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_ver)
    return new_ver

@router.get("/items/{item_id}/diff")
async def get_version_diff(
    item_id: str,
    v_base: int = Query(1, description="Base version number"),
    v_compare: int = Query(2, description="Comparison version number"),
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    """
    Review Diff Intelligence:
    Compares two versions, highlights inserted/removed chunks, and analyzes
    which findings were resolved vs remaining open.
    """
    res = await db.execute(
        select(ContentItem)
        .where(ContentItem.id == item_id, ContentItem.organization_id == org.id)
        .options(
            selectinload(ContentItem.versions).selectinload(ContentVersion.findings)
        )
    )
    item = res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Content item not found")

    ver_base = next((v for v in item.versions if v.version_number == v_base), None)
    ver_comp = next((v for v in item.versions if v.version_number == v_compare), None)

    if not ver_base or not ver_comp:
        raise HTTPException(status_code=400, detail="One or both version numbers not found")

    text_base = ver_base.raw_text
    text_comp = ver_comp.raw_text

    # Compute word/token differences
    base_words = text_base.split()
    comp_words = text_comp.split()

    matcher = difflib.SequenceMatcher(None, base_words, comp_words)
    diff_chunks = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            diff_chunks.append({"type": "unchanged", "text": " ".join(base_words[i1:i2])})
        elif tag == "insert":
            diff_chunks.append({"type": "inserted", "text": " ".join(comp_words[j1:j2])})
        elif tag == "delete":
            diff_chunks.append({"type": "removed", "text": " ".join(base_words[i1:i2])})
        elif tag == "replace":
            diff_chunks.append({"type": "removed", "text": " ".join(base_words[i1:i2])})
            diff_chunks.append({"type": "inserted", "text": " ".join(comp_words[j1:j2])})

    # Analyze which base findings appear to be resolved
    resolved_findings = []
    unresolved_findings = []

    for f in ver_base.findings:
        # If the affected passage is no longer present in compare text, it was likely edited/fixed
        if f.affected_passage and f.affected_passage.lower() not in text_comp.lower():
            resolved_findings.append({
                "finding_id": f.id,
                "category": f.category,
                "affected_passage": f.affected_passage,
                "explanation": f.explanation,
                "resolution_evidence": "Passage modified or replaced in new revision."
            })
        else:
            unresolved_findings.append({
                "finding_id": f.id,
                "category": f.category,
                "affected_passage": f.affected_passage,
                "explanation": f.explanation
            })

    return {
        "item_id": item.id,
        "title": item.title,
        "base_version": v_base,
        "compare_version": v_compare,
        "diff_chunks": diff_chunks,
        "resolved_findings": resolved_findings,
        "unresolved_findings": unresolved_findings,
        "resolved_count": len(resolved_findings),
        "unresolved_count": len(unresolved_findings)
    }
