import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  History,
  ShieldCheck,
  FileText,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../api/client';
import { BrandRule, SourceDocument, ApprovedFact, ApprovedClaim, TerminologyEntry } from '../types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  Textarea,
  statusTone,
  useToast,
} from '../components/ui';

export const KnowledgeHubPage: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'rules' | 'sources' | 'facts' | 'claims' | 'terms'>('rules');
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [sources, setSources] = useState<SourceDocument[]>([]);
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [claims, setClaims] = useState<ApprovedClaim[]>([]);
  const [terminology, setTerminology] = useState<TerminologyEntry[]>([]);
  const [selectedRule, setSelectedRule] = useState<BrandRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Rule Form Modal State
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleCode, setNewRuleCode] = useState('');
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<'TONE' | 'TERMINOLOGY' | 'CLAIM' | 'FACT' | 'ACCESSIBILITY'>('TERMINOLOGY');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleSeverity, setNewRuleSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('HIGH');

  // Fact Superseding Modal State (Signature Workflow)
  const [supersedeModal, setSupersedeModal] = useState<ApprovedFact | null>(null);
  const [newObjectValue, setNewObjectValue] = useState('');
  const [supersedeRationale, setSupersedeRationale] = useState('');
  const [supersedeSubmitting, setSupersedeSubmitting] = useState(false);
  const [supersedeSuccess, setSupersedeSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAllKnowledge();
  }, []);

  const loadAllKnowledge = async () => {
    try {
      setLoading(true);
      setError(null);
      const captureError = (err: any) => {
        console.error(err);
        setError(err?.message || 'Knowledge data could not be loaded.');
      };
      const [rList, sList, fList, cList, tList] = await Promise.all([
        api.getRules().catch((err) => { captureError(err); return [] as BrandRule[]; }),
        api.getSources().catch((err) => { captureError(err); return [] as SourceDocument[]; }),
        api.getFacts().catch((err) => { captureError(err); return [] as ApprovedFact[]; }),
        api.getClaims().catch((err) => { captureError(err); return [] as ApprovedClaim[]; }),
        api.getTerminology().catch((err) => { captureError(err); return [] as TerminologyEntry[]; }),
      ]);
      setRules(rList);
      setSources(sList);
      setFacts(fList);
      setClaims(cList);
      setTerminology(tList);
      if (rList.length > 0) setSelectedRule(rList[0]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Knowledge data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleCode || !newRuleTitle) return;
    const ruleCode = newRuleCode;
    try {
      const created = await api.createRule({
        rule_code: newRuleCode,
        category: newRuleCategory,
        title: newRuleTitle,
        description: newRuleDesc,
        rule_type: `${newRuleCategory}_DIRECTIVE`,
        severity: newRuleSeverity,
        owner: 'Brand Governance Council',
      });
      setRules(prev => [created, ...prev]);
      setSelectedRule(created);
      setShowNewRuleModal(false);
      setNewRuleCode('');
      setNewRuleTitle('');
      setNewRuleDesc('');
      toast.success('Rule published', `${ruleCode} is now active in the brand ground truth.`);
    } catch (err: any) {
      console.error(err);
      toast.error('Could not publish rule', err?.message);
    }
  };

  const handleSupersedeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supersedeModal || !newObjectValue || !supersedeRationale) return;
    const factCode = supersedeModal.fact_code;
    const newValue = newObjectValue;
    try {
      setSupersedeSubmitting(true);
      await api.supersedeFact(supersedeModal.id, {
        new_object_value: newObjectValue,
        change_rationale: supersedeRationale,
      });
      setSupersedeSuccess(`Successfully superseded ${factCode} -> new specification '${newValue}'. Affected assets now flagged in Risk Propagation.`);
      toast.success('Fact superseded', `${factCode} archived; affected assets are flagged for re-review.`);
      setSupersedeModal(null);
      setNewObjectValue('');
      setSupersedeRationale('');
      await loadAllKnowledge();
    } catch (err: any) {
      toast.error('Failed to supersede fact', err?.message);
    } finally {
      setSupersedeSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<BookOpen className="w-5 h-5" />}
        eyebrow="Versioned Ground Truth"
        title="Brand Knowledge Hub — The Ground Truth"
        description="Evidence-backed repository of source documents, section-coded passages, versioned brand rules, approved facts, and claims."
        actions={
          <Button
            onClick={() => setShowNewRuleModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Publish New Rule
          </Button>
        }
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-line gap-6 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'rules'
              ? 'text-ink border-vermilion font-bold'
              : 'text-ink-muted border-transparent hover:text-ink'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Brand Rules ({rules.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sources'
              ? 'text-ink border-vermilion font-bold'
              : 'text-ink-muted border-transparent hover:text-ink'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Source Documents ({sources.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('facts')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'facts'
              ? 'text-ink border-vermilion font-bold'
              : 'text-ink-muted border-transparent hover:text-ink'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Approved Facts ({facts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'claims'
              ? 'text-ink border-vermilion font-bold'
              : 'text-ink-muted border-transparent hover:text-ink'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Approved Claims ({claims.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('terms')}
          className={`pb-3 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'terms'
              ? 'text-ink border-vermilion font-bold'
              : 'text-ink-muted border-transparent hover:text-ink'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Terminology ({terminology.length})</span>
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={loadAllKnowledge} />}

      {/* TAB CONTENT: RULES & VERSION HISTORY */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Rules List (col-span-7) */}
          <Panel className="lg:col-span-7 p-5 space-y-3">
            <h2 className="text-sm font-bold text-ink mb-2">Active Organizational Brand Rules</h2>
            {loading ? (
              <Skeleton className="h-20 w-full" count={3} />
            ) : rules.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="w-4 h-4" />}
                title="No brand rules yet"
                description="Publish your first rule to establish versioned brand ground truth for every review."
                action={
                  <Button
                    size="sm"
                    onClick={() => setShowNewRuleModal(true)}
                    icon={<Plus className="w-4 h-4" />}
                  >
                    Publish New Rule
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {rules.map((r) => {
                  const isSelected = selectedRule?.id === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRule(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedRule(r);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      className={`p-3.5 rounded-md border transition cursor-pointer text-xs space-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/30 ${
                        isSelected
                          ? 'bg-white border-vermilion shadow-sm'
                          : 'bg-ivory border-line hover:border-line-strong'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-vermilion">{r.rule_code}</span>
                          <span className="font-semibold text-ink">{r.title}</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-inset text-ink-muted border border-line shrink-0">
                          v{r.current_version}
                        </span>
                      </div>
                      <p className="text-ink-muted line-clamp-2">{r.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-ink-muted pt-1">
                        <span>Category: <strong className="text-ink-soft">{r.category}</strong></span>
                        <span>Owner: <strong className="text-ink-soft">{r.owner}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Rule Version History & Detail Inspector (col-span-5) */}
          <Panel className="lg:col-span-5 p-5 space-y-4">
            <div className="border-b border-line pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-vermilion" />
                <h2 className="text-sm font-bold text-ink">Immutable Version History</h2>
              </div>
              {selectedRule && (
                <span className="text-xs font-mono text-teal-400">
                  {selectedRule.versions.length} Snapshots
                </span>
              )}
            </div>

            {loading ? (
              <Skeleton className="h-16 w-full" count={3} />
            ) : selectedRule ? (
              <div className="space-y-4">
                <div className="bg-ivory p-4 rounded-md border border-line space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink">{selectedRule.title}</span>
                    <span className="text-[10px] font-mono font-bold text-vermilion px-2 py-0.5 rounded bg-vermilion-tint border border-indigo-800/60 shrink-0">
                      Active v{selectedRule.current_version}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed">{selectedRule.description}</p>
                </div>

                {/* Versions Timeline */}
                <div>
                  <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">Audit Snapshots</h3>
                  <div className="space-y-2">
                    {selectedRule.versions.map((v, i) => (
                      <div key={v.id || i} className="p-3 bg-ivory rounded-md border border-line text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-vermilion">Version {v.version_number}</span>
                          <span className="text-[10px] text-ink-muted">Author: {v.author}</span>
                        </div>
                        <p className="text-[11px] text-ink-soft italic">
                          Rationale: "{v.change_rationale || '—'}"
                        </p>
                        {v.approved_by && (
                          <div className="flex items-center gap-1 text-[10px] text-teal-400 pt-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved by: {v.approved_by}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink-muted">Select a rule from the list to inspect version history.</p>
            )}
          </Panel>
        </div>
      )}

      {/* TAB CONTENT: SOURCE DOCUMENTS & PASSAGES */}
      {activeTab === 'sources' && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <Panel key={i} className="p-5 space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-12 w-full" />
                </Panel>
              ))}
            </div>
          ) : sources.length === 0 ? (
            <Panel className="p-5">
              <EmptyState
                icon={<FileText className="w-4 h-4" />}
                title="No source documents yet"
                description="Create a source document to ground brand rules in verifiable evidence — ingested documents appear here."
              />
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sources.map((doc) => (
                <Panel key={doc.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-vermilion-tint text-vermilion border border-indigo-800/60 uppercase font-bold">
                      {doc.doc_type}
                    </span>
                    <span className="text-xs font-mono text-ink-muted">v{doc.version}</span>
                  </div>
                  <h3 className="text-sm font-bold text-ink">{doc.title}</h3>
                  <div className="text-[11px] text-ink-muted space-y-1">
                    <p>Passages: <strong className="text-ink">{doc.passages.length} sections</strong></p>
                    <p>Authority: <strong className="text-ink">{doc.owner}</strong></p>
                    <p>Status: <strong className="text-teal-400">{doc.confidence_level}</strong></p>
                  </div>

                  <div className="pt-2 border-t border-line space-y-2">
                    <p className="text-[10px] uppercase font-bold text-ink-muted">Stored Passages:</p>
                    {doc.passages.map((p) => (
                      <div key={p.id} className="p-2 bg-ivory rounded-lg border border-line text-[11px] space-y-1">
                        <span className="font-mono text-vermilion text-[10px]">{p.section_code || `SEC-${p.passage_number}`}</span>
                        <p className="text-ink-soft italic font-serif">"{p.content.substring(0, 140)}..."</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: APPROVED FACTS */}
      {activeTab === 'facts' && (
        <Panel className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Approved & Verified Technical Facts</h2>
            <span className="text-[10px] text-ink-muted font-mono">Governed by Technical Authority Board</span>
          </div>

          {supersedeSuccess && (
            <div
              role="status"
              className="p-3 bg-teal-950 border border-teal-800 rounded-md text-xs text-teal-400 flex items-center justify-between"
            >
              <span>{supersedeSuccess}</span>
              <button
                onClick={() => setSupersedeSuccess(null)}
                aria-label="Dismiss supersede notice"
                className="text-teal-400 hover:text-ink font-bold ml-2"
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <Skeleton className="h-8 w-full" count={4} />
          ) : facts.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-4 h-4" />}
              title="No approved facts yet"
              description="Technical facts harvested from verified source passages appear here once approved."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-muted font-medium">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Predicate</th>
                    <th className="py-2.5 px-3">Object / Specification</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3 text-right">Governance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {facts.map((f) => (
                    <tr key={f.id} className="hover:bg-ivory/70 transition">
                      <td className="py-3 px-3 font-mono font-bold text-vermilion">{f.fact_code}</td>
                      <td className="py-3 px-3 text-ink font-semibold">{f.subject}</td>
                      <td className="py-3 px-3 text-ink-soft">{f.predicate}</td>
                      <td className="py-3 px-3 font-mono text-ink font-bold">{f.object_value}</td>
                      <td className="py-3 px-3">
                        <Badge tone={f.status === 'ACTIVE' ? 'success' : 'danger'}>
                          {f.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-ink-muted font-mono text-[11px]">{f.confidence_status}</td>
                      <td className="py-3 px-3 text-right">
                        {f.status === 'ACTIVE' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSupersedeModal(f);
                              setNewObjectValue('');
                              setSupersedeRationale('');
                            }}
                          >
                            Supersede Spec
                          </Button>
                        ) : (
                          <span className="text-[10px] text-ink-faint italic">Archived (v1)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* TAB CONTENT: APPROVED CLAIMS */}
      {activeTab === 'claims' && (
        <Panel className="p-5 space-y-4">
          <h2 className="text-sm font-bold text-ink">Approved Marketing Claims Repository</h2>
          {loading ? (
            <Skeleton className="h-24 w-full" count={3} />
          ) : claims.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-4 h-4" />}
              title="No approved claims yet"
              description="Marketing claims cleared by governance appear here with their approved safe wording."
            />
          ) : (
            <div className="space-y-3">
              {claims.map((c) => (
                <div key={c.id} className="p-4 rounded-md bg-ivory border border-line text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-vermilion">{c.claim_code}</span>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </div>
                  <p className="text-ink font-medium text-sm font-serif">"{c.claim_text}"</p>
                  {c.safe_wording && (
                    <div className="bg-teal-950 p-2.5 rounded-lg border border-teal-800/60">
                      <span className="text-[10px] font-bold uppercase block text-teal-400">Approved Safe Copy:</span>
                      <span className="text-ink-soft">{c.safe_wording}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* TAB CONTENT: TERMINOLOGY */}
      {activeTab === 'terms' && (
        <Panel className="p-5 space-y-4">
          <h2 className="text-sm font-bold text-ink">Brand Terminology & Prohibited Phrases</h2>
          {loading ? (
            <Skeleton className="h-8 w-full" count={4} />
          ) : terminology.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-4 h-4" />}
              title="No terminology entries yet"
              description="Prohibited and preferred term pairs appear here once registered with governance."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-muted font-medium">
                    <th className="py-2.5 px-3">Prohibited Term</th>
                    <th className="py-2.5 px-3">Mandatory Preferred Term</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Legal / Governance Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {terminology.map((t) => (
                    <tr key={t.id} className="hover:bg-ivory/70 transition">
                      <td className="py-3 px-3 font-mono text-red-400 font-bold line-through">
                        "{t.forbidden_term}"
                      </td>
                      <td className="py-3 px-3 font-mono text-teal-300 font-bold">
                        "{t.preferred_term}"
                      </td>
                      <td className="py-3 px-3">
                        <Badge tone="warning">{t.severity}</Badge>
                      </td>
                      <td className="py-3 px-3 text-ink-soft text-[11px] max-w-md">
                        {t.context_notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* New Rule Modal */}
      <Modal
        open={showNewRuleModal}
        onClose={() => setShowNewRuleModal(false)}
        title="Publish New Brand Governance Rule"
        description="Creates the first immutable version of this directive."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewRuleModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="new-rule-form"
              disabled={!newRuleCode || !newRuleTitle}
            >
              Publish Rule v1.0.0
            </Button>
          </>
        }
      >
        <form id="new-rule-form" onSubmit={handleCreateRule} className="space-y-3">
          <Field label="Rule Code" hint="e.g. RULE-TERM-03" required>
            <Input
              type="text"
              required
              value={newRuleCode}
              onChange={(e) => setNewRuleCode(e.target.value)}
              placeholder="RULE-TONE-02"
              className="font-mono"
            />
          </Field>

          <Field label="Rule Title" required>
            <Input
              type="text"
              required
              value={newRuleTitle}
              onChange={(e) => setNewRuleTitle(e.target.value)}
              placeholder="Measured Competitive Positioning"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select
                value={newRuleCategory}
                onChange={(e: any) => setNewRuleCategory(e.target.value)}
              >
                <option value="TONE">TONE</option>
                <option value="TERMINOLOGY">TERMINOLOGY</option>
                <option value="CLAIM">CLAIM</option>
                <option value="FACT">FACT</option>
                <option value="ACCESSIBILITY">ACCESSIBILITY</option>
              </Select>
            </Field>

            <Field label="Severity">
              <Select
                value={newRuleSeverity}
                onChange={(e: any) => setNewRuleSeverity(e.target.value)}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
              </Select>
            </Field>
          </div>

          <Field label="Detailed Description & Directive">
            <Textarea
              rows={3}
              value={newRuleDesc}
              onChange={(e) => setNewRuleDesc(e.target.value)}
              placeholder="Mandatory guideline directive for content creators..."
            />
          </Field>
        </form>
      </Modal>

      {/* MODAL: SUPERSEDE APPROVED FACT (SIGNATURE WORKFLOW) */}
      {supersedeModal && (
        <Modal
          open
          onClose={() => setSupersedeModal(null)}
          title="Supersede Approved Technical Fact"
          description="Signature Workflow: Versioned specification cascade"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSupersedeModal(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="supersede-fact-form"
                loading={supersedeSubmitting}
                disabled={!newObjectValue || !supersedeRationale}
              >
                {supersedeSubmitting ? 'Superseding...' : 'Confirm & Supersede Fact'}
              </Button>
            </>
          }
        >
          <div className="space-y-3.5">
            <div className="bg-ivory p-3.5 rounded-md border border-line space-y-1 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-vermilion font-bold">{supersedeModal.fact_code}</span>
                <span className="text-teal-400 font-semibold">{supersedeModal.confidence_status}</span>
              </div>
              <p className="text-ink font-medium">{supersedeModal.subject} — {supersedeModal.predicate}</p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-ink-muted">Current Specification:</span>
                <span className="px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-mono font-bold">
                  {supersedeModal.object_value}
                </span>
              </div>
            </div>

            <form id="supersede-fact-form" onSubmit={handleSupersedeSubmit} className="space-y-3.5">
              <Field label="New Approved Specification Value" required>
                <Input
                  type="text"
                  required
                  value={newObjectValue}
                  onChange={(e) => setNewObjectValue(e.target.value)}
                  className="font-mono"
                  placeholder="e.g. 99.99% or SOC 2 Type II (2026 Audit Complete)"
                />
              </Field>

              <Field label="Governance Change Rationale" required>
                <Textarea
                  rows={3}
                  required
                  value={supersedeRationale}
                  onChange={(e) => setSupersedeRationale(e.target.value)}
                  placeholder="Explain why this specification is being superseded and what authority approved it..."
                />
              </Field>

              <div className="p-3 bg-amber-950 border border-amber-800/60 rounded-md text-[11px] text-amber-300">
                <strong>Governance Rule:</strong> The previous fact will be archived as <em>SUPERSEDED</em> with an immutable historical timestamp. BrandSentinel will automatically flag all previously approved marketing collateral in the <em>Risk Propagation Center</em> for authorized re-review.
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
