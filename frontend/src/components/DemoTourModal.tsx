import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { Badge, Button } from './ui';

interface DemoTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onTriggerReview?: () => void;
}

const steps: {
  step: number;
  title: string;
  tab: NavTab;
  description: string;
  actionLabel: string;
  categoryBadge: string;
}[] = [
  {
    step: 1,
    title: 'Executive Overview',
    tab: 'overview',
    description: 'Review the live governance telemetry: overall health score (88%), category breakdown, active review queue, and quick actions.',
    actionLabel: 'Go to Overview',
    categoryBadge: 'Telemetry'
  },
  {
    step: 2,
    title: 'Select Seeded Marketing Draft',
    tab: 'studio',
    description: 'Open the 3-panel Content Review Studio. The synthetic Northstar Labs draft contains 5 intentional brand governance infractions across claims, tone, terminology, facts, and accessibility.',
    actionLabel: 'Open Review Studio',
    categoryBadge: 'Content Studio'
  },
  {
    step: 3,
    title: 'Run Governance Review',
    tab: 'studio',
    description: 'Click "Run Governance Review" in the top bar. BrandSentinel runs hybrid deterministic checks and Claim DNA semantic analysis.',
    actionLabel: 'Execute Review in Studio',
    categoryBadge: 'Review Engine'
  },
  {
    step: 4,
    title: 'Inspect 5 Structured Findings',
    tab: 'studio',
    description: 'Examine the right panel findings. Notice the exact affected character offsets, severity ratings, calibrated confidence ratings, and rule links.',
    actionLabel: 'Inspect Finding Cards',
    categoryBadge: 'Structured Findings'
  },
  {
    step: 5,
    title: 'Open Claim DNA Inspector',
    tab: 'claim_dna',
    description: 'Observe how the 98% productivity claim is decomposed into Subject, Baseline, Scope, Timeline, and missing qualifiers. A source supports only the scope it actually establishes.',
    actionLabel: 'Inspect Claim DNA',
    categoryBadge: 'Unique Differentiator'
  },
  {
    step: 6,
    title: 'Inspect Ground-Truth Citations',
    tab: 'knowledge',
    description: 'Open Brand Knowledge Hub to verify that every citation resolves to stored source passages in the Northstar Brand Voice Manual or 2026 Benchmark Study.',
    actionLabel: 'View Source Passages',
    categoryBadge: 'Evidence Graph'
  },
  {
    step: 7,
    title: 'Accept Suggested Corrections',
    tab: 'studio',
    description: 'In the Review Studio, click "Accept Suggestion" on the terminology finding to substitute "guaranteed results" with "systematically validated outcomes".',
    actionLabel: 'Apply Suggestions in Studio',
    categoryBadge: 'Human Oversight'
  },
  {
    step: 8,
    title: 'Save Revision & Resubmit',
    tab: 'studio',
    description: 'Save the revised text as Revision v2. Notice how BrandSentinel creates an immutable snapshot of every version.',
    actionLabel: 'Save Revision v2',
    categoryBadge: 'Versioning'
  },
  {
    step: 9,
    title: 'Review Diff Intelligence',
    tab: 'studio',
    description: 'Switch to the "Review Diff" tab in the Center Panel to see word-by-word inserted/removed diffs and automatic detection of resolved vs remaining issues.',
    actionLabel: 'View Diff Intelligence',
    categoryBadge: 'Unique Differentiator'
  },
  {
    step: 10,
    title: 'Post Reviewer Comment',
    tab: 'studio',
    description: 'Switch to Legal Reviewer persona (Sarah Jenkins, Esq.) and post a contextual comment on the revision thread.',
    actionLabel: 'Collaborate in Studio',
    categoryBadge: 'Collaboration'
  },
  {
    step: 11,
    title: 'Approval Gate with Mandatory Rationale',
    tab: 'approvals',
    description: 'Switch to Executive Approver (David Vance). Sign off on Revision v2. Notice the system snapshots all active guideline versions at decision time.',
    actionLabel: 'Open Approval Workspace',
    categoryBadge: 'Approval Gate'
  },
  {
    step: 12,
    title: 'Explore Brand Evidence Graph',
    tab: 'graph',
    description: 'Open the React Flow visual graph showing Brand Rule → Approved Fact → Content Claim → Finding → Reviewer Decision.',
    actionLabel: 'View Evidence Graph',
    categoryBadge: 'Unique Differentiator'
  },
  {
    step: 13,
    title: 'Explore Brand Drift Radar',
    tab: 'drift',
    description: 'Track repeated terminology errors, override trends, recurring patterns, and rule health across the organisation.',
    actionLabel: 'Open Drift Radar',
    categoryBadge: 'Drift Detection'
  },
  {
    step: 14,
    title: 'Inspect Guideline Conflict Center',
    tab: 'conflicts',
    description: 'See the Conflict Detector surface 2 contradictory active guidelines (e.g. platform nomenclature and draft SLA targets) with administrator recommendations.',
    actionLabel: 'View Conflicts',
    categoryBadge: 'Conflict Resolution'
  },
  {
    step: 15,
    title: 'Inspect Risk Propagation Center',
    tab: 'propagation',
    description: 'Trace how upgrading the SLA and deprecating SOC 1 flags 2 previously approved corporate documents for re-review.',
    actionLabel: 'View Propagation Map',
    categoryBadge: 'Cascade Analysis'
  },
  {
    step: 16,
    title: 'Verify Immutable Audit Trail',
    tab: 'audit',
    description: 'Examine the tamper-evident server event log recording every submission, review execution, role modification, and approval decision.',
    actionLabel: 'Inspect Audit Trail',
    categoryBadge: 'Compliance & Security'
  }
];

export const DemoTourModal: React.FC<DemoTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentStepIdx((i) => Math.min(steps.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStepIdx((i) => Math.max(0, i - 1));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentStep = steps[currentStepIdx];

  const handleGoToStep = () => {
    onNavigateTab(currentStep.tab);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#251C19]/45 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="BrandSentinel Guided Hackathon Demonstration"
        tabIndex={-1}
        className="w-full max-w-2xl bg-white border border-line rounded-lg shadow-2xl overflow-hidden flex flex-col outline-none animate-scale-in"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-line bg-ivory flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-vermilion-tint border border-indigo-800/40 flex items-center justify-center text-vermilion">
              <Sparkles className="w-4 h-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-display text-ink tracking-tight">
                BrandSentinel Guided Hackathon Demonstration
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Step {currentStep.step} of 16 — Northstar Labs Scenario
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guided tour"
            className="text-ink-muted hover:text-ink p-1 rounded-md hover:bg-surface-inset transition"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Badge tone="brand" className="font-mono">
              {currentStep.categoryBadge}
            </Badge>
            <span className="text-xs font-mono text-ink-muted">
              Step {currentStepIdx + 1} / {steps.length}
            </span>
          </div>

          <h3 className="text-lg font-display font-semibold text-ink">{currentStep.title}</h3>
          <p className="text-sm text-ink-muted leading-relaxed bg-ivory border border-line rounded-md p-4">
            {currentStep.description}
          </p>

          {/* Quick jump to page */}
          <div className="pt-2 flex justify-start">
            <Button
              size="sm"
              onClick={handleGoToStep}
              icon={<ArrowRight className="w-3.5 h-3.5" aria-hidden />}
            >
              {currentStep.actionLabel}
            </Button>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-ivory px-6 py-3.5 border-t border-line flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentStepIdx(Math.max(0, currentStepIdx - 1))}
            disabled={currentStepIdx === 0}
            icon={<ChevronLeft className="w-3.5 h-3.5" aria-hidden />}
          >
            Previous Step
          </Button>

          {/* Step Dots */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs py-1" role="group" aria-label="Tour steps">
            {steps.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIdx(idx)}
                aria-label={`Go to step ${s.step}: ${s.title}`}
                aria-current={idx === currentStepIdx ? 'step' : undefined}
                className={`h-2.5 rounded-full transition-all ${
                  idx === currentStepIdx
                    ? 'w-5 bg-vermilion'
                    : idx < currentStepIdx
                    ? 'w-2.5 bg-teal-400'
                    : 'w-2.5 bg-line-strong'
                }`}
                title={`Step ${s.step}: ${s.title}`}
              />
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => setCurrentStepIdx(Math.min(steps.length - 1, currentStepIdx + 1))}
            disabled={currentStepIdx === steps.length - 1}
          >
            Next Step
            <ChevronRight className="w-3.5 h-3.5" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
};
