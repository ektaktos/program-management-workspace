'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Dashboard from '@/components/views/Dashboard';
import AllProjects from '@/components/views/AllProjects';
import AllTasks from '@/components/views/AllTasks';
import Upcoming from '@/components/views/Upcoming';
import ProjectDetail from '@/components/views/ProjectDetail';
import WeeklyPlanner from '@/components/views/WeeklyPlanner';
import NotesView from '@/components/views/NotesView';
import ArchiveView from '@/components/views/ArchiveView';
import Today from '@/components/views/Today';
import ToastContainer from '@/components/ui/Toast';
import PWAInit from '@/components/PWAInit';
import QuickAdd from '@/components/QuickAdd';
import CalendarsModal from '@/components/modals/CalendarsModal';
import { unlockAudio } from '@/lib/notifications';

export default function Home() {
  const currentView    = useAppStore(s => s.currentView);
  const isLoaded       = useAppStore(s => s.isLoaded);
  const loadError      = useAppStore(s => s.loadError);
  const loadAll        = useAppStore(s => s.loadAll);
  const runAutoOverdue = useAppStore(s => s.runAutoOverdue);
  const runAlertCheck  = useAppStore(s => s.runAlertCheck);
  const refreshCalendars = useAppStore(s => s.refreshCalendars);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let calInterval: ReturnType<typeof setInterval>;
    let syncInterval: ReturnType<typeof setInterval>;
    loadAll().then(() => {
      runAutoOverdue();
      runAlertCheck();
      interval = setInterval(() => {
        runAutoOverdue();
        runAlertCheck();
      }, 30_000);
      // Subscribed calendars: pick up new or moved events while the app stays open
      calInterval = setInterval(() => { refreshCalendars(); }, 10 * 60_000);
      // Pick up changes made in another browser or device while this one stays open
      syncInterval = setInterval(() => { if (document.visibilityState === 'visible') useAppStore.getState().refreshFromServer(); }, 90_000);
    });
    // Coming back to the tab: check straight away rather than waiting for the next tick
    // and pull in anything changed elsewhere while it was in the background
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !useAppStore.getState().isLoaded) return;
      runAlertCheck();
      useAppStore.getState().refreshFromServer();
    };
    const onFocus = () => { if (useAppStore.getState().isLoaded) useAppStore.getState().refreshFromServer(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    // Sound needs a first interaction before the browser lets it play
    const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      clearInterval(interval); clearInterval(calInterval); clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg)',
        gap: 12, padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Couldn&apos;t reach your workspace</div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 360 }}>
          The connection timed out or was blocked. If you&apos;re on a work or public network, it may be filtering this site.
        </div>
        <button onClick={() => window.location.reload()} style={{
          marginTop: 8, padding: '8px 18px', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 14,
        }}>Try again</button>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'var(--bg)',
        gap: 16,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--primary-dark)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading workspace...</div>
        {/* Shown by CSS alone after 15s, so it still appears when the page's scripts never load
            (the case where React never starts and no timeout of ours can run). */}
        <a href="/" className="slow-load-hint" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Taking too long? Reload
        </a>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }
          .slow-load-hint { visibility: hidden; animation: slow-load-show 0s linear 15s forwards; }
          @keyframes slow-load-show { to { visibility: visible; } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'today'     && <Today />}
          {currentView === 'projects'  && <AllProjects />}
          {currentView === 'tasks'     && <AllTasks />}
          {currentView === 'upcoming'  && <Upcoming />}
          {currentView === 'project'   && <ProjectDetail />}
          {currentView === 'planner'   && <WeeklyPlanner />}
          {currentView === 'notes'     && <NotesView />}
          {currentView === 'archive'   && <ArchiveView />}
        </main>
      </div>
      <ToastContainer />
      <PWAInit />
      <QuickAdd />
      <CalendarsModal />
    </div>
  );
}
