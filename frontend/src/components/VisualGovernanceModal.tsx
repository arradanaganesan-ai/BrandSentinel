import React, { useEffect, useRef, useState } from 'react';
import {
  Palette,
  X,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Info,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { Button, Input } from './ui';

interface VisualGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ── WCAG 2.1 relative luminance (same maths the contrast engine performs) ── */

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/* Legible label colour for a swatch chip, chosen by the swatch's own luminance. */
const swatchLabelClass = (hex: string): string =>
  relativeLuminance(hex) > 0.2 ? 'text-ink' : 'text-white';

/* Approved brand palette — the app's real design tokens (see DESIGN.md). */
const approvedPalette = [
  { name: 'Ivory (Page Background)', hex: '#F8F4EC' },
  { name: 'Ink (Primary Text)', hex: '#251C19' },
  { name: 'Vermilion (Primary Action)', hex: '#C83232' },
  { name: 'Surface (Cards)', hex: '#FFFFFF' },
  { name: 'Line (Borders)', hex: '#E6DDCC' },
  { name: 'Ink Muted (Secondary Text)', hex: '#6E625A' },
  { name: 'Verified Green', hex: '#1F6E52' },
  { name: 'Caution Ochre', hex: '#A8761A' },
  { name: 'Critical Red', hex: '#A3231D' },
];

export const VisualGovernanceModal: React.FC<VisualGovernanceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [fgHex, setFgHex] = useState('#251C19');
  const [bgHex, setBgHex] = useState('#F8F4EC');
  const [textSize, setTextSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [contrastResult, setContrastResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contrastError, setContrastError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCalculateContrast = async () => {
    setIsLoading(true);
    setContrastError(null);
    try {
      const res = await api.checkContrast({
        foreground_hex: fgHex,
        background_hex: bgHex,
        text_size_pt: textSize,
        is_bold: isBold,
      });
      setContrastResult(res);
    } catch (err: any) {
      console.error(err);
      setContrastError(
        err?.message || 'Contrast check failed. Ensure the BrandSentinel API is reachable.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await api.inspectImage(formData);
      setUploadResult(res);
    } catch (err: any) {
      console.error(err);
      setUploadResult(null);
      setUploadError(
        err?.message || 'Image inspection failed. Ensure the BrandSentinel API is reachable.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#251C19]/45 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Visual Brand Governance & Accessibility Lab"
        tabIndex={-1}
        className="w-full max-w-4xl my-8 bg-white border border-line rounded-lg shadow-2xl overflow-hidden flex flex-col outline-none animate-scale-in"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-line bg-ivory flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-vermilion-tint border border-indigo-800/40 flex items-center justify-center text-vermilion">
              <Palette className="w-4 h-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold font-display text-ink tracking-tight">
                Visual Brand Governance &amp; Accessibility Lab
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                WCAG 2.1 Contrast Calculation, Color Palette Fidelity &amp; Asset Verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close visual governance lab"
            className="text-ink-muted hover:text-ink p-1 rounded-md hover:bg-surface-inset transition"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Approved Brand Palette */}
          <div>
            <h3 className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">
              Approved Northstar Labs Color Palette
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {approvedPalette.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setFgHex(p.hex)}
                  title={`Use ${p.name} as the foreground colour`}
                  className="w-full text-left p-2.5 rounded-md bg-white border border-line hover:border-vermilion/50 hover:bg-ivory/60 transition flex items-center gap-3 cursor-pointer"
                >
                  <span
                    className={`w-12 h-12 rounded-md border border-line shrink-0 flex items-center justify-center font-mono text-[9px] font-semibold ${swatchLabelClass(p.hex)}`}
                    style={{ backgroundColor: p.hex }}
                  >
                    {p.hex.replace('#', '')}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-ink truncate">{p.name}</span>
                    <span className="block text-[10px] font-mono text-ink-muted">{p.hex}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Interactive WCAG Contrast Calculator */}
          <div className="bg-ivory border border-line p-5 rounded-lg space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold font-display text-ink">
                  WCAG 2.1 Contrast Ratio Verification
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Calculates mathematical relative luminance to guarantee AA (4.5:1) and AAA (7:1) readability
                </p>
              </div>
              <Button size="sm" loading={isLoading} onClick={handleCalculateContrast}>
                Run Contrast Check
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="vg-fg-hex" className="text-[11px] font-semibold text-ink-muted block mb-1">
                  Foreground (Text) Hex
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fgHex}
                    onChange={(e) => setFgHex(e.target.value)}
                    aria-label="Foreground colour picker"
                    className="w-8 h-8 rounded-md border border-line bg-transparent cursor-pointer p-0.5 shrink-0"
                  />
                  <Input
                    id="vg-fg-hex"
                    value={fgHex}
                    onChange={(e) => setFgHex(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vg-bg-hex" className="text-[11px] font-semibold text-ink-muted block mb-1">
                  Background Hex
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgHex}
                    onChange={(e) => setBgHex(e.target.value)}
                    aria-label="Background colour picker"
                    className="w-8 h-8 rounded-md border border-line bg-transparent cursor-pointer p-0.5 shrink-0"
                  />
                  <Input
                    id="vg-bg-hex"
                    value={bgHex}
                    onChange={(e) => setBgHex(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vg-font-size" className="text-[11px] font-semibold text-ink-muted block mb-1">
                  Font Size (pt)
                </label>
                <Input
                  id="vg-font-size"
                  type="number"
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 text-xs text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBold}
                    onChange={(e) => setIsBold(e.target.checked)}
                    className="rounded border-line text-vermilion focus:ring-vermilion/20"
                  />
                  <span>Bold Weight</span>
                </label>
              </div>
            </div>

            {contrastError && (
              <p
                role="alert"
                className="text-xs text-red-400 flex items-center gap-1.5 bg-red-950 border border-red-800/70 rounded-md px-3 py-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {contrastError}
              </p>
            )}

            {/* Live Visual Preview Swatch */}
            <div
              className="p-5 rounded-md border border-line flex flex-col justify-center items-center text-center transition"
              style={{ backgroundColor: bgHex }}
            >
              <p
                style={{
                  color: fgHex,
                  fontSize: `${textSize}pt`,
                  fontWeight: isBold ? 'bold' : 'normal',
                }}
              >
                Northstar Labs — Precision Brand Governance Intelligence
              </p>
              <p className="text-[10px] opacity-75 mt-1 font-mono" style={{ color: fgHex }}>
                Sample preview rendering in live client DOM
              </p>
            </div>

            {/* Contrast Evaluation Metrics */}
            {contrastResult && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="bg-white p-3 rounded-md border border-line">
                  <p className="text-[10px] text-ink-muted font-medium">Calculated Ratio</p>
                  <p className="text-xl font-bold font-mono text-ink mt-0.5">{contrastResult.contrast_ratio}:1</p>
                </div>

                <div
                  className={`p-3 rounded-md border ${
                    contrastResult.passes_wcag_aa_normal
                      ? 'bg-teal-950 border-teal-800/70'
                      : 'bg-red-950 border-red-800/70'
                  }`}
                >
                  <p
                    className={`text-[10px] font-medium ${
                      contrastResult.passes_wcag_aa_normal ? 'text-teal-400' : 'text-red-400'
                    }`}
                  >
                    WCAG AA Standard (4.5:1)
                  </p>
                  <div
                    className={`flex items-center gap-1.5 mt-0.5 font-bold text-sm ${
                      contrastResult.passes_wcag_aa_normal ? 'text-teal-400' : 'text-red-400'
                    }`}
                  >
                    {contrastResult.passes_wcag_aa_normal ? (
                      <CheckCircle2 className="w-4 h-4" aria-hidden />
                    ) : (
                      <AlertTriangle className="w-4 h-4" aria-hidden />
                    )}
                    <span>{contrastResult.passes_wcag_aa_normal ? 'Compliant' : 'Non-Compliant'}</span>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-md border ${
                    contrastResult.passes_wcag_aaa_normal
                      ? 'bg-teal-950 border-teal-800/70'
                      : 'bg-surface-inset border-line'
                  }`}
                >
                  <p
                    className={`text-[10px] font-medium ${
                      contrastResult.passes_wcag_aaa_normal ? 'text-teal-400' : 'text-ink-muted'
                    }`}
                  >
                    WCAG AAA Enhanced (7:1)
                  </p>
                  <div
                    className={`flex items-center gap-1.5 mt-0.5 font-bold text-sm ${
                      contrastResult.passes_wcag_aaa_normal ? 'text-teal-400' : 'text-ink-muted'
                    }`}
                  >
                    {contrastResult.passes_wcag_aaa_normal ? (
                      <CheckCircle2 className="w-4 h-4" aria-hidden />
                    ) : (
                      <Info className="w-4 h-4" aria-hidden />
                    )}
                    <span>{contrastResult.passes_wcag_aaa_normal ? 'Exceptional' : 'Standard AA'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Upload Image for Palette & Logo Verification */}
          <div className="bg-ivory border border-line p-5 rounded-lg space-y-4">
            <div>
              <h3 className="text-sm font-semibold font-display text-ink">
                Visual Asset Image Upload &amp; Inspection
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Extracts dominant colors, verifies alignment against approved brand palette, and tests logo similarity
              </p>
            </div>

            <div className="border-2 border-dashed border-line hover:border-vermilion/50 rounded-md p-6 text-center cursor-pointer transition bg-white/60">
              <UploadCloud
                className={`w-8 h-8 mx-auto mb-2 ${isUploading ? 'text-ink-faint' : 'text-vermilion'}`}
                aria-hidden
              />
              <p className="text-xs font-semibold text-ink">Upload visual asset (PNG, JPG, SVG)</p>
              <p className="text-[11px] text-ink-muted mt-1">Automatic dominant color extraction via Pillow</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="asset-upload-input"
                disabled={isUploading}
              />
              <label
                htmlFor="asset-upload-input"
                className="mt-3 inline-block px-3 py-1.5 rounded-md bg-white border border-line hover:bg-surface-inset text-ink text-xs font-medium cursor-pointer shadow-xs transition"
              >
                {isUploading ? 'Inspecting…' : 'Select File'}
              </label>
            </div>

            {isUploading && (
              <p className="text-xs text-ink-muted flex items-center gap-1.5" role="status" aria-live="polite">
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                Inspecting image against the approved brand palette…
              </p>
            )}

            {uploadError && (
              <p
                role="alert"
                className="text-xs text-red-400 flex items-center gap-1.5 bg-red-950 border border-red-800/70 rounded-md px-3 py-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {uploadError}
              </p>
            )}

            {uploadResult && (
              <div className="p-4 rounded-md bg-white border border-line space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">File: {uploadResult.filename}</span>
                  <span className="text-xs font-mono text-teal-400">
                    Logo Match Score: {Math.round((uploadResult.logo_similarity_score || 0) * 100)}%
                  </span>
                </div>

                <div>
                  <p className="text-[11px] text-ink-muted mb-1.5 font-medium">Extracted Dominant Colors:</p>
                  <div className="flex flex-wrap gap-2">
                    {uploadResult.dominant_colors?.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 bg-ivory px-2.5 py-1 rounded-md border border-line">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-line"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-[11px] font-mono text-ink-soft">{c.hex}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-ink-muted bg-ivory p-2.5 rounded-md border border-line flex items-start gap-2">
                  <Info className="w-4 h-4 text-vermilion shrink-0 mt-0.5" aria-hidden />
                  <span>{uploadResult.governance_advisory}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
