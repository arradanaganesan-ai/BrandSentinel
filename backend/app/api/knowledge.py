from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.entities import (
    Organization,
    User,
    SourceDocument,
    SourcePassage,
    BrandRule,
    RuleVersion,
    ApprovedFact,
    ApprovedClaim,
    TerminologyEntry,
    AuditEvent
)
from app.schemas.schemas import (
    SourceDocumentResponse,
    SourceDocumentCreate,
    BrandRuleResponse,
    BrandRuleCreate,
    BrandRuleUpdate,
    ApprovedFactResponse,
    ApprovedFactCreate,
    FactSupersedeRequest,
    ApprovedClaimResponse,
    ApprovedClaimCreate,
    TerminologyEntryResponse,
    TerminologyEntryCreate
)
from app.api.deps import get_current_user, get_current_organization, require_roles

router = APIRouter(prefix="/knowledge", tags=["Brand Knowledge Hub"])

# --- Source Documents ---
@router.get("/sources", response_model=List[SourceDocumentResponse])
async def list_sources(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(SourceDocument)
        .where(SourceDocument.organization_id == org.id)
        .options(selectinload(SourceDocument.passages))
    )
    return res.scalars().all()

@router.post("/sources", response_model=SourceDocumentResponse)
async def create_source_document(
    doc_in: SourceDocumentCreate,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(require_roles(["BRAND_MANAGER", "ORG_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    doc = SourceDocument(
        organization_id=org.id,
        title=doc_in.title,
        doc_type=doc_in.doc_type,
        version=doc_in.version,
        owner=doc_in.owner,
        status="ACTIVE"
    )
    db.add(doc)
    await db.flush()

    for idx, p_data in enumerate(doc_in.passages):
        passage = SourcePassage(
            document_id=doc.id,
            passage_number=idx + 1,
            heading=p_data.get("heading", f"Section {idx+1}"),
            section_code=p_data.get("section_code", f"SEC-{idx+1}"),
            content=p_data.get("content", ""),
            metadata_json=p_data.get("metadata", {})
        )
        db.add(passage)

    audit = AuditEvent(
        organization_id=org.id,
        user_id=user.id,
        action_type="SOURCE_DOCUMENT_CREATED",
        entity_type="SOURCE_DOCUMENT",
        entity_id=doc.id,
        description=f"{user.full_name} ingested brand source '{doc.title}' ({doc.version}) with {len(doc_in.passages)} passages.",
        actor_name=user.full_name,
        actor_role=user.memberships[0].role if user.memberships else "BRAND_MANAGER"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(doc)
    return doc

# --- Brand Rules ---
@router.get("/rules", response_model=List[BrandRuleResponse])
async def list_brand_rules(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(BrandRule)
        .where(BrandRule.organization_id == org.id)
        .options(selectinload(BrandRule.versions))
    )
    return res.scalars().all()

@router.post("/rules", response_model=BrandRuleResponse)
async def create_brand_rule(
    rule_in: BrandRuleCreate,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(require_roles(["BRAND_MANAGER", "ORG_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    rule = BrandRule(
        organization_id=org.id,
        rule_code=rule_in.rule_code,
        category=rule_in.category,
        title=rule_in.title,
        description=rule_in.description,
        rule_type=rule_in.rule_type,
        severity=rule_in.severity,
        owner=rule_in.owner,
        status="ACTIVE",
        current_version="1.0.0"
    )
    db.add(rule)
    await db.flush()

    rv = RuleVersion(
        rule_id=rule.id,
        version_number="1.0.0",
        title=rule.title,
        description=rule.description,
        config_json=rule_in.config_json,
        source_passage_id=rule_in.source_passage_id,
        change_rationale="Initial approved baseline rule.",
        author=user.full_name,
        approved_by=user.full_name
    )
    db.add(rv)

    audit = AuditEvent(
        organization_id=org.id,
        user_id=user.id,
        action_type="BRAND_RULE_CREATED",
        entity_type="BRAND_RULE",
        entity_id=rule.id,
        description=f"{user.full_name} created brand rule {rule.rule_code}: '{rule.title}'.",
        actor_name=user.full_name,
        actor_role="BRAND_MANAGER"
    )
    db.add(audit)

    await db.commit()
    res = await db.execute(
        select(BrandRule)
        .where(BrandRule.id == rule.id)
        .options(selectinload(BrandRule.versions))
    )
    return res.scalars().first()

@router.patch("/rules/{rule_id}", response_model=BrandRuleResponse)
async def update_brand_rule(
    rule_id: str,
    rule_update: BrandRuleUpdate,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(require_roles(["BRAND_MANAGER", "ORG_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(BrandRule)
        .where(BrandRule.id == rule_id, BrandRule.organization_id == org.id)
        .options(selectinload(BrandRule.versions))
    )
    rule = res.scalars().first()
    if not rule:
        raise HTTPException(status_code=404, detail="Brand rule not found")

    # Increment version, e.g. 1.0.0 -> 1.1.0
    cur_parts = rule.current_version.split(".")
    major, minor, patch = int(cur_parts[0]), int(cur_parts[1]), int(cur_parts[2])
    new_version_str = f"{major}.{minor + 1}.0"
    rule.current_version = new_version_str

    if rule_update.title:
        rule.title = rule_update.title
    if rule_update.description:
        rule.description = rule_update.description
    if rule_update.severity:
        rule.severity = rule_update.severity
    if rule_update.status:
        rule.status = rule_update.status

    # Always create an immutable RuleVersion snapshot
    rv = RuleVersion(
        rule_id=rule.id,
        version_number=new_version_str,
        title=rule.title,
        description=rule.description,
        config_json=rule_update.config_json or {},
        change_rationale=rule_update.change_rationale or f"Updated by {user.full_name}",
        author=user.full_name,
        approved_by=user.full_name
    )
    db.add(rv)

    audit = AuditEvent(
        organization_id=org.id,
        user_id=user.id,
        action_type="RULE_VERSION_PUBLISHED",
        entity_type="BRAND_RULE",
        entity_id=rule.id,
        description=f"{user.full_name} published rule {rule.rule_code} version {new_version_str}.",
        details_json={"rationale": rule_update.change_rationale},
        actor_name=user.full_name,
        actor_role="BRAND_MANAGER"
    )
    db.add(audit)

    await db.commit()
    res = await db.execute(
        select(BrandRule)
        .where(BrandRule.id == rule.id)
        .options(selectinload(BrandRule.versions))
    )
    return res.scalars().first()

# --- Facts, Claims, Terminology ---
@router.get("/facts", response_model=List[ApprovedFactResponse])
async def list_facts(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(ApprovedFact).where(ApprovedFact.organization_id == org.id))
    return res.scalars().all()

@router.post("/facts", response_model=ApprovedFactResponse)
async def create_fact(
    fact_in: ApprovedFactCreate,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(require_roles(["BRAND_MANAGER", "ORG_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    fact = ApprovedFact(
        organization_id=org.id,
        fact_code=fact_in.fact_code,
        subject=fact_in.subject,
        predicate=fact_in.predicate,
        object_value=fact_in.object_value,
        unit=fact_in.unit,
        status=fact_in.status,
        source_passage_id=fact_in.source_passage_id,
        confidence_status="VERIFIED"
    )
    db.add(fact)
    await db.commit()
    await db.refresh(fact)
    return fact

@router.post("/facts/{fact_id}/supersede", response_model=ApprovedFactResponse)
async def supersede_fact(
    fact_id: str,
    supersede_in: FactSupersedeRequest,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(require_roles(["BRAND_MANAGER", "ORG_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(ApprovedFact).where(
            ApprovedFact.id == fact_id,
            ApprovedFact.organization_id == org.id
        )
    )
    existing_fact = res.scalars().first()
    if not existing_fact:
        raise HTTPException(status_code=404, detail="Approved fact not found")

    now = datetime.now(timezone.utc)
    existing_fact.status = "SUPERSEDED"
    existing_fact.valid_until = now

    new_code = supersede_in.new_fact_code or f"{existing_fact.fact_code}-v2"
    new_fact = ApprovedFact(
        organization_id=org.id,
        fact_code=new_code,
        subject=existing_fact.subject,
        predicate=existing_fact.predicate,
        object_value=supersede_in.new_object_value,
        unit=supersede_in.unit or existing_fact.unit,
        valid_from=now,
        status="ACTIVE",
        source_passage_id=supersede_in.new_source_passage_id or existing_fact.source_passage_id,
        confidence_status="VERIFIED"
    )
    db.add(new_fact)
    await db.flush()

    audit = AuditEvent(
        organization_id=org.id,
        user_id=user.id,
        action_type="APPROVED_FACT_SUPERSEDED",
        entity_type="APPROVED_FACT",
        entity_id=new_fact.id,
        description=f"{user.full_name} superseded fact {existing_fact.fact_code}: changed value from '{existing_fact.object_value}' to '{new_fact.object_value}'. Rationale: {supersede_in.change_rationale}",
        details_json={
            "old_fact_id": existing_fact.id,
            "old_fact_code": existing_fact.fact_code,
            "old_value": existing_fact.object_value,
            "new_fact_id": new_fact.id,
            "new_fact_code": new_fact.fact_code,
            "new_value": new_fact.object_value,
            "change_rationale": supersede_in.change_rationale
        },
        actor_name=user.full_name,
        actor_role="BRAND_MANAGER"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_fact)
    return new_fact

@router.get("/claims", response_model=List[ApprovedClaimResponse])
async def list_approved_claims(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(ApprovedClaim).where(ApprovedClaim.organization_id == org.id))
    return res.scalars().all()

@router.post("/claims", response_model=ApprovedClaimResponse)
async def create_approved_claim(
    claim_in: ApprovedClaimCreate,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(require_roles(["BRAND_MANAGER", "LEGAL_COMPLIANCE", "ORG_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    claim = ApprovedClaim(
        organization_id=org.id,
        claim_code=claim_in.claim_code,
        claim_text=claim_in.claim_text,
        decomposed_dna=claim_in.decomposed_dna,
        safe_wording=claim_in.safe_wording,
        source_passage_id=claim_in.source_passage_id,
        status="ACTIVE"
    )
    db.add(claim)
    await db.commit()
    await db.refresh(claim)
    return claim

@router.get("/terminology", response_model=List[TerminologyEntryResponse])
async def list_terminology(
    org: Organization = Depends(get_current_organization),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(TerminologyEntry).where(TerminologyEntry.organization_id == org.id))
    return res.scalars().all()

@router.post("/terminology", response_model=TerminologyEntryResponse)
async def create_terminology(
    term_in: TerminologyEntryCreate,
    org: Organization = Depends(get_current_organization),
    user: User = Depends(require_roles(["BRAND_MANAGER", "ORG_ADMIN"])),
    db: AsyncSession = Depends(get_db)
):
    entry = TerminologyEntry(
        organization_id=org.id,
        forbidden_term=term_in.forbidden_term,
        preferred_term=term_in.preferred_term,
        context_notes=term_in.context_notes,
        category=term_in.category,
        severity=term_in.severity,
        source_passage_id=term_in.source_passage_id,
        status="ACTIVE"
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
