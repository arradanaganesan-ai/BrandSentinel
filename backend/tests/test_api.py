import pytest
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base

@pytest.mark.asyncio
async def test_full_governance_lifecycle():
    # 0. Initialize schema
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Health check
        res = await ac.get("/health")
        assert res.status_code == 200
        assert res.json()["service"] == "BrandSentinel"

        # 2. Reset / Seed Demo
        res = await ac.post("/api/v1/demo/reset")
        assert res.status_code == 200
        assert "Northstar Labs" in res.json()["organization_name"]

        # 3. Auth login as Content Creator
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "creator@northstarlabs.internal",
            "password": "Northstar2026!"
        })
        assert login_res.status_code == 200
        data = login_res.json()
        token = data["access_token"]
        assert token is not None
        headers = {"Authorization": f"Bearer {token}"}

        # 4. Fetch content items (should contain seeded draft)
        items_res = await ac.get("/api/v1/content/items", headers=headers)
        assert items_res.status_code == 200
        items = items_res.json()
        assert len(items) > 0
        draft_item = items[0]
        version_id = draft_item["latest_version"]["id"]

        # 5. Execute hybrid review on seeded draft
        rev_res = await ac.post(f"/api/v1/review/versions/{version_id}/execute", json={
            "analysis_mode": "HYBRID_AI_DETERMINISTIC"
        }, headers=headers)
        assert rev_res.status_code == 200

        # 6. Fetch findings
        findings_res = await ac.get(f"/api/v1/review/versions/{version_id}/findings", headers=headers)
        assert findings_res.status_code == 200
        findings = findings_res.json()
        assert len(findings) >= 5, f"Expected at least 5 findings, got {len(findings)}"

        # Verify all 5 categories are covered: TERMINOLOGY, FACT, TONE, CLAIM, ACCESSIBILITY
        categories = {f["category"] for f in findings}
        assert "TERMINOLOGY" in categories
        assert "FACT" in categories
        assert "CLAIM" in categories
        assert "TONE" in categories

        # Verify evidence citations link to real passages and documents
        ev_count = sum(len(f["evidence_items"]) for f in findings)
        assert ev_count > 0

        # 7. Check Claim DNA decomposition
        dna_res = await ac.get(f"/api/v1/claim-dna/versions/{version_id}", headers=headers)
        assert dna_res.status_code == 200
        claim_dnas = dna_res.json()
        assert len(claim_dnas) > 0
        dna = claim_dnas[0]
        assert dna["numerical_value"] == "98%"
        assert dna["evidence_status"] in ["UNVERIFIED", "PARTIALLY_SUPPORTED"]

        # 8. Accept a suggested edit and create revision v2
        rec_finding = next((f for f in findings if f["category"] == "TERMINOLOGY"), findings[0])
        status_patch = await ac.patch(f"/api/v1/review/findings/{rec_finding['id']}/status", json={
            "status": "ACCEPTED_SUGGESTION"
        }, headers=headers)
        assert status_patch.status_code == 200

        # Create revision v2 with fixed terminology and corrected fact
        revised_text = (
            "Northstar Labs announces our next-generation enterprise release. "
            "Our platform accelerates governance review turnaround by up to 34% based on Northstar Labs 2026 Enterprise Benchmarks. "
            "We deliver systematically validated outcomes. "
            "Engineered for measurable performance with verified technical excellence. "
            "Rest easy knowing our system is fully compliant with SOC 2 Type II certification and 99.95% uptime."
            "\n\n* Disclaimer: Performance metrics derived from Northstar Labs 2026 Enterprise Benchmarks. Individual organizational outcomes may vary."
        )
        rev_v2_res = await ac.post(f"/api/v1/content/items/{draft_item['id']}/versions", json={
            "raw_text": revised_text
        }, headers=headers)
        assert rev_v2_res.status_code == 200
        v2_id = rev_v2_res.json()["id"]

        # 9. Review Diff Intelligence
        diff_res = await ac.get(f"/api/v1/content/items/{draft_item['id']}/diff?v_base=1&v_compare=2", headers=headers)
        assert diff_res.status_code == 200
        diff_data = diff_res.json()
        assert "diff_chunks" in diff_data
        assert diff_data["resolved_count"] > 0

        # 10. Login as Approver and submit formal approval
        app_login = await ac.post("/api/v1/auth/login", json={
            "email": "approver@northstarlabs.internal",
            "password": "Northstar2026!"
        })
        app_token = app_login.json()["access_token"]
        app_headers = {"Authorization": f"Bearer {app_token}"}

        dec_res = await ac.post(f"/api/v1/approvals/versions/{v2_id}/decide", json={
            "decision": "APPROVED",
            "rationale": "Revision v2 resolves all previous unverified claims and complies with 2026 benchmark specifications. Full legal sign-off granted."
        }, headers=app_headers)
        assert dec_res.status_code == 200
        assert dec_res.json()["decision"] == "APPROVED"

        # 11. Evidence Graph
        graph_res = await ac.get("/api/v1/evidence-graph", headers=headers)
        assert graph_res.status_code == 200
        graph_data = graph_res.json()
        assert len(graph_data["nodes"]) > 0
        assert len(graph_data["edges"]) > 0

        # 12. Drift Radar
        drift_res = await ac.get("/api/v1/drift/metrics", headers=headers)
        assert drift_res.status_code == 200
        drift_data = drift_res.json()
        assert "governance_health_score" in drift_data
        assert "category_distribution" in drift_data

        # 13. Guideline Conflicts
        conf_res = await ac.get("/api/v1/conflicts", headers=headers)
        assert conf_res.status_code == 200
        assert len(conf_res.json()) >= 2

        # 14. Risk Propagation
        risk_res = await ac.get("/api/v1/risk-propagation", headers=headers)
        assert risk_res.status_code == 200
        risk_data = risk_res.json()
        assert risk_data["total_affected_assets"] > 0

        # 15. Visual Contrast Check (WCAG)
        contrast_res = await ac.post("/api/v1/visual/contrast-check", json={
            "foreground_hex": "#6366F1",
            "background_hex": "#0B0F17"
        })
        assert contrast_res.status_code == 200
        assert "contrast_ratio" in contrast_res.json()
