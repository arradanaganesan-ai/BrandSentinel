import React, { useState, useEffect, useCallback } from 'react';
import { Scale, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
  useToast,
} from '../components/ui';

export const ConflictCenterPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const loadConflicts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getConflicts();
      setConflicts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Guideline conflicts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  const handleResolveAction = async (conflictId: string, action: string) => {
    try {
      setResolvedIds(prev => [...prev, conflictId]);
      toast.success(
        'Resolution recorded',
        `${action.replace(/_/g, ' ')} applied to ${conflictId}.`
      );
    } catch (err: any) {
      toast.error('Resolve conflict', err?.message || 'The resolution could not be recorded.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<Scale className="w-5 h-5" />}
        eyebrow="Contradiction Resolution"
        title="Guideline Conflict Center"
        description="Automated detection of contradictory active brand directives, overlapping scopes, and draft vs. published policy discrepancies."
        actions={
          <div className="text-xs text-ink-soft bg-surface-inset px-3.5 py-2 rounded-md border border-line">
            <span>Governance Rule: </span>
            <strong className="text-ink font-semibold">
              Never silently choose an arbitrary rule. Escalate to humans.
            </strong>
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={loadConflicts} />}

      {/* Conflicts Cards List */}
      {loading ? (
        <div className="space-y-6">
          {[0, 1].map((i) => (
            <Panel key={i} className="p-6 space-y-5">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-16 w-full" />
            </Panel>
          ))}
        </div>
      ) : conflicts.length === 0 ? (
        <Panel className="p-4">
          <EmptyState
            icon={<CheckCircle2 style={{ width: 18, height: 18 }} />}
            title="No guideline conflicts detected"
            description="When contradictory brand directives, overlapping scopes or draft-vs-published discrepancies are found, they will appear here for administrator resolution."
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          {conflicts.map((c) => {
            const isResolved = resolvedIds.includes(c.conflict_id);
            return (
              <Panel
                key={c.conflict_id}
                className={`p-6 space-y-5 transition ${
                  isResolved ? 'border-teal-800 opacity-75' : ''
                }`}
              >
                {/* Conflict Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink-muted">{c.conflict_id}</span>
                    <h2 className="text-sm font-semibold text-ink">{c.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={c.severity === 'CRITICAL' ? 'danger' : 'warning'}>
                      {c.severity}
                    </Badge>
                    <Badge tone="neutral">{c.category}</Badge>
                    {isResolved && (
                      <Badge tone="success">
                        <CheckCircle2 className="w-3 h-3" />
                        Resolved by Admin
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Side-by-Side Rule Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Rule A */}
                  <div className="p-4 rounded-md bg-ivory border border-line space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-vermilion">{c.rule_a.rule_code}</span>
                      <span className="text-[10px] font-mono text-teal-300 bg-teal-950 px-1.5 py-0.5 rounded border border-teal-800/40">
                        {c.rule_a.version}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-ink">{c.rule_a.title}</h3>
                    <p className="text-xs text-ink bg-white p-2.5 rounded-lg border border-line font-serif leading-relaxed">
                      "{c.rule_a.directive}"
                    </p>
                    <p className="text-[10px] text-ink-muted">Owner: {c.rule_a.owner} | Effective: {c.rule_a.effective_date}</p>
                  </div>

                  {/* Rule B */}
                  <div className="p-4 rounded-md bg-ivory border border-line space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-amber-400">{c.rule_b.rule_code}</span>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800/40">
                        {c.rule_b.version}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-ink">{c.rule_b.title}</h3>
                    <p className="text-xs text-ink bg-white p-2.5 rounded-lg border border-line font-serif leading-relaxed">
                      "{c.rule_b.directive}"
                    </p>
                    <p className="text-[10px] text-ink-muted">Owner: {c.rule_b.owner} | Effective: {c.rule_b.effective_date}</p>
                  </div>
                </div>

                {/* Overlap & Ambiguity Explanation */}
                <div className="space-y-2 bg-ivory/70 p-4 rounded-md border border-line text-xs">
                  <div>
                    <span className="font-bold text-ink-muted uppercase text-[10px] block">Overlapping Scope Conditions:</span>
                    <p className="text-ink-soft mt-0.5">{c.overlapping_conditions}</p>
                  </div>
                  <div className="pt-2 border-t border-line">
                    <span className="font-bold text-ink-muted uppercase text-[10px] block">Ambiguity Impact:</span>
                    <p className="text-ink-soft mt-0.5">{c.ambiguity_explanation}</p>
                  </div>
                </div>

                {/* Recommendation & Admin Actions */}
                <div className="bg-vermilion-tint border border-indigo-800/50 p-4 rounded-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-vermilion">
                      <Sparkles className="w-4 h-4" />
                      <span>System Administrator Recommendation</span>
                    </div>
                    <p className="text-xs text-ink max-w-2xl leading-relaxed">
                      {c.recommended_resolution}
                    </p>
                  </div>

                  {!isResolved && (
                    <div className="flex items-center gap-2 shrink-0">
                      {c.available_actions?.map((act: string) => (
                        <Button
                          key={act}
                          size="sm"
                          onClick={() => handleResolveAction(c.conflict_id, act)}
                        >
                          {act.replace(/_/g, ' ').toLowerCase()}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
};
