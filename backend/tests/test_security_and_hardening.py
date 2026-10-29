import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base

@pytest.mark.asyncio
async def test_cross_org_isolation_and_rbac():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Reset to base Northstar demo state
        reset_res = await ac.post("/api/v1/demo/reset")
        assert reset_res.status_code == 200

        # Login as Creator (Org: Northstar Labs)
        creator_login = await ac.post("/api/v1/auth/login", json={
            "email": "creator@northstarlabs.internal",
            "password": "Northstar2026!"
        })
        assert creator_login.status_code == 200
        creator_token = creator_login.json()["access_token"]
        creator_headers = {"Authorization": f"Bearer {creator_token}"}

        # Login as Brand Manager
        mgr_login = await ac.post("/api/v1/auth/login", json={
            "email": "brand@northstarlabs.internal",
            "password": "Northstar2026!"
        })
        assert mgr_login.status_code == 200
        mgr_token = mgr_login.json()["access_token"]
        mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

        # 1. Test RBAC: Creator should NOT be permitted to create brand rules
        bad_rule_res = await ac.post("/api/v1/knowledge/rules", json={
            "rule_code": "SEC-TEST-001",
            "category": "TONE",
            "title": "Unauthorized Rule Creation",
            "description": "Creators cannot publish rules",
            "rule_type": "FORBIDDEN_PHRASE",
            "severity": "HIGH"
        }, headers=creator_headers)
        assert bad_rule_res.status_code == 403, "Creators must not be authorized to create brand rules"

        # 2. Test RBAC: Creator should NOT be permitted to approve content
        # Get content items
        items_res = await ac.get("/api/v1/content/items", headers=creator_headers)
        assert items_res.status_code == 200
        items = items_res.json()
        assert len(items) > 0
        v_id = items[0]["latest_version"]["id"]

        creator_approve_res = await ac.post(f"/api/v1/approvals/versions/{v_id}/decide", json={
            "decision": "APPROVED",
            "rationale": "Self-approving my own content without authority"
        }, headers=creator_headers)
        assert creator_approve_res.status_code == 403, "Content Creators cannot self-approve content"

        # 3. Test RBAC: Brand Manager CAN create rules
        good_rule_res = await ac.post("/api/v1/knowledge/rules", json={
            "rule_code": "TEST-RULE-001",
            "category": "TONE",
            "title": "Authorized Rule Creation",
            "description": "Brand Managers can publish brand rules",
            "rule_type": "FORBIDDEN_PHRASE",
            "severity": "MEDIUM"
        }, headers=mgr_headers)
        assert good_rule_res.status_code == 200
        created_rule = good_rule_res.json()
        assert created_rule["rule_code"] == "TEST-RULE-001"

@pytest.mark.asyncio
async def test_fact_superseding_and_re_review_workflow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post("/api/v1/demo/reset")

        # Login as Brand Manager
        mgr_login = await ac.post("/api/v1/auth/login", json={
            "email": "brand@northstarlabs.internal",
            "password": "Northstar2026!"
        })
        mgr_headers = {"Authorization": f"Bearer {mgr_login.json()['access_token']}"}

        # Fetch facts
        facts_res = await ac.get("/api/v1/knowledge/facts", headers=mgr_headers)
        assert facts_res.status_code == 200
        facts = facts_res.json()
        uptime_fact = next((f for f in facts if "99.95%" in f["object_value"]), facts[0])

        # Supersede the fact (e.g. 99.95% -> 99.99%)
        supersede_res = await ac.post(f"/api/v1/knowledge/facts/{uptime_fact['id']}/supersede", json={
            "new_fact_code": "FACT-UPTIME-2026-V2",
            "new_object_value": "99.99%",
            "change_rationale": "Infrastructure upgrade complete. SLA increased from 99.95% to 99.99% multi-region."
        }, headers=mgr_headers)
        assert supersede_res.status_code == 200
        new_fact = supersede_res.json()
        assert new_fact["object_value"] == "99.99%"
        assert new_fact["status"] == "ACTIVE"

        # Verify old fact is now SUPERSEDED
        refetched_facts = (await ac.get("/api/v1/knowledge/facts", headers=mgr_headers)).json()
        old_fact_refetch = next(f for f in refetched_facts if f["id"] == uptime_fact["id"])
        assert old_fact_refetch["status"] == "SUPERSEDED"
        assert old_fact_refetch["valid_until"] is not None

        # Check Risk Propagation center reflects affected materials
        risk_res = await ac.get("/api/v1/risk-propagation", headers=mgr_headers)
        assert risk_res.status_code == 200
        risk_data = risk_res.json()
        assert "affected_items" in risk_data
        assert risk_data["total_affected_assets"] >= 1

        # Request re-review on affected content
        if risk_data["affected_items"]:
            target_item_id = risk_data["affected_items"][0]["content_item_id"]
            re_review_res = await ac.post("/api/v1/risk-propagation/request-re-review", json={
                "content_item_id": target_item_id,
                "reason": "Uptime guarantee superseded to 99.99%; asset references obsolete 99.95%."
            }, headers=mgr_headers)
            assert re_review_res.status_code == 200
            assert re_review_res.json()["new_status"] == "CHANGES_REQUESTED"

        # Check audit trail records both actions
        audit_res = await ac.get("/api/v1/audit?limit=10", headers=mgr_headers)
        assert audit_res.status_code == 200
        actions = [a["action_type"] for a in audit_res.json()]
        assert "APPROVED_FACT_SUPERSEDED" in actions

@pytest.mark.asyncio
async def test_wcag_visual_contrast_engine():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # High contrast: Pure White on Pure Black (21.0:1)
        res_high = await ac.post("/api/v1/visual/contrast-check", json={
            "foreground_hex": "#FFFFFF",
            "background_hex": "#000000",
            "text_size_pt": 14.0,
            "is_bold": False
        })
        assert res_high.status_code == 200
        data_high = res_high.json()
        assert data_high["contrast_ratio"] == 21.0
        assert data_high["passes_wcag_aa_normal"] is True
        assert data_high["passes_wcag_aaa_normal"] is True

        # Low contrast: Dark gray on Black (failing)
        res_low = await ac.post("/api/v1/visual/contrast-check", json={
            "foreground_hex": "#333333",
            "background_hex": "#111111",
            "text_size_pt": 12.0,
            "is_bold": False
        })
        assert res_low.status_code == 200
        data_low = res_low.json()
        assert data_low["contrast_ratio"] < 3.0
        assert data_low["passes_wcag_aa_normal"] is False

@pytest.mark.asyncio
async def test_governance_gates_and_rationale_validation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.post("/api/v1/demo/reset")

        # Login as Approver
        approver_login = await ac.post("/api/v1/auth/login", json={
            "email": "approver@northstarlabs.internal",
            "password": "Northstar2026!"
        })
        assert approver_login.status_code == 200
        approver_headers = {"Authorization": f"Bearer {approver_login.json()['access_token']}"}

        # Get seeded draft content version
        items = (await ac.get("/api/v1/content/items", headers=approver_headers)).json()
        v_id = items[0]["latest_version"]["id"]

        # Run review to generate findings
        await ac.post(f"/api/v1/review/versions/{v_id}/execute", json={
            "analysis_mode": "HYBRID_AI_DETERMINISTIC"
        }, headers=approver_headers)

        # 1. Attempt approval with empty / short rationale (<10 chars)
        short_res = await ac.post(f"/api/v1/approvals/versions/{v_id}/decide", json={
            "decision": "APPROVED",
            "rationale": "ok"
        }, headers=approver_headers)
        assert short_res.status_code == 400
        assert "at least 10 characters" in short_res.json()["detail"]

        # 2. Attempt approval without addressing critical findings
        unresolved_res = await ac.post(f"/api/v1/approvals/versions/{v_id}/decide", json={
            "decision": "APPROVED",
            "rationale": "Looks good to me for release."
        }, headers=approver_headers)
        assert unresolved_res.status_code == 400
        assert "unresolved high/critical findings" in unresolved_res.json()["detail"]

        # 3. Request changes with valid rationale -> should succeed
        changes_res = await ac.post(f"/api/v1/approvals/versions/{v_id}/decide", json={
            "decision": "CHANGES_REQUESTED",
            "rationale": "Please resolve unverified 98% marketing claim and terminology violations before publication."
        }, headers=approver_headers)
        assert changes_res.status_code == 200
        assert changes_res.json()["decision"] == "CHANGES_REQUESTED"

        # 4. Check Decision Memory precedents endpoint
        precedents_res = await ac.get("/api/v1/precedents", headers=approver_headers)
        assert precedents_res.status_code == 200
        precedents = precedents_res.json()
        assert len(precedents) > 0
        assert any("CLAIM" in p["finding_category"] for p in precedents)

        # 5. Check Guideline Conflict Center endpoint
        conflicts_res = await ac.get("/api/v1/conflicts", headers=approver_headers)
        assert conflicts_res.status_code == 200
        conflicts = conflicts_res.json()
        assert len(conflicts) > 0

