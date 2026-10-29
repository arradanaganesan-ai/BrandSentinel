import React, { useEffect, useRef, useState } from 'react';
import {
  RotateCcw,
  Sparkles,
  ChevronDown,
  Palette,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  Menu,
} from 'lucide-react';
import { User, DemoUser } from '../types';
import { Badge } from './ui';

interface NavbarProps {
  currentUser: User | null;
  demoUsers: DemoUser[];
  onSwitchUser: (user: DemoUser) => void;
  onResetDemo: () => void;
  onOpenTour: () => void;
  onOpenVisualModal: () => void;
  isResetting: boolean;
  onExitToSite?: () => void;
  onToggleNav?: () => void;
}

const roleTone = (role?: string) => {
  switch (role) {
    case 'ORG_ADMIN':
      return 'violet' as const;
    case 'APPROVER':
      return 'success' as const;
    case 'LEGAL_COMPLIANCE':
      return 'warning' as const;
    case 'BRAND_MANAGER':
      return 'info' as const;
    default:
      return 'neutral' as const;
  }
};

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  demoUsers,
  onSwitchUser,
  onResetDemo,
  onOpenTour,
  onOpenVisualModal,
  isResetting,
  onExitToSite,
  onToggleNav,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDropdownOpen(false);
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [dropdownOpen]);

  return (
    <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur border-b border-line px-4 sm:px-5 py-2.5 flex items-center justify-between gap-4">
      {/* Brand & organization */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onToggleNav && (
          <button
            onClick={onToggleNav}
            className="lg:hidden p-2 -ml-1 shrink-0 rounded-md text-ink-soft hover:bg-surface-inset border border-line transition"
            aria-label="Toggle navigation menu"
            aria-expanded={false}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-md bg-vermilion flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-[17px] text-ink tracking-tight leading-none">
                BrandSentinel
              </span>
              <span className="hidden xl:inline shrink-0 whitespace-nowrap text-[9px] uppercase font-bold tracking-[0.12em] px-1.5 py-0.5 rounded bg-vermilion-tint text-vermilion border border-vermilion/25">
                Governance OS
              </span>
            </div>
            <p className="hidden sm:block text-[10.5px] text-ink-muted font-medium leading-tight mt-0.5 truncate">
              Evidence-Backed Brand Governance Intelligence
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 pl-3.5 border-l border-line">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" aria-hidden />
          <span className="text-[11px] text-ink-muted">
            Tenant: <strong className="text-ink font-semibold">Northstar Labs</strong>
          </span>
          <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950 border border-amber-800/60 px-1.5 py-0.5 rounded">
            SYNTHETIC DEMO
          </span>
        </div>
      </div>

      {/* Core principle */}
      <div className="hidden xl:flex items-center gap-1.5 text-[11px] bg-white border border-line px-3.5 py-1.5 rounded-full shadow-xs">
        <span className="text-ink-faint font-medium">Core principle:</span>
        <span className="font-semibold text-ink-soft">
          <span className="text-vermilion">AI recommends.</span>{' '}
          <span className="text-teal-400">Evidence supports.</span>{' '}
          <span className="text-amber-300">Authorised humans decide.</span>
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenVisualModal}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium text-ink-soft bg-white hover:bg-surface-inset border border-line transition whitespace-nowrap"
          title="Inspect WCAG contrast and brand colour palette"
        >
          <Palette className="w-3.5 h-3.5 text-vermilion" aria-hidden />
          <span className="hidden md:inline">Visual WCAG</span>
        </button>

        <button
          onClick={onOpenTour}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-semibold text-white bg-vermilion hover:bg-vermilion-hover transition shadow-sm whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          <span className="hidden sm:inline">Demo Tour</span>
          <span className="sm:hidden">Tour</span>
        </button>

        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium text-ink-soft bg-white hover:bg-surface-inset border border-line transition disabled:opacity-60 whitespace-nowrap"
          title="Reset seeded Northstar Labs draft and findings"
        >
          <RotateCcw
            className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-vermilion' : 'text-ink-faint'}`}
            aria-hidden
          />
          <span className="hidden md:inline">{isResetting ? 'Resetting…' : 'Reset Demo'}</span>
        </button>

        {onExitToSite && (
          <button
            onClick={onExitToSite}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium text-ink-soft bg-white hover:bg-surface-inset border border-line transition whitespace-nowrap"
            title="Return to the public site"
          >
            <LogOut className="w-3.5 h-3.5 text-ink-faint" aria-hidden />
            <span>Site</span>
          </button>
        )}

        {/* Persona switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-md bg-white border border-line hover:bg-surface-inset transition text-left shrink-0"
          >
            <div className="w-7 h-7 rounded-full bg-vermilion-tint border border-indigo-800/40 flex items-center justify-center text-xs font-bold text-indigo-400">
              {currentUser?.full_name?.charAt(0) || '…'}
            </div>
            <div className="hidden md:block leading-tight whitespace-nowrap">
              <div className="text-[11.5px] font-semibold text-ink">
                {currentUser?.full_name || 'Loading…'}
              </div>
              <div className="text-[10px] text-ink-muted capitalize">
                {currentUser?.role?.replace(/_/g, ' ').toLowerCase() || 'role'}
              </div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-ink-faint transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>

          {dropdownOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-72 bg-white border border-line rounded-lg shadow-xl py-1.5 z-50 animate-scale-in"
            >
              <div className="px-3.5 py-2 border-b border-line">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Switch persona
                </p>
                <p className="text-[10.5px] text-ink-faint mt-0.5">
                  Test server-enforced RBAC gates across five seeded roles
                </p>
              </div>

              <div className="py-1 max-h-[320px] overflow-y-auto">
                {demoUsers.map((u) => {
                  const isCurrent = currentUser?.email === u.email;
                  return (
                    <button
                      key={u.id}
                      role="menuitem"
                      onClick={() => {
                        onSwitchUser(u);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 flex items-center justify-between gap-2 text-left transition ${
                        isCurrent ? 'bg-vermilion-tint/70' : 'hover:bg-surface-inset'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium text-ink flex items-center gap-1.5">
                          <span className="truncate">{u.name}</span>
                          {isCurrent && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" aria-label="Active persona" />
                          )}
                        </div>
                        <div className="text-[10.5px] text-ink-muted truncate">{u.email}</div>
                      </div>
                      <Badge tone={roleTone(u.role)} className="shrink-0">
                        {u.role.replace(/_/g, ' ')}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
