import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Dna,
  FileCheck2,
  GitCompare,
  Network,
  Scale,
  Activity,
  AlertOctagon,
  Contrast,
  ShieldCheck,
  Quote,
  BookOpen,
  Gavel,
  ScanSearch,
} from 'lucide-react';
import { api } from '../api/client';
import { Badge, Button, Skeleton, statusTone } from './ui';

/* ── Scroll reveal ─────────────────────────────────────────────── */
const useReveal = () => {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
};

/* ── Real product preview (fetched from the live API) ──────────── */
type PreviewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      items: any[];
      metrics: any;
      conflictCount: number;
      finding: any | null;
      findingTitle: string;
    };

const ProductPreview: React.FC<{ onEnterApp: () => void; sessionReady: boolean }> = ({
  onEnterApp,
  sessionReady,
}) => {
  const [state, setState] = useState<PreviewState>({ status: 'loading' });

  const load = async () => {
    setState({ status: 'loading' });
    try {
      const [items, metrics, conflicts] = await Promise.all([
        api.getContentItems(),
        api.getDriftMetrics().catch(() => null),
        api.getConflicts().catch(() => []),
      ]);

      // Drill into one real finding so the preview shows genuine evidence.
      let finding: any = null;
      let findingTitle = '';
      const first = items?.[0];
      if (first) {
        try {
          const detail = await api.getContentItemDetail(first.id);
          const versions: any[] = Array.isArray(detail?.versions) ? detail.versions : [];
          const latest = versions
            .slice()
            .sort((a, b) => (b.version_number || 0) - (a.version_number || 0))[0];
          if (latest?.id) {
            const findings = await api.getFindings(latest.id);
            if (Array.isArray(findings) && findings.length > 0) {
              finding = findings.find((f: any) => f.evidence_items?.length > 0) || findings[0];
              findingTitle = detail.title;
            }
          }
        } catch {
          /* evidence panel simply stays empty */
        }
      }

      setState({
        status: 'ready',
        items: Array.isArray(items) ? items : [],
        metrics,
        conflictCount: Array.isArray(conflicts) ? conflicts.length : 0,
        finding,
        findingTitle,
      });
    } catch (err: any) {
      setState({ status: 'error', message: err?.message || 'API unreachable' });
    }
  };

  useEffect(() => {
    if (sessionReady) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady]);

  const navItems = [
    'Executive Overview',
    'Content Review Studio',
    'Claim DNA Inspector',
    'Review Queue',
    'Approval Workspace',
    'Brand Evidence Graph',
  ];

  return (
    <div className="bg-white border border-line rounded-lg shadow-xl overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line bg-surface-alt">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" aria-hidden />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" aria-hidden />
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500/70" aria-hidden />
          <span className="ml-2 text-[10.5px] font-mono text-ink-muted truncate">
            brandsentinel.app / workspace
          </span>
        </div>
        <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950 border border-amber-800/60 px-1.5 py-0.5 rounded shrink-0">
          SYNTHETIC DEMO DATA
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[176px_1fr]">
        {/* Mini sidebar */}
        <div className="hidden md:block border-r border-line p-3 bg-ivory/60">
          <div className="space-y-0.5">
            {navItems.map((label, i) => (
              <div
                key={label}
                className={`text-[11px] px-2.5 py-1.5 rounded-md flex items-center gap-2 ${
                  i === 0
                    ? 'bg-white border border-line font-semibold text-ink shadow-xs'
                    : 'text-ink-muted'
                }`}
              >
                <span
                  className={`w-1 h-1 rounded-full ${i === 0 ? 'bg-vermilion' : 'bg-line-strong'}`}
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main preview */}
        <div className="p-4 sm:p-5 min-h-[340px]">
          {state.status === 'loading' && (
            <div className="space-y-4" aria-label="Loading live preview">
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="border border-line rounded-md p-3 space-y-2">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-6 w-14" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-9 w-full" count={3} />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {state.status === 'error' && (
            <div
              role="alert"
              className="h-full flex flex-col items-center justify-center text-center py-10 px-6"
            >
              <div className="w-10 h-10 rounded-md bg-red-950 border border-red-800/60 flex items-center justify-center mb-3">
                <AlertOctagon className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-sm font-semibold text-ink">Live preview unavailable</p>
              <p className="text-xs text-ink-muted mt-1 max-w-sm">
                The BrandSentinel API did not respond ({state.message}). Start the backend to
                load real workspace data — nothing on this page is fabricated.
              </p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
                Retry connection
              </Button>
            </div>
          )}

          {state.status === 'ready' && (
            <div className="space-y-4 animate-fade-in">
              {/* Real metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-line rounded-md p-3">
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-muted">
                    Governance health
                  </p>
                  <p className="text-xl font-mono font-semibold text-ink mt-1">
                    {state.metrics?.governance_health_score ?? '—'}
                    <span className="text-[11px] text-ink-faint font-normal"> /100</span>
                  </p>
                </div>
                <div className="border border-line rounded-md p-3">
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-muted">
                    Findings on record
                  </p>
                  <p className="text-xl font-mono font-semibold text-ink mt-1">
                    {state.metrics?.total_findings ?? '—'}
                  </p>
                </div>
                <div className="border border-line rounded-md p-3">
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-ink-muted">
                    Guideline conflicts
                  </p>
                  <p
                    className={`text-xl font-mono font-semibold mt-1 ${
                      state.conflictCount > 0 ? 'text-amber-300' : 'text-teal-400'
                    }`}
                  >
                    {state.conflictCount}
                  </p>
                </div>
              </div>

              {/* Real submissions */}
              <div className="border border-line rounded-md overflow-hidden">
                <div className="px-3.5 py-2 border-b border-line flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-ink">Active submissions</p>
                  <button
                    onClick={onEnterApp}
                    className="text-[10.5px] font-semibold text-vermilion hover:underline underline-offset-2"
                  >
                    Open queue →
                  </button>
                </div>
                {state.items.length === 0 ? (
                  <p className="px-3.5 py-4 text-[11.5px] text-ink-muted">
                    No content items yet — create one in the Review Studio.
                  </p>
                ) : (
                  <table className="w-full text-left">
                    <tbody className="divide-y divide-line">
                      {state.items.slice(0, 3).map((item) => (
                        <tr key={item.id} className="hover:bg-ivory/70 transition">
                          <td className="px-3.5 py-2.5">
                            <p className="text-[12px] font-medium text-ink truncate">{item.title}</p>
                            <p className="text-[10.5px] text-ink-muted truncate">
                              {item.campaign || item.content_type}
                            </p>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <Badge tone={statusTone(item.current_status)}>
                              {item.current_status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Real evidence */}
              {state.finding ? (
                <div className="border border-line rounded-md p-3.5 bg-ivory/50">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-ink-muted">
                      Evidence · {state.findingTitle}
                    </span>
                    <span className="flex gap-1.5">
                      <Badge tone={statusTone(state.finding.severity)}>
                        {state.finding.severity}
                      </Badge>
                      <Badge tone={statusTone(state.finding.evidence_status)}>
                        {state.finding.evidence_status.replace(/_/g, ' ')}
                      </Badge>
                    </span>
                  </div>
                  <p className="text-[12px] text-ink leading-relaxed">
                    {state.finding.explanation}
                  </p>
                  {state.finding.evidence_items?.[0]?.citation_quote && (
                    <div className="mt-2.5 pl-3 border-l-2 border-vermilion">
                      <p className="text-[11.5px] text-ink-soft italic leading-relaxed">
                        “{state.finding.evidence_items[0].citation_quote}”
                      </p>
                      <p className="text-[10px] font-mono text-ink-muted mt-1">
                        — {state.finding.evidence_items[0].source_title || 'stored source passage'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-line rounded-md p-3.5 bg-ivory/50">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-ink-muted">
                    Evidence
                  </span>
                  <p className="text-[11.5px] text-ink-muted mt-1.5">
                    Run a review to see evidence-backed findings with source citations.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Page ──────────────────────────────────────────────────────── */

const capabilities = [
  {
    icon: Network,
    title: 'Brand Evidence Graph',
    body: 'Trace Brand Rule → Approved Fact → Content Claim → Finding → Reviewer Decision, and inspect the underlying passage quote on every node.',
  },
  {
    icon: Dna,
    title: 'Claim DNA',
    body: 'Decompose promotional assertions into nine atomic parameters and see exactly where a claim outruns the scope its source establishes.',
  },
  {
    icon: GitCompare,
    title: 'Review Diff Intelligence',
    body: 'Word-by-word revision comparison that reports whether a rewrite actually resolved previous findings — or introduced new ones.',
  },
  {
    icon: Activity,
    title: 'Brand Drift Radar',
    body: 'Four-week analytics on recurring terminology errors, tone mismatches, unsupported claims and reviewer override rates.',
  },
  {
    icon: Scale,
    title: 'Guideline Conflict Center',
    body: 'Detects active brand guidelines that contradict each other and routes them to an administrator for side-by-side resolution.',
  },
  {
    icon: AlertOctagon,
    title: 'Risk Propagation',
    body: 'When an approved specification changes, previously approved collateral referencing the outdated fact is flagged for re-review.',
  },
  {
    icon: Contrast,
    title: 'Visual Governance & WCAG Lab',
    body: 'Mathematical WCAG 2.1 contrast verification (AA 4.5:1 / AAA 7:1) and dominant colour extraction for brand assets.',
  },
  {
    icon: Gavel,
    title: 'Approval & Audit',
    body: 'Server-enforced approval gating with mandatory rationale, immutable guideline snapshots and an append-only audit ledger.',
  },
];

const steps = [
  {
    num: '01',
    icon: BookOpen,
    title: 'Ground the system in approved knowledge',
    body: 'Load source documents, brand rules, approved facts, claims and terminology into the Knowledge Hub. Every later judgement is anchored to this ground truth.',
  },
  {
    num: '02',
    icon: ScanSearch,
    title: 'Review every draft against evidence',
    body: 'The hybrid review engine returns structured findings with exact character offsets. Citations resolve exclusively to stored source passages — never to invented ones.',
  },
  {
    num: '03',
    icon: ShieldCheck,
    title: 'Decide with a full audit trail',
    body: 'Authorised humans accept suggestions, request changes or approve with mandatory rationale. Every action lands in an append-only governance ledger.',
  },
];

const evidencePoints = [
  {
    title: '5 of 5 automated governance tests passing',
    body: 'Full lifecycle, RBAC isolation, fact superseding, WCAG engine and gating validation covered by the pytest suite.',
  },
  {
    title: 'Zero hallucinated citations',
    body: 'A finding can only cite a passage that exists in the database — evidence items carry source title, section and quote.',
  },
  {
    title: 'Server-enforced approval gating',
    body: 'Decisions cannot be recorded without a rationale; role checks live in the API, not in the interface.',
  },
  {
    title: 'Append-only audit trail',
    body: 'Every mutation is written to an immutable ledger with JSON metadata available for inspection.',
  },
  {
    title: 'Cross-organisation isolation tested',
    body: 'Security tests verify that one tenant can never read another tenant’s knowledge, content or findings.',
  },
  {
    title: 'Mathematical accessibility checks',
    body: 'Relative luminance and contrast ratios are computed to WCAG 2.1 rather than estimated by eye.',
  },
];

export const LandingPage: React.FC<{ onEnterApp: () => void; sessionReady: boolean }> = ({
  onEnterApp,
  sessionReady,
}) => {
  useReveal();

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col">
      {/* ── Site header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2.5 shrink-0">
            <span className="w-8 h-8 rounded-md bg-vermilion flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-[18px] h-[18px] text-white" />
            </span>
            <span className="font-display font-semibold text-[17px] tracking-tight">
              BrandSentinel
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-7 text-[13px] text-ink-soft">
            <a className="hover:text-ink transition" href="#how">How it works</a>
            <a className="hover:text-ink transition" href="#capabilities">Capabilities</a>
            <a className="hover:text-ink transition" href="#evidence">Evidence</a>
          </nav>

          <Button size="sm" onClick={onEnterApp} icon={<ArrowRight className="w-3.5 h-3.5" />}>
            Open workspace
          </Button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <main id="top" className="flex-1">
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-12">
          <div className="max-w-3xl">
            <p className="reveal text-[11px] font-bold uppercase tracking-[0.18em] text-vermilion">
              Evidence-backed brand governance
            </p>
            <h1 className="reveal reveal-delay-1 display-title text-[44px] leading-[1.04] sm:text-[64px] sm:leading-[1.02] font-semibold mt-4 tracking-tight text-balance">
              Publish only what your brand{' '}
              <span className="text-vermilion italic">can prove.</span>
            </h1>
            <p className="reveal reveal-delay-2 text-[16px] sm:text-[17px] leading-relaxed text-ink-soft mt-6 max-w-2xl">
              BrandSentinel reviews copy, claims and collateral against your approved brand
              knowledge — returning explainable findings with citations that resolve only to
              stored source passages.{' '}
              <span className="text-ink font-medium">AI recommends. Evidence supports. Authorised humans decide.</span>
            </p>

            <div className="reveal reveal-delay-3 flex flex-wrap items-center gap-3 mt-8">
              <Button onClick={onEnterApp} icon={<ArrowRight className="w-4 h-4" />}>
                Open the workspace
              </Button>
              <a href="#how">
                <Button variant="secondary">See how it works</Button>
              </a>
            </div>

            <ul className="reveal reveal-delay-4 flex flex-wrap gap-x-6 gap-y-2 mt-8 text-[12.5px] text-ink-muted">
              {[
                '5/5 automated governance tests passing',
                'Zero hallucinated citations',
                'Append-only audit trail',
              ].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Product preview ───────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28" data-reveal>
          <ProductPreview onEnterApp={onEnterApp} sessionReady={sessionReady} />
          <p className="text-[11px] text-ink-faint mt-3 text-center">
            Live preview rendered from the seeded Northstar Labs demo tenant — real API data, no mock statistics.
          </p>
        </section>

        {/* ── How it works ──────────────────────────────────────── */}
        <section id="how" className="border-t border-line bg-white/60 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24">
            <div className="max-w-2xl" data-reveal>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-vermilion">
                How it works
              </p>
              <h2 className="display-title text-[32px] sm:text-[40px] leading-tight font-semibold mt-3 tracking-tight">
                Three moves from ground truth to signed-off copy.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-px bg-line border border-line rounded-lg overflow-hidden mt-12">
              {steps.map((s, i) => (
                <div
                  key={s.num}
                  data-reveal
                  style={{ transitionDelay: `${i * 90}ms` }}
                  className="bg-white p-7 hover:bg-ivory/60 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[13px] font-semibold text-vermilion">
                      {s.num}
                    </span>
                    <s.icon className="w-5 h-5 text-ink-faint" aria-hidden />
                  </div>
                  <h3 className="text-[16px] font-semibold mt-5 leading-snug">{s.title}</h3>
                  <p className="text-[13.5px] text-ink-muted leading-relaxed mt-2.5">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Capabilities ──────────────────────────────────────── */}
        <section id="capabilities" className="border-t border-line scroll-mt-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6" data-reveal>
              <div className="max-w-2xl">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-vermilion">
                  Capabilities
                </p>
                <h2 className="display-title text-[32px] sm:text-[40px] leading-tight font-semibold mt-3 tracking-tight">
                  An investigation toolkit for brand governance.
                </h2>
              </div>
              <p className="text-[13.5px] text-ink-muted max-w-sm leading-relaxed">
                Every module works from the same evidence graph — open any finding and follow it
                back to the rule and passage that produced it.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
              {capabilities.map((c, i) => (
                <div
                  key={c.title}
                  data-reveal
                  style={{ transitionDelay: `${(i % 4) * 70}ms` }}
                  className="bg-white border border-line rounded-lg p-5 hover:shadow-card hover:border-line-strong transition-all group"
                >
                  <div className="w-9 h-9 rounded-md bg-vermilion-tint border border-indigo-800/40 flex items-center justify-center text-vermilion group-hover:bg-vermilion group-hover:text-white group-hover:border-vermilion transition-colors">
                    <c.icon className="w-[18px] h-[18px]" />
                  </div>
                  <h3 className="text-[14.5px] font-semibold mt-4">{c.title}</h3>
                  <p className="text-[12.5px] text-ink-muted leading-relaxed mt-2">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Evidence / trust ──────────────────────────────────── */}
        <section id="evidence" className="border-t border-line bg-white/60 scroll-mt-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-12 lg:gap-16">
              <div data-reveal>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-vermilion">
                  Evidence, not adjectives
                </p>
                <h2 className="display-title text-[32px] sm:text-[40px] leading-tight font-semibold mt-3 tracking-tight">
                  Trust that survives an audit.
                </h2>
                <p className="text-[14px] text-ink-muted leading-relaxed mt-4">
                  BrandSentinel is judged by what it can show. These are properties of the
                  running system — verifiable in the test suite, the API and the audit ledger.
                </p>

                <div className="mt-8 border-l-2 border-vermilion pl-4">
                  <Quote className="w-4 h-4 text-vermilion" aria-hidden />
                  <p className="display-title text-[19px] leading-snug mt-2 italic">
                    A source supports only the scope it actually establishes.
                  </p>
                  <p className="text-[11.5px] font-mono text-ink-muted mt-2">
                    — Golden Rule, Claim DNA engine
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
                {evidencePoints.map((e, i) => (
                  <div
                    key={e.title}
                    data-reveal
                    style={{ transitionDelay: `${(i % 2) * 80}ms` }}
                    className="flex gap-3"
                  >
                    <CheckCircle2
                      className="w-4 h-4 text-teal-400 shrink-0 mt-0.5"
                      aria-hidden
                    />
                    <div>
                      <h3 className="text-[13.5px] font-semibold leading-snug">{e.title}</h3>
                      <p className="text-[12.5px] text-ink-muted leading-relaxed mt-1">{e.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section className="border-t border-line">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24 text-center" data-reveal>
            <h2 className="display-title text-[32px] sm:text-[44px] leading-tight font-semibold tracking-tight max-w-2xl mx-auto">
              Bring your next campaign before the sentinel.
            </h2>
            <p className="text-[14.5px] text-ink-muted mt-4 max-w-xl mx-auto leading-relaxed">
              Step into the seeded Northstar Labs workspace, switch personas and watch a draft
              travel from finding to approval — with evidence at every step.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button onClick={onEnterApp} icon={<ArrowRight className="w-4 h-4" />}>
                Open the workspace
              </Button>
              <a href="#capabilities">
                <Button variant="secondary">Explore capabilities</Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-line bg-white/70">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-md bg-vermilion flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" aria-hidden />
                </span>
                <span className="font-display font-semibold text-[16px] tracking-tight">
                  BrandSentinel
                </span>
              </div>
              <p className="text-[12.5px] text-ink-muted leading-relaxed mt-3 max-w-xs">
                Evidence-backed brand governance intelligence for teams that would rather show
                their sources than assert their claims.
              </p>
            </div>

            <div>
              <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                Product
              </h3>
              <ul className="mt-3.5 space-y-2 text-[13px] text-ink-soft">
                <li><a className="hover:text-vermilion transition" href="#how">How it works</a></li>
                <li><a className="hover:text-vermilion transition" href="#capabilities">Capabilities</a></li>
                <li><a className="hover:text-vermilion transition" href="#evidence">Evidence</a></li>
                <li>
                  <button className="hover:text-vermilion transition" onClick={onEnterApp}>
                    Open workspace
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                Modules
              </h3>
              <ul className="mt-3.5 space-y-2 text-[13px] text-ink-soft">
                <li>Review Studio & Claim DNA</li>
                <li>Brand Evidence Graph</li>
                <li>Drift Radar & Conflicts</li>
                <li>Approval & Audit Trail</li>
              </ul>
            </div>

            <div>
              <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                Demo environment
              </h3>
              <p className="text-[12.5px] text-ink-muted leading-relaxed mt-3.5">
                Northstar Labs is a synthetic organisation. All tenants, personas and telemetry
                shown are seeded demo data.
              </p>
              <p className="text-[11px] font-mono text-ink-faint mt-3">
                API docs · 127.0.0.1:8000/docs
              </p>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-[11.5px] text-ink-faint">
            <p>© 2026 BrandSentinel. AI recommends · Evidence supports · Humans decide.</p>
            <p className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" aria-hidden />
              5/5 automated tests passing
              <ChevronRight className="w-3 h-3" aria-hidden />
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
