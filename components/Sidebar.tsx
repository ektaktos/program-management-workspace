'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import ProjectModal from './modals/ProjectModal';

const NAV = [
  {
    id: 'dashboard', label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    id: 'projects', label: 'All Projects',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'tasks', label: 'All Tasks',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  },
  {
    id: 'upcoming', label: 'Upcoming',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
];

export default function Sidebar() {
  const { currentView, activeProjectId, projects, tasks, sidebarOpen, setSidebarOpen, setView, setSearch, searchQuery } = useAppStore();
  const [showNewProject, setShowNewProject] = useState(false);

  const open = sidebarOpen;

  function nonDoneCount(projectId: string) {
    return tasks.filter(t => t.projectId === projectId && t.status !== 'done').length;
  }

  const navActive = (id: string) => currentView === id && currentView !== 'project';

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className={`sidebar-overlay${open ? ' visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar${open ? ' open' : ''}`}>
        {/* Header */}
        <div style={{
          padding: open ? '22px 20px 18px' : '22px 0 18px',
          borderBottom: '1px solid var(--sidebar-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          transition: 'padding 0.25s',
        }}>
          {open ? (
            <div>
              <div style={{ fontFamily: 'var(--font-serif), "Instrument Serif", Georgia, serif', fontSize: 22, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                Workspace
              </div>
              <div style={{ fontSize: 12, color: 'var(--sidebar-text)', marginTop: 2 }}>
                OyinT&rsquo;s projects
              </div>
            </div>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20, color: 'var(--sidebar-text)' }}>
              <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          )}
        </div>

        {/* Nav */}
        <div style={{ padding: open ? '14px 10px' : '14px 8px' }}>
          {open && (
            <div style={{ color: 'var(--text-faint)', fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', padding: '6px 10px 10px' }}>
              Menu
            </div>
          )}
          {NAV.map(item => {
            const active = navActive(item.id);
            return (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setSidebarOpen(window.innerWidth >= 768 ? open : false); }}
                title={!open ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: open ? 10 : 0,
                  justifyContent: open ? 'flex-start' : 'center',
                  width: '100%',
                  padding: open ? '9px 12px' : '10px 0',
                  borderRadius: 10,
                  background: active ? 'var(--primary-light)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--sidebar-text)',
                  fontWeight: 500,
                  fontSize: 13.5,
                  textAlign: 'left',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  marginBottom: 2,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
                onMouseOver={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-active)'; }}
                onMouseOut={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <span style={{ color: '#5f441c', flexShrink: 0 }}>{item.icon}</span>
                {open && item.label}
              </button>
            );
          })}
        </div>

        {/* Projects section */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            color: 'var(--text-faint)', fontSize: 10, fontWeight: 600,
            letterSpacing: 1, textTransform: 'uppercase',
            padding: open ? '14px 20px 8px' : '14px 0 8px',
            display: 'flex', alignItems: 'center',
            justifyContent: open ? 'space-between' : 'center',
          }}>
            {open && <span>Projects</span>}
            <button
              onClick={() => setShowNewProject(true)}
              title="New Project"
              style={{
                background: 'var(--sidebar-active)', border: 'none',
                color: 'var(--sidebar-text)', cursor: 'pointer',
                fontSize: 16, lineHeight: 1, padding: 0,
                width: 22, height: 22, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-active)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-text)'; }}
            >+</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: open ? '0 10px' : '0 8px' }}>
            {projects.map(p => {
              const active = currentView === 'project' && activeProjectId === p.id;
              const count = nonDoneCount(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => { setView('project', p.id); setSidebarOpen(window.innerWidth >= 768 ? open : false); }}
                  title={!open ? p.name : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: open ? 10 : 0,
                    justifyContent: open ? 'flex-start' : 'center',
                    width: '100%',
                    padding: open ? '8px 12px' : '9px 0',
                    borderRadius: 10,
                    background: active ? 'var(--primary-light)' : 'transparent',
                    color: active ? 'var(--text)' : 'var(--sidebar-text)',
                    fontWeight: 500,
                    fontSize: 13,
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginBottom: 1,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--sidebar-active)'; }}
                  onMouseOut={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  {open && (
                    <>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      {count > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          background: active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.6)',
                          color: active ? 'var(--primary-dark)' : 'var(--sidebar-text)',
                          padding: '1px 7px', borderRadius: 10, flexShrink: 0,
                        }}>{count}</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search — only when open */}
        {open && (
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--sidebar-border)' }}>
            <div className="search-input-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14, color: 'var(--text-faint)' }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => { setSearch(e.target.value); if (e.target.value) setView('tasks'); }}
              />
            </div>
          </div>
        )}
      </aside>

      {showNewProject && <ProjectModal onClose={() => setShowNewProject(false)} />}
    </>
  );
}
