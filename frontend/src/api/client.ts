const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('brandsentinel_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const err = await response.json();
      errorDetail = err.detail || err.message || JSON.stringify(err);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) => 
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request<any>('/auth/me'),
  getDemoUsers: () => request<any[]>('/auth/demo-users'),

  // Organization & Profile
  getBrandProfile: () => request<any>('/organization/brand-profile'),
  updateBrandProfile: (data: any) => 
    request<any>('/organization/brand-profile', { method: 'PATCH', body: JSON.stringify(data) }),

  // Knowledge Hub
  getSources: () => request<any[]>('/knowledge/sources'),
  createSource: (data: any) => 
    request<any>('/knowledge/sources', { method: 'POST', body: JSON.stringify(data) }),
  getRules: () => request<any[]>('/knowledge/rules'),
  createRule: (data: any) => 
    request<any>('/knowledge/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateRule: (id: string, data: any) => 
    request<any>(`/knowledge/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getFacts: () => request<any[]>('/knowledge/facts'),
  createFact: (data: any) => 
    request<any>('/knowledge/facts', { method: 'POST', body: JSON.stringify(data) }),
  supersedeFact: (factId: string, data: { new_fact_code?: string; new_object_value: string; unit?: string; new_source_passage_id?: string; change_rationale: string }) => 
    request<any>(`/knowledge/facts/${factId}/supersede`, { method: 'POST', body: JSON.stringify(data) }),
  getClaims: () => request<any[]>('/knowledge/claims'),
  createClaim: (data: any) => 
    request<any>('/knowledge/claims', { method: 'POST', body: JSON.stringify(data) }),
  getTerminology: () => request<any[]>('/knowledge/terminology'),
  createTerminology: (data: any) => 
    request<any>('/knowledge/terminology', { method: 'POST', body: JSON.stringify(data) }),

  // Content Review Studio
  getContentItems: () => request<any[]>('/content/items'),
  getContentItemDetail: (id: string) => request<any>(`/content/items/${id}`),
  createContentItem: (data: { title: string; content_type: string; campaign?: string; target_audience?: string; raw_text: string }) => 
    request<any>('/content/items', { method: 'POST', body: JSON.stringify(data) }),
  createRevision: (itemId: string, data: { raw_text: string; parent_version_id?: string }) => 
    request<any>(`/content/items/${itemId}/versions`, { method: 'POST', body: JSON.stringify(data) }),
  getVersionDiff: (itemId: string, vBase: number, vCompare: number) => 
    request<any>(`/content/items/${itemId}/diff?v_base=${vBase}&v_compare=${vCompare}`),

  // Review Engine & Findings
  executeReview: (versionId: string, analysisMode: string = 'HYBRID_AI_DETERMINISTIC') => 
    request<any>(`/review/versions/${versionId}/execute`, { method: 'POST', body: JSON.stringify({ analysis_mode: analysisMode }) }),
  getFindings: (versionId: string) => request<any[]>(`/review/versions/${versionId}/findings`),
  updateFindingStatus: (findingId: string, status: string) => 
    request<any>(`/review/findings/${findingId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Claim DNA
  getClaimDnaForVersion: (versionId: string) => request<any[]>(`/claim-dna/versions/${versionId}`),
  getAllClaimDna: () => request<any[]>('/claim-dna/all'),

  // Evidence Graph
  getEvidenceGraph: (versionId?: string) => 
    request<any>(`/evidence-graph${versionId ? `?version_id=${versionId}` : ''}`),

  // Drift Radar
  getDriftMetrics: () => request<any>('/drift/metrics'),

  // Guideline Conflict Center
  getConflicts: () => request<any[]>('/conflicts'),

  // Decision Memory / Precedents
  getPrecedents: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    return request<any[]>(`/precedents?${params.toString()}`);
  },

  // Risk Propagation
  getRiskPropagation: () => request<any>('/risk-propagation'),
  requestReReview: (data: { content_item_id: string; reason?: string }) => 
    request<any>('/risk-propagation/request-re-review', { method: 'POST', body: JSON.stringify(data) }),

  // Comments
  getVersionComments: (versionId: string) => request<any[]>(`/comments/versions/${versionId}`),
  postComment: (versionId: string, data: { message: string; finding_id?: string; role_tag?: string }) => 
    request<any>(`/comments/versions/${versionId}`, { method: 'POST', body: JSON.stringify(data) }),

  // Approvals
  getVersionDecisions: (versionId: string) => request<any[]>(`/approvals/versions/${versionId}`),
  submitApprovalDecision: (versionId: string, data: { decision: string; rationale: string }) => 
    request<any>(`/approvals/versions/${versionId}/decide`, { method: 'POST', body: JSON.stringify(data) }),

  // Audit Trail
  getAuditEvents: (limit: number = 50) => request<any[]>(`/audit?limit=${limit}`),

  // Visual Brand Governance
  checkContrast: (data: { foreground_hex: string; background_hex: string; text_size_pt?: number; is_bold?: boolean }) => 
    request<any>('/visual/contrast-check', { method: 'POST', body: JSON.stringify(data) }),
  getBrandAssets: () => request<any[]>('/visual/assets'),
  inspectImage: async (formData: FormData) => {
    const headers = { ...getAuthHeader() };
    const res = await fetch(`${API_BASE}/visual/inspect-image`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Team & Permissions
  getTeamMembers: () => request<any[]>('/team/members'),
  updateMemberRole: (membershipId: string, role: string) => 
    request<any>(`/team/members/${membershipId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  // Demo Controls
  resetDemoData: () => request<any>('/demo/reset', { method: 'POST' }),
  getDemoScenario: () => request<any>('/demo/scenario'),
};
