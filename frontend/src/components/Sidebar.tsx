import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileCheck2,
  Dna,
  ListOrdered,
  CheckSquare,
  Network,
  Activity,
  Scale,
  BrainCircuit,
  AlertOctagon,
  History,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'knowledge'
  | 'studio'
  | 'claim_dna'
  | 'queue'
  | 'approvals'
  | 'graph'
  | 'drift'
  | 'conflicts'
  | 'memory'
  | 'propagation'
  | 'audit'
  | 'team'
  | 'settings';

export interface SidebarCounts {
  queue?: number | null;
  conflicts?: number | null;
}

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  counts?: SidebarCounts;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  icon: any;
  badge?: string;
  countKey?: keyof SidebarCounts;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  counts = {},
  mobileOpen = false,
  onCloseMobile,
}) => {
  const navSections: NavSection[] = [
    {
      title: 'Dashboard',
      items: [{ id: 'overview', label: 'Executive Overview', icon: LayoutDashboard }],
    },
    {
      title: 'Review Workflow',
      items: [
        { id: 'studio', label: 'Content Review Studio', icon: FileCheck2 },
        { id: 'claim_dna', label: 'Claim DNA Inspector', icon: Dna, badge: 'New' },
        { id: 'queue', label: 'Review Queue', icon: ListOrdered, countKey: 'queue' },
        { id: 'approvals', label: 'Approval Workspace', icon: CheckSquare },
        { id: 'knowledge', label: 'Brand Knowledge Hub', icon: BookOpen },
      ],
    },
    {
      title: 'Governance Intelligence',
      items: [
        { id: 'graph', label: 'Brand Evidence Graph', icon: Network },
        { id: 'drift', label: 'Brand Drift Radar', icon: Activity },
        { id: 'conflicts', label: 'Guideline Conflicts', icon: Scale, countKey: 'conflicts' },
        { id: 'memory', label: 'Decision Memory', icon: BrainCircuit },
        { id: 'propagation', label: 'Risk Propagation', icon: AlertOctagon },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'audit', label: 'Audit Trail', icon: History },
        { id: 'team', label: 'Team & Permissions', icon: Users },
        { id: 'settings', label: 'Governance Settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#251C19]/45 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      )}
      <aside
        className={`shrink-0 bg-ivory border-r border-line flex flex-col justify-between
          fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'w-[68px]' : 'w-60'}`}
      >
      <nav
        aria-label="Primary"
        className="flex-1 overflow-y-auto py-5 px-2.5 space-y-6"
      >
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <h3 className="px-2.5 pb-1.5 text-[9.5px] font-bold tracking-[0.14em] text-ink-faint uppercase">
                {sec.title}
              </h3>
            )}
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              const count =
                item.countKey && counts[item.countKey] != null
                  ? counts[item.countKey]
                  : undefined;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile?.();
                  }}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group w-full relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors duration-150 ${
                    isActive
                      ? 'bg-white text-ink font-semibold border border-line shadow-xs'
                      : 'text-ink-soft hover:text-ink hover:bg-white/70 border border-transparent'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full transition-opacity ${
                      isActive ? 'bg-vermilion opacity-100' : 'opacity-0'
                    }`}
                  />
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-vermilion' : 'text-ink-faint group-hover:text-ink-soft'
                    }`}
                  />
                  {!collapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-px rounded bg-vermilion-tint text-indigo-400 border border-indigo-800/40">
                      {item.badge}
                    </span>
                  )}
                  {!collapsed && count != null && count > 0 && (
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-px rounded border ${
                        item.countKey === 'conflicts'
                          ? 'bg-amber-950 text-amber-300 border-amber-800/60'
                          : 'bg-surface-inset text-ink-soft border-line'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-line hidden lg:flex items-center justify-between gap-2">
        {!collapsed && (
          <div className="text-[10px] font-mono text-ink-faint">
            v1.0.0 <span className="text-teal-400">● Live</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="ml-auto p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-surface-inset transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      </aside>
    </>
  );
};
