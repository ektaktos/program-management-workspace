'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ProjectModal from './modals/ProjectModal';

const NAV = [
  { id: 'dashboard', label: 'Dashboard',     icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { id: 'projects',  label: 'All Projects',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
  { id: 'tasks',     label: 'All Tasks',     icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { id: 'upcoming',  label: 'Upcoming',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
];

export default function Sidebar() {
  const { currentView, activeProjectId, projects, tasks, setView, setSearch, searchQuery } = useAppStore();
  const [showNewProject, setShowNewProject] = useState(false);

  function nonDoneCount(projectId: string) {
    return tasks.filter(t => t.projectId === projectId && t.status !== 'done').length;
  }

  return (
    <>
      <aside style={{
        width: 248,
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '22px 20px 16px' }}>
          <div style={{ fontFamily: 'var(--font-serif), serif', fontSize: 22, color: 'var(--sidebar-text)', lineHeight: 1.2 }}>Workspace</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>OyinT&rsquo;s projects</div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '0 10px' }}>
          {NAV.map(item => {
            const active = currentView === item.id && (item.id !== 'project');
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: active ? '#d4b896' : 'transparent',
                  color: active ? 'var(--sidebar-text)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                  marginBottom: 2,
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--sidebar-border)', margin: '12px 20px' }} />

        {/* Projects */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)' }}>Projects</span>
            <button
              className="btn-icon"
              style={{ width: 22, height: 22 }}
              onClick={() => setShowNewProject(true)}
              title="New project"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
            {projects.map(p => {
              const active = currentView === 'project' && activeProjectId === p.id;
              const count = nonDoneCount(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setView('project', p.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '7px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: active ? '#d4b896' : 'transparent',
                    color: active ? 'var(--sidebar-text)' : 'var(--text-muted)',
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    marginBottom: 2,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  {count > 0 && (
                    <span style={{
                      fontSize: 10,
                      background: active ? 'rgba(95,68,28,0.15)' : 'var(--border)',
                      color: active ? 'var(--sidebar-text)' : 'var(--text-muted)',
                      padding: '1px 6px',
                      borderRadius: 999,
                      flexShrink: 0,
                    }}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 14px 16px' }}>
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => { setSearch(e.target.value); if (e.target.value) setView('tasks'); }}
              style={{ paddingLeft: 32, fontSize: 13, background: 'var(--surface)' }}
            />
          </div>
        </div>
      </aside>

      {showNewProject && <ProjectModal onClose={() => setShowNewProject(false)} />}
    </>
  );
}
