import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Search,
  Filter,
  BookOpen,
} from 'lucide-react';
import { api } from '../api/client';
import { DecisionPrecedent } from '../types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Panel,
  Select,
  Skeleton,
  statusTone,
} from '../components/ui';

export const DecisionMemoryPage: React.FC = () => {
  const [precedents, setPrecedents] = useState<DecisionPrecedent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrecedents();
  }, [categoryFilter]);

  const loadPrecedents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPrecedents(categoryFilter || undefined, searchQuery || undefined);
      setPrecedents(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Decision precedents could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPrecedents();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<BrainCircuit className="w-5 h-5" aria-hidden />}
        eyebrow="Contextual Precedents"
        title="Brand Memory & Decision Precedent"
        description="Institutional governance memory capturing historical reviewer deliberations, exceptions granted, and legal rationales."
        actions={
          <div className="text-xs bg-amber-950 border border-amber-800/70 rounded-md px-3.5 py-2 max-w-md">
            <p className="font-semibold text-amber-300">Governance Precedent Guardrail:</p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              A previous approval is not automatic permission to approve a new claim. Prior
              decisions never override current approved evidence.
            </p>
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={loadPrecedents} />}

      {/* Filter and Search Bar */}
      <Panel className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form
          onSubmit={handleSearch}
          className="flex-1 flex items-center gap-2 w-full"
          role="search"
        >
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search historical rationale, scenarios, keywords..."
              aria-label="Search decision precedents"
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-ink-faint shrink-0" aria-hidden />
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter precedents by category"
            className="w-full sm:w-auto"
          >
            <option value="">All Categories</option>
            <option value="CLAIM">Claims</option>
            <option value="TERMINOLOGY">Terminology</option>
            <option value="TONE">Tone</option>
            <option value="FACT">Facts</option>
          </Select>
        </div>
      </Panel>

      {/* Precedents Cards */}
      {loading && <Skeleton className="h-44 w-full" count={2} />}

      {!loading && !error && precedents.length === 0 && (
        <Panel>
          <EmptyState
            icon={<BookOpen className="w-4 h-4" />}
            title="No precedents match this search"
            description="Try different keywords or clear the category filter — precedents are recorded here once reviewers resolve a finding, so an empty result means nothing has been settled on this topic yet."
          />
        </Panel>
      )}

      {!loading && precedents.length > 0 && (
        <div className="space-y-4">
          {precedents.map((p) => (
            <Panel key={p.id} className="p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-2.5">
                <div className="flex items-center gap-2">
                  <Badge tone="brand" className="font-mono">
                    {p.finding_category}
                  </Badge>
                  <h2 className="text-sm font-bold text-ink">{p.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(p.past_decision)} className="font-mono">
                    {p.past_decision.replace(/_/g, ' ')}
                  </Badge>
                  <Badge tone="warning" className="font-mono">
                    {p.applicability_status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-ink-muted">
                    Deliberated Scenario:
                  </span>
                  <p className="text-ink-soft bg-ivory p-3 rounded-md border border-line leading-relaxed">
                    {p.scenario_description}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-ink-muted">
                    Reviewer Rationale & Gating:
                  </span>
                  <p className="text-ink bg-ivory p-3 rounded-md border border-line font-display italic leading-relaxed">
                    "{p.reviewer_rationale}"
                  </p>
                </div>
              </div>

              {p.similarity_explanation && (
                <div className="bg-vermilion-tint p-2.5 rounded-md border border-vermilion/30 text-xs text-ink-soft flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>
                    <strong className="text-vermilion">Similarity Mapping:</strong>{' '}
                    {p.similarity_explanation}
                  </span>
                  <span className="text-[10px] font-mono text-ink-faint shrink-0">
                    Rule Snapshot v{p.rule_version}
                  </span>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
};
