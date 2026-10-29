import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Check, 
  X, 
  Flag, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  FileText, 
  GitCompare, 
  MessageSquare, 
  Send,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Copy
} from 'lucide-react';
import { api } from '../api/client';
import { ContentItem, ContentVersion, Finding, Comment, VersionDiff, User } from '../types';
import { Button, EmptyState, ErrorState, Panel, Skeleton, Textarea, useToast } from '../components/ui';

interface ReviewStudioPageProps {
  currentUser: User | null;
}

export const ReviewStudioPage: React.FC<ReviewStudioPageProps> = ({ currentUser }) => {
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(null);
  const [draftText, setDraftText] = useState('');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [centerTab, setCenterTab] = useState<'document' | 'diff' | 'raw_editor'>('document');
  const [diffData, setDiffData] = useState<VersionDiff | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'findings' | 'comments'>('findings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await api.getContentItems();
      setContentItems(items);
      if (items.length > 0) {
        const item = items[0];
        setSelectedItem(item);
        if (item.latest_version) {
          setSelectedVersion(item.latest_version);
          setDraftText(item.latest_version.raw_text);
          await loadFindingsAndComments(item.latest_version.id);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Content items could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const loadFindingsAndComments = async (versionId: string) => {
    try {
      const [fList, cList] = await Promise.all([
        api.getFindings(versionId).catch((err: any) => {
          setError(err?.message || 'Findings could not be loaded.');
          return [] as Finding[];
        }),
        api.getVersionComments(versionId).catch((err: any) => {
          setError(err?.message || 'Comments could not be loaded.');
          return [] as Comment[];
        }),
      ]);
      setFindings(fList);
      setComments(cList);
      if (fList.length > 0) {
        setSelectedFindingId(fList[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Findings and comments could not be loaded.');
    }
  };

  const handleRunReview = async () => {
    if (!selectedVersion) return;
    setIsReviewing(true);
    setStatusMessage('Executing hybrid deterministic checks and Claim DNA decomposition...');
    try {
      await api.executeReview(selectedVersion.id, 'HYBRID_AI_DETERMINISTIC');
      await loadFindingsAndComments(selectedVersion.id);
      setStatusMessage('Review complete. Structured findings and evidence passages loaded.');
      toast.success('Review complete', 'Structured findings and evidence passages loaded.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`);
      toast.error('Governance review failed', err.message);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleAcceptSuggestion = async (finding: Finding) => {
    if (!finding.suggested_correction) return;
    // Substitute affected passage with suggested correction in draftText
    const newText = draftText.replace(finding.affected_passage, finding.suggested_correction);
    setDraftText(newText);

    // Update finding status on backend
    try {
      await api.updateFindingStatus(finding.id, 'ACCEPTED_SUGGESTION');
      setFindings(prev => prev.map(f => f.id === finding.id ? { ...f, status: 'ACCEPTED_SUGGESTION' } : f));
      toast.success('Suggestion accepted', 'The suggested wording was applied to your draft.');
    } catch (err: any) {
      toast.error('Could not accept suggestion', err.message);
    }
  };

  const handleRejectSuggestion = async (findingId: string) => {
    try {
      await api.updateFindingStatus(findingId, 'REJECTED_SUGGESTION');
      setFindings(prev => prev.map(f => f.id === findingId ? { ...f, status: 'REJECTED_SUGGESTION' } : f));
      toast.success('Suggestion rejected', 'The finding was marked as rejected.');
    } catch (err: any) {
      toast.error('Could not reject suggestion', err.message);
    }
  };

  const handleFlagForReview = async (findingId: string) => {
    try {
      await api.updateFindingStatus(findingId, 'FLAGGED_FOR_REVIEW');
      setFindings(prev => prev.map(f => f.id === findingId ? { ...f, status: 'FLAGGED_FOR_REVIEW' } : f));
      toast.success('Finding flagged', 'Sent for legal/brand human review.');
    } catch (err: any) {
      toast.error('Could not flag finding', err.message);
    }
  };

  const handleSaveRevision = async () => {
    if (!selectedItem || !selectedVersion) return;
    setIsSaving(true);
    try {
      const newVer = await api.createRevision(selectedItem.id, {
        raw_text: draftText,
        parent_version_id: selectedVersion.id,
      });
      setSelectedVersion(newVer);
      setStatusMessage(`Revision v${newVer.version_number} saved and resubmitted.`);
      toast.success('Revision saved', `Revision v${newVer.version_number} saved and resubmitted.`);
      
      // Load Diff comparison against parent
      const diff = await api.getVersionDiff(selectedItem.id, selectedVersion.version_number, newVer.version_number);
      setDiffData(diff);
      setCenterTab('diff');

      // Auto-trigger review on new revision
      await api.executeReview(newVer.id);
      await loadFindingsAndComments(newVer.id);
    } catch (err: any) {
      setStatusMessage(`Failed to save revision: ${err.message}`);
      toast.error('Failed to save revision', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadDiff = async () => {
    if (!selectedItem || !selectedVersion) return;
    try {
      const vComp = selectedVersion.version_number;
      const vBase = Math.max(1, vComp - 1);
      const diff = await api.getVersionDiff(selectedItem.id, vBase, vComp);
      setDiffData(diff);
      setCenterTab('diff');
    } catch (err: any) {
      setError(err?.message || 'Diff comparison could not be loaded.');
    }
  };

  const handlePostComment = async () => {
    if (!selectedVersion || !newCommentText.trim()) return;
    try {
      const userRole = currentUser?.role || 'CONTENT_CREATOR';
      const c = await api.postComment(selectedVersion.id, {
        message: newCommentText,
        finding_id: selectedFindingId || undefined,
        role_tag: userRole,
      });
      setComments(prev => [...prev, c]);
      setNewCommentText('');
      toast.success('Comment posted', 'Your reviewer comment was added to this version.');
    } catch (err: any) {
      toast.error('Comment not posted', err.message);
    }
  };

  // Helper to render inline highlighted document text
  const renderHighlightedDocument = () => {
    if (!selectedVersion) {
      return <EmptyState icon={<FileText className="w-4 h-4" />} title="No content loaded" />;
    }
    let text = draftText;

    // Build segments by finding offsets
    const sorted = [...findings].filter(f => f.start_offset !== undefined && f.end_offset !== undefined)
      .sort((a, b) => (a.start_offset || 0) - (b.start_offset || 0));

    if (sorted.length === 0) {
      return <div className="whitespace-pre-wrap leading-relaxed text-ink text-sm">{text}</div>;
    }

    let elements = [];
    let lastIndex = 0;

    sorted.forEach((f, idx) => {
      const start = f.start_offset || 0;
      const end = f.end_offset || 0;

      if (start > lastIndex && start <= text.length) {
        elements.push(
          <span key={`text-${idx}`}>{text.substring(lastIndex, start)}</span>
        );
      }

      const isSelected = selectedFindingId === f.id;
      let badgeColor = 'bg-amber-950/70 border-amber-600 text-amber-300';
      if (f.severity === 'CRITICAL') badgeColor = 'bg-red-950/80 border-red-500 text-red-300';
      if (f.category === 'CLAIM') badgeColor = 'bg-pink-950/80 border-pink-500 text-pink-300';
      if (f.status === 'ACCEPTED_SUGGESTION') badgeColor = 'bg-emerald-950/70 border-emerald-500 line-through text-emerald-300';

      elements.push(
        <mark
          key={`highlight-${idx}`}
          onClick={() => setSelectedFindingId(f.id)}
          className={`cursor-pointer px-1 py-0.5 rounded border transition inline font-medium ${badgeColor} ${
            isSelected ? 'ring-2 ring-vermilion shadow-md' : 'hover:opacity-90'
          }`}
          title={`[${f.category}] ${f.explanation}`}
        >
          {text.substring(start, end) || f.affected_passage}
        </mark>
      );

      lastIndex = Math.max(lastIndex, end);
    });

    if (lastIndex < text.length) {
      elements.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-ink text-sm font-serif sm:text-base">
        {elements}
      </div>
    );
  };

  const activeFinding = findings.find(f => f.id === selectedFindingId) || findings[0];

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 shrink-0 rounded-md bg-white border border-line shadow-xs flex items-center justify-center text-vermilion">
            <FileText className="w-5 h-5" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-vermilion mb-1">
              Review Studio
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[26px] leading-tight font-semibold font-display text-ink tracking-tight">
                {selectedItem?.title || 'Review Studio'}
              </h1>
              {selectedVersion && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-semibold">
                  Version {selectedVersion.version_number}
                </span>
              )}
              {selectedItem?.current_status && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-semibold">
                  {selectedItem.current_status}
                </span>
              )}
            </div>
            <p className="text-[13px] text-ink-muted mt-1 max-w-2xl leading-relaxed">
              Interactive pre-publication inspection with evidence citation and diff intelligence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleRunReview}
            loading={isReviewing}
            icon={<Play className="w-3.5 h-3.5" />}
          >
            {isReviewing ? 'Reviewing Engine...' : 'Run Governance Review'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleSaveRevision}
            loading={isSaving}
            icon={<Check className="w-3.5 h-3.5 text-teal-400" />}
          >
            {isSaving ? 'Saving...' : 'Save Revision v2'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleLoadDiff}
            icon={<GitCompare className="w-3.5 h-3.5 text-pink-400" />}
            title="Inspect Review Diff Intelligence"
          >
            <span className="hidden sm:inline">Diff</span>
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadItems} />}

      {statusMessage && (
        <div className="p-3 bg-surface-alt border border-line rounded-md text-xs text-ink-soft shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            aria-label="Dismiss status message"
            className="text-ink-faint hover:text-ink transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Three Panel Studio Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ======================================================== */}
        {/* LEFT PANEL: Metadata & Document Configuration (col-span-3) */}
        {/* ======================================================== */}
        <Panel className="lg:col-span-3 p-4 space-y-4 flex flex-col justify-between">
          {loading ? (
            <Skeleton className="h-4 w-full" count={6} />
          ) : (
            <>
              <div className="space-y-4">
                <h2 className="text-xs font-bold text-ink uppercase tracking-wider pb-2 border-b border-line">
                  Draft Metadata & Policy
                </h2>

                <div>
                  <label className="text-[11px] font-semibold text-ink-muted block mb-1">Content Type</label>
                  <div className="p-2 bg-ivory rounded-md border border-line text-xs text-ink font-mono">
                    {selectedItem?.content_type || '—'}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink-muted block mb-1">Campaign</label>
                  <div className="p-2 bg-ivory rounded-md border border-line text-xs text-ink">
                    {selectedItem?.campaign || '—'}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink-muted block mb-1">Target Audience</label>
                  <div className="p-2 bg-ivory rounded-md border border-line text-xs text-ink">
                    {selectedItem?.target_audience || '—'}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink-muted block mb-1">Draft Version</label>
                  <div className="p-2 bg-ivory rounded-md border border-line text-xs text-vermilion font-mono flex items-center justify-between">
                    <span>Version {selectedVersion?.version_number ?? '—'}</span>
                    <span className="text-[10px] text-ink-muted">Active Snapshot</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-ink-muted block mb-1">Word Count & Metrics</label>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-ivory p-2 rounded-md border border-line">
                      <span className="text-[10px] text-ink-muted">Words</span>
                      <p className="font-bold font-mono text-ink mt-0.5">{draftText.split(/\s+/).filter(Boolean).length}</p>
                    </div>
                    <div className="bg-ivory p-2 rounded-md border border-line">
                      <span className="text-[10px] text-ink-muted">Findings</span>
                      <p className="font-bold font-mono text-amber-400 mt-0.5">{findings.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-surface-inset rounded-md border border-line text-[11px] text-ink-muted space-y-1">
                <p className="font-semibold text-ink-soft">Policy Gating Check:</p>
                <p className="text-teal-400">✓ Northstar Style Manual v3.2</p>
                <p className="text-teal-400">✓ 2026 Benchmark Scope Gate</p>
                <p className="text-teal-400">✓ SOC 2 Type II Veracity</p>
              </div>
            </>
          )}
        </Panel>

        {/* ======================================================== */}
        {/* CENTER PANEL: Document Content & Highlights (col-span-5) */}
        {/* ======================================================== */}
        <Panel className="lg:col-span-5 p-5 flex flex-col justify-between">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCenterTab('document')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border inline-flex items-center gap-1.5 ${
                    centerTab === 'document'
                      ? 'bg-white text-ink border-line shadow-xs'
                      : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-inset'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      centerTab === 'document' ? 'bg-vermilion' : 'bg-transparent'
                    }`}
                    aria-hidden
                  />
                  Live Document
                </button>
                <button
                  onClick={() => setCenterTab('diff')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border inline-flex items-center gap-1.5 ${
                    centerTab === 'diff'
                      ? 'bg-white text-ink border-line shadow-xs'
                      : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-inset'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      centerTab === 'diff' ? 'bg-vermilion' : 'bg-transparent'
                    }`}
                    aria-hidden
                  />
                  Review Diff Intelligence
                </button>
                <button
                  onClick={() => setCenterTab('raw_editor')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border inline-flex items-center gap-1.5 ${
                    centerTab === 'raw_editor'
                      ? 'bg-white text-ink border-line shadow-xs'
                      : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-inset'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      centerTab === 'raw_editor' ? 'bg-vermilion' : 'bg-transparent'
                    }`}
                    aria-hidden
                  />
                  Edit Copy
                </button>
              </div>

              <span className="text-[11px] text-ink-muted">
                {findings.length} inline markers
              </span>
            </div>

            {/* View Tab: Document Mode */}
            {centerTab === 'document' && (
              <div className="p-4 rounded-md bg-ivory border border-line min-h-[380px] overflow-y-auto">
                {renderHighlightedDocument()}
              </div>
            )}

            {/* View Tab: Review Diff Intelligence */}
            {centerTab === 'diff' && (
              <div className="space-y-4 min-h-[380px] overflow-y-auto">
                {diffData && (
                  <div className="p-3 bg-ivory rounded-md border border-line text-xs flex items-center justify-between">
                    <span className="text-ink-soft font-medium">
                      Comparing Version {diffData.base_version} → Version {diffData.compare_version}
                    </span>
                    <span className="text-teal-400 font-mono">
                      {diffData.resolved_count} findings resolved by edit
                    </span>
                  </div>
                )}

                {diffData?.diff_chunks ? (
                  <div className="p-4 rounded-md bg-ivory border border-line text-sm leading-relaxed whitespace-pre-wrap">
                    {diffData.diff_chunks.map((c, i) => {
                      if (c.type === 'inserted') {
                        return <span key={i} className="bg-emerald-950 text-emerald-300 border-b-2 border-emerald-500 px-1">{c.text} </span>;
                      }
                      if (c.type === 'removed') {
                        return <span key={i} className="bg-red-950 text-red-300 line-through opacity-70 px-1">{c.text} </span>;
                      }
                      return <span key={i} className="text-slate-300">{c.text} </span>;
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={<GitCompare className="w-4 h-4" />}
                    title="No diff intelligence yet"
                    description={'Click "Save Revision v2" after editing or accepting suggestions to generate diff intelligence.'}
                    className="py-10"
                  />
                )}
              </div>
            )}

            {/* View Tab: Raw Text Editor */}
            {centerTab === 'raw_editor' && (
              <div>
                <Textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  className="h-80 font-mono"
                  placeholder="Paste or write draft copy here..."
                />
              </div>
            )}
          </div>

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-[11px] text-ink-muted">
                <span>Tip: Click highlighted text to inspect evidence citation on the right</span>
                <span className="font-mono">Offsets validated server-side</span>
              </div>
            </>
          )}
        </Panel>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Structured Findings & Evidence (col-span-4)  */}
        {/* ======================================================== */}
        <Panel className="lg:col-span-4 p-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Tabs: Findings vs Comments */}
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setRightPanelTab('findings')}
                  className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${
                    rightPanelTab === 'findings'
                      ? 'text-ink border-vermilion'
                      : 'text-ink-muted border-transparent hover:text-ink'
                  }`}
                >
                  Findings ({findings.length})
                </button>
                <button
                  onClick={() => setRightPanelTab('comments')}
                  className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors ${
                    rightPanelTab === 'comments'
                      ? 'text-ink border-vermilion'
                      : 'text-ink-muted border-transparent hover:text-ink'
                  }`}
                >
                  Comments ({comments.length})
                </button>
              </div>

              <span className="text-[10px] font-mono text-ink-muted">
                Calibrated AI + Rules
              </span>
            </div>

            {/* TAB: FINDINGS INSPECTOR */}
            {rightPanelTab === 'findings' &&
              (loading ? (
                <Skeleton className="h-28 w-full" count={3} />
              ) : findings.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  title="No findings yet"
                  description="Run the governance review to generate structured findings for this version."
                  action={
                    <Button size="sm" onClick={handleRunReview} loading={isReviewing}>
                      Run Governance Review
                    </Button>
                  }
                />
              ) : (
              <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                {findings.map((f) => {
                  const isSelected = selectedFindingId === f.id;
                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFindingId(f.id)}
                      className={`p-3.5 rounded-md border transition cursor-pointer text-xs space-y-2.5 ${
                        isSelected
                          ? 'bg-white border-vermilion shadow-sm ring-1 ring-vermilion/25'
                          : 'bg-ivory border-line hover:border-line-strong'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                            f.severity === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                            f.severity === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          }`}>
                            {f.severity}
                          </span>
                          <span className="text-[10px] font-mono text-slate-300 font-semibold">{f.category}</span>
                        </div>

                        <span className="text-[10px] font-mono text-teal-400 bg-teal-950/50 px-1.5 py-0.5 rounded border border-teal-800/40">
                          {f.finding_type}
                        </span>
                      </div>

                      {/* Affected Passage Snippet */}
                      <div className="bg-white p-2 rounded-md border border-line font-mono text-[11px] text-ink">
                        "{f.affected_passage}"
                      </div>

                      {/* Explanation */}
                      <p className="text-slate-300 text-xs leading-relaxed">
                        {f.explanation}
                      </p>

                      {/* Suggested Correction */}
                      {f.suggested_correction && (
                        <div className="bg-teal-950/30 border border-teal-800/40 p-2.5 rounded-md space-y-1">
                          <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wide">
                            Suggested Safer Wording
                          </p>
                          <p className="text-xs text-slate-200 font-medium">
                            {f.suggested_correction}
                          </p>
                        </div>
                      )}

                      {/* Verified Evidence Citation */}
                      {f.evidence_items && f.evidence_items.length > 0 && (
                        <div className="bg-white border border-line p-2.5 rounded-md space-y-1">
                          <div className="flex items-center gap-1 text-[10px] text-indigo-300 font-semibold uppercase">
                            <BookOpen className="w-3 h-3 text-indigo-400" />
                            <span>Source: {f.evidence_items[0].source_title} ({f.evidence_items[0].source_version})</span>
                          </div>
                          <p className="text-[11px] text-slate-400 italic">
                            "{f.evidence_items[0].citation_quote}"
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-line">
                        {f.suggested_correction && f.status !== 'ACCEPTED_SUGGESTION' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptSuggestion(f);
                            }}
                            className="flex-1 py-1.5 rounded-md bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept</span>
                          </button>
                        )}

                        {f.status !== 'REJECTED_SUGGESTION' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectSuggestion(f.id);
                            }}
                            className="py-1.5 px-2.5 rounded-md bg-white border border-line text-ink-muted hover:text-ink hover:bg-surface-inset text-[11px] transition"
                            title="Reject suggestion"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFlagForReview(f.id);
                          }}
                          className="py-1.5 px-2.5 rounded-md bg-white border border-line text-amber-400 hover:bg-surface-inset text-[11px] transition"
                          title="Flag for Legal/Brand Human Review"
                        >
                          <Flag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              ))}

            {/* TAB: COLLABORATION COMMENTS */}
            {rightPanelTab === 'comments' && (
              <div className="space-y-4 max-h-[540px] overflow-y-auto">
                {loading ? (
                  <Skeleton className="h-16 w-full" count={2} />
                ) : comments.length === 0 ? (
                  <EmptyState
                    icon={<MessageSquare className="w-4 h-4" />}
                    title="No comments yet"
                    description="Reviewer guidance and rationale posted here will appear in this thread."
                    className="py-8"
                  />
                ) : (
                  <div className="space-y-2.5">
                    {comments.map((c) => (
                      <div key={c.id} className="p-3 bg-ivory rounded-md border border-line text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink">{c.user_name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {c.role_tag}
                          </span>
                        </div>
                        <p className="text-ink-soft leading-relaxed">{c.message}</p>
                        <span className="text-[9px] text-ink-faint block">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-line space-y-2">
                  <Textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Add reviewer guidance or rationale..."
                    rows={3}
                  />
                  <Button
                    onClick={handlePostComment}
                    icon={<Send className="w-3.5 h-3.5" />}
                    className="w-full"
                  >
                    Post Reviewer Comment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};
