import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Cpu,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import {
  Button,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  useToast,
} from '../components/ui';

interface SettingsPageProps {
  onResetDemo: () => void;
  isResetting: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onResetDemo, isResetting }) => {
  const toast = useToast();
  const [retentionDays, setRetentionDays] = useState(365);
  const [requireLegalGate, setRequireLegalGate] = useState(true);
  const [strictToneChecks, setStrictToneChecks] = useState(true);
  const [aiProvider, setAiProvider] = useState('DEMO');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleSaveSettings = () => {
    // Honest feedback: this build exposes no organization policy endpoint, so the
    // controls are session-scoped rather than persisted server-side.
    setSavedMsg(
      'Settings applied to this session — organization policy storage is not exposed by the API in this build.'
    );
    setTimeout(() => setSavedMsg(null), 5000);
  };

  // The reset mutation itself lives in App.handleResetDemo, which awaits the API
  // call and reports its own success/error toasts; this guard only surfaces a
  // synchronous failure of the callback itself.
  const handleResetDemoClick = () => {
    try {
      onResetDemo();
    } catch (err: any) {
      toast.error('Demo reset failed', err?.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={<Settings className="w-5 h-5" />}
        eyebrow="Policy Control"
        title="Organization Governance Settings"
        description="Organization-wide review enforcement thresholds, AI provider integration, retention parameters, and demo state."
        actions={
          <Button onClick={handleSaveSettings}>Save Configuration</Button>
        }
      />

      {savedMsg && (
        <div
          role="status"
          className="p-3 bg-teal-950 border border-teal-800 text-teal-400 rounded-md text-xs flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Review & Gating Policies */}
        <Panel className="p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <ShieldCheck className="w-4 h-4 text-vermilion" />
            <h2 className="text-sm font-bold text-ink">Review Gating & Compliance Policies</h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-ivory border border-line">
              <div>
                <p className="font-semibold text-ink">Mandatory Legal Review for Claims</p>
                <p className="text-[11px] text-ink-muted">Requires Legal Reviewer sign-off for any numerical claim &gt; 30%</p>
              </div>
              <input
                type="checkbox"
                checked={requireLegalGate}
                onChange={(e) => setRequireLegalGate(e.target.checked)}
                aria-label="Mandatory legal review for claims"
                className="w-4 h-4 shrink-0 rounded border-line text-vermilion focus:ring-vermilion/20 bg-white"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-ivory border border-line">
              <div>
                <p className="font-semibold text-ink">Strict Tone Restraint Engine</p>
                <p className="text-[11px] text-ink-muted">Automatically flags superlatives and competitive sales vernacular</p>
              </div>
              <input
                type="checkbox"
                checked={strictToneChecks}
                onChange={(e) => setStrictToneChecks(e.target.checked)}
                aria-label="Strict tone restraint engine"
                className="w-4 h-4 shrink-0 rounded border-line text-vermilion focus:ring-vermilion/20 bg-white"
              />
            </div>

            <div className="p-3 rounded-md bg-ivory border border-line">
              <Field
                label="Audit & Version Retention Period (Days)"
                hint="Content snapshots preserved for regulatory compliance."
              >
                <Input
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                />
              </Field>
            </div>
          </div>
        </Panel>

        {/* AI Engine & Provider Adapter */}
        <Panel className="p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Cpu className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-ink">AI Provider & Inspection Adapter</h2>
          </div>

          <div className="space-y-4 text-xs">
            <Field label="Active AI Provider Adapter">
              <Select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
                <option value="DEMO">BrandSentinel Hybrid Local Rule Engine (Deterministic + Claim DNA)</option>
                <option value="OPENAI">OpenAI GPT-4o (Semantic Analysis)</option>
                <option value="GEMINI">Google Gemini 1.5 Pro / Flash</option>
                <option value="ANTHROPIC">Anthropic Claude 3.5 Sonnet</option>
              </Select>
            </Field>

            <div className="p-3.5 bg-vermilion-tint border border-indigo-800/60 rounded-md space-y-1">
              <span className="text-[10px] font-bold text-vermilion uppercase">External Provider Notice:</span>
              <p className="text-[11px] text-ink-soft leading-relaxed">
                When external LLM providers are configured, only extracted claim fragments and anonymized text segments are sent for semantic verification. System ground truth rules remain isolated on-premise.
              </p>
            </div>

            {/* Demo Data Reset Section */}
            <div className="pt-2 border-t border-line space-y-2">
              <span className="font-semibold text-ink block">Synthetic Demo Management</span>
              <p className="text-[11px] text-ink-muted">
                Reset Northstar Labs synthetic brand guidelines, approved facts, precedents, and the 5-issue draft.
              </p>
              <Button
                variant="secondary"
                onClick={handleResetDemoClick}
                loading={isResetting}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                {isResetting ? 'Resetting Demo Data...' : 'Reset Northstar Labs Demo Data'}
              </Button>
            </div>

            <p className="text-[11px] text-ink-faint border-t border-line pt-3">
              Policy controls are session-scoped in this build — no organization policy endpoint
              is exposed by the API.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
};
