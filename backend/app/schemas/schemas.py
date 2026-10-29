from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth & User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    avatar_url: Optional[str] = None
    is_active: bool
    role: Optional[str] = None
    organization_id: Optional[str] = None
    organization_name: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Organization & Profile Schemas ---
class OrganizationBase(BaseModel):
    name: str
    slug: str
    domain: Optional[str] = None

class OrganizationResponse(OrganizationBase):
    id: str
    is_demo: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class BrandProfileResponse(BaseModel):
    id: str
    organization_id: str
    brand_name: str
    tagline: Optional[str] = None
    voice_description: Optional[str] = None
    target_audiences: List[str] = []
    core_values: List[str] = []
    primary_colors: List[str] = []
    secondary_colors: List[str] = []
    logo_url: Optional[str] = None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class BrandProfileUpdate(BaseModel):
    brand_name: Optional[str] = None
    tagline: Optional[str] = None
    voice_description: Optional[str] = None
    primary_colors: Optional[List[str]] = None
    secondary_colors: Optional[List[str]] = None
    core_values: Optional[List[str]] = None

# --- Source Knowledge Schemas ---
class SourcePassageResponse(BaseModel):
    id: str
    document_id: str
    passage_number: int
    heading: Optional[str] = None
    section_code: Optional[str] = None
    content: str
    metadata_json: Dict[str, Any] = {}
    model_config = ConfigDict(from_attributes=True)

class SourceDocumentResponse(BaseModel):
    id: str
    organization_id: str
    title: str
    doc_type: str
    version: str
    file_path: Optional[str] = None
    effective_date: datetime
    review_date: Optional[datetime] = None
    owner: str
    status: str
    confidence_level: str
    passages: List[SourcePassageResponse] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SourceDocumentCreate(BaseModel):
    title: str
    doc_type: str
    version: str = "1.0.0"
    owner: str = "Brand Governance Council"
    passages: List[Dict[str, Any]] = []

# --- Brand Rules & Versions ---
class RuleVersionResponse(BaseModel):
    id: str
    rule_id: str
    version_number: str
    title: str
    description: str
    config_json: Dict[str, Any] = {}
    source_passage_id: Optional[str] = None
    change_rationale: Optional[str] = None
    author: str
    approved_by: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class BrandRuleResponse(BaseModel):
    id: str
    organization_id: str
    rule_code: str
    category: str
    title: str
    description: str
    rule_type: str
    severity: str
    status: str
    current_version: str
    owner: str
    effective_date: datetime
    review_date: Optional[datetime] = None
    versions: List[RuleVersionResponse] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class BrandRuleCreate(BaseModel):
    rule_code: str
    category: str
    title: str
    description: str
    rule_type: str
    severity: str = "MEDIUM"
    owner: str = "Brand Governance Council"
    config_json: Dict[str, Any] = {}
    source_passage_id: Optional[str] = None

class BrandRuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    change_rationale: Optional[str] = None
    config_json: Optional[Dict[str, Any]] = None

# --- Facts, Claims, Terminology ---
class ApprovedFactResponse(BaseModel):
    id: str
    fact_code: str
    organization_id: str
    subject: str
    predicate: str
    object_value: str
    unit: Optional[str] = None
    valid_from: datetime
    valid_until: Optional[datetime] = None
    status: str
    source_passage_id: Optional[str] = None
    confidence_status: str
    model_config = ConfigDict(from_attributes=True)

class ApprovedFactCreate(BaseModel):
    fact_code: str
    subject: str
    predicate: str
    object_value: str
    unit: Optional[str] = None
    status: str = "ACTIVE"
    source_passage_id: Optional[str] = None

class FactSupersedeRequest(BaseModel):
    new_fact_code: Optional[str] = None
    new_object_value: str
    unit: Optional[str] = None
    new_source_passage_id: Optional[str] = None
    change_rationale: str

class ApprovedClaimResponse(BaseModel):
    id: str
    claim_code: str
    organization_id: str
    claim_text: str
    decomposed_dna: Dict[str, Any] = {}
    safe_wording: Optional[str] = None
    source_passage_id: Optional[str] = None
    status: str
    model_config = ConfigDict(from_attributes=True)

class ApprovedClaimCreate(BaseModel):
    claim_code: str
    claim_text: str
    decomposed_dna: Dict[str, Any] = {}
    safe_wording: Optional[str] = None
    source_passage_id: Optional[str] = None

class TerminologyEntryResponse(BaseModel):
    id: str
    organization_id: str
    forbidden_term: str
    preferred_term: str
    context_notes: Optional[str] = None
    category: str
    severity: str
    source_passage_id: Optional[str] = None
    status: str
    model_config = ConfigDict(from_attributes=True)

class TerminologyEntryCreate(BaseModel):
    forbidden_term: str
    preferred_term: str
    context_notes: Optional[str] = None
    category: str = "TERMINOLOGY"
    severity: str = "HIGH"
    source_passage_id: Optional[str] = None

# --- Content Items & Versions ---
class ContentItemBase(BaseModel):
    title: str
    content_type: str = "BLOG_ARTICLE"
    campaign: Optional[str] = None
    target_audience: Optional[str] = None

class ContentItemCreate(ContentItemBase):
    raw_text: str

class ContentVersionResponse(BaseModel):
    id: str
    content_item_id: str
    version_number: int
    raw_text: str
    parent_version_id: Optional[str] = None
    created_by_id: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ContentItemResponse(ContentItemBase):
    id: str
    organization_id: str
    current_status: str
    creator_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    latest_version: Optional[ContentVersionResponse] = None
    versions_count: int = 1
    model_config = ConfigDict(from_attributes=True)

class ContentVersionCreate(BaseModel):
    raw_text: str
    parent_version_id: Optional[str] = None

# --- Findings & Evidence ---
class FindingEvidenceResponse(BaseModel):
    id: str
    source_passage_id: Optional[str] = None
    rule_version_id: Optional[str] = None
    relevance_score: float
    citation_quote: Optional[str] = None
    source_title: Optional[str] = None
    section_code: Optional[str] = None
    passage_content: Optional[str] = None
    source_version: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class FindingResponse(BaseModel):
    id: str
    content_version_id: str
    category: str
    severity: str
    affected_passage: str
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    matched_rule_id: Optional[str] = None
    matched_rule_code: Optional[str] = None
    matched_rule_title: Optional[str] = None
    explanation: str
    suggested_correction: Optional[str] = None
    confidence_label: str
    evidence_status: str
    finding_type: str
    status: str
    evidence_items: List[FindingEvidenceResponse] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class FindingStatusUpdate(BaseModel):
    status: str  # OPEN, ACCEPTED_SUGGESTION, REJECTED_SUGGESTION, FLAGGED_FOR_REVIEW, RESOLVED_BY_EDIT

# --- Claim DNA ---
class ClaimDNAResponse(BaseModel):
    id: str
    content_version_id: str
    finding_id: Optional[str] = None
    original_claim: str
    subject: Optional[str] = None
    action: Optional[str] = None
    numerical_value: Optional[str] = None
    unit: Optional[str] = None
    comparison_baseline: Optional[str] = None
    time_period: Optional[str] = None
    target_audience: Optional[str] = None
    scope: Optional[str] = None
    qualifiers: Optional[str] = None
    evidence_status: str
    missing_qualifiers: Optional[str] = None
    suggested_safer_wording: Optional[str] = None
    matched_source_ids: List[str] = []
    model_config = ConfigDict(from_attributes=True)

# --- Comments ---
class CommentCreate(BaseModel):
    message: str
    finding_id: Optional[str] = None
    role_tag: Optional[str] = None

class CommentResponse(BaseModel):
    id: str
    content_version_id: str
    user_id: str
    user_name: Optional[str] = None
    role_tag: Optional[str] = None
    finding_id: Optional[str] = None
    message: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Approval Decisions ---
class ApprovalDecisionCreate(BaseModel):
    decision: str  # APPROVED, REJECTED, CHANGES_REQUESTED
    rationale: str

class ApprovalDecisionResponse(BaseModel):
    id: str
    content_version_id: str
    approver_id: Optional[str] = None
    approver_name: Optional[str] = None
    decision: str
    rationale: str
    rule_versions_snapshot: List[Any] = []
    findings_summary_snapshot: Dict[str, Any] = {}
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Review Job Execution ---
class ReviewExecuteRequest(BaseModel):
    analysis_mode: str = "HYBRID_AI_DETERMINISTIC"

class ReviewJobResponse(BaseModel):
    id: str
    content_version_id: str
    status: str
    analysis_mode: str
    model_info: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    findings: List[FindingResponse] = []
    claim_dnas: List[ClaimDNAResponse] = []
    model_config = ConfigDict(from_attributes=True)

# --- Precedents ---
class DecisionPrecedentResponse(BaseModel):
    id: str
    organization_id: str
    title: str
    scenario_description: str
    finding_category: str
    past_decision: str
    reviewer_rationale: str
    rule_id: Optional[str] = None
    rule_version: str
    similarity_explanation: Optional[str] = None
    applicability_status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Risk Propagation & Re-review Requests ---
class ReReviewRequest(BaseModel):
    content_item_id: str
    reason: str = "Referenced specification was superseded. Mandating compliance re-review."

# --- Audit Trail ---
class AuditEventResponse(BaseModel):
    id: str
    organization_id: str
    user_id: Optional[str] = None
    actor_name: str
    actor_role: str
    action_type: str
    entity_type: str
    entity_id: str
    description: str
    details_json: Dict[str, Any] = {}
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- Visual Governance ---
class VisualCheckRequest(BaseModel):
    foreground_hex: str
    background_hex: str
    text_size_pt: float = 14.0
    is_bold: bool = False

class VisualContrastResult(BaseModel):
    foreground: str
    background: str
    contrast_ratio: float
    passes_wcag_aa_normal: bool
    passes_wcag_aa_large: bool
    passes_wcag_aaa_normal: bool
    passes_wcag_aaa_large: bool
    evaluation: str

class VisualReviewResponse(BaseModel):
    id: str
    content_version_id: str
    uploaded_image_path: Optional[str] = None
    dominant_colors: List[str] = []
    contrast_ratios: List[Dict[str, Any]] = []
    logo_similarity_score: Optional[float] = None
    detected_issues: List[Dict[str, Any]] = []
    accessibility_notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
