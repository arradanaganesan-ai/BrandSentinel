import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  History,
  Inbox,
} from 'lucide-react';
import { api } from '../api/client';
import { ContentItem, ApprovalDecision, User } from '../types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  Panel,
  Skeleton,
  statusTone,
  Textarea,
  useToast,
} from '../components/ui';

interface ApprovalWorkspacePageProps {
  currentUser: User | null;
}

export const ApprovalWorkspacePage: React.FC<ApprovalWorkspacePageProps> = ({ currentUser }) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [decisions, setDecisions] = useState<ApprovalDecision[]>([]);
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [decisionsLoading, setDecisionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadApprovalData();
  }, []);

  const loadApprovalData = async () => {
    try {
      setLoading(true);
      setError(null);
      const itemsList = await api.getContentItems();
      setItems(itemsList);
      if (itemsList.length > 0) {
        setSelectedItem(itemsList[0]);
        if (itemsList[0].latest_version) {
          loadDecisions(itemsList[0].latest_version.id);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Submissions awaiting sign-off could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const loadDecisions = async (versionId: string) => {
    try {
      setDecisionsLoading(true);
      const decs = await api.getVersionDecisions(versionId);
      setDecisions(decs);
    } catch (err) {
      console.error(err);
    } finally {
      setDecisionsLoading(false);
    }
  };

  const handleDecision = async (decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED') => {
    if (!selectedItem?.latest_version) return;
    if (!rationale.trim() || rationale.length < 10) {
      toast.error('Rationale required', 'Decision rationale must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitApprovalDecision(selectedItem.latest_version.id, {
        decision,
        rationale,
      });
      toast.success(`Decision '${decision}' successfully recorded`, 'Guideline snapshot attached to the decision.');
      setRationale('');
      await loadDecisions(selectedItem.latest_version.id);
      await loadApprovalData();
    } catch (err: any) {
      toast.error('Approval failed', err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canApprove = currentUser?.role === 'APPROVER' || currentUser?.role === 'ORG_ADMIN' || currentUser?.role === 'LEGAL_COMPLIANCE';
  /* UX gate only — the server enforces the same rule before recording a decision */
  const rationaleValid = rationale.trim().length >= 10;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<CheckSquare className="w-5 h-5" aria-hidden />}
        eyebrow="Sign-off Gate"
        title="Approval Workspace — Human Accountability Gate"
        description="Formal review gating with mandatory rationale, server-enforced role permissions, and immutable guideline version snapshots."
        actions={
          <div className="text-xs text-ink-muted bg-white border border-line rounded-md px-3.5 py-2 shadow-xs">
            <span>Active Role: </span>
            <strong className="text-teal-400 uppercase">{currentUser?.role || '—'}</strong>
            {!canApprove && (
              <p className="text-[10px] text-amber-300 mt-0.5">
                Switch to 'Approver' (David Vance) to sign off
              </p>
            )}
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={loadApprovalData} />}

      {/* Grid: Pending Submissions & Sign-off Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pending Content Drafts (col-span-5) */}
        <Panel className="lg:col-span-5 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink border-b border-line pb-3">
            Submissions Requiring Sign-off
          </h2>

          <div className="space-y-3">
            {loading ? (
              <Skeleton className="h-24 w-full" count={3} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Inbox className="w-4 h-4" />}
                title="No submissions awaiting sign-off"
                description="Drafts submitted for governance review will appear here once they are ready for a formal decision."
                className="py-8"
              />
            ) : (
              items.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      if (item.latest_version) loadDecisions(item.latest_version.id);
                    }}
                    className={`w-full text-left p-4 rounded-md border transition cursor-pointer text-xs space-y-2 ${
                      isSelected
                        ? 'bg-vermilion-tint border-vermilion shadow-xs'
                        : 'bg-white border-line hover:bg-ivory/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{item.title}</span>
                      <Badge tone={statusTone(item.current_status)}>
                        {item.current_status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-ink-muted font-mono text-[11px]">
                      Type: {item.content_type} | Campaign: {item.campaign || 'Corporate'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-ink-faint pt-1">
                      <span>
                        Latest Version:{' '}
                        <strong className="text-ink-soft">
                          {item.latest_version ? `v${item.latest_version.version_number}` : '—'}
                        </strong>
                      </span>
                      <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        {/* Right: Decision Action & History (col-span-7) */}
        <Panel className="lg:col-span-7 p-5 space-y-5">
          <div className="border-b border-line pb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Executive Decision Action</h2>
            {selectedItem?.latest_version && (
              <span className="text-xs font-mono text-vermilion">
                Gating Version {selectedItem.latest_version.version_number}
              </span>
            )}
          </div>

          {selectedItem?.latest_version ? (
            <div className="space-y-4">
              {/* Draft Preview Box */}
              <div className="p-3.5 bg-ivory rounded-md border border-line space-y-1">
                <span className="text-[10px] uppercase font-bold text-ink-faint">Version Preview Snippet:</span>
                <p className="text-xs text-ink font-serif leading-relaxed line-clamp-3">
                  "{selectedItem.latest_version.raw_text}"
                </p>
              </div>

              {/* Rationale Input */}
              <Field
                label="Mandatory Decision Rationale & Governance Justification"
                required
                hint="Minimum 10 characters explaining compliance rationale."
              >
                <Textarea
                  rows={4}
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  disabled={!canApprove}
                  placeholder={canApprove ? "Detail legal, compliance, and factual review basis (required for audit logging)..." : "You do not have approval permissions. Switch to an Approver role."}
                  className="disabled:opacity-50"
                />
              </Field>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <Button
                  onClick={() => handleDecision('APPROVED')}
                  disabled={!canApprove || !rationaleValid}
                  loading={isSubmitting}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Grant Approval
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => handleDecision('CHANGES_REQUESTED')}
                  disabled={!canApprove || !rationaleValid}
                  loading={isSubmitting}
                  icon={<AlertTriangle className="w-4 h-4" />}
                >
                  Request Changes
                </Button>

                <Button
                  variant="danger"
                  onClick={() => handleDecision('REJECTED')}
                  disabled={!canApprove || !rationaleValid}
                  loading={isSubmitting}
                  icon={<XCircle className="w-4 h-4" />}
                >
                  Reject Draft
                </Button>
              </div>

              {/* Historical Decisions Recorded */}
              <div className="pt-4 border-t border-line space-y-3">
                <h3 className="text-xs font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-vermilion" aria-hidden />
                  <span>Immutable Sign-off Records ({decisions.length})</span>
                </h3>

                <div className="space-y-2">
                  {decisionsLoading ? (
                    <Skeleton className="h-16 w-full" count={2} />
                  ) : decisions.length === 0 ? (
                    <EmptyState
                      title="No sign-off records yet"
                      description="Decisions recorded against this version will appear here with their rationale and authority."
                      className="py-6"
                    />
                  ) : (
                    decisions.map((d) => (
                      <div key={d.id} className="p-3 bg-surface-alt rounded-md border border-line text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={statusTone(d.decision)}>
                            {d.decision.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-[10px] text-ink-faint">{new Date(d.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-ink-soft italic font-serif">"{d.rationale}"</p>
                        <p className="text-[10px] text-ink-muted">
                          Sign-off Authority: <strong className="text-ink">{d.approver_name || '—'}</strong>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : selectedItem ? (
            <EmptyState
              title="No version to gate"
              description="This draft has no submitted version yet. Submit a version from the Review Studio to request sign-off."
              className="py-10"
            />
          ) : (
            <EmptyState
              title="No submission selected"
              description="Select a submission from the left list to review and decide."
              className="py-10"
            />
          )}
        </Panel>
      </div>
    </div>
  );
};
