'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ProjectModal from './modals/ProjectModal';
import ConfirmModal from './modals/ConfirmModal';

const VIEW_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard',         subtitle: 'A gentle overview of everything' },
  projects:  { title: 'All Projects',       subtitle: 'Browse and manage all your projects' },
  tasks:     { title: 'All Tasks',          subtitle: 'Every task across every project' },
  upcoming:  { title: 'Upcoming',           subtitle: 'Deadlines and milestones on the horizon' },
};

export default function Topbar() {
  const { currentView, activeProjectId, projects, toasts, sidebarOpen, setSidebarOpen, setView, deleteProject } = useAppStore();
  const [editProject, setEditProject] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = projects.find(p => p.id === activeProjectId);
  const isProject = currentView === 'project';
  const meta = isProject
    ? { title: project?.name ?? 'Project', subtitle: project?.type ?? '' }
    : (VIEW_META[currentView] ?? { title: 'Workspace', subtitle: '' });

  function handleDeleteProject() {
    if (!activeProjectId) return;
    deleteProject(activeProjectId);
    setView('projects');
    setConfirmDelete(false);
  }

  return (
    <>
      <header style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px 0 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
        flexShrink: 0,
        gap: 12,
      }}>
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            flexShrink: 0,
            width: 36, height: 36,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="topbar-title-text" style={{
            fontFamily: 'var(--font-serif), "Instrument Serif", Georgia, serif',
            fontSize: 26, fontWeight: 400,
            color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{meta.title}</div>
          {meta.subtitle && (
            <div className="topbar-subtitle" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{meta.subtitle}</div>
          )}
        </div>

        <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isProject && project && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setEditProject(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span className="btn-label">Edit</span>
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
                <span className="btn-label">Delete</span>
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setView('projects')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                <span className="btn-label">Back</span>
              </button>
            </>
          )}

          {/* Bell */}
          <button className="bell-btn" title="Alert status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {toasts.length > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                minWidth: 18, height: 18, padding: '0 4px',
                background: 'var(--danger)', borderRadius: 999,
                fontSize: 10, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, border: '2px solid var(--bg)',
              }}>{toasts.length}</span>
            )}
          </button>
        </div>
      </header>

      {editProject && project && <ProjectModal project={project} onClose={() => setEditProject(false)} />}
      {confirmDelete && (
        <ConfirmModal
          message={`Delete "${project?.name}"? This will also remove all tasks, milestones, phases, and notes.`}
          onConfirm={handleDeleteProject}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  );
}
