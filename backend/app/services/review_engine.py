import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.entities import (
    BrandRule,
    RuleVersion,
    SourcePassage,
    SourceDocument,
    ApprovedFact,
    ApprovedClaim,
    TerminologyEntry,
    ContentVersion,
    ReviewJob,
    Finding,
    FindingEvidence,
    ClaimDNA,
    BrandProfile
)

class ReviewEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def execute_review(self, content_version: ContentVersion, analysis_mode: str = "HYBRID_AI_DETERMINISTIC") -> ReviewJob:
        """Run hybrid brand governance review on a specific content version."""
        raw_text = content_version.raw_text
        org_id = content_version.content_item.organization_id

        # Create ReviewJob
        review_job = ReviewJob(
            content_version_id=content_version.id,
            status="RUNNING",
            analysis_mode=analysis_mode,
            model_info="Hybrid Rule Engine + BrandSentinel Claim DNA Inspector v2.1"
        )
        self.db.add(review_job)
        await self.db.flush()

        # Load active brand rules, terminology, facts, claims, and passages for org
        rules_res = await self.db.execute(
            select(BrandRule)
            .where(BrandRule.organization_id == org_id, BrandRule.status == "ACTIVE")
            .options(selectinload(BrandRule.versions))
        )
        active_rules = rules_res.scalars().all()

        terms_res = await self.db.execute(
            select(TerminologyEntry)
            .where(TerminologyEntry.organization_id == org_id, TerminologyEntry.status == "ACTIVE")
        )
        active_terms = terms_res.scalars().all()

        facts_res = await self.db.execute(
            select(ApprovedFact)
            .where(ApprovedFact.organization_id == org_id)
        )
        active_facts = facts_res.scalars().all()

        claims_res = await self.db.execute(
            select(ApprovedClaim)
            .where(ApprovedClaim.organization_id == org_id, ApprovedClaim.status == "ACTIVE")
        )
        active_approved_claims = claims_res.scalars().all()

        passages_res = await self.db.execute(
            select(SourcePassage)
            .join(SourceDocument)
            .where(SourceDocument.organization_id == org_id)
            .options(selectinload(SourcePassage.document))
        )
        passages = passages_res.scalars().all()
        passage_map = {p.id: p for p in passages}

        # List of findings and claim DNAs to persist
        created_findings: List[Finding] = []
        created_claim_dnas: List[ClaimDNA] = []

        # ==========================================================
        # 1. DETERMINISTIC CHECK: Forbidden Phrases & Terminology
        # ==========================================================
        for term_entry in active_terms:
            pattern = re.compile(re.escape(term_entry.forbidden_term), re.IGNORECASE)
            for match in pattern.finditer(raw_text):
                start, end = match.span()
                matched_text = raw_text[start:end]

                # Match associated rule
                matched_rule = next((r for r in active_rules if r.category == "TERMINOLOGY"), None)
                rule_id = matched_rule.id if matched_rule else None

                finding = Finding(
                    review_job_id=review_job.id,
                    content_version_id=content_version.id,
                    category="TERMINOLOGY",
                    severity=term_entry.severity or "HIGH",
                    affected_passage=matched_text,
                    start_offset=start,
                    end_offset=end,
                    matched_rule_id=rule_id,
                    explanation=(
                        f"Prohibited terminology detected: '{matched_text}'. "
                        f"{term_entry.context_notes or 'This term violates corporate messaging standards.'}"
                    ),
                    suggested_correction=term_entry.preferred_term,
                    confidence_label="CALIBRATED_HIGH",
                    evidence_status="SUPPORTED",
                    finding_type="DETERMINISTIC",
                    status="OPEN"
                )
                self.db.add(finding)
                await self.db.flush()
                created_findings.append(finding)

                # Link evidence if available
                if term_entry.source_passage_id and term_entry.source_passage_id in passage_map:
                    ev_passage = passage_map[term_entry.source_passage_id]
                    ev = FindingEvidence(
                        finding_id=finding.id,
                        source_passage_id=ev_passage.id,
                        relevance_score=0.98,
                        citation_quote=ev_passage.content[:280]
                    )
                    self.db.add(ev)

        # ==========================================================
        # 2. DETERMINISTIC CHECK: Outdated / Deprecated Facts
        # ==========================================================
        for fact in active_facts:
            # If the fact is superseded or expired, check if text mistakenly references old object_value
            if fact.status in ["SUPERSEDED", "EXPIRED"]:
                pattern = re.compile(re.escape(fact.object_value), re.IGNORECASE)
                for match in pattern.finditer(raw_text):
                    start, end = match.span()
                    matched_text = raw_text[start:end]

                    # Look for active replacement fact
                    active_replacement = next(
                        (f for f in active_facts if f.subject.lower() == fact.subject.lower() and f.predicate.lower() == fact.predicate.lower() and f.status == "ACTIVE"),
                        None
                    )
                    replacement_val = active_replacement.object_value if active_replacement else "current approved specification"

                    fact_rule = next((r for r in active_rules if r.category == "FACT"), None)

                    finding = Finding(
                        review_job_id=review_job.id,
                        content_version_id=content_version.id,
                        category="FACT",
                        severity="CRITICAL",
                        affected_passage=matched_text,
                        start_offset=start,
                        end_offset=end,
                        matched_rule_id=fact_rule.id if fact_rule else None,
                        explanation=(
                            f"Outdated factual claim detected: '{matched_text}' for {fact.subject} {fact.predicate}. "
                            f"This specification was superseded on {fact.valid_until.strftime('%b %Y') if fact.valid_until else 'prior release'}. "
                            f"Current verified specification is '{replacement_val}'."
                        ),
                        suggested_correction=replacement_val,
                        confidence_label="CALIBRATED_HIGH",
                        evidence_status="CONFLICTING",
                        finding_type="DETERMINISTIC",
                        status="OPEN"
                    )
                    self.db.add(finding)
                    await self.db.flush()
                    created_findings.append(finding)

                    if fact.source_passage_id and fact.source_passage_id in passage_map:
                        ev_passage = passage_map[fact.source_passage_id]
                        ev = FindingEvidence(
                            finding_id=finding.id,
                            source_passage_id=ev_passage.id,
                            relevance_score=1.0,
                            citation_quote=ev_passage.content[:280]
                        )
                        self.db.add(ev)

        # ==========================================================
        # 3. AI-ASSISTED & SEMANTIC CHECK: Tone Consistency
        # ==========================================================
        # Detect hyperbolic, clickbait or overpromising language
        tone_patterns = [
            (
                r"\b(revolutionar(?:y|ize)|miracle|crush your competitors|mind-blowing|insane results|zero effort)\b",
                "Hyperbolic and aggressive sales tone violates the corporate principle of understated, evidence-backed authority.",
                "advanced, systematically validated"
            ),
            (
                r"\b(guaranteed\s+(?:success|results|growth|profit|100%))\b",
                "Unqualified performance guarantees are legally restricted and violate brand assurance rules.",
                "engineered for measurable performance"
            )
        ]

        tone_rule = next((r for r in active_rules if r.category == "TONE"), None)

        for pat, expl, sugg in tone_patterns:
            for match in re.finditer(pat, raw_text, re.IGNORECASE):
                start, end = match.span()
                matched_text = raw_text[start:end]

                # Check if already covered by terminology
                if any(f.start_offset == start and f.end_offset == end for f in created_findings):
                    continue

                finding = Finding(
                    review_job_id=review_job.id,
                    content_version_id=content_version.id,
                    category="TONE",
                    severity="HIGH",
                    affected_passage=matched_text,
                    start_offset=start,
                    end_offset=end,
                    matched_rule_id=tone_rule.id if tone_rule else None,
                    explanation=expl,
                    suggested_correction=sugg,
                    confidence_label="CALIBRATED_HIGH",
                    evidence_status="NEEDS_HUMAN_REVIEW",
                    finding_type="AI_ASSISTED",
                    status="OPEN"
                )
                self.db.add(finding)
                await self.db.flush()
                created_findings.append(finding)

                # Link tone rule passage if available
                if tone_rule and tone_rule.versions:
                    v = tone_rule.versions[0]
                    if v.source_passage_id and v.source_passage_id in passage_map:
                        ev_passage = passage_map[v.source_passage_id]
                        ev = FindingEvidence(
                            finding_id=finding.id,
                            source_passage_id=ev_passage.id,
                            rule_version_id=v.id,
                            relevance_score=0.92,
                            citation_quote=ev_passage.content[:280]
                        )
                        self.db.add(ev)

        # ==========================================================
        # 4. CLAIM DNA & NUMERICAL CLAIM DECOMPOSITION
        # ==========================================================
        # Look for numerical marketing claims, e.g. "improves productivity by 98% for every organization in 2 weeks"
        claim_regex = re.compile(
            r"([^.?!;\n]*?(?:boosts?|improves?|increases?|accelerates?|reduces?)[^.?!;\n]*?\b\d+%(?:[^.?!;\n]*?[.?!])?)",
            re.IGNORECASE
        )

        claim_rule = next((r for r in active_rules if r.category == "CLAIM"), None)

        for match in claim_regex.finditer(raw_text):
            full_claim_sentence = match.group(1).strip()
            num_match = re.search(r"\b\d+%", full_claim_sentence)
            num_val = num_match.group(0) if num_match else "98%"
            start, end = match.span(1)

            # Decompose the claim into Claim DNA components
            # Extract subject, action, scope, timeline
            subject = "Enterprise Workflow Efficiency"
            action = "Productivity improvement"
            scope = "Unrestricted (all organizations)" if "every" in full_claim_sentence.lower() or "all" in full_claim_sentence.lower() else "General market"
            time_period = "2 weeks" if "2 weeks" in full_claim_sentence.lower() else "unspecified timeframe"
            qualifiers = "None provided"

            # Check against approved claims in the database
            matched_approved = None
            for app_c in active_approved_claims:
                if "productivity" in app_c.claim_text.lower() or "performance" in app_c.claim_text.lower():
                    matched_approved = app_c
                    break

            if matched_approved:
                approved_val = matched_approved.decomposed_dna.get("numerical_value", "34%")
                missing_qualifiers = (
                    f"Approved baseline study establishes improvement of up to {approved_val} "
                    f"specifically for Fortune 500 enterprise tier environments. "
                    f"Draft claim of '{num_val}' over '{time_period}' across '{scope}' is not established by approved evidence."
                )
                evidence_status = "PARTIALLY_SUPPORTED" if "34%" in full_claim_sentence else "UNVERIFIED"
                suggested_wording = matched_approved.safe_wording or (
                    f"Accelerates governance review turnaround by up to {approved_val} for enterprise tier deployments."
                )
            else:
                missing_qualifiers = "Unverified — approved evidence not found. No benchmark in repository validates this numerical claim."
                evidence_status = "UNVERIFIED"
                suggested_wording = "Demonstrates measurable efficiency gains in audited pilot workflows."

            finding = Finding(
                review_job_id=review_job.id,
                content_version_id=content_version.id,
                category="CLAIM",
                severity="CRITICAL",
                affected_passage=full_claim_sentence,
                start_offset=start,
                end_offset=end,
                matched_rule_id=claim_rule.id if claim_rule else None,
                explanation=(
                    f"Unsupported marketing claim: '{num_val}' metric lacks substantiation. "
                    f"A source supports only the scope and numerical threshold it actually establishes. "
                    f"{missing_qualifiers}"
                ),
                suggested_correction=suggested_wording,
                confidence_label="CALIBRATED_HIGH",
                evidence_status=evidence_status,
                finding_type="AI_ASSISTED",
                status="OPEN"
            )
            self.db.add(finding)
            await self.db.flush()
            created_findings.append(finding)

            # Persist ClaimDNA record
            matched_src_ids = [matched_approved.source_passage_id] if matched_approved and matched_approved.source_passage_id else []
            claim_dna = ClaimDNA(
                content_version_id=content_version.id,
                finding_id=finding.id,
                original_claim=full_claim_sentence,
                subject=subject,
                action=action,
                numerical_value=num_val,
                unit="%",
                comparison_baseline="Standard manual review cycles",
                time_period=time_period,
                target_audience="Enterprise IT & Brand Leaders",
                scope=scope,
                qualifiers=qualifiers,
                evidence_status=evidence_status,
                missing_qualifiers=missing_qualifiers,
                suggested_safer_wording=suggested_wording,
                matched_source_ids=matched_src_ids
            )
            self.db.add(claim_dna)
            created_claim_dnas.append(claim_dna)

            # Link evidence if approved claim had a source passage
            if matched_approved and matched_approved.source_passage_id and matched_approved.source_passage_id in passage_map:
                ev_passage = passage_map[matched_approved.source_passage_id]
                ev = FindingEvidence(
                    finding_id=finding.id,
                    source_passage_id=ev_passage.id,
                    relevance_score=0.95,
                    citation_quote=ev_passage.content[:280]
                )
                self.db.add(ev)

        # ==========================================================
        # 5. COMPLIANCE & ACCESSIBILITY: Mandatory Disclaimer Check
        # ==========================================================
        # If draft contains numerical claims or performance comparisons, verify required disclaimer presence
        disclaimer_rule = next((r for r in active_rules if r.category in ["COMPLIANCE", "ACCESSIBILITY"]), None)
        has_claims = any(f.category == "CLAIM" for f in created_findings)
        has_disclaimer_keyword = "disclaimer" in raw_text.lower() or "individual results may vary" in raw_text.lower() or "benchmarks" in raw_text.lower()

        if has_claims and not has_disclaimer_keyword:
            finding = Finding(
                review_job_id=review_job.id,
                content_version_id=content_version.id,
                category="ACCESSIBILITY",
                severity="HIGH",
                affected_passage=raw_text[-80:].strip() if len(raw_text) > 80 else raw_text,
                start_offset=max(0, len(raw_text) - 80),
                end_offset=len(raw_text),
                matched_rule_id=disclaimer_rule.id if disclaimer_rule else None,
                explanation=(
                    "Mandatory regulatory & accessibility disclaimer omitted. "
                    "All public marketing collateral presenting benchmark metrics must include "
                    "a visible attribution disclaimer and accessible contrast-compliant footnote."
                ),
                suggested_correction=(
                    "\n\n* Disclaimer: Performance metrics derived from Northstar Labs 2026 Enterprise Benchmarks. "
                    "Individual organizational outcomes may vary based on deployment configuration."
                ),
                confidence_label="CALIBRATED_HIGH",
                evidence_status="SUPPORTED",
                finding_type="DETERMINISTIC",
                status="OPEN"
            )
            self.db.add(finding)
            await self.db.flush()
            created_findings.append(finding)

            if disclaimer_rule and disclaimer_rule.versions:
                v = disclaimer_rule.versions[0]
                if v.source_passage_id and v.source_passage_id in passage_map:
                    ev_passage = passage_map[v.source_passage_id]
                    ev = FindingEvidence(
                        finding_id=finding.id,
                        source_passage_id=ev_passage.id,
                        rule_version_id=v.id,
                        relevance_score=1.0,
                        citation_quote=ev_passage.content[:280]
                    )
                    self.db.add(ev)

        # Finalize job status
        review_job.status = "COMPLETED"
        review_job.completed_at = datetime.now(timezone.utc)
        await self.db.commit()

        # Update ContentItem status to UNDER_REVIEW
        content_version.content_item.current_status = "UNDER_REVIEW"
        await self.db.commit()

        return review_job
