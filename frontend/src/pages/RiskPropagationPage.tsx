import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  CheckCircle2,
  Send,
} from 'lucide-react';
import { api } from '../api/client';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
  statusTone,
  useToast,
} from '../components/ui';

export const RiskPropagationPage: React.FC = () => {
  const [riskData, setRiskData] = useState<any>(null);
  const [reReviewRequested, setReReviewRequested] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadRiskData();
  }, []);

  const loadRiskData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRiskPropagation();
      setRiskData(data);
    } catch (err: any) {
      setError(err?.message || 'Risk propagation data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReReview = async (itemId: string, itemTitle: string) => {
    try {
      await api.requestReReview({
        content_item_id: itemId,
        reason: "Source specification/approved fact was superseded. Mandating compliance re-review.",
      });
      setReReviewRequested(prev => [...prev, itemId]);
      toast.success('Re-review requested', `A collateral re-review was dispatched for “${itemTitle}”.`);
      loadRiskData();
    } catch (err: any) {
      toast.error('Re-review request failed', err?.message || 'The request could not be dispatched.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<AlertOctagon className="w-5 h-5" aria-hidden />}
        eyebrow="Signature Workflow"
        title="Risk Propagation Center — Cascading Governance Impact"
        description="Tracing downstream impact when brand guidelines or product specifications are modified or superseded."
        actions={
          <div className="text-xs bg-red-950 border border-red-800/70 rounded-md px-3.5 py-2 max-w-md">
            <p className="font-semibold text-red-300">Preservation Principle:</p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Historical approvals are never silently rewritten. A change in source fact signals
              potential risk, prompting human re-review.
            </p>
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={loadRiskData} />}

      {loading && (
        <>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-48 w-full" count={2} />
        </>
      )}

      {!loading && !error && riskData && (
        <>
          {/* Root Cause Banner */}
          <Panel className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" aria-hidden />
              <span className="text-ink font-semibold">Root Cause Telemetry:</span>
              <span className="text-ink-muted font-medium">
                {riskData.root_cause_summary ?? '—'}
              </span>
            </div>
            <Badge tone={riskData.high_risk_propagations > 0 ? 'danger' : 'success'}>
              {riskData.high_risk_propagations ?? 0} Critical Propagations
            </Badge>
          </Panel>

          {/* Affected Documents List */}
          {!riskData.affected_items?.length ? (
            <Panel>
              <EmptyState
                icon={<CheckCircle2 className="w-4 h-4" />}
                title="No collateral references a superseded specification"
                description="Nothing downstream is affected right now. When a fact or guideline is superseded in the Knowledge Hub, every approved asset that relies on it will be listed here for re-review."
              />
            </Panel>
          ) : (
            <div className="space-y-4">
              {riskData.affected_items.map((item: any, i: number) => {
                const isRequested = reReviewRequested.includes(item.content_item_id);
                return (
                  <Panel key={i} className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-ink">{item.content_title}</h2>
                          <Badge tone="brand" className="font-mono">
                            Version {item.version_number}
                          </Badge>
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">
                          Asset Type: {item.content_type} | Last Reviewed:{' '}
                          {item.last_reviewed_at ?? '—'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge tone={statusTone(item.severity)} className="font-mono">
                          {item.severity}
                        </Badge>
                        <Badge tone="success" className="font-mono">
                          Prior Status: {item.current_content_status}
                        </Badge>
                      </div>
                    </div>

                    {/* Cascade Path Visual */}
                    <div className="bg-surface-inset p-3 rounded-md border border-line text-xs font-mono text-ink-soft flex items-center gap-2 overflow-x-auto">
                      <span className="text-ink-muted uppercase text-[10px] font-bold shrink-0">
                        Propagation Path:
                      </span>
                      <span className="text-vermilion font-semibold">{item.propagation_path}</span>
                    </div>

                    {/* Element & Action Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-surface-inset rounded-md border border-line space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-300">
                          Referenced Superseded Element:
                        </span>
                        <p className="text-ink font-semibold">{item.referenced_element}</p>
                        <p className="text-[11px] text-ink-muted">
                          This specification was officially superseded in active brand knowledge.
                        </p>
                      </div>

                      <div className="p-3 bg-surface-inset rounded-md border border-line space-y-1">
                        <span className="text-[10px] uppercase font-bold text-teal-400">
                          Suggested Remediation Action:
                        </span>
                        <p className="text-ink-soft">{item.suggested_action}</p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 flex justify-end">
                      {isRequested ? (
                        <div className="flex items-center gap-1.5 text-xs text-teal-400 font-semibold bg-teal-950 border border-teal-800/70 px-3 py-1.5 rounded-md">
                          <CheckCircle2 className="w-4 h-4" aria-hidden />
                          <span>Re-Review Ticket Dispatched to Author</span>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          icon={<Send className="w-3.5 h-3.5" />}
                          onClick={() =>
                            handleRequestReReview(item.content_item_id, item.content_title)
                          }
                        >
                          Request Re-Review & Flag Asset
                        </Button>
                      )}
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
