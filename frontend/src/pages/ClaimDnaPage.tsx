import React, { useState, useEffect } from 'react';
import { 
  Dna, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  ExternalLink,
  BookOpen,
  ArrowRight,
  Filter
} from 'lucide-react';
import { api } from '../api/client';
import { ClaimDNA } from '../types';
import { EmptyState, ErrorState, Panel, Skeleton } from '../components/ui';

export const ClaimDnaPage: React.FC = () => {
  const [claimDnas, setClaimDnas] = useState<ClaimDNA[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const claims = await api.getAllClaimDna();
      setClaimDnas(claims);
      if (claims.length > 0) {
        setSelectedClaim(claims[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Claim DNA records could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUPPORTED':
        return 'bg-teal-950 text-teal-300 border-teal-800';
      case 'PARTIALLY_SUPPORTED':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'CONFLICTING':
        return 'bg-red-950 text-red-300 border-red-800';
      case 'UNVERIFIED':
      default:
        return 'bg-pink-950 text-pink-300 border-pink-800';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 shrink-0 rounded-md bg-white border border-line shadow-xs flex items-center justify-center text-vermilion">
            <Dna className="w-5 h-5" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-vermilion mb-1">
              Core Differentiator
            </p>
            <h1 className="text-[26px] leading-tight font-semibold font-display text-ink tracking-tight">
              Claim DNA — Marketing Claim Decomposition
            </h1>
            <p className="text-[13px] text-ink-muted mt-1 max-w-2xl leading-relaxed">
              Decomposing promotional assertions into structured atomic parameters to eliminate phantom marketing statistics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs text-ink-muted bg-white px-3.5 py-2 rounded-md border border-line shadow-xs">
            <span>Golden Rule: </span>
            <strong className="text-vermilion">A source supports only the scope it actually establishes.</strong>
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={loadClaims} />}

      {/* Main Grid: Claims List & Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Table: Extracted Claims (col-span-7) */}
        <Panel className="lg:col-span-7 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Extracted Marketing Claims</h2>
              <p className="text-xs text-ink-muted">Claims parsed from active collateral drafts</p>
            </div>
            <span className="text-xs font-mono text-ink-muted font-semibold">
              {claimDnas.length} Decompositions
            </span>
          </div>

          {loading ? (
            <Skeleton className="h-28 w-full" count={3} />
          ) : claimDnas.length === 0 ? (
            <EmptyState
              icon={<Search className="w-4 h-4" />}
              title="No claims decomposed yet"
              description="Claim DNA appears once a governance review decomposes a promotional claim from an active draft."
            />
          ) : (
            <div className="space-y-3">
              {claimDnas.map((c) => {
                const isSelected = selectedClaim?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClaim(c)}
                    className={`p-4 rounded-md border transition cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'bg-white border-vermilion shadow-sm ring-1 ring-vermilion/25'
                        : 'bg-ivory border-line hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold text-pink-400">
                        Metric: {c.numerical_value || '—'}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getStatusBadge(c.evidence_status)}`}>
                        {c.evidence_status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <p className="text-xs font-serif text-slate-200 leading-relaxed italic">
                      "{c.original_claim}"
                    </p>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-ink-muted pt-1">
                      <div>
                        <span className="text-ink-muted block">Subject:</span>
                        <span className="font-semibold text-ink truncate block">{c.subject}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted block">Scope:</span>
                        <span className="font-semibold text-ink truncate block">{c.scope}</span>
                      </div>
                      <div>
                        <span className="text-ink-muted block">Timeline:</span>
                        <span className="font-semibold text-ink truncate block">{c.time_period}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Right Inspector: Deep Claim DNA Breakdown (col-span-5) */}
        <Panel className="lg:col-span-5 p-5 space-y-5">
          <div className="border-b border-line pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dna className="w-4 h-4 text-pink-400" />
              <h2 className="text-sm font-bold text-ink">Claim Evidence Inspector</h2>
            </div>
            {selectedClaim && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getStatusBadge(selectedClaim.evidence_status)}`}>
                {selectedClaim.evidence_status}
              </span>
            )}
          </div>

          {loading ? (
            <Skeleton className="h-4 w-full" count={5} />
          ) : selectedClaim ? (
            <div className="space-y-4">
              {/* Atomic Components Matrix */}
              <div>
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                  Decomposed Atomic Parameters
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-ivory p-2.5 rounded-md border border-line">
                    <span className="text-[10px] text-ink-muted uppercase block">Subject</span>
                    <span className="font-semibold text-ink">{selectedClaim.subject || '—'}</span>
                  </div>
                  <div className="bg-ivory p-2.5 rounded-md border border-line">
                    <span className="text-[10px] text-ink-muted uppercase block">Action / Benefit</span>
                    <span className="font-semibold text-ink">{selectedClaim.action || '—'}</span>
                  </div>
                  <div className="bg-ivory p-2.5 rounded-md border border-line">
                    <span className="text-[10px] text-ink-muted uppercase block">Numerical Value</span>
                    <span className="font-bold text-pink-400 font-mono">{selectedClaim.numerical_value || '—'}</span>
                  </div>
                  <div className="bg-ivory p-2.5 rounded-md border border-line">
                    <span className="text-[10px] text-ink-muted uppercase block">Timeline</span>
                    <span className="font-semibold text-ink">{selectedClaim.time_period || '—'}</span>
                  </div>
                  <div className="bg-ivory p-2.5 rounded-md border border-line">
                    <span className="text-[10px] text-ink-muted uppercase block">Asserted Scope</span>
                    <span className="font-semibold text-amber-300">{selectedClaim.scope || '—'}</span>
                  </div>
                  <div className="bg-ivory p-2.5 rounded-md border border-line">
                    <span className="text-[10px] text-ink-muted uppercase block">Qualifiers in Draft</span>
                    <span className="font-semibold text-red-300">{selectedClaim.qualifiers || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Missing Qualifiers & Scope Discrepancy */}
              <div className="bg-pink-950 border border-pink-800 p-3.5 rounded-md space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-pink-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Missing Qualifiers & Scope Gap</span>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed">
                  {selectedClaim.missing_qualifiers || '—'}
                </p>
              </div>

              {/* Suggested Safer Wording */}
              <div className="bg-teal-950 border border-teal-800 p-3.5 rounded-md space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Suggested Safer Wording</span>
                </div>
                <p className="text-xs text-ink-soft font-medium leading-relaxed">
                  {selectedClaim.suggested_safer_wording
                    ? `"${selectedClaim.suggested_safer_wording}"`
                    : '—'}
                </p>
              </div>

              {/* Source Document Reference */}
              <div className="bg-ivory p-3 rounded-md border border-line text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Benchmark Reference: Northstar Benchmark Study 2026 (v1.0)</span>
                </div>
                <p className="text-[11px] text-ink-muted italic">
                  "Section 1.4: Empirical review cycle acceleration measured at up to 34% over a 90-day trial across 42 enterprise teams."
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Search className="w-4 h-4" />}
              title="No claim selected"
              description="Select a claim from the left table to inspect its decomposed Claim DNA."
            />
          )}
        </Panel>
      </div>
    </div>
  );
};
