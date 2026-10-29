/**
 * API base URL.
 *
 * Defaults to the relative '/api' prefix, which is what both the Vite dev
 * proxy and the production nginx `location /api/` block resolve. Set
 * `VITE_API_BASE_URL` at build time when the frontend is hosted separately
 * from the backend (e.g. "https://api.example.com/api").
 *
 * A trailing slash is stripped so that endpoints (which always start with
 * "/") concatenate cleanly.
 */
const ENV_BASE =
  typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_API_BASE_URL : undefined;
export const API_BASE = (ENV_BASE && ENV_BASE.trim() !== '' ? ENV_BASE.trim() : '/api').replace(
  /\/+$/,
  ''
);

/** Raised for any non-2xx or unparsable response. Carries the HTTP context. */
export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly detail: string;
  readonly endpoint: string;

  constructor(message: string, status: number, statusText: string, detail: string, endpoint: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.detail = detail;
    this.endpoint = endpoint;
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('brandsentinel_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Reads a Response body exactly ONCE.
 *
 * A Response body is a one-shot stream: after `text()` (or `json()`) has been
 * called, any further read throws TypeError "body stream already read". This
 * helper makes the single read and degrades to an empty string if the stream
 * is already consumed, so callers never attempt a second read.
 */
async function readBodyOnce(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

/**
 * Pulls the most useful error detail out of an already-read body.
 * Handles FastAPI JSON (`{detail}`), `{message}`, plain JSON, and
 * non-JSON bodies such as an nginx HTML error page.
 */
function extractDetail(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
      const candidate = (parsed as any).detail ?? (parsed as any).message;
      if (typeof candidate === 'string') return candidate;
      // FastAPI validation errors: [{loc, msg, type}, ...]
      if (Array.isArray(candidate)) {
        return candidate
          .map((e: any) =>
            e && typeof e === 'object' && e.msg
              ? `${Array.isArray(e.loc) ? e.loc.join('.') : 'body'}: ${e.msg}`
              : JSON.stringify(e)
          )
          .join('; ');
      }
      if (candidate && typeof candidate === 'object') return JSON.stringify(candidate);
      return JSON.stringify(parsed);
    }
    return String(parsed);
  } catch {
    // Non-JSON body (HTML/text error page) — surface a short excerpt.
    const flat = trimmed.replace(/\s+/g, ' ');
    return flat.length > 240 ? `${flat.slice(0, 240)}…` : flat;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    // fetch() itself rejected: offline, DNS, blocked by CORS, connection reset.
    throw new ApiError(
      `Network error contacting ${endpoint}: ${err?.message || 'request failed'}`,
      0,
      '',
      err?.message || '',
      endpoint
    );
  }

  // Single read of the body — shared by both the error and success paths.
  const raw = await readBodyOnce(response);

  if (!response.ok) {
    const detail = extractDetail(raw);
    const label = response.statusText ? `${response.status} ${response.statusText}` : `${response.status}`;
    const message = detail ? `HTTP ${label} — ${detail}` : `HTTP ${label} — no response body`;
    throw new ApiError(message, response.status, response.statusText, detail, endpoint);
  }

  // 204 No Content is a legitimate empty success.
  if (response.status === 204) return undefined as unknown as T;

  const body = raw.trim();
  if (body === '') {
    throw new ApiError(
      `HTTP ${response.status} ${
        response.statusText || 'OK'
      } — expected JSON but the response body was empty`,
      response.status,
      response.statusText,
      '',
      endpoint
    );
  }

  try {
    return JSON.parse(body) as T;
  } catch (err: any) {
    const flat = body.replace(/\s+/g, ' ');
    const excerpt = flat.length > 240 ? `${flat.slice(0, 240)}…` : flat;
    throw new ApiError(
      `HTTP ${response.status} ${
        response.statusText || 'OK'
      } — response was not valid JSON: ${excerpt}`,
      response.status,
      response.statusText,
      excerpt,
      endpoint
    );
  }
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
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/visual/inspect-image`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch (err: any) {
      throw new ApiError(
        `Network error contacting /visual/inspect-image: ${err?.message || 'request failed'}`,
        0,
        '',
        err?.message || '',
        '/visual/inspect-image'
      );
    }
    const raw = await readBodyOnce(res);
    if (!res.ok) {
      const detail = extractDetail(raw);
      const label = res.statusText ? `${res.status} ${res.statusText}` : `${res.status}`;
      throw new ApiError(
        detail ? `HTTP ${label} — ${detail}` : `HTTP ${label} — no response body`,
        res.status,
        res.statusText,
        detail,
        '/visual/inspect-image'
      );
    }
    return JSON.parse(raw);
  },

  // Team & Permissions
  getTeamMembers: () => request<any[]>('/team/members'),
  updateMemberRole: (membershipId: string, role: string) => 
    request<any>(`/team/members/${membershipId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  // Demo Controls
  resetDemoData: () => request<any>('/demo/reset', { method: 'POST' }),
  getDemoScenario: () => request<any>('/demo/scenario'),
};
