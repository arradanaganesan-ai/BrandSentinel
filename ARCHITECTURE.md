# BrandSentinel System Architecture & Design Specification

## 1. High-Level Architecture Overview

BrandSentinel is designed around the core principle:
> **"AI recommends. Evidence supports. Authorised humans decide."**

```
 ┌─────────────────────────────────────────────────────────────┐
 │                      React Frontend                         │
 │  (Tailwind CSS + shadcn/ui style + @xyflow/react + Recharts) │
 └──────────────┬───────────────────────────────▲──────────────┘
                │ HTTP / REST                   │ JSON & SSE
                ▼                               │
 ┌──────────────────────────────────────────────┴──────────────┐
 │                      FastAPI Backend                        │
 │  ┌────────────────────────────────────────────────────────┐ │
 │  │        Server-Side RBAC & Tenant Scoping Layer         │ │
 │  └────────────────────────────────────────────────────────┘ │
 │  ┌────────────────────────────────────────────────────────┐ │
 │  │                  Hybrid Review Engine                  │ │
 │  │  - Deterministic Rule Engine (Offsets, Phrases, Facts) │ │
 │  │  - Claim DNA Decomposition Inspector                   │ │
 │  │  - Tone & Semantic Guideline Verifier                  │ │
 │  │  - Ground-Truth Passage Linker (Zero Hallucination)    │ │
 │  └────────────────────────────────────────────────────────┘ │
 │  ┌────────────────────────────────────────────────────────┐ │
 │  │                 Intelligence Services                  │ │
 │  │  - Evidence Graph Builder (React Flow Graph)           │ │
 │  │  - Brand Drift Radar (Telemetry & Health Index)        │ │
 │  │  - Guideline Conflict Detector (Contradiction Engine)  │ │
 │  │  - Risk Propagation Engine (Cascade Analysis)          │ │
 │  │  - Visual Governance & WCAG 2.1 Luminance Engine       │ │
 │  └────────────────────────────────────────────────────────┘ │
 └──────────────────────────────┬──────────────────────────────┘
                                │ SQLAlchemy Async
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │               Asynchronous Storage Layer                    │
 │         (PostgreSQL in Docker / SQLite Async Local)         │
 └─────────────────────────────────────────────────────────────┘
```

---

## 2. Evidence Graph Topology

The evidence graph enforces bidirectional traceability across the governance lifecycle:

```
[Brand Rule (v1.0)] ────► [Approved Fact]
         │                       │
         ▼                       ▼
  [Finding Alert] ◄────── [Content Claim]
         │
         ▼
[Reviewer Decision (Mandatory Rationale + Rule Snapshot)]
```

Every node contains:
- Unique entity ID
- Effective timestamps
- Exact section code and verbatim passage text
- Confidence/verification status (`CALIBRATED_HIGH`, `UNCERTAIN_NEEDS_REVIEW`)

---

## 3. Claim DNA Decomposition Model

When a draft contains a marketing assertion, BrandSentinel decomposes it into 9 atomic parameters:
1. **Subject**: The core product, feature, or service under evaluation.
2. **Action / Benefit**: Asserted capability, turnaround reduction, or efficiency boost.
3. **Numerical Value**: Explicit metric (e.g. `98%`, `34%`, `10x`).
4. **Unit**: Metric unit (`%`, `seconds`, `multiple`).
5. **Comparison Baseline**: Evaluated reference standard (e.g. manual multi-stakeholder review).
6. **Time Period**: Evaluated duration (`90-day trial evaluation`, `2 weeks`).
7. **Target Audience**: Applicable customer tier (`Enterprise Tier`, `SMB`).
8. **Scope**: Organizational environment (`Fortune 500 multi-tenant`, `Universal`).
9. **Qualifiers**: Explicit conditions or restrictions established by empirical studies.

### Outcome Matrix
- `SUPPORTED`: Metric, scope, and timeline strictly align with approved empirical evidence.
- `PARTIALLY_SUPPORTED`: Claim is verified for a restricted segment, but overextended in copy.
- `CONFLICTING`: Metric directly contradicts active approved specifications.
- `UNVERIFIED`: Approved evidence not found in repository.
- `NEEDS_HUMAN_REVIEW`: Nuanced marketing phrasing requiring legal evaluation.

---

## 4. Visual Brand Governance & WCAG Calculation

The visual governance engine implements exact mathematical relative luminance pursuant to WCAG 2.1:

$$L = 0.2126 \times R_{\text{linear}} + 0.7152 \times G_{\text{linear}} + 0.0722 \times B_{\text{linear}}$$

Where:
$$C_{\text{linear}} = \begin{cases} 
\frac{C}{12.92} & \text{if } C \le 0.03928 \\
\left(\frac{C + 0.055}{1.055}\right)^{2.4} & \text{if } C > 0.03928 
\end{cases}$$

Contrast Ratio:
$$\text{Ratio} = \frac{\max(L_1, L_2) + 0.05}{\min(L_1, L_2) + 0.05}$$

- **WCAG AA Normal Text**: $\ge 4.5:1$
- **WCAG AA Large / Bold Text**: $\ge 3.0:1$
- **WCAG AAA Enhanced Normal Text**: $\ge 7.0:1$

---

## 5. Security & Tenant Isolation

- **Role-Based Access Control**: Server-enforced permissions (`CONTENT_CREATOR`, `BRAND_MANAGER`, `LEGAL_COMPLIANCE`, `APPROVER`, `ORG_ADMIN`).
- **Org Scoping**: All database queries filter on `organization_id` at the database level.
- **Append-Only Audit Trail**: Every submission, review execution, role modification, and approval decision is logged into `audit_events`.
- **Immutable Version Snapshots**: Approvals store a frozen snapshot of all active guideline versions and open findings at the exact moment of sign-off.
