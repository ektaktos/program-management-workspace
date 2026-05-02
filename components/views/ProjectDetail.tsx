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

  const pct        = calcProjectProgress(project.id, tasks);
  const statusMeta = PROJECT_STATUS_META[project.status] ?? { badgeClass: 'badge-gray' };

  const tabCounts: Record<Tab, number> = {
    Tasks:      tasks.filter(t => t.projectId === project.id).length,
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
        marginBottom: 22,
      }}>
        <div className="project-header-inner" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 32, fontWeight: 400,
              color: 'var(--text)', letterSpacing: '-0.015em', lineHeight: 1.1,
            }}>{project.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge ${statusMeta.badgeClass}`}>{project.status}</span>
              {project.type && <span>{project.type}</span>}
              {project.start && <span>Started {fmtDate(project.start)}</span>}
              {project.end && <span>Due {fmtDate(project.end)}</span>}
            </div>
            {project.description && (
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6, maxWidth: '60ch' }}>{project.description}</p>
            )}
          </div>
          <div className="project-header-pct" style={{ textAlign: 'right', flexShrink: 0 }}>
            <div className="pct-number" style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 48, fontWeight: 400,
              color: project.color, lineHeight: 1,
            }}>{pct}<span style={{ fontSize: 24, opacity: 0.7 }}>%</span></div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>complete</div>
          </div>
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
    </div>
  );
}
