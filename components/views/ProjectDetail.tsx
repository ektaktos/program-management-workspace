'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calcProjectProgress, fmtDate } from '@/lib/utils';
import { PROJECT_STATUS_META } from '@/lib/constants';
import TasksTab from '../project/TasksTab';
import PhasesTab from '../project/PhasesTab';
import MilestonesTab from '../project/MilestonesTab';
import NotesTab from '../project/NotesTab';
import ProjectModal from '../modals/ProjectModal';
import ConfirmModal from '../modals/ConfirmModal';

const TABS = ['Tasks', 'Phases', 'Milestones', 'Notes'] as const;
type Tab = typeof TABS[number];

export default function ProjectDetail() {
  const { projects, tasks, milestones, phases, notes, activeProjectId, highlightedTaskId, archiveProject, deleteProject, setView } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('Tasks');
  const [editingProject, setEditingProject] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return <div style={{ color: 'var(--text-muted)' }}>Project not found.</div>;

  function handleArchive() {
    archiveProject(project!.id);
    setMenuOpen(false);
    setView('projects');
  }

  const pct        = calcProjectProgress(project.id, tasks);
  const statusMeta = PROJECT_STATUS_META[project.status] ?? { badgeClass: 'badge-gray' };
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const doneTasks    = projectTasks.filter(t => t.status === 'done').length;

  const tabCounts: Record<Tab, number> = {
    Tasks:      projectTasks.length,
    Phases:     phases.filter(p => p.projectId === project.id).length,
    Milestones: milestones.filter(m => m.projectId === project.id).length,
    Notes:      notes.filter(n => n.projectId === project.id).length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        border: '1px solid var(--border)',
        borderTop: `4px solid ${project.color}`,
        marginBottom: 22,
        overflow: 'hidden',
      }}>
        <div className="project-header-inner" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title row: dot + name + status badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', background: project.color, flexShrink: 0, display: 'inline-block' }} />
              <div style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 32, fontWeight: 400,
                color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.1,
              }}>{project.name}</div>
              <span className={`badge ${statusMeta.badgeClass}`}>{project.status}</span>
            </div>
            {/* Meta: type · start · deadline */}
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              {project.type && <span>{project.type}</span>}
              {project.start && <span>Start · {fmtDate(project.start)}</span>}
              {project.end && <span>Deadline · {fmtDate(project.end)}</span>}
            </div>
            {project.description && (
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6, maxWidth: '60ch' }}>{project.description}</p>
            )}
          </div>
          {/* Percentage + task count + actions menu */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0 }}>
            <div className="project-header-pct" style={{ textAlign: 'right', minWidth: 90 }}>
              <div className="pct-number" style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 44, fontWeight: 400,
                color: project.color, lineHeight: 1, letterSpacing: '-0.02em',
              }}>{pct}<span style={{ fontSize: 24, color: 'var(--text-muted)' }}>%</span></div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{doneTasks}/{projectTasks.length} tasks</div>
            </div>

            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                className="btn-icon"
                title="Project actions"
                onClick={() => setMenuOpen(o => !o)}
                style={{ width: 30, height: 30 }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
                  <circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/>
                </svg>
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 99,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 160,
                  overflow: 'hidden',
                }}>
                  <div
                    onClick={() => { setEditingProject(true); setMenuOpen(false); }}
                    style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit project
                  </div>
                  <div
                    onClick={handleArchive}
                    style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)' }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                      <polyline points="21 8 21 21 3 21 3 8"/>
                      <rect x="1" y="3" width="22" height="5" rx="1"/>
                      <line x1="10" y1="12" x2="14" y2="12"/>
                    </svg>
                    Archive project
                  </div>
                  <div
                    onClick={() => { setConfirmingDelete(true); setMenuOpen(false); }}
                    style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)' }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                    Delete project
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 8, background: '#f1ebe1', borderRadius: 999, overflow: 'hidden', marginTop: 14 }}>
          <div style={{ height: '100%', borderRadius: 999, background: project.color, width: `${pct}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Pill tabs */}
      <div className="tabs-pill-wrap">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`tab-pill${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tabCounts[tab] > 0 && (
              <span style={{
                marginLeft: 6, fontSize: 11,
                background: activeTab === tab ? 'rgba(95,68,28,0.12)' : 'var(--border)',
                color: activeTab === tab ? '#5f441c' : 'var(--text-muted)',
                padding: '1px 6px', borderRadius: 999,
              }}>{tabCounts[tab]}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Tasks'      && <TasksTab      projectId={project.id} highlightedTaskId={highlightedTaskId} />}
      {activeTab === 'Phases'     && <PhasesTab     projectId={project.id} />}
      {activeTab === 'Milestones' && <MilestonesTab projectId={project.id} />}
      {activeTab === 'Notes'      && <NotesTab      projectId={project.id} />}

      {editingProject && <ProjectModal project={project} onClose={() => setEditingProject(false)} />}
      {confirmingDelete && (
        <ConfirmModal
          message={`Permanently delete "${project.name}" and all its data? This cannot be undone.`}
          onConfirm={() => { deleteProject(project.id); setConfirmingDelete(false); setView('projects'); }}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
