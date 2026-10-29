# BrandSentinel — Build & Implementation Status

**Platform**: Evidence-Backed Brand Governance Intelligence Platform  
**Architecture**: FastAPI (Python 3.12, async SQLAlchemy, SQLite/PostgreSQL) + React (TypeScript, Vite, Tailwind CSS, @xyflow/react, Recharts)  
**Status Date**: 2026-10-28  

---

## 1. Executive Summary & Verification

BrandSentinel is a complete, working pre-publication governance intelligence platform built under the guiding principle:
> **"AI recommends. Evidence supports. Authorised humans decide."**

### Verification Checkpoint
- **Backend Test Suite**: `tests/test_api.py::test_full_governance_lifecycle` **PASSED [100%]**
- **Lifecycle Tested**: Health check → Demo Seed & Reset → Multi-role Auth → Content Submission → Hybrid Review Execution → 5 Structured Findings & Ground-Truth Citations → Claim DNA Decomposition → Suggested Edits Applied → Immutable Revision v2 Creation → Word/Token Diff Intelligence → Formal Approval with Rationale & Guideline Snapshot → Evidence Graph → Drift Radar → Guideline Conflict Detector → Risk Propagation Center → WCAG Contrast Verification.

---

## 2. Completed Features

### Core Brand Governance
1. **Hybrid Review Engine (`app/services/review_engine.py`)**:
   - Working deterministic checks: forbidden phrases, preferred terminology substitutions, deprecated specifications, mandatory disclaimers.
   - AI-assisted checks: tone consistency against brand profile voice, Claim DNA decomposition, semantic guideline matching.
   - Server-side character offset calculation and passage attribution.
   - Calibrated uncertainty labels (`CALIBRATED_HIGH`, `UNCERTAIN_NEEDS_REVIEW`).
   - Zero citation hallucination: all evidence links validate against database-stored `SourcePassage` records.

2. **Claim DNA Decomposition (`app/models/entities.py`, `app/api/claim_dna.py`)**:
   - Decomposes marketing assertions into: Subject, Action/Benefit, Numerical value, Unit, Baseline, Timeline, Target audience, Scope, Qualifiers.
   - Evidence status evaluation: `SUPPORTED`, `PARTIALLY_SUPPORTED`, `CONFLICTING`, `UNVERIFIED`, `NEEDS_HUMAN_REVIEW`.
   - Identification of missing qualifiers (e.g. unsegmented market claim vs. Fortune 500 benchmark).
   - Generates safer alternative wording.

3. **Brand Knowledge Hub (`app/api/knowledge.py`)**:
   - Ingestion of source documents and section-coded passages (`SourceDocument`, `SourcePassage`).
   - Immutable versioned brand rules (`BrandRule`, `RuleVersion`). Publishing a rule change generates a new version snapshot without overwriting history.
   - Approved facts registry (`ApprovedFact`) with active and superseded states.
   - Approved promotional claims registry (`ApprovedClaim`).
   - Terminology dictionary (`TerminologyEntry`).

4. **Review Studio & Diff Intelligence (`app/api/content.py`, `app/api/review.py`)**:
   - Three-panel review workspace (Metadata & Policy / Center Document & Diff / Right Findings & Comments).
   - Inline marker highlights linked to structured finding cards.
   - Suggested edit acceptance and rejection.
   - Word-by-word revision diff engine (`difflib.SequenceMatcher`).
   - Automated detection of resolved vs remaining issues across revisions.

5. **Human Approval Workflow (`app/api/approvals.py`)**:
   - Server-enforced role gating (only `APPROVER`, `LEGAL_COMPLIANCE`, or `ORG_ADMIN` can sign off).
   - Mandatory decision rationale (minimum length and high-risk finding justification).
   - Immutable snapshot of active guideline versions and findings summary at the moment of approval.
   - Revision creation invalidates prior approval for modified text.

6. **Differentiator Modules**:
   - **Brand Evidence Graph (`app/services/evidence_graph.py`)**: Graph structure tracing Rule → Fact → Claim → Finding → Decision.
   - **Brand Drift Radar (`app/services/drift_radar.py`)**: Telemetry on override rates, category distributions, recurring problem patterns, and rule health.
   - **Guideline Conflict Center (`app/services/conflict_detector.py`)**: Detects active guideline contradictions with administrator resolution recommendations.
   - **Decision Memory (`app/api/precedents.py`)**: Searchable precedent history with past decisions, reviewer rationale, and applicability warnings.
   - **Risk Propagation Center (`app/services/risk_propagation.py`)**: Identifies historical approved assets affected by superseded facts or modified specifications.
   - **Visual Brand Governance (`app/services/visual_governance.py`)**: WCAG 2.1 mathematical contrast ratio calculation (AA 4.5:1 / AAA 7:1) using relative luminance; Pillow-based dominant color extraction and brand palette alignment.
   - **Audit Trail (`app/api/audit.py`)**: Server-enforced tamper-evident audit logging for all critical operations.

7. **Synthetic Demo Experience ("Northstar Labs")**:
   - Fictional organisation with brand pack, voice manual, specs, benchmarks, and 5 demo user personas across all RBAC roles.
   - Seeded marketing draft containing 5 deliberate infractions (unsupported claim, forbidden phrase, clickbait tone, outdated SOC 1 fact, missing disclaimer).
   - Reproducible `/api/v1/demo/reset` endpoint.
   - 16-step guided judge demonstration tour.

---

## 3. Known Bugs & Resolved Fixes

| Issue | Root Cause | Status | Resolution |
|---|---|---|---|
| Windows C-Extension DLL Block | AppLocker / Application Control policy blocked compiled `.pyd` DLLs inside virtual environment | Resolved | Set `DISABLE_SQLALCHEMY_CEXT="1"` in `app/__init__.py` and `app/main.py` for clean pure-python execution |
| Missing `greenlet` & `email-validator` | Dependencies required for async SQLAlchemy and Pydantic `EmailStr` | Resolved | Installed and locked in `requirements.txt` |
| Numerical Claim Regex non-match | Regex used `\b` after `%` (`\d+%\b`), but `%` is non-word character | Resolved | Updated pattern to `\b\d+%(?:[^.?!;\n]*?[.?!])?` with distinct group capture |
| AuditEvent Missing `entity_id` | `db.flush()` needed to populate UUID primary key before logging audit event | Resolved | Added explicit `await db.flush()` prior to creating `AuditEvent` |
| Missing import in `evidence_graph.py` | `FindingEvidence` was referenced without explicit import | Resolved | Added `FindingEvidence` to imports |

---

## 4. Next Priorities (Current Milestone)

1. Complete remaining frontend pages in `frontend/src/pages/`:
   - `KnowledgeHubPage.tsx`
   - `EvidenceGraphPage.tsx` (with React Flow canvas)
   - `DriftRadarPage.tsx`
   - `ConflictCenterPage.tsx`
   - `DecisionMemoryPage.tsx`
   - `RiskPropagationPage.tsx`
   - `ApprovalWorkspacePage.tsx`
   - `ReviewQueuePage.tsx`
   - `AuditTrailPage.tsx`
   - `TeamPermissionsPage.tsx`
   - `SettingsPage.tsx`
2. Complete `frontend/src/App.tsx` and `frontend/src/main.tsx` tying all 14 modules together with routing and demo user simulation.
3. Validate full frontend build via `npm run build`.
4. Provide comprehensive README.md and startup documentation.
