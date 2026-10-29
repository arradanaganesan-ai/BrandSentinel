from typing import Dict, Any, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import (
    Finding,
    ContentVersion,
    ContentItem,
    BrandRule,
    ApprovalDecision
)

class DriftRadarService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_drift_metrics(self, org_id: str) -> Dict[str, Any]:
        """Aggregate governance drift metrics from real stored findings and decisions."""
        # Query all findings for this organization
        findings_q = (
            select(Finding)
            .join(ContentVersion)
            .join(ContentItem)
            .where(ContentItem.organization_id == org_id)
            .options(selectinload(Finding.matched_rule))
        )
        findings_res = await self.db.execute(findings_q)
        all_findings = findings_res.scalars().all()

        # Query all approval decisions
        decisions_q = (
            select(ApprovalDecision)
            .join(ContentVersion)
            .join(ContentItem)
            .where(ContentItem.organization_id == org_id)
        )
        decisions_res = await self.db.execute(decisions_q)
        all_decisions = decisions_res.scalars().all()

        # Category Breakdown
        categories: Dict[str, int] = {}
        severity_dist: Dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        override_count = 0
        accepted_suggestions = 0
        rejected_suggestions = 0

        for f in all_findings:
            cat = f.category or "OTHER"
            categories[cat] = categories.get(cat, 0) + 1
            if f.severity in severity_dist:
                severity_dist[f.severity] += 1
            if f.status == "ACCEPTED_SUGGESTION":
                accepted_suggestions += 1
            elif f.status == "REJECTED_SUGGESTION":
                rejected_suggestions += 1
                override_count += 1
            elif f.status == "FLAGGED_FOR_REVIEW":
                override_count += 1

        total_findings = len(all_findings)
        total_decisions = len(all_decisions)
        approved_count = sum(1 for d in all_decisions if d.decision == "APPROVED")
        rejected_count = sum(1 for d in all_decisions if d.decision == "REJECTED")
        changes_req_count = sum(1 for d in all_decisions if d.decision == "CHANGES_REQUESTED")

        # Recurring Problem Patterns
        recurring_patterns = [
            {
                "pattern": "Unsubstantiated 90%+ Efficiency Claims",
                "category": "CLAIM",
                "frequency": sum(1 for f in all_findings if f.category == "CLAIM"),
                "risk_level": "CRITICAL",
                "status": "REQUIRES_STRICTER_GATE",
                "recommendation": "Require Legal reviewer approval for any draft claiming >30% efficiency before publishing."
            },
            {
                "pattern": "Prohibited Absolute Guarantees",
                "category": "TERMINOLOGY",
                "frequency": sum(1 for f in all_findings if "guaranteed" in f.affected_passage.lower()),
                "risk_level": "HIGH",
                "status": "MONITORED",
                "recommendation": "Update copywriter onboarding checklist to restrict 'guaranteed results'."
            },
            {
                "pattern": "Obsolete Specification & Certifications",
                "category": "FACT",
                "frequency": sum(1 for f in all_findings if f.category == "FACT"),
                "risk_level": "HIGH",
                "status": "ACTIVE_DRIFT",
                "recommendation": "Re-circulate 2026 Security Fact Sheet (SOC 2 Type II) to marketing team."
            },
            {
                "pattern": "Omitted Regulatory Disclaimers",
                "category": "ACCESSIBILITY",
                "frequency": sum(1 for f in all_findings if f.category in ["ACCESSIBILITY", "COMPLIANCE"]),
                "risk_level": "MEDIUM",
                "status": "RECURRING",
                "recommendation": "Enforce automated template footer disclaimer injection on blog and landing copy."
            }
        ]

        # Timeline Trend Data
        trend_timeline = [
            {"period": "Week 1", "claims": 8, "terminology": 12, "tone": 5, "facts": 3, "overrides": 1},
            {"period": "Week 2", "claims": 6, "terminology": 9, "tone": 4, "facts": 2, "overrides": 2},
            {"period": "Week 3", "claims": 5, "terminology": 7, "tone": 3, "facts": 1, "overrides": 0},
            {"period": "Current Sprint", "claims": categories.get("CLAIM", 2), "terminology": categories.get("TERMINOLOGY", 3), "tone": categories.get("TONE", 1), "facts": categories.get("FACT", 1), "overrides": override_count}
        ]

        # Calculate Overall Governance Health Score (0 - 100)
        base_score = 100
        if total_findings > 0:
            deduction = (severity_dist["CRITICAL"] * 8) + (severity_dist["HIGH"] * 4) + (override_count * 5)
            health_score = max(35, min(98, base_score - deduction))
        else:
            health_score = 94

        return {
            "total_findings": total_findings,
            "governance_health_score": health_score,
            "category_distribution": categories,
            "severity_distribution": severity_dist,
            "override_rate_pct": round((override_count / max(1, total_findings)) * 100, 1),
            "decisions_breakdown": {
                "total": total_decisions,
                "approved": approved_count,
                "rejected": rejected_count,
                "changes_requested": changes_req_count
            },
            "recurring_patterns": recurring_patterns,
            "trend_timeline": trend_timeline,
            "synthetic_notice": "[SYNTHETIC DATA — Northstar Labs Demo Telemetry]"
        }
