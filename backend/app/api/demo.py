from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.seed_service import seed_northstar_demo

router = APIRouter(prefix="/demo", tags=["Demo Mode"])

@router.post("/reset")
async def reset_demo_data(db: AsyncSession = Depends(get_db)):
    """
    Resets the fictional Northstar Labs demo organization and re-seeds
    all source documents, rules, facts, claims, and the 5-issue marketing draft.
    """
    org = await seed_northstar_demo(db)
    return {
        "status": "success",
        "message": "Northstar Labs demo data reset successfully.",
        "organization_id": org.id,
        "organization_name": org.name,
        "label": "[SYNTHETIC DEMO DATA — Northstar Labs]"
    }

@router.get("/scenario")
async def get_demo_scenario():
    """Returns the guided 16-step demo walkthrough for hackathon judges."""
    return {
        "title": "BrandSentinel Master Hackathon Demonstration",
        "organization": "Northstar Labs [Fictional Demo]",
        "core_principle": "AI recommends. Evidence supports. Authorised humans decide.",
        "steps": [
            {"step": 1, "action": "Open Executive Overview", "description": "Inspect live governance health score, category breakdown and active review queue."},
            {"step": 2, "action": "Select Seeded Draft", "description": "Open 'Q1 Product Launch & Enterprise Announcement [Demo Draft]' in Content Review Studio."},
            {"step": 3, "action": "Run Governance Review", "description": "Trigger hybrid deterministic and Claim DNA review engine."},
            {"step": 4, "action": "Inspect 5 Structured Findings", "description": "Verify affected passages, severity levels, rule citations, and calibrated confidence."},
            {"step": 5, "action": "Open Claim DNA Inspector", "description": "Decompose the 98% productivity claim into Subject, Baseline, Scope, and missing qualifiers."},
            {"step": 6, "action": "Inspect Ground-Truth Citations", "description": "Examine verbatim quotes from 'Benchmark Study 2026' and 'Security Spec Q1 2026'."},
            {"step": 7, "action": "Accept Suggested Corrections", "description": "Replace 'guaranteed results' with 'systematically validated outcomes' and update outdated SOC 1 to SOC 2 Type II."},
            {"step": 8, "action": "Create Revision & Resubmit", "description": "Save revised version 2 with safer wording."},
            {"step": 9, "action": "Review Diff Intelligence", "description": "Open the interactive Diff tab to see resolved findings and unchanged text."},
            {"step": 10, "action": "Post Reviewer Comment", "description": "Simulate Legal reviewer Sarah Jenkins approving the benchmark scope."},
            {"step": 11, "action": "Formal Approval with Mandatory Rationale", "description": "Approver David Vance signs off with immutable rule and finding snapshots."},
            {"step": 12, "action": "Open Brand Evidence Graph", "description": "Trace visual graph: Brand Rule → Approved Fact → Content Claim → Finding → Decision."},
            {"step": 13, "action": "Explore Brand Drift Radar", "description": "Analyze recurring patterns, rule health index, and override rates."},
            {"step": 14, "action": "Inspect Guideline Conflict Center", "description": "Examine conflicting rules for platform nomenclature and high-availability SLA."},
            {"step": 15, "action": "Inspect Risk Propagation Center", "description": "See how retiring SOC 1 and upgrading SLA flags 2 previously approved corporate documents."},
            {"step": 16, "action": "Verify Immutable Audit Trail", "description": "Review server-enforced event log capturing every timestamp, actor, and payload."}
        ]
    }
