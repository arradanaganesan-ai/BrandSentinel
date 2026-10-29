# BrandSentinel — Guided Demo Walkthrough & Evaluation Script

This guide outlines the 16-step scenario for evaluating BrandSentinel using the synthetic demo organization **"Northstar Labs"**.

---

## Pre-requisites & Quick Startup

```powershell
# 1. Start Backend (Terminal 1)
cd backend
venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 2. Start Frontend (Terminal 2)
cd frontend
npm run dev
```

Open browser at `http://localhost:5173`.

---

## 16-Step Guided Evaluation Scenario

### Step 1: Open Executive Overview
- **Action**: Examine the Executive Overview page.
- **Verification**: Notice the live Governance Health Score (88/100), Severity Mix donut, and 4-week category distribution charts.

### Step 2: Select Seeded Marketing Draft
- **Action**: Navigate to **Content Review Studio** via sidebar or click "Open Review Studio".
- **Verification**: The seeded draft **"Q1 Product Launch & Enterprise Announcement [Demo Draft]"** is loaded with version 1 selected.

### Step 3: Run Governance Review
- **Action**: Click the purple **"Run Governance Review"** button in the top action bar.
- **Verification**: The hybrid review engine executes in real-time, generating 5 structured findings across all core categories:
  1. **Claim Violation**: 98% productivity boost flagged as unsubstantiated.
  2. **Terminology**: "guaranteed results" flagged as prohibited.
  3. **Tone Mismatch**: "Crush your competitors" and clickbait superlatives flagged.
  4. **Outdated Fact**: Superseded "SOC 1 Type I" and "99.0% uptime" detected.
  5. **Accessibility / Compliance**: Missing regulatory attribution disclaimer detected.

### Step 4: Inspect Structured Findings & Ground-Truth Citations
- **Action**: Click any highlight in the center panel (e.g. "guaranteed results" or "98%").
- **Verification**: The right panel scrolls to the exact finding card, displaying:
  - Exact severity badge and calibrated confidence (`CALIBRATED_HIGH`)
  - Explanation citing corporate policy
  - Verbatim quotation from the source document (e.g. *Northstar Brand Voice Manual 2026* or *Product Security Specs*)

### Step 5: Open Claim DNA Inspector
- **Action**: Click **Claim DNA Inspector** on the sidebar.
- **Verification**: Inspect the atomic decomposition:
  - Subject: Enterprise Workflow Efficiency
  - Numerical Value: `98%`
  - Scope Gap: Draft asserts "every organization in 2 weeks" vs approved empirical study establishing "up to 34% for Fortune 500 enterprise tier".
  - Golden rule displayed: *"A source supports only the scope it actually establishes."*

### Step 6: Verify Knowledge Hub Sources
- **Action**: Click **Brand Knowledge Hub** on the sidebar.
- **Verification**: Switch tabs between Brand Rules, Source Documents, Approved Facts, Approved Claims, and Terminology to inspect the ground truth.

### Step 7: Accept Suggested Corrections in Review Studio
- **Action**: Return to **Content Review Studio**.
- **Verification**: Click **"Accept"** on the terminology finding ("guaranteed results" -> "systematically validated outcomes"). Observe the draft copy update automatically.

### Step 8: Save Revision v2 & Resubmit
- **Action**: Click **"Save Revision v2"**.
- **Verification**: BrandSentinel creates an immutable Revision 2 snapshot in the database.

### Step 9: Review Diff Intelligence
- **Action**: In the Center Panel, click the **"Review Diff Intelligence"** tab.
- **Verification**: View word-by-word inserted (green) and removed (red) diffs, along with automated detection of resolved findings.

### Step 10: Post Reviewer Collaboration Comment
- **Action**: In the right panel, switch to the **"Comments"** tab.
- **Verification**: Type a reviewer message (e.g., *"Legal review complete: revised 34% benchmark wording aligns with 2026 specs."*) and post it.

### Step 11: Approval Gate with Mandatory Rationale
- **Action**: In the top navigation user switcher, switch persona to **David Vance (Approver)**.
- **Action**: Navigate to **Approval Workspace** on sidebar.
- **Verification**: Enter decision rationale (*"Revision v2 resolves previous unverified claims and complies with 2026 benchmark specifications. Full sign-off granted."*) and click **"Grant Approval"**.
- **Verification**: The decision is recorded alongside an immutable snapshot of all active guideline versions.

### Step 12: Explore Brand Evidence Graph
- **Action**: Navigate to **Brand Evidence Graph** on sidebar.
- **Verification**: View interactive React Flow canvas tracing:
  `Brand Rule → Approved Fact → Content Claim → Finding → Decision`.
  Click any node to inspect live database metadata.

### Step 13: Explore Brand Drift Radar
- **Action**: Navigate to **Brand Drift Radar** on sidebar.
- **Verification**: View 4-week violation timeline line chart, override rates, and recurring problem patterns table.

### Step 14: Inspect Guideline Conflict Center
- **Action**: Navigate to **Guideline Conflict Center** on sidebar.
- **Verification**: View 2 active contradictory rules (Platform product capitalization and High-availability SLA discrepancy). Review the system administrator recommendation.

### Step 15: Inspect Risk Propagation Center
- **Action**: Navigate to **Risk Propagation Center** on sidebar.
- **Verification**: Trace how deprecating SOC 1 and upgrading the SLA to 99.95% flags 2 previously approved corporate documents. Click **"Request Re-Review"**.

### Step 16: Verify Immutable Audit Trail
- **Action**: Navigate to **Audit Trail** on sidebar.
- **Verification**: Review server-logged event stream capturing every user action, role, and payload. Click the code icon to inspect full JSON metadata.
