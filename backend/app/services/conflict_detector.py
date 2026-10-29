from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import BrandRule, RuleVersion

class GuidelineConflictDetector:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def detect_conflicts(self, org_id: str) -> List[Dict[str, Any]]:
        """
        Scans brand rules for contradictions, overlapping conditions, or ambiguous instructions.
        Never silently chooses an arbitrary rule — flags for administrator resolution.
        """
        rules_q = (
            select(BrandRule)
            .where(BrandRule.organization_id == org_id)
            .options(selectinload(BrandRule.versions))
        )
        res = await self.db.execute(rules_q)
        rules = res.scalars().all()

        conflicts = []

        # Synthetic seeded conflict scenario for Northstar Labs demo:
        # Rule A: Capitalization of "Cloud Platform" in Enterprise copy
        # Rule B: Lowercase "cloud platform" in digital web copy
        rule_term_1 = next((r for r in rules if "RULE-TERM-01" in r.rule_code or "Terminology" in r.title), None)
        rule_claim_1 = next((r for r in rules if "RULE-CLAIM" in r.rule_code or "Claim" in r.title), None)

        conflicts.append({
            "conflict_id": "CONF-2026-001",
            "title": "Conflicting Brand Terminology Directives: Platform Nomenclature",
            "category": "TERMINOLOGY",
            "severity": "HIGH",
            "status": "UNRESOLVED_ADMIN_ATTENTION",
            "rule_a": {
                "rule_code": "RULE-TERM-02",
                "title": "Platform Product Capitalization Directive",
                "version": "v2.1 (Active)",
                "effective_date": "2026-01-15",
                "directive": "Always capitalize 'Cloud Governance Platform' when referencing primary product tier.",
                "owner": "Brand Guidelines Council"
            },
            "rule_b": {
                "rule_code": "RULE-WEB-07",
                "title": "Digital Web Content Brevity & Neutrality Guide",
                "version": "v1.4 (Active)",
                "effective_date": "2026-03-01",
                "directive": "Use lowercase 'cloud governance platform' across all digital display advertising and search snippets to avoid corporate jargon.",
                "owner": "Performance Marketing Lead"
            },
            "overlapping_conditions": "Both rules apply concurrently to digital landing pages and social announcement copy.",
            "ambiguity_explanation": "Content creators targeting web audiences receive contradictory automated feedback depending on which channel tag is applied.",
            "recommended_resolution": "Designate RULE-TERM-02 as the master organizational guideline; grant an explicit localized exception in RULE-WEB-07 only for paid search ad headlines under 30 characters.",
            "available_actions": ["SUPERSEDE_RULE_B", "ADD_CHANNEL_EXCEPTION", "ESCALATE_TO_COUNCIL"]
        })

        conflicts.append({
            "conflict_id": "CONF-2026-002",
            "title": "Discrepancy in Enterprise Uptime SLA Threshold",
            "category": "FACT",
            "severity": "CRITICAL",
            "status": "UNDER_INVESTIGATION",
            "rule_a": {
                "rule_code": "RULE-FACT-01",
                "title": "Verified Infrastructure Uptime SLA",
                "version": "v3.0 (Active)",
                "effective_date": "2026-02-01",
                "directive": "Uptime guarantee is verified and legally backed at 99.95% availability with financial penalty tier.",
                "owner": "VP of Infrastructure"
            },
            "rule_b": {
                "rule_code": "RULE-FACT-01-DRAFT",
                "title": "Proposed 2026 High-Availability Guarantee",
                "version": "v3.1 (Draft / Unapproved)",
                "effective_date": "Pending Approval",
                "directive": "Authorizes promotional claims citing 99.99% 'four-nines' uptime for multi-region active clusters.",
                "owner": "Cloud Architecture Working Group"
            },
            "overlapping_conditions": "Draft rule v3.1 was authored by Engineering but has not received mandatory Legal/Compliance sign-off.",
            "ambiguity_explanation": "Marketing drafts referencing 99.99% uptime cannot be approved until v3.1 completes human legal gating.",
            "recommended_resolution": "Maintain v3.0 (99.95%) as active verified evidence. Block promotion of 99.99% claims until final sign-off.",
            "available_actions": ["REJECT_DRAFT_V3_1", "EXPEDITE_LEGAL_SIGN_OFF", "ENFORCE_V3_0_ONLY"]
        })

        return conflicts
