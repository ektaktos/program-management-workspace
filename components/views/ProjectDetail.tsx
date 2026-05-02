'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calcProjectProgress, fmtDate } from '@/lib/utils';
import { PROJECT_STATUS_META } from '@/lib/constants';
import TasksTab from '../project/TasksTab';
import PhasesTab from '../project/PhasesTab';
import MilestonesTab from '../project/MilestonesTab';
import NotesTab from '../project/NotesTab';

const TABS = ['Tasks', 'Phases', 'Milestones', 'Notes'] as const;
type Tab = typeof TABS[number];

export default function ProjectDetail() {
  const { projects, tasks, milestones, phases, notes, activeProjectId, highlightedTaskId } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('Tasks');

  const project = projects.find(p => p.id === activeProjectId);
  if (!project) return <div style={{ color: 'var(--text-muted)' }}>Project not found.</div>;

  const pct = calcProjectProgress(project.id, tasks);
  const statusMeta = PROJECT_STATUS_META[project.status] ?? { badgeClass: 'badge-gray' };

  const tabCounts: Record<Tab, number> = {
    Tasks:      tasks.filter(t => t.projectId === project.id).length,
    Phases:     phases.filter(p => p.projectId === project.id).length,
    Milestones: milestones.filter(m => m.projectId === project.id).length,
    Notes:      notes.filter(n => n.projectId === project.id).length,
  };

  return (
    <div>
      {/* Header panel */}
      <div className="card" style={{ marginBottom: 24, borderTop: `4px solid ${project.color}`, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-serif), serif', fontSize: 32, color: 'var(--text)', lineHeight: 1.1, marginBottom: 8 }}>
              {project.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span className={`badge ${statusMeta.badgeClass}`}>{project.status}</span>
              {project.type && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project.type}</span>}
              {project.start && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Started {fmtDate(project.start)}</span>}
              {project.end && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Due {fmtDate(project.end)}</span>}
            </div>
            {project.description && (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 600 }}>{project.description}</p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
            <div style={{ fontFamily: 'var(--font-serif), serif', fontSize: 48, color: project.color, lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>complete</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 18px',
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? 'var(--text)' : 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? `2px solid ${project.color}` : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 0.15s',
            }}
          >
            {tab}
            {tabCounts[tab] > 0 && (
              <span style={{
                fontSize: 10,
                background: activeTab === tab ? project.color : 'var(--border)',
                color: activeTab === tab ? '#fff' : 'var(--text-muted)',
                padding: '1px 6px',
                borderRadius: 999,
              }}>{tabCounts[tab]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Tasks'      && <TasksTab      projectId={project.id} highlightedTaskId={highlightedTaskId} />}
      {activeTab === 'Phases'     && <PhasesTab     projectId={project.id} />}
      {activeTab === 'Milestones' && <MilestonesTab projectId={project.id} />}
      {activeTab === 'Notes'      && <NotesTab      projectId={project.id} />}
    </div>
  );
}
