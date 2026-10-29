import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Scale,
  Clock,
  FileText,
  ArrowUpRight,
  Dna,
  Activity,
  Inbox,
  History,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../api/client';
import { NavTab } from '../components/Sidebar';
import { Badge, Button, EmptyState, ErrorState, Panel, Skeleton, statusTone } from '../components/ui';

interface OverviewPageProps {
  onNavigateTab: (tab: NavTab) => void;
}

/* Chart palette — derived from the design system, not decoration */
const CHART_COLORS = ['#C83232', '#1F6E52', '#A8761A', '#2C5A8A', '#5B4B8A', '#B83A60'];
const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderColor: '#E6DDCC',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#251C19',
  boxShadow: '0 8px 24px -12px rgba(37,28,25,0.25)',
};
const AXIS = '#8B7F76';
const GRID = '#EFE8DB';

const ACTIVE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED', 'CHANGES_REQUESTED'];

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateTab }) => {
  const [driftMetrics, setDriftMetrics] = useState<any>(null);
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverviewData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [drift, items, confs, events] = await Promise.all([
        api.getDriftMetrics().catch(() => null),
        api.getContentItems().catch(() => [] as any[]),
        api.getConflicts().catch(() => [] as any[]),
        api.getAuditEvents(6).catch(() => [] as any[]),
      ]);
      setDriftMetrics(drift);
      setContentItems(Array.isArray(items) ? items : []);
      setConflicts(Array.isArray(confs) ? confs : []);
      setAuditEvents(Array.isArray(events) ? events : []);
      if (!drift) setError('Governance metrics could not be loaded.');
    } catch (err: any) {
      setError(err?.message || 'Overview data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  const categoryDistribution = driftMetrics?.category_distribution
    ? Object.entries(driftMetrics.category_distribution as Record<string, number>).map(
        ([name, count]) => ({ name, count })
      )
    : [];

  const severity = driftMetrics?.severity_distribution || null;
  const severityTotal = severity
    ? ['CRITICAL', 'HIGH', 'MEDIUM'].reduce((sum, k) => sum + (severity[k] || 0), 0)
    : 0;
  const severityData = severity
    ? [
        { name: 'Critical', value: severity.CRITICAL || 0 },
        { name: 'High', value: severity.HIGH || 0 },
        { name: 'Medium', value: severity.MEDIUM || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const queueItems = contentItems.filter((i) => ACTIVE_STATUSES.includes(i.current_status));
  const latestEvents = auditEvents.slice(0, 6);

  const kpis = [
    {
      label: 'Governance health',
      value: driftMetrics ? driftMetrics.governance_health_score : null,
      suffix: '/100',
      caption: driftMetrics
        ? `${driftMetrics.total_findings} findings on record`
        : 'Awaiting metrics',
      captionTone: 'text-teal-400',
      icon: ShieldCheck,
      iconTone: 'bg-teal-950 border-teal-800/60 text-teal-400',
    },
    {
      label: 'Findings by severity',
      value: driftMetrics ? severity?.CRITICAL || 0 : null,
      suffix: 'critical',
      caption: driftMetrics
        ? `${severity?.HIGH || 0} high · ${severity?.MEDIUM || 0} medium`
        : 'Awaiting metrics',
      captionTone: 'text-ink-muted',
      icon: Dna,
      iconTone: 'bg-vermilion-tint border-indigo-800/50 text-vermilion',
    },
    {
      label: 'Active review queue',
      value: contentItems.length ? queueItems.length : 0,
      suffix: 'drafts',
      caption: 'Pending human review gating',
      captionTone: 'text-ink-muted',
      icon: Clock,
      iconTone: 'bg-blue-950 border-blue-800/60 text-blue-300',
    },
    {
      label: 'Guideline conflicts',
      value: conflicts.length,
      suffix: 'open',
      caption: conflicts.length ? 'Administrator resolution required' : 'No contradictions detected',
      captionTone: conflicts.length ? 'text-amber-300' : 'text-teal-400',
      icon: Scale,
      iconTone: 'bg-amber-950 border-amber-800/60 text-amber-300',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 shrink-0 rounded-md bg-white border border-line shadow-xs flex items-center justify-center text-vermilion">
            <Activity className="w-5 h-5" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-vermilion mb-1">
              Northstar Labs · Synthetic demo tenant
            </p>
            <h1 className="text-[26px] leading-tight font-semibold font-display text-ink tracking-tight">
              Executive Governance Overview
            </h1>
            <p className="text-[13px] text-ink-muted mt-1 max-w-2xl leading-relaxed">
              Pre-publication governance monitoring, claim substantiation and compliance telemetry —
              every number below is read live from the API.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => onNavigateTab('studio')}
            icon={<FileText className="w-4 h-4" />}
          >
            Open Review Studio
          </Button>
          <Button variant="secondary" onClick={() => onNavigateTab('graph')}>
            Evidence Graph
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadOverviewData} />}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <Panel key={i} className="p-5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-20 mt-3" />
                <Skeleton className="h-3 w-36 mt-3" />
              </Panel>
            ))
          : kpis.map((k) => (
              <Panel key={k.label} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-medium text-ink-muted">{k.label}</span>
                  <div
                    className={`w-7 h-7 rounded-md border flex items-center justify-center ${k.iconTone}`}
                  >
                    <k.icon className="w-3.5 h-3.5" aria-hidden />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-[30px] leading-none font-semibold font-mono text-ink">
                    {k.value === null || k.value === undefined ? '—' : k.value}
                  </span>
                  <span className="text-[11.5px] font-medium text-ink-faint">{k.suffix}</span>
                </div>
                <p className={`mt-2.5 text-[11px] font-medium ${k.captionTone}`}>{k.caption}</p>
              </Panel>
            ))}
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Findings by category</h2>
              <p className="text-[11.5px] text-ink-muted mt-0.5">
                Aggregated from stored review findings for this organisation
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('drift')}>
              Drift Radar →
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : categoryDistribution.length === 0 ? (
            <EmptyState
              icon={<Inbox className="w-[18px] h-[18px]" />}
              title="No findings recorded yet"
              description="Run a review in the Studio and category analytics will appear here."
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryDistribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke={AXIS}
                    fontSize={10.5}
                    tickLine={false}
                    axisLine={{ stroke: GRID }}
                  />
                  <YAxis
                    stroke={AXIS}
                    fontSize={10.5}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(37,28,25,0.04)' }} />
                  <Bar dataKey="count" fill="#C83232" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel className="p-5 space-y-4 flex flex-col">
          <div>
            <h2 className="text-sm font-semibold text-ink">Severity mix</h2>
            <p className="text-[11.5px] text-ink-muted mt-0.5">Calibrated risk classification</p>
          </div>

          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : severityData.length === 0 ? (
            <EmptyState
              title="Nothing to classify"
              description="Severity distribution appears once findings exist."
              className="py-8"
            />
          ) : (
            <>
              <div className="h-40 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      innerRadius={46}
                      outerRadius={66}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {severityData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-3 border-t border-line">
                {[
                  { label: 'Critical', value: severity.CRITICAL || 0, color: '#C83232' },
                  { label: 'High', value: severity.HIGH || 0, color: '#A8761A' },
                  { label: 'Medium', value: severity.MEDIUM || 0, color: '#2C5A8A' },
                ].map((s) => (
                  <div key={s.label}>
                    <span
                      className="w-2 h-2 rounded-full inline-block mr-1"
                      style={{ backgroundColor: s.color }}
                      aria-hidden
                    />
                    <span className="text-ink-muted">{s.label}</span>
                    <p className="font-semibold font-mono text-ink mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Queue + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Investigation queue</h2>
              <p className="text-[11.5px] text-ink-muted mt-0.5">
                Drafts awaiting evidence-backed review or human sign-off
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('queue')}>
              View full queue →
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-9 w-full" count={3} />
          ) : queueItems.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon />}
              title="Queue is clear"
              description="No drafts are awaiting review. Submit a draft from the Review Studio to start the workflow."
              action={
                <Button size="sm" onClick={() => onNavigateTab('studio')}>
                  Open Review Studio
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-ink-muted font-medium">
                    <th className="py-2.5 px-1">Title & campaign</th>
                    <th className="py-2.5 px-1">Type</th>
                    <th className="py-2.5 px-1">Status</th>
                    <th className="py-2.5 px-1">Version</th>
                    <th className="py-2.5 px-1 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {queueItems.slice(0, 6).map((item) => (
                    <tr key={item.id} className="hover:bg-ivory/70 transition">
                      <td className="py-3 px-1">
                        <p className="font-medium text-ink">{item.title}</p>
                        <p className="text-[11px] text-ink-muted">
                          {item.campaign || 'Corporate Communications'}
                        </p>
                      </td>
                      <td className="py-3 px-1 font-mono text-ink-muted">{item.content_type}</td>
                      <td className="py-3 px-1">
                        <Badge tone={statusTone(item.current_status)}>
                          {item.current_status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-1 font-mono text-ink-muted">
                        v{item.latest_version?.version_number || item.versions_count || 1}
                      </td>
                      <td className="py-3 px-1 text-right">
                        <Button size="sm" variant="secondary" onClick={() => onNavigateTab('studio')}>
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink">Recent activity</h2>
              <p className="text-[11.5px] text-ink-muted mt-0.5">From the append-only audit ledger</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigateTab('audit')}>
              Ledger →
            </Button>
          </div>

          {loading ? (
            <Skeleton className="h-8 w-full" count={4} />
          ) : latestEvents.length === 0 ? (
            <EmptyState
              icon={<History className="w-4 h-4" />}
              title="No events yet"
              description="Actions recorded against this tenant will appear here."
              className="py-8"
            />
          ) : (
            <ul className="space-y-3">
              {latestEvents.map((ev) => (
                <li key={ev.id} className="flex gap-2.5">
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full bg-vermilion shrink-0"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-[12px] text-ink leading-snug">
                      <span className="font-medium">{ev.actor_name}</span>{' '}
                      <span className="text-ink-muted">{ev.description}</span>
                    </p>
                    <p className="text-[10.5px] font-mono text-ink-faint mt-0.5">
                      {ev.action_type} · {new Date(ev.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};

function CheckCircleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
