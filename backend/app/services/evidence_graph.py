from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import (
    BrandRule,
    ApprovedFact,
    Finding,
    FindingEvidence,
    ClaimDNA,
    ApprovalDecision,
    SourcePassage,
    ContentVersion
)

class EvidenceGraphService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def build_graph(self, org_id: str, content_version_id: str = None) -> Dict[str, Any]:
        """
        Builds an evidence-backed relationship graph:
        Brand Rule -> Approved Fact -> Content Claim -> Finding -> Reviewer Decision.
        """
        nodes = []
        edges = []

        # 1. Fetch Brand Rules
        rules_q = select(BrandRule).where(BrandRule.organization_id == org_id)
        rules_res = await self.db.execute(rules_q)
        rules = rules_res.scalars().all()

        for idx, rule in enumerate(rules):
            nodes.append({
                "id": f"rule-{rule.id}",
                "type": "brandRuleNode",
                "position": {"x": 50, "y": 80 + idx * 140},
                "data": {
                    "code": rule.rule_code,
                    "title": rule.title,
                    "category": rule.category,
                    "severity": rule.severity,
                    "version": rule.current_version,
                    "status": rule.status,
                    "type": "Brand Rule"
                }
            })

        # 2. Fetch Approved Facts
        facts_q = select(ApprovedFact).where(ApprovedFact.organization_id == org_id)
        facts_res = await self.db.execute(facts_q)
        facts = facts_res.scalars().all()

        for idx, fact in enumerate(facts):
            nodes.append({
                "id": f"fact-{fact.id}",
                "type": "approvedFactNode",
                "position": {"x": 380, "y": 80 + idx * 140},
                "data": {
                    "code": fact.fact_code,
                    "subject": fact.subject,
                    "predicate": fact.predicate,
                    "object_value": fact.object_value,
                    "status": fact.status,
                    "confidence": fact.confidence_status,
                    "type": "Approved Fact"
                }
            })

            # Edge from Rule to Fact if categories align
            matching_rule = next((r for r in rules if r.category == "FACT" or fact.predicate.lower() in r.title.lower()), None)
            if matching_rule:
                edges.append({
                    "id": f"e-rule-fact-{matching_rule.id}-{fact.id}",
                    "source": f"rule-{matching_rule.id}",
                    "target": f"fact-{fact.id}",
                    "animated": fact.status == "ACTIVE",
                    "style": {"stroke": "#10B981" if fact.status == "ACTIVE" else "#EF4444"}
                })

        # 3. Fetch Findings & Claim DNAs
        findings_q = select(Finding).join(ContentVersion)
        if content_version_id:
            findings_q = findings_q.where(Finding.content_version_id == content_version_id)
        findings_q = findings_q.options(
            selectinload(Finding.evidence_items).selectinload(FindingEvidence.source_passage),
            selectinload(Finding.matched_rule)
        )
        findings_res = await self.db.execute(findings_q)
        findings = findings_res.scalars().all()

        for idx, f in enumerate(findings):
            nodes.append({
                "id": f"finding-{f.id}",
                "type": "findingNode",
                "position": {"x": 720, "y": 60 + idx * 120},
                "data": {
                    "id": f.id,
                    "category": f.category,
                    "severity": f.severity,
                    "passage": f.affected_passage[:80],
                    "evidence_status": f.evidence_status,
                    "finding_type": f.finding_type,
                    "status": f.status,
                    "type": "Governance Finding"
                }
            })

            # Edge from Rule to Finding
            if f.matched_rule_id:
                edges.append({
                    "id": f"e-rule-finding-{f.matched_rule_id}-{f.id}",
                    "source": f"rule-{f.matched_rule_id}",
                    "target": f"finding-{f.id}",
                    "label": f.category,
                    "style": {"stroke": "#F59E0B" if f.severity in ["HIGH", "CRITICAL"] else "#6366F1"}
                })

        # 4. Fetch Claim DNAs
        claims_q = select(ClaimDNA)
        if content_version_id:
            claims_q = claims_q.where(ClaimDNA.content_version_id == content_version_id)
        claims_res = await self.db.execute(claims_q)
        claims = claims_res.scalars().all()

        for idx, c in enumerate(claims):
            nodes.append({
                "id": f"claim-{c.id}",
                "type": "claimDnaNode",
                "position": {"x": 1050, "y": 80 + idx * 160},
                "data": {
                    "claim": c.original_claim[:70],
                    "metric": c.numerical_value,
                    "scope": c.scope,
                    "status": c.evidence_status,
                    "safer": c.suggested_safer_wording[:60] if c.suggested_safer_wording else None,
                    "type": "Claim DNA"
                }
            })

            if c.finding_id:
                edges.append({
                    "id": f"e-finding-claim-{c.finding_id}-{c.id}",
                    "source": f"finding-{c.finding_id}",
                    "target": f"claim-{c.id}",
                    "animated": True,
                    "style": {"stroke": "#EC4899"}
                })

        # 5. Fetch Approval Decisions
        decisions_q = select(ApprovalDecision)
        if content_version_id:
            decisions_q = decisions_q.where(ApprovalDecision.content_version_id == content_version_id)
        decisions_res = await self.db.execute(decisions_q)
        decisions = decisions_res.scalars().all()

        for idx, d in enumerate(decisions):
            nodes.append({
                "id": f"decision-{d.id}",
                "type": "decisionNode",
                "position": {"x": 1380, "y": 100 + idx * 150},
                "data": {
                    "decision": d.decision,
                    "rationale": d.rationale[:80],
                    "timestamp": d.timestamp.isoformat() if d.timestamp else None,
                    "type": "Authorised Decision"
                }
            })

            # Edge from finding or claim to decision
            if findings:
                edges.append({
                    "id": f"e-finding-dec-{findings[0].id}-{d.id}",
                    "source": f"finding-{findings[0].id}",
                    "target": f"decision-{d.id}",
                    "style": {"stroke": "#10B981" if d.decision == "APPROVED" else "#EF4444"}
                })

        return {
            "nodes": nodes,
            "edges": edges,
            "summary": {
                "rules_count": len(rules),
                "facts_count": len(facts),
                "findings_count": len(findings),
                "claims_count": len(claims),
                "decisions_count": len(decisions)
            }
        }
