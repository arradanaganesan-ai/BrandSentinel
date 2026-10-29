import React, { useState, useEffect, useCallback } from 'react';
import { Activity, FileQuestion, Inbox } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { api } from '../api/client';
import { Badge, EmptyState, ErrorState, PageHeader, Panel, Skeleton } from '../components/ui';

/* Chart palette + styling — matches OverviewPage */
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

export const DriftRadarPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDriftMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || 'Drift metrics could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  /* No fabricated fallback series — an empty timeline renders an EmptyState instead */
  const trendData = Array.isArray(metrics?.trend_timeline) ? metrics.trend_timeline : [];
  const patterns = Array.isArray(metrics?.recurring_patterns) ? metrics.recurring_patterns : [];

  const kpis = [
    {
      label: 'Total Governed Findings',
      value: metrics?.total_findings ?? null,
      suffix: '',
      caption: 'Across active revisions',
      tone: 'text-ink',
      captionTone: 'text-ink-muted',
    },
    {
      label: 'Governance Health Index',
      value: metrics?.governance_health_score ?? null,
      suffix: '/ 100',
      caption: 'Acceptable compliance tier',
      tone: 'text-teal-400',
      captionTone: 'text-teal-400',
    },
    {
      label: 'Reviewer Override Rate',
      value: metrics?.override_rate_pct ?? null,
      suffix: '%',
      caption: 'Signal for human investigation',
      tone: 'text-amber-400',
      captionTone: 'text-amber-400',
    },
    {
      label: 'Decisions Recorded',
      value: metrics?.decisions_breakdown?.total ?? null,
      suffix: '',
      caption: 'Recorded reviewer decisions',
      tone: 'text-vermilion',
      captionTone: 'text-ink-muted',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<Activity className="w-5 h-5" />}
        eyebrow="Live Telemetry"
        title="Brand Drift Radar — Governance Trend Analytics"
        description="Continuous monitoring of recurring violations, override patterns, outdated fact propagation, and organizational rule health."
        actions={
          <Badge tone="warning">[SYNTHETIC DATA — Northstar Labs Telemetry]</Badge>
        }
      />

      {error && <ErrorState message={error} onRetry={loadMetrics} />}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <Panel key={i} className="p-5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-8 w-24 mt-3" />
                <Skeleton className="h-3 w-36 mt-3" />
              </Panel>
            ))
          : kpis.map((k) => (
              <Panel key={k.label} className="p-5">
                <span className="text-[11.5px] font-medium text-ink-muted">{k.label}</span>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className={`text-3xl font-bold font-mono ${k.tone}`}>
                    {k.value === null || k.value === undefined ? '—' : k.value}
                  </span>
                  {k.value !== null && k.value !== undefined && k.suffix && (
                    <span className="text-sm font-medium text-ink-faint">{k.suffix}</span>
                  )}
                </div>
                <p className={`text-[11px] mt-1 ${k.captionTone}`}>{k.caption}</p>
              </Panel>
            ))}
      </div>

      {/* Timeline Trend Line Chart */}
      <Panel className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">4-Week Governance Violation Timeline</h2>
            <p className="text-[11.5px] text-ink-muted mt-0.5">
              Longitudinal frequency tracking across core categories
            </p>
          </div>
          <span className="text-xs font-mono text-ink-faint">Weekly Cadence</span>
        </div>

        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : trendData.length === 0 ? (
          <EmptyState
            icon={<FileQuestion style={{ width: 18, height: 18 }} />}
            title="No findings recorded yet"
            description="Run a review in the Studio and the weekly governance trend will appear here."
            className="py-10"
          />
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis
                  dataKey="period"
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
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: '#D8CDB8' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="claims" stroke="#B83A60" strokeWidth={2.5} name="Claims" activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="terminology" stroke="#C83232" strokeWidth={2.5} name="Terminology" />
                <Line type="monotone" dataKey="facts" stroke="#1F6E52" strokeWidth={2} name="Outdated Facts" />
                <Line type="monotone" dataKey="tone" stroke="#A8761A" strokeWidth={2} name="Tone Mismatch" />
                <Line type="monotone" dataKey="overrides" stroke="#2C5A8A" strokeDasharray="4 4" strokeWidth={2} name="Overrides" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      {/* Recurring Problem Patterns Table */}
      <Panel className="p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Recurring Problem Patterns & Rule Health</h2>
          <p className="text-[11.5px] text-ink-muted mt-0.5">
            Systemic patterns detected across multiple content versions
          </p>
        </div>

        {loading ? (
          <Skeleton className="h-4 w-full" count={4} />
        ) : patterns.length === 0 ? (
          <EmptyState
            icon={<Inbox style={{ width: 18, height: 18 }} />}
            title="No recurring patterns detected"
            description="Systemic violation patterns appear here once multiple content versions have been reviewed."
            className="py-8"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-ink-muted font-medium">
                  <th className="py-2.5 px-3">Pattern Description</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">System Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {patterns.map((p: any, i: number) => (
                  <tr key={i} className="hover:bg-ivory/70 transition">
                    <td className="py-3 px-3 font-semibold text-ink">{p.pattern}</td>
                    <td className="py-3 px-3 font-mono text-vermilion">{p.category}</td>
                    <td className="py-3 px-3">
                      <Badge tone={p.risk_level === 'CRITICAL' ? 'danger' : 'warning'}>
                        {p.risk_level}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-mono text-ink-soft">{p.frequency} incidents</td>
                    <td className="py-3 px-3 text-ink-muted text-[11px] max-w-sm">{p.recommendation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};
