from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import (
    Organization,
    User,
    Membership,
    BrandProfile,
    SourceDocument,
    SourcePassage,
    BrandRule,
    RuleVersion,
    ApprovedFact,
    ApprovedClaim,
    TerminologyEntry,
    ContentItem,
    ContentVersion,
    DecisionPrecedent,
    AuditEvent,
    BrandAsset
)
from app.core.security import get_password_hash

DEMO_ORG_SLUG = "northstar-labs"
DEMO_PASSWORD = "Northstar2026!"

async def seed_northstar_demo(db: AsyncSession) -> Organization:
    """Seed the complete Northstar Labs fictional demo organization with rich governance data."""
    # Check if demo org exists; clean if resetting
    q = select(Organization).where(Organization.slug == DEMO_ORG_SLUG)
    res = await db.execute(q)
    existing_org = res.scalars().first()

    if existing_org:
        # Delete existing demo org to reset cleanly
        await db.delete(existing_org)
        await db.commit()

    # 1. Create Organization
    org = Organization(
        name="Northstar Labs [Fictional Demo]",
        slug=DEMO_ORG_SLUG,
        domain="northstarlabs.internal",
        is_demo=True,
        settings={
            "retention_days": 365,
            "require_legal_gate_for_claims": True,
            "strict_tone_checks": True,
            "synthetic_label": "[SYNTHETIC DEMO DATA — Northstar Labs]"
        }
    )
    db.add(org)
    await db.flush()

    # 2. Create Users across 5 Roles
    users_data = [
        {"email": "creator@northstarlabs.internal", "name": "Elena Rostova", "role": "CONTENT_CREATOR"},
        {"email": "brand@northstarlabs.internal", "name": "Marcus Chen", "role": "BRAND_MANAGER"},
        {"email": "legal@northstarlabs.internal", "name": "Sarah Jenkins, Esq.", "role": "LEGAL_COMPLIANCE"},
        {"email": "approver@northstarlabs.internal", "name": "David Vance", "role": "APPROVER"},
        {"email": "admin@northstarlabs.internal", "name": "System Administrator", "role": "ORG_ADMIN"},
    ]

    created_users = {}
    hashed_pwd = get_password_hash(DEMO_PASSWORD)

    for ud in users_data:
        # Check if user email already exists
        uq = select(User).where(User.email == ud["email"])
        ur = await db.execute(uq)
        user = ur.scalars().first()
        if not user:
            user = User(
                email=ud["email"],
                full_name=ud["name"],
                hashed_password=hashed_pwd,
                is_active=True
            )
            db.add(user)
            await db.flush()

        # Create membership
        mem = Membership(
            user_id=user.id,
            organization_id=org.id,
            role=ud["role"]
        )
        db.add(mem)
        created_users[ud["role"]] = user

    # 3. Create Brand Profile
    brand_profile = BrandProfile(
        organization_id=org.id,
        brand_name="Northstar Labs",
        tagline="Precision Brand Governance Intelligence",
        voice_description="Authoritative, evidence-backed, understated, clear, and uncompromisingly accurate. Avoid hype, uncalibrated superlatives, or aggressive sales rhetoric.",
        target_audiences=["Enterprise Compliance Directors", "Brand Governance Teams", "Chief Legal Officers", "Marketing Operations Leads"],
        core_values=["Explainable AI", "Verified Evidence", "Human Accountability", "Zero Unsubstantiated Claims"],
        primary_colors=["#0B0F17", "#0F172A", "#6366F1"],
        secondary_colors=["#10B981", "#F59E0B", "#EF4444", "#F8FAFC"],
        logo_url="/shield.svg"
    )
    db.add(brand_profile)

    # 4. Source Documents & Passages (The Ground Truth)
    doc_guidelines = SourceDocument(
        organization_id=org.id,
        title="Northstar Corporate Brand Governance & Voice Manual 2026",
        doc_type="GUIDELINE",
        version="v3.2",
        effective_date=datetime.now(timezone.utc) - timedelta(days=90),
        owner="Brand Governance Council",
        status="ACTIVE",
        confidence_level="OFFICIALLY_VERIFIED"
    )
    db.add(doc_guidelines)
    await db.flush()

    p_voice = SourcePassage(
        document_id=doc_guidelines.id,
        passage_number=1,
        heading="Section 3.1: Voice Architecture and Superlative Restrictions",
        section_code="SEC-VOICE-3.1",
        content=(
            "Northstar Labs maintains an understated, scientific and authoritative corporate voice. "
            "Content creators must never use hyperbolic sales rhetoric such as 'miracle', 'revolutionary', "
            "'crush competitors', or 'mind-blowing'. All marketing assertions must reflect verified technical capability. "
            "Never guarantee business outcomes."
        )
    )
    p_terminology = SourcePassage(
        document_id=doc_guidelines.id,
        passage_number=2,
        heading="Section 4.4: Prohibited Marketing Phrases",
        section_code="SEC-TERM-4.4",
        content=(
            "The phrase 'guaranteed results' is strictly prohibited across all marketing communications. "
            "Use 'systematically validated outcomes'. The term 'autonomous AI copilot' is non-compliant; "
            "refer to our architecture as 'AI-assisted brand governance'."
        )
    )
    p_disclaimer = SourcePassage(
        document_id=doc_guidelines.id,
        passage_number=3,
        heading="Section 8.2: Mandatory Performance Disclaimers",
        section_code="SEC-DISCLAIMER-8.2",
        content=(
            "Any public collateral presenting performance statistics, time savings, or turnaround accelerations "
            "must include the following attribution disclaimer: "
            "'Performance metrics derived from Northstar Labs 2026 Enterprise Benchmarks. Individual organizational outcomes may vary.'"
        )
    )
    db.add_all([p_voice, p_terminology, p_disclaimer])

    doc_specs = SourceDocument(
        organization_id=org.id,
        title="Product Security & Infrastructure Specifications (Q1 2026)",
        doc_type="SPECIFICATION",
        version="v2.0",
        effective_date=datetime.now(timezone.utc) - timedelta(days=60),
        owner="Security & Compliance Office",
        status="ACTIVE",
        confidence_level="OFFICIALLY_VERIFIED"
    )
    db.add(doc_specs)
    await db.flush()

    p_security = SourcePassage(
        document_id=doc_specs.id,
        passage_number=1,
        heading="Section 2.1: Audit Certifications",
        section_code="SEC-AUDIT-2.1",
        content=(
            "Effective January 1, 2026, Northstar Labs is fully certified under SOC 2 Type II with zero exceptions noted. "
            "Prior references to legacy 'SOC 1 Type I' certifications are superseded and must be retired immediately from all active collateral."
        )
    )
    p_uptime = SourcePassage(
        document_id=doc_specs.id,
        passage_number=2,
        heading="Section 5.3: High-Availability SLA",
        section_code="SEC-SLA-5.3",
        content=(
            "Northstar Labs Cloud Enterprise maintains a 99.95% uptime SLA backed by financial service credits. "
            "The obsolete 99.0% SLA tier from 2024 is strictly deprecated."
        )
    )
    db.add_all([p_security, p_uptime])

    doc_benchmarks = SourceDocument(
        organization_id=org.id,
        title="Northstar Enterprise Productivity Benchmark Study 2026",
        doc_type="PRODUCT_FACT_SHEET",
        version="v1.0",
        effective_date=datetime.now(timezone.utc) - timedelta(days=45),
        owner="Product Performance Analytics",
        status="ACTIVE",
        confidence_level="OFFICIALLY_VERIFIED"
    )
    db.add(doc_benchmarks)
    await db.flush()

    p_benchmark = SourcePassage(
        document_id=doc_benchmarks.id,
        passage_number=1,
        heading="Section 1.4: Empirical Review Cycle Acceleration",
        section_code="SEC-BENCH-1.4",
        content=(
            "In controlled multi-tenant trials involving 42 enterprise legal and compliance teams, "
            "BrandSentinel demonstrated an acceleration in brand review turnaround of up to 34% "
            "over a 90-day measurement period. Claims asserting productivity improvements beyond 34% or "
            "claims extending across unsegmented universal markets are unsupported by research data."
        )
    )
    db.add(p_benchmark)
    await db.flush()

    # 5. Brand Rules & Versions
    rule_tone = BrandRule(
        organization_id=org.id,
        rule_code="RULE-TONE-01",
        category="TONE",
        title="Anti-Hyperbole & Measured Scientific Tone",
        description="Marketing and product descriptions must remain restrained, authoritative and strictly factual.",
        rule_type="TONE_RESTRICTION",
        severity="HIGH",
        status="ACTIVE",
        current_version="1.0.0",
        owner="Brand Governance Council"
    )
    db.add(rule_tone)
    await db.flush()

    rv_tone = RuleVersion(
        rule_id=rule_tone.id,
        version_number="1.0.0",
        title="Anti-Hyperbole & Measured Scientific Tone",
        description="Prohibits exaggerated claims, hyperbolic adjectives and aggressive sales vernacular.",
        source_passage_id=p_voice.id,
        change_rationale="Initial baseline governance standard for 2026.",
        author="Brand Governance Council",
        approved_by="Sarah Jenkins, Esq."
    )
    db.add(rv_tone)

    rule_term = BrandRule(
        organization_id=org.id,
        rule_code="RULE-TERM-01",
        category="TERMINOLOGY",
        title="Prohibition of Guaranteed Business Outcomes",
        description="Forbids guarantees of financial or organizational performance.",
        rule_type="FORBIDDEN_PHRASE",
        severity="HIGH",
        status="ACTIVE",
        current_version="1.0.0",
        owner="Legal & Compliance"
    )
    db.add(rule_term)
    await db.flush()

    rv_term = RuleVersion(
        rule_id=rule_term.id,
        version_number="1.0.0",
        title="Prohibition of Guaranteed Business Outcomes",
        description="Enforces preferred term substitutions for high-risk legal assertions.",
        source_passage_id=p_terminology.id,
        change_rationale="FTC / Advertising standards compliance update.",
        author="Legal & Compliance",
        approved_by="David Vance"
    )
    db.add(rv_term)

    rule_claim = BrandRule(
        organization_id=org.id,
        rule_code="RULE-CLAIM-01",
        category="CLAIM",
        title="Numerical Marketing Claim Substantiation",
        description="Every numerical claim must cite approved benchmarks and establish precise scope.",
        rule_type="CLAIM_GUARDRAIL",
        severity="CRITICAL",
        status="ACTIVE",
        current_version="1.0.0",
        owner="Legal & Compliance"
    )
    db.add(rule_claim)
    await db.flush()

    rv_claim = RuleVersion(
        rule_id=rule_claim.id,
        version_number="1.0.0",
        title="Numerical Marketing Claim Substantiation",
        description="Requires decomposed claim verification before publication.",
        source_passage_id=p_benchmark.id,
        change_rationale="Governance guardrail to eliminate phantom statistical marketing.",
        author="Legal & Compliance",
        approved_by="Sarah Jenkins, Esq."
    )
    db.add(rv_claim)

    rule_fact = BrandRule(
        organization_id=org.id,
        rule_code="RULE-FACT-01",
        category="FACT",
        title="Current Certification & SLA Veracity",
        description="Mandates references to active SOC 2 Type II and 99.95% SLA; retires obsolete specs.",
        rule_type="CONFLICTING_SPEC",
        severity="CRITICAL",
        status="ACTIVE",
        current_version="1.0.0",
        owner="Security & Compliance Office"
    )
    db.add(rule_fact)
    await db.flush()

    rv_fact = RuleVersion(
        rule_id=rule_fact.id,
        version_number="1.0.0",
        title="Current Certification & SLA Veracity",
        description="Prevents propagation of legacy SOC 1 or outdated 99.0% SLA specs.",
        source_passage_id=p_security.id,
        change_rationale="Post-audit verification release.",
        author="Security Office",
        approved_by="Sarah Jenkins, Esq."
    )
    db.add(rv_fact)

    rule_disc = BrandRule(
        organization_id=org.id,
        rule_code="RULE-COMP-01",
        category="ACCESSIBILITY",
        title="Mandatory Performance Attribution & Disclaimer",
        description="Requires accessible contrast disclaimer on all benchmark claims.",
        rule_type="MANDATORY_DISCLAIMER",
        severity="HIGH",
        status="ACTIVE",
        current_version="1.0.0",
        owner="Brand Governance Council"
    )
    db.add(rule_disc)
    await db.flush()

    rv_disc = RuleVersion(
        rule_id=rule_disc.id,
        version_number="1.0.0",
        title="Mandatory Performance Attribution & Disclaimer",
        description="Enforces mandatory disclaimer injection.",
        source_passage_id=p_disclaimer.id,
        change_rationale="Accessibility & transparency compliance.",
        author="Brand Governance Council",
        approved_by="David Vance"
    )
    db.add(rv_disc)

    # 6. Approved Facts
    fact_soc2 = ApprovedFact(
        organization_id=org.id,
        fact_code="FACT-SEC-02",
        subject="Northstar Labs Enterprise",
        predicate="Security Certification",
        object_value="SOC 2 Type II",
        unit=None,
        valid_from=datetime(2026, 1, 1, tzinfo=timezone.utc),
        status="ACTIVE",
        source_passage_id=p_security.id,
        confidence_status="VERIFIED"
    )
    fact_soc1 = ApprovedFact(
        organization_id=org.id,
        fact_code="FACT-SEC-01",
        subject="Northstar Labs Enterprise",
        predicate="Security Certification",
        object_value="SOC 1 Type I",
        unit=None,
        valid_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        valid_until=datetime(2025, 12, 31, tzinfo=timezone.utc),
        status="SUPERSEDED",
        source_passage_id=p_security.id,
        confidence_status="EXPIRED_HISTORICAL"
    )
    fact_uptime_curr = ApprovedFact(
        organization_id=org.id,
        fact_code="FACT-SLA-02",
        subject="Northstar Cloud",
        predicate="High-Availability SLA",
        object_value="99.95%",
        unit="%",
        valid_from=datetime(2026, 1, 1, tzinfo=timezone.utc),
        status="ACTIVE",
        source_passage_id=p_uptime.id,
        confidence_status="VERIFIED"
    )
    fact_uptime_old = ApprovedFact(
        organization_id=org.id,
        fact_code="FACT-SLA-01",
        subject="Northstar Cloud",
        predicate="High-Availability SLA",
        object_value="99.0%",
        unit="%",
        valid_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
        valid_until=datetime(2025, 12, 31, tzinfo=timezone.utc),
        status="SUPERSEDED",
        source_passage_id=p_uptime.id,
        confidence_status="EXPIRED_HISTORICAL"
    )
    db.add_all([fact_soc2, fact_soc1, fact_uptime_curr, fact_uptime_old])

    # 7. Approved Claim & Decomposed DNA
    app_claim = ApprovedClaim(
        organization_id=org.id,
        claim_code="CLAIM-PROD-01",
        claim_text="Accelerates governance review turnaround by up to 34% for enterprise tier deployments.",
        decomposed_dna={
            "subject": "Governance Review Turnaround",
            "action": "Accelerate review cycle",
            "numerical_value": "34%",
            "unit": "%",
            "comparison_baseline": "Standard manual multi-stakeholder review",
            "time_period": "90-day trial evaluation",
            "target_audience": "Enterprise tier compliance and legal operations",
            "scope": "Fortune 500 multi-tenant deployments",
            "qualifiers": "Based on Northstar Labs 2026 Enterprise Benchmarks across 42 evaluated organizations."
        },
        safe_wording="Empowers enterprise compliance teams to accelerate brand review turnaround by up to 34%, based on Northstar Labs 2026 Enterprise Benchmarks.",
        source_passage_id=p_benchmark.id,
        status="ACTIVE"
    )
    db.add(app_claim)

    # 8. Terminology Entries
    term_1 = TerminologyEntry(
        organization_id=org.id,
        forbidden_term="guaranteed results",
        preferred_term="systematically validated outcomes",
        context_notes="Absolute commercial guarantees incur civil false advertising liability under FTC regulations.",
        category="TERMINOLOGY",
        severity="HIGH",
        source_passage_id=p_terminology.id,
        status="ACTIVE"
    )
    term_2 = TerminologyEntry(
        organization_id=org.id,
        forbidden_term="autonomous AI copilot",
        preferred_term="AI-assisted brand governance platform",
        context_notes="Northstar Labs insists on human oversight; autonomous labeling undermines compliance positioning.",
        category="TERMINOLOGY",
        severity="HIGH",
        source_passage_id=p_terminology.id,
        status="ACTIVE"
    )
    term_3 = TerminologyEntry(
        organization_id=org.id,
        forbidden_term="unbreakable security",
        preferred_term="SOC 2 Type II certified infrastructure",
        context_notes="Security superlatives are technically inaccurate and create legal exposure.",
        category="TERMINOLOGY",
        severity="CRITICAL",
        source_passage_id=p_security.id,
        status="ACTIVE"
    )
    db.add_all([term_1, term_2, term_3])

    # 9. Brand Assets
    asset_logo = BrandAsset(
        organization_id=org.id,
        asset_type="LOGO",
        name="Northstar Primary Shield Mark",
        file_path="/shield.svg",
        color_palette=["#0B0F17", "#6366F1"],
        dimensions="512x512",
        format="SVG",
        is_approved=True
    )
    db.add(asset_logo)

    # 10. Decision Precedent
    precedent = DecisionPrecedent(
        organization_id=org.id,
        title="Exception Precedent: Accelerated Turnaround Metric in Q4 Keynote",
        scenario_description="Author submitted a draft citing 40% speedup in draft social preview.",
        finding_category="CLAIM",
        past_decision="APPROVED_WITH_DISCLAIMER",
        reviewer_rationale=(
            "Reviewer Sarah Jenkins approved after modifying draft text from 40% down to the verified 'up to 34%' "
            "and appending the mandatory benchmark attribution footnote. Precedent confirms that no metric exceeding 34% "
            "may be approved without new audited lab empirical benchmarks."
        ),
        rule_id=rule_claim.id,
        rule_version="1.0.0",
        similarity_explanation="Matches current numerical claim review scenario regarding efficiency metrics.",
        applicability_status="APPLICABLE_WITH_CAUTION"
    )
    db.add(precedent)

    # 11. Create Synthetic Marketing Draft with the 5 Required Issues
    demo_creator = created_users["CONTENT_CREATOR"]
    demo_draft_text = (
        "Northstar Labs is thrilled to announce our next-generation enterprise release. "
        "Our revolutionary platform boosts enterprise productivity by 98% for every organization in 2 weeks. "
        "We deliver guaranteed results with zero margin of error! "
        "Crush your competitors with mind-blowing AI autonomy that makes old solutions look pathetic. "
        "Rest easy knowing our system is fully compliant with SOC 1 Type I certification and 99.0% uptime."
    )

    content_item = ContentItem(
        organization_id=org.id,
        title="Q1 Product Launch & Enterprise Announcement [Demo Draft]",
        content_type="BLOG_ARTICLE",
        campaign="2026 Enterprise Wave Launch",
        target_audience="Enterprise Technology Leaders",
        current_status="SUBMITTED",
        creator_id=demo_creator.id
    )
    db.add(content_item)
    await db.flush()

    content_version = ContentVersion(
        content_item_id=content_item.id,
        version_number=1,
        raw_text=demo_draft_text,
        metadata_json={
            "seeded_demo": True,
            "simulated_scenario": "Pre-publication review with 5 intentional governance infractions"
        },
        created_by_id=demo_creator.id
    )
    db.add(content_version)
    await db.flush()

    # 12. Create Audit Event
    audit = AuditEvent(
        organization_id=org.id,
        user_id=demo_creator.id,
        action_type="CONTENT_SUBMITTED",
        entity_type="CONTENT_ITEM",
        entity_id=content_item.id,
        description=f"Elena Rostova submitted '{content_item.title}' (Version 1) for automated brand governance review.",
        details_json={"word_count": len(demo_draft_text.split()), "target_campaign": content_item.campaign},
        actor_name=demo_creator.full_name,
        actor_role="CONTENT_CREATOR"
    )
    db.add(audit)

    await db.commit()
    return org
