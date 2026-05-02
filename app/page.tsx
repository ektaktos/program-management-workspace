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
import ToastContainer from '@/components/ui/Toast';

export default function Home() {
  const currentView = useAppStore(s => s.currentView);
  const runAutoOverdue = useAppStore(s => s.runAutoOverdue);
  const runAlertCheck = useAppStore(s => s.runAlertCheck);

  useEffect(() => {
    runAutoOverdue();
    runAlertCheck();
    const interval = setInterval(() => {
      runAutoOverdue();
      runAlertCheck();
    }, 60000);
    return () => clearInterval(interval);
  }, [runAutoOverdue, runAlertCheck]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {currentView === 'dashboard'   && <Dashboard />}
          {currentView === 'projects'    && <AllProjects />}
          {currentView === 'tasks'       && <AllTasks />}
          {currentView === 'upcoming'    && <Upcoming />}
          {currentView === 'project'     && <ProjectDetail />}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
