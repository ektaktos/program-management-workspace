'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ProjectModal from './modals/ProjectModal';
import ConfirmModal from './modals/ConfirmModal';

const VIEW_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard',          subtitle: 'Overview of all your projects and tasks' },
  projects:  { title: 'All Projects',        subtitle: 'Browse and manage your projects' },
  tasks:     { title: 'All Tasks',           subtitle: 'View and filter tasks across projects' },
  upcoming:  { title: 'Upcoming Deadlines',  subtitle: 'Tasks and milestones due soon' },
};

export default function Topbar() {
  const { currentView, activeProjectId, projects, tasks, toasts, setView, deleteProject } = useAppStore();
  const [editProject, setEditProject] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const project = projects.find(p => p.id === activeProjectId);
  const unreadCount = toasts.length;

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
        padding: '0 32px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif), serif', fontSize: 26, color: 'var(--text)', lineHeight: 1 }}>{meta.title}</div>
          {meta.subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{meta.subtitle}</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isProject && project && (
            <>
              <button className="btn btn-outline" style={{ height: 34, fontSize: 13 }} onClick={() => setEditProject(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
              <button className="btn btn-danger" style={{ height: 34, fontSize: 13 }} onClick={() => setConfirmDelete(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Delete
              </button>
              <button className="btn btn-ghost" style={{ height: 34, fontSize: 13 }} onClick={() => setView('projects')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back
              </button>
            </>
          )}

          {/* Bell */}
          <div style={{ position: 'relative' }}>
            <button className="btn-icon" style={{ width: 36, height: 36 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--danger)',
              }} />
            )}
          </div>
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
