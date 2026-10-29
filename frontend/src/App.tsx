import React, { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab, SidebarCounts } from './components/Sidebar';
import { DemoTourModal } from './components/DemoTourModal';
import { VisualGovernanceModal } from './components/VisualGovernanceModal';
import { LandingPage } from './components/LandingPage';
import { ToastProvider, useToast } from './components/ui';

import { OverviewPage } from './pages/OverviewPage';
import { ReviewStudioPage } from './pages/ReviewStudioPage';
import { ClaimDnaPage } from './pages/ClaimDnaPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { ApprovalWorkspacePage } from './pages/ApprovalWorkspacePage';
import { KnowledgeHubPage } from './pages/KnowledgeHubPage';
import { EvidenceGraphPage } from './pages/EvidenceGraphPage';
import { DriftRadarPage } from './pages/DriftRadarPage';
import { ConflictCenterPage } from './pages/ConflictCenterPage';
import { DecisionMemoryPage } from './pages/DecisionMemoryPage';
import { RiskPropagationPage } from './pages/RiskPropagationPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { TeamPermissionsPage } from './pages/TeamPermissionsPage';
import { SettingsPage } from './pages/SettingsPage';

import { api, API_BASE } from './api/client';
import { User, DemoUser } from './types';

const ROUTE_HASH = '#/app';
const ACTIVE_STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED', 'CHANGES_REQUESTED'];

const readView = (): 'landing' | 'app' =>
  window.location.hash === ROUTE_HASH ? 'app' : 'landing';

const Shell: React.FC = () => {
  const [view, setView] = useState<'landing' | 'app'>(readView);
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [counts, setCounts] = useState<SidebarCounts>({});
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isVisualModalOpen, setIsVisualModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [appErrorIsConnection, setAppErrorIsConnection] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const toast = useToast();

  /* Hash routing (landing <-> workspace) */
  useEffect(() => {
    const onHash = () => setView(readView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const enterApp = useCallback(() => {
    window.location.hash = ROUTE_HASH;
    setView('app');
    window.scrollTo({ top: 0 });
  }, []);

  const exitApp = useCallback(() => {
    window.location.hash = '';
    setView('landing');
    window.scrollTo({ top: 0 });
  }, []);

  /* Live sidebar counts (real API data, never hardcoded) */
  const loadCounts = useCallback(async () => {
    try {
      const [items, conflicts] = await Promise.all([
        api.getContentItems().catch(() => [] as any[]),
        api.getConflicts().catch(() => [] as any[]),
      ]);
      setCounts({
        queue: Array.isArray(items)
          ? items.filter((i) => ACTIVE_STATUSES.includes(i.current_status)).length
          : null,
        conflicts: Array.isArray(conflicts) ? conflicts.length : null,
      });
    } catch {
      /* counts stay unknown rather than fabricated */
    }
  }, []);

  const initializeSession = useCallback(async () => {
    try {
      const users = await api.getDemoUsers();
      setDemoUsers(users);

      const existingToken = localStorage.getItem('brandsentinel_token');
      if (existingToken) {
        try {
          const me = await api.getMe();
          setCurrentUser(me);
          setAppError(null);
          setAppErrorIsConnection(false);
          loadCounts();
          return;
        } catch {
          localStorage.removeItem('brandsentinel_token');
        }
      }

      // Default demo login as content creator (seeded persona)
      if (users.length > 0) {
        const creator = users.find((u: DemoUser) => u.role === 'CONTENT_CREATOR') || users[0];
        const res = await api.login({
          email: creator.email,
          password: creator.default_password || 'Northstar2026!',
        });
        localStorage.setItem('brandsentinel_token', res.access_token);
        setCurrentUser(res.user);
        setAppError(null);
        setAppErrorIsConnection(false);
        loadCounts();
      }
    } catch (err: any) {
      console.error('Failed to initialize session:', err);
      setAppError(err.message);
      // Suggest "backend unreachable" only when the failure actually looks like
      // one: status 0 = fetch() rejected, 5xx = server/proxy unavailable.
      // 4xx are application-level (bad credentials, RBAC) — not a connectivity
      // problem, so we must not blame the backend being down for those.
      const status = err?.status;
      setAppErrorIsConnection(status === 0 || (typeof status === 'number' && status >= 500));
    } finally {
      // The landing preview may fetch only after auth is settled (success or failure).
      setSessionReady(true);
    }
  }, [loadCounts]);

  useEffect(() => {
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwitchUser = async (user: DemoUser) => {
    try {
      const res = await api.login({
        email: user.email,
        password: user.default_password || 'Northstar2026!',
      });
      localStorage.setItem('brandsentinel_token', res.access_token);
      setCurrentUser(res.user);
      toast.success(`Switched to ${user.name}`, user.role.replace(/_/g, ' '));
      loadCounts();
    } catch (err: any) {
      console.error('Error switching persona:', err);
      toast.error('Could not switch persona', err?.message);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await api.resetDemoData();
      await initializeSession();
      setCurrentTab('overview');
      toast.success('Demo data reset', 'Northstar Labs seed restored to its initial state.');
    } catch (err: any) {
      console.error('Error resetting demo:', err);
      toast.error('Reset failed', err?.message);
    } finally {
      setIsResetting(false);
    }
  };

  /* ── Public landing site ───────────────────────────────────── */
  if (view === 'landing') {
    return <LandingPage onEnterApp={enterApp} sessionReady={sessionReady} />;
  }

  /* ── Application workspace ─────────────────────────────────── */
  return (
    <div className="h-screen bg-ivory text-ink flex flex-col font-sans overflow-hidden">
      <Navbar
        currentUser={currentUser}
        demoUsers={demoUsers}
        onSwitchUser={handleSwitchUser}
        onResetDemo={handleResetDemo}
        onOpenTour={() => setIsTourOpen(true)}
        onOpenVisualModal={() => setIsVisualModalOpen(true)}
        isResetting={isResetting}
        onExitToSite={exitApp}
        onToggleNav={() => setMobileNavOpen((v) => !v)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          counts={counts}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <main className="flex-1 overflow-y-auto bg-ivory">
          <div className="p-5 sm:p-6 max-w-7xl mx-auto">
            {appError && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-red-800/50 bg-red-950 px-4 py-3 text-xs text-red-300 flex items-start gap-2"
              >
                <span className="font-semibold">
                  {appErrorIsConnection ? 'Backend connection notice:' : 'Session notice:'}
                </span>
                <span className="flex-1">
                  <span className="block">{appError}</span>
                  {appErrorIsConnection && (
                    <span className="block opacity-80 mt-0.5">
                      Check that the backend is reachable at API base &quot;{API_BASE}&quot;.
                    </span>
                  )}
                </span>
                <button
                  onClick={initializeSession}
                  className="font-semibold underline underline-offset-2 hover:text-red-200"
                >
                  Retry
                </button>
              </div>
            )}

            {currentTab === 'overview' && <OverviewPage onNavigateTab={setCurrentTab} />}
            {currentTab === 'studio' && <ReviewStudioPage currentUser={currentUser} />}
            {currentTab === 'claim_dna' && <ClaimDnaPage />}
            {currentTab === 'queue' && <ReviewQueuePage onNavigateTab={setCurrentTab} />}
            {currentTab === 'approvals' && <ApprovalWorkspacePage currentUser={currentUser} />}
            {currentTab === 'knowledge' && <KnowledgeHubPage />}
            {currentTab === 'graph' && <EvidenceGraphPage />}
            {currentTab === 'drift' && <DriftRadarPage />}
            {currentTab === 'conflicts' && <ConflictCenterPage />}
            {currentTab === 'memory' && <DecisionMemoryPage />}
            {currentTab === 'propagation' && <RiskPropagationPage />}
            {currentTab === 'audit' && <AuditTrailPage />}
            {currentTab === 'team' && <TeamPermissionsPage currentUser={currentUser} />}
            {currentTab === 'settings' && (
              <SettingsPage onResetDemo={handleResetDemo} isResetting={isResetting} />
            )}
          </div>
        </main>
      </div>

      <DemoTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
          setIsTourOpen(false);
        }}
      />

      <VisualGovernanceModal
        isOpen={isVisualModalOpen}
        onClose={() => setIsVisualModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => (
  <ToastProvider>
    <Shell />
  </ToastProvider>
);
