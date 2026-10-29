import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  FileCode,
} from 'lucide-react';
import { api } from '../api/client';
import { AuditEvent } from '../types';
import {
  Badge,
  BadgeTone,
  Button,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  Panel,
  Skeleton,
} from '../components/ui';

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAuditEvents();
  }, []);

  const loadAuditEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAuditEvents(100);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Audit events could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleTone = (role: string): BadgeTone => {
    switch (role) {
      case 'ORG_ADMIN': return 'violet';
      case 'APPROVER': return 'success';
      case 'LEGAL_COMPLIANCE': return 'warning';
      case 'BRAND_MANAGER': return 'info';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<History className="w-5 h-5" aria-hidden />}
        eyebrow="Tamper-Evident Ledger"
        title="Audit Trail & Governance Ledger"
        description="Append-only event log capturing every review run, suggestion decision, revision diff, and executive approval."
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={loadAuditEvents}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            Refresh Ledger
          </Button>
        }
      />

      {error && <ErrorState message={error} onRetry={loadAuditEvents} />}

      {/* Events Table */}
      <Panel className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ink uppercase tracking-wider">
            Recorded Governance Events{' '}
            {!loading && !error ? `(${events.length})` : ''}
          </span>
          <span className="text-xs font-mono text-ink-faint">Server-Side Verified</span>
        </div>

        {loading ? (
          <Skeleton className="h-9 w-full" count={6} />
        ) : !error && events.length === 0 ? (
          <EmptyState
            icon={<History className="w-4 h-4" />}
            title="No audit events recorded yet"
            description="Every review run, decision, revision and approval is written to this ledger as it happens. Perform an action in the Review Studio and it will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-muted font-medium">
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Actor & Role</th>
                  <th className="py-2.5 px-3">Action Type</th>
                  <th className="py-2.5 px-3">Event Description</th>
                  <th className="py-2.5 px-3 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-ivory/70 transition">
                    <td className="py-3 px-3 font-mono text-ink-faint text-[11px]">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-ink block">{e.actor_name}</span>
                      <Badge tone={getRoleTone(e.actor_role)} className="mt-0.5 font-mono">
                        {e.actor_role.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-vermilion font-semibold">
                      {e.action_type}
                    </td>
                    <td className="py-3 px-3 text-ink-soft max-w-md">
                      {e.description}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(e)}
                        className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-surface-inset transition"
                        title="Inspect event JSON payload"
                        aria-label={`Inspect JSON payload for ${e.action_type}`}
                      >
                        <FileCode className="w-4 h-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Payload Modal */}
      <Modal
        open={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent ? `AuditEvent: ${selectedEvent.action_type}` : undefined}
        width="max-w-xl"
        footer={
          <Button type="button" variant="secondary" onClick={() => setSelectedEvent(null)}>
            Close
          </Button>
        }
      >
        {selectedEvent && (
          <div className="space-y-4">
            <p className="text-xs text-ink-soft">{selectedEvent.description}</p>

            <div>
              <span className="text-[10px] font-mono text-ink-muted uppercase font-bold block mb-1">
                JSON Event Metadata & Snapshot:
              </span>
              <pre className="p-3 bg-ivory border border-line rounded-md text-[11px] font-mono text-ink-soft overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
                {JSON.stringify(selectedEvent.details_json, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
