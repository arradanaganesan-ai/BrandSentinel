import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Integer, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    domain = Column(String(255), nullable=True)
    is_demo = Column(Boolean, default=False)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    memberships = relationship("Membership", back_populates="organization", cascade="all, delete-orphan")
    brand_profile = relationship("BrandProfile", back_populates="organization", uselist=False, cascade="all, delete-orphan")
    source_documents = relationship("SourceDocument", back_populates="organization", cascade="all, delete-orphan")
    rules = relationship("BrandRule", back_populates="organization", cascade="all, delete-orphan")
    content_items = relationship("ContentItem", back_populates="organization", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    memberships = relationship("Membership", back_populates="user", cascade="all, delete-orphan")


class Membership(Base):
    __tablename__ = "memberships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    # Roles: CONTENT_CREATOR, BRAND_MANAGER, LEGAL_COMPLIANCE, APPROVER, ORG_ADMIN
    role = Column(String(50), nullable=False, default="CONTENT_CREATOR")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="memberships")
    organization = relationship("Organization", back_populates="memberships")


class BrandProfile(Base):
    __tablename__ = "brand_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), unique=True, nullable=False)
    brand_name = Column(String(255), nullable=False)
    tagline = Column(String(255), nullable=True)
    voice_description = Column(Text, nullable=True)
    target_audiences = Column(JSON, default=list)  # list of audience personas
    core_values = Column(JSON, default=list)
    primary_colors = Column(JSON, default=list)  # hex colors e.g. ["#0B0F17", "#6366F1"]
    secondary_colors = Column(JSON, default=list) # hex colors e.g. ["#10B981", "#F59E0B"]
    typography_rules = Column(JSON, default=dict)
    logo_url = Column(String(500), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="brand_profile")


class SourceDocument(Base):
    __tablename__ = "source_documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False)  # GUIDELINE, SPECIFICATION, LEGAL_DISCLAIMER, PRODUCT_FACT_SHEET
    version = Column(String(50), default="1.0.0")
    file_path = Column(String(500), nullable=True)
    effective_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    review_date = Column(DateTime, nullable=True)
    owner = Column(String(255), default="Brand Governance Council")
    status = Column(String(50), default="ACTIVE")  # ACTIVE, DRAFT, SUPERSEDED, EXPIRED
    confidence_level = Column(String(50), default="OFFICIALLY_VERIFIED")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="source_documents")
    passages = relationship("SourcePassage", back_populates="document", cascade="all, delete-orphan")


class SourcePassage(Base):
    __tablename__ = "source_passages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("source_documents.id", ondelete="CASCADE"), nullable=False)
    passage_number = Column(Integer, nullable=False)
    heading = Column(String(255), nullable=True)
    section_code = Column(String(100), nullable=True)  # e.g. "SEC-VOICE-3.2"
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)

    document = relationship("SourceDocument", back_populates="passages")
    evidence_links = relationship("FindingEvidence", back_populates="source_passage")


class BrandRule(Base):
    __tablename__ = "brand_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    rule_code = Column(String(50), nullable=False, index=True)  # e.g. "RULE-TONE-01"
    category = Column(String(50), nullable=False)  # TONE, TERMINOLOGY, CLAIM, FACT, VISUAL, ACCESSIBILITY, COMPLIANCE
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    rule_type = Column(String(50), nullable=False)  # FORBIDDEN_PHRASE, PREFERRED_TERM, MANDATORY_DISCLAIMER, CLAIM_GUARDRAIL, TONE_RESTRICTION, CONFLICTING_SPEC
    severity = Column(String(50), default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    status = Column(String(50), default="ACTIVE")  # ACTIVE, DRAFT, SUPERSEDED, EXPIRED, CONFLICTING
    current_version = Column(String(20), default="1.0.0")
    owner = Column(String(255), default="Brand Governance Council")
    effective_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    review_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="rules")
    versions = relationship("RuleVersion", back_populates="rule", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="matched_rule")


class RuleVersion(Base):
    __tablename__ = "rule_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rule_id = Column(String(36), ForeignKey("brand_rules.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(String(20), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    config_json = Column(JSON, default=dict)  # pattern matching rules, keywords, thresholds
    source_passage_id = Column(String(36), ForeignKey("source_passages.id", ondelete="SET NULL"), nullable=True)
    change_rationale = Column(Text, nullable=True)
    author = Column(String(255), default="Brand Policy Committee")
    approved_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    rule = relationship("BrandRule", back_populates="versions")
    source_passage = relationship("SourcePassage")


class ApprovedFact(Base):
    __tablename__ = "approved_facts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    fact_code = Column(String(50), nullable=False, index=True)
    subject = Column(String(255), nullable=False)  # e.g. "BrandSentinel Cloud Enterprise"
    predicate = Column(String(255), nullable=False)  # e.g. "uptime guarantee", "soc certification"
    object_value = Column(String(255), nullable=False)  # e.g. "99.95%", "SOC 2 Type II"
    unit = Column(String(50), nullable=True)
    valid_from = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    valid_until = Column(DateTime, nullable=True)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, SUPERSEDED, EXPIRED
    source_passage_id = Column(String(36), ForeignKey("source_passages.id", ondelete="SET NULL"), nullable=True)
    confidence_status = Column(String(50), default="VERIFIED")

    source_passage = relationship("SourcePassage")


class ApprovedClaim(Base):
    __tablename__ = "approved_claims"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    claim_code = Column(String(50), nullable=False, index=True)
    claim_text = Column(Text, nullable=False)
    decomposed_dna = Column(JSON, default=dict)  # subject, action, value, unit, baseline, scope, qualifiers
    safe_wording = Column(Text, nullable=True)
    source_passage_id = Column(String(36), ForeignKey("source_passages.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="ACTIVE")

    source_passage = relationship("SourcePassage")


class TerminologyEntry(Base):
    __tablename__ = "terminology_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    forbidden_term = Column(String(255), nullable=False, index=True)
    preferred_term = Column(String(255), nullable=False)
    context_notes = Column(Text, nullable=True)
    category = Column(String(50), default="TERMINOLOGY")
    severity = Column(String(50), default="HIGH")
    source_passage_id = Column(String(36), ForeignKey("source_passages.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="ACTIVE")

    source_passage = relationship("SourcePassage")


class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    # SOCIAL_POST, ADVERTISEMENT, EMAIL_CAMPAIGN, WEBSITE_COPY, PRODUCT_DESCRIPTION, BLOG_ARTICLE, ANNOUNCEMENT
    content_type = Column(String(50), nullable=False, default="BLOG_ARTICLE")
    campaign = Column(String(255), nullable=True)
    target_audience = Column(String(255), nullable=True)
    # DRAFT, SUBMITTED, UNDER_REVIEW, CHANGES_REQUESTED, RESUBMITTED, APPROVED, REJECTED, ARCHIVED
    current_status = Column(String(50), nullable=False, default="DRAFT")
    creator_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="content_items")
    creator = relationship("User")
    versions = relationship("ContentVersion", back_populates="content_item", cascade="all, delete-orphan", order_by="ContentVersion.version_number")


class ContentVersion(Base):
    __tablename__ = "content_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    content_item_id = Column(String(36), ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    raw_text = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    parent_version_id = Column(String(36), ForeignKey("content_versions.id"), nullable=True)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    content_item = relationship("ContentItem", back_populates="versions")
    created_by = relationship("User")
    review_jobs = relationship("ReviewJob", back_populates="content_version", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="content_version", cascade="all, delete-orphan")
    claim_dnas = relationship("ClaimDNA", back_populates="content_version", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="content_version", cascade="all, delete-orphan")
    approval_decisions = relationship("ApprovalDecision", back_populates="content_version", cascade="all, delete-orphan")
    visual_results = relationship("VisualReviewResult", back_populates="content_version", cascade="all, delete-orphan")


class ReviewJob(Base):
    __tablename__ = "review_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    content_version_id = Column(String(36), ForeignKey("content_versions.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, RUNNING, COMPLETED, FAILED
    analysis_mode = Column(String(50), default="HYBRID_AI_DETERMINISTIC")
    model_info = Column(String(255), default="Hybrid Rule Validator + BrandSentinel Semantic Inspector")
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    content_version = relationship("ContentVersion", back_populates="review_jobs")
    findings = relationship("Finding", back_populates="review_job", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    review_job_id = Column(String(36), ForeignKey("review_jobs.id", ondelete="CASCADE"), nullable=False)
    content_version_id = Column(String(36), ForeignKey("content_versions.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(50), nullable=False)  # TONE, TERMINOLOGY, CLAIM, FACT, VISUAL, ACCESSIBILITY, COMPLIANCE
    severity = Column(String(50), default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    affected_passage = Column(Text, nullable=False)
    start_offset = Column(Integer, nullable=True)
    end_offset = Column(Integer, nullable=True)
    matched_rule_id = Column(String(36), ForeignKey("brand_rules.id", ondelete="SET NULL"), nullable=True)
    explanation = Column(Text, nullable=False)
    suggested_correction = Column(Text, nullable=True)
    confidence_label = Column(String(50), default="CALIBRATED_HIGH")  # CALIBRATED_HIGH, CALIBRATED_MEDIUM, UNCERTAIN_NEEDS_REVIEW
    evidence_status = Column(String(50), default="UNVERIFIED")  # SUPPORTED, PARTIALLY_SUPPORTED, CONFLICTING, UNVERIFIED, NEEDS_HUMAN_REVIEW
    finding_type = Column(String(50), default="DETERMINISTIC")  # DETERMINISTIC, AI_ASSISTED, HUMAN_CONFIRMED
    status = Column(String(50), default="OPEN")  # OPEN, ACCEPTED_SUGGESTION, REJECTED_SUGGESTION, FLAGGED_FOR_REVIEW, RESOLVED_BY_EDIT
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    review_job = relationship("ReviewJob", back_populates="findings")
    content_version = relationship("ContentVersion", back_populates="findings")
    matched_rule = relationship("BrandRule", back_populates="findings")
    evidence_items = relationship("FindingEvidence", back_populates="finding", cascade="all, delete-orphan")


class FindingEvidence(Base):
    __tablename__ = "finding_evidences"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    finding_id = Column(String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    source_passage_id = Column(String(36), ForeignKey("source_passages.id", ondelete="SET NULL"), nullable=True)
    rule_version_id = Column(String(36), ForeignKey("rule_versions.id", ondelete="SET NULL"), nullable=True)
    relevance_score = Column(Float, default=1.0)
    citation_quote = Column(Text, nullable=True)

    finding = relationship("Finding", back_populates="evidence_items")
    source_passage = relationship("SourcePassage", back_populates="evidence_links")
    rule_version = relationship("RuleVersion")


class ClaimDNA(Base):
    __tablename__ = "claim_dnas"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    content_version_id = Column(String(36), ForeignKey("content_versions.id", ondelete="CASCADE"), nullable=False)
    finding_id = Column(String(36), ForeignKey("findings.id", ondelete="SET NULL"), nullable=True)
    original_claim = Column(Text, nullable=False)
    subject = Column(String(255), nullable=True)
    action = Column(String(255), nullable=True)
    numerical_value = Column(String(100), nullable=True)
    unit = Column(String(100), nullable=True)
    comparison_baseline = Column(String(255), nullable=True)
    time_period = Column(String(100), nullable=True)
    target_audience = Column(String(255), nullable=True)
    scope = Column(String(255), nullable=True)
    qualifiers = Column(String(255), nullable=True)
    evidence_status = Column(String(50), default="UNVERIFIED")  # SUPPORTED, PARTIALLY_SUPPORTED, CONFLICTING, UNVERIFIED, NEEDS_HUMAN_REVIEW
    missing_qualifiers = Column(Text, nullable=True)
    suggested_safer_wording = Column(Text, nullable=True)
    matched_source_ids = Column(JSON, default=list)

    content_version = relationship("ContentVersion", back_populates="claim_dnas")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    content_version_id = Column(String(36), ForeignKey("content_versions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    finding_id = Column(String(36), ForeignKey("findings.id", ondelete="SET NULL"), nullable=True)
    message = Column(Text, nullable=False)
    role_tag = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    content_version = relationship("ContentVersion", back_populates="comments")
    user = relationship("User")


class ApprovalDecision(Base):
    __tablename__ = "approval_decisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    content_version_id = Column(String(36), ForeignKey("content_versions.id", ondelete="CASCADE"), nullable=False)
    approver_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision = Column(String(50), nullable=False)  # APPROVED, REJECTED, CHANGES_REQUESTED
    rationale = Column(Text, nullable=False)
    rule_versions_snapshot = Column(JSON, default=list)
    findings_summary_snapshot = Column(JSON, default=dict)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    content_version = relationship("ContentVersion", back_populates="approval_decisions")
    approver = relationship("User")


class DecisionPrecedent(Base):
    __tablename__ = "decision_precedents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    scenario_description = Column(Text, nullable=False)
    finding_category = Column(String(50), nullable=False)
    past_decision = Column(String(50), nullable=False)  # APPROVED_WITH_DISCLAIMER, REJECTED, MODIFIED
    reviewer_rationale = Column(Text, nullable=False)
    rule_id = Column(String(36), ForeignKey("brand_rules.id", ondelete="SET NULL"), nullable=True)
    rule_version = Column(String(50), default="1.0.0")
    similarity_explanation = Column(Text, nullable=True)
    applicability_status = Column(String(50), default="APPLICABLE_WITH_CAUTION")  # APPLICABLE, APPLICABLE_WITH_CAUTION, DEPRECATED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    rule = relationship("BrandRule")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_type = Column(String(100), nullable=False)  # CONTENT_SUBMITTED, REVIEW_EXECUTED, SUGGESTION_ACCEPTED, APPROVAL_GRANTED, RULE_UPDATED, ROLE_CHANGED
    entity_type = Column(String(50), nullable=False)  # CONTENT_ITEM, CONTENT_VERSION, RULE, DECISION, USER
    entity_id = Column(String(36), nullable=False)
    description = Column(Text, nullable=False)
    details_json = Column(JSON, default=dict)
    actor_name = Column(String(255), default="System")
    actor_role = Column(String(50), default="SYSTEM")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="audit_events")
    user = relationship("User")


class BrandAsset(Base):
    __tablename__ = "brand_assets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    asset_type = Column(String(50), nullable=False)  # LOGO, COLOR_PALETTE, BADGE, TYPOGRAPHY
    name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)
    color_palette = Column(JSON, default=list)  # ["#0B0F17", "#6366F1", "#10B981"]
    dimensions = Column(String(50), nullable=True)
    format = Column(String(20), default="SVG")
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class VisualReviewResult(Base):
    __tablename__ = "visual_review_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    content_version_id = Column(String(36), ForeignKey("content_versions.id", ondelete="CASCADE"), nullable=False)
    uploaded_image_path = Column(String(500), nullable=True)
    dominant_colors = Column(JSON, default=list)
    contrast_ratios = Column(JSON, default=list)  # [{"pair": "Text on BG", "ratio": 7.4, "passes_aa": True, "passes_aaa": True}]
    logo_similarity_score = Column(Float, nullable=True)
    detected_issues = Column(JSON, default=list)
    accessibility_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    content_version = relationship("ContentVersion", back_populates="visual_results")
