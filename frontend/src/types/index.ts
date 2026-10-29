export type Role = 
  | 'CONTENT_CREATOR' 
  | 'BRAND_MANAGER' 
  | 'LEGAL_COMPLIANCE' 
  | 'APPROVER' 
  | 'ORG_ADMIN';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  organization_id?: string;
  organization_name?: string;
}

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  default_password: string;
}

export interface BrandProfile {
  id: string;
  brand_name: string;
  tagline?: string;
  voice_description?: string;
  target_audiences: string[];
  core_values: string[];
  primary_colors: string[];
  secondary_colors: string[];
  logo_url?: string;
}

export interface SourcePassage {
  id: string;
  passage_number: number;
  heading?: string;
  section_code?: string;
  content: string;
}

export interface SourceDocument {
  id: string;
  title: string;
  doc_type: string;
  version: string;
  effective_date: string;
  owner: string;
  status: string;
  confidence_level: string;
  passages: SourcePassage[];
}

export interface RuleVersion {
  id: string;
  version_number: string;
  title: string;
  description: string;
  change_rationale?: string;
  author: string;
  approved_by?: string;
  created_at: string;
}

export interface BrandRule {
  id: string;
  rule_code: string;
  category: 'TONE' | 'TERMINOLOGY' | 'CLAIM' | 'FACT' | 'VISUAL' | 'ACCESSIBILITY' | 'COMPLIANCE';
  title: string;
  description: string;
  rule_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: string;
  current_version: string;
  owner: string;
  versions: RuleVersion[];
}

export interface ApprovedFact {
  id: string;
  fact_code: string;
  subject: string;
  predicate: string;
  object_value: string;
  unit?: string;
  status: string;
  confidence_status: string;
}

export interface ApprovedClaim {
  id: string;
  claim_code: string;
  claim_text: string;
  decomposed_dna: {
    subject?: string;
    action?: string;
    numerical_value?: string;
    unit?: string;
    comparison_baseline?: string;
    time_period?: string;
    target_audience?: string;
    scope?: string;
    qualifiers?: string;
  };
  safe_wording?: string;
  status: string;
}

export interface TerminologyEntry {
  id: string;
  forbidden_term: string;
  preferred_term: string;
  context_notes?: string;
  category: string;
  severity: string;
  status: string;
}

export interface ContentVersion {
  id: string;
  content_item_id: string;
  version_number: number;
  raw_text: string;
  parent_version_id?: string;
  created_at: string;
}

export interface ContentItem {
  id: string;
  organization_id: string;
  title: string;
  content_type: string;
  campaign?: string;
  target_audience?: string;
  current_status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'RESUBMITTED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
  versions_count: number;
  latest_version?: ContentVersion;
}

export interface FindingEvidence {
  id: string;
  source_passage_id?: string;
  relevance_score: number;
  citation_quote?: string;
  source_title?: string;
  section_code?: string;
  passage_content?: string;
  source_version?: string;
}

export interface Finding {
  id: string;
  content_version_id: string;
  category: 'TONE' | 'TERMINOLOGY' | 'CLAIM' | 'FACT' | 'VISUAL' | 'ACCESSIBILITY' | 'COMPLIANCE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  affected_passage: string;
  start_offset?: number;
  end_offset?: number;
  matched_rule_id?: string;
  matched_rule_code?: string;
  matched_rule_title?: string;
  explanation: string;
  suggested_correction?: string;
  confidence_label: string;
  evidence_status: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'CONFLICTING' | 'UNVERIFIED' | 'NEEDS_HUMAN_REVIEW';
  finding_type: 'DETERMINISTIC' | 'AI_ASSISTED' | 'HUMAN_CONFIRMED';
  status: 'OPEN' | 'ACCEPTED_SUGGESTION' | 'REJECTED_SUGGESTION' | 'FLAGGED_FOR_REVIEW' | 'RESOLVED_BY_EDIT';
  evidence_items: FindingEvidence[];
  created_at: string;
}

export interface ClaimDNA {
  id: string;
  content_version_id: string;
  finding_id?: string;
  original_claim: string;
  subject?: string;
  action?: string;
  numerical_value?: string;
  unit?: string;
  comparison_baseline?: string;
  time_period?: string;
  target_audience?: string;
  scope?: string;
  qualifiers?: string;
  evidence_status: string;
  missing_qualifiers?: string;
  suggested_safer_wording?: string;
  matched_source_ids: string[];
}

export interface Comment {
  id: string;
  content_version_id: string;
  user_id: string;
  user_name: string;
  role_tag?: string;
  finding_id?: string;
  message: string;
  created_at: string;
}

export interface ApprovalDecision {
  id: string;
  content_version_id: string;
  approver_id?: string;
  approver_name?: string;
  decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  rationale: string;
  timestamp: string;
}

export interface DecisionPrecedent {
  id: string;
  title: string;
  scenario_description: string;
  finding_category: string;
  past_decision: string;
  reviewer_rationale: string;
  rule_version: string;
  similarity_explanation?: string;
  applicability_status: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  description: string;
  details_json: Record<string, any>;
  created_at: string;
}

export interface DiffChunk {
  type: 'unchanged' | 'inserted' | 'removed';
  text: string;
}

export interface VersionDiff {
  item_id: string;
  title: string;
  base_version: number;
  compare_version: number;
  diff_chunks: DiffChunk[];
  resolved_findings: any[];
  unresolved_findings: any[];
  resolved_count: number;
  unresolved_count: number;
}
