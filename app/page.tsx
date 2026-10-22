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
import ReportView from '@/components/views/ReportView';
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
  const loadAll        = useAppStore(s => s.loadAll);
  const runAutoOverdue = useAppStore(s => s.runAutoOverdue);
  const runAlertCheck  = useAppStore(s => s.runAlertCheck);
  const refreshCalendars = useAppStore(s => s.refreshCalendars);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let calInterval: ReturnType<typeof setInterval>;
    loadAll().then(() => {
      runAutoOverdue();
      runAlertCheck();
      interval = setInterval(() => {
        runAutoOverdue();
        runAlertCheck();
      }, 30_000);
      // Subscribed calendars: pick up new or moved events while the app stays open
      calInterval = setInterval(() => { refreshCalendars(); }, 10 * 60_000);
    });
    // Coming back to the tab: check straight away rather than waiting for the next tick
    const onVisible = () => { if (document.visibilityState === 'visible' && useAppStore.getState().isLoaded) runAlertCheck(); };
    document.addEventListener('visibilitychange', onVisible);
    // Sound needs a first interaction before the browser lets it play
    const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      clearInterval(interval); clearInterval(calInterval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          {currentView === 'report'    && <ReportView />}
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
