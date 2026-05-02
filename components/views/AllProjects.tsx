'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calcProjectProgress, getOverdueCount, fmtDate } from '@/lib/utils';
import { PROJECT_STATUS_META } from '@/lib/constants';
import ProgressBar from '../ui/ProgressBar';
import ProjectModal from '../modals/ProjectModal';
import { Project } from '@/lib/types';

export default function AllProjects() {
  const { projects, tasks, milestones, phases, setView } = useAppStore();
  const [editing, setEditing] = useState<Project | null>(null);

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <h3>No projects yet</h3>
        <p>Click the + button in the sidebar to create your first project.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
        {projects.map(p => {
          const pct       = calcProjectProgress(p.id, tasks);
          const pt        = tasks.filter(t => t.projectId === p.id);
          const done      = pt.filter(t => t.status === 'done').length;
          const overdue   = getOverdueCount(p.id, tasks);
          const msCount   = milestones.filter(m => m.projectId === p.id).length;
          const phCount   = phases.filter(ph => ph.projectId === p.id).length;
          const statusMeta = PROJECT_STATUS_META[p.status] ?? { badgeClass: 'badge-gray' };

          return (
            <div
              key={p.id}
              onClick={() => setView('project', p.id)}
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                padding: 22,
                border: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseOver={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = 'var(--shadow-md)';
                el.style.transform = 'translateY(-2px)';
                el.style.borderColor = 'var(--primary)';
                const btn = el.querySelector('.proj-edit-btn') as HTMLElement;
                if (btn) btn.style.opacity = '1';
              }}
              onMouseOut={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.boxShadow = 'none';
                el.style.transform = 'none';
                el.style.borderColor = 'var(--border)';
                const btn = el.querySelector('.proj-edit-btn') as HTMLElement;
                if (btn) btn.style.opacity = '0';
              }}
            >
              {/* Edit button */}
              <button
                className="proj-edit-btn"
                onClick={e => { e.stopPropagation(); setEditing(p); }}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  opacity: 0, transition: 'opacity 0.18s',
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid var(--border)',
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.color = '#5f441c'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#5f441c'; }}
                onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
                <div>
                  <div style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: 18, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 500 }}>{p.type}</div>
                </div>
                <span className={`badge ${statusMeta.badgeClass}`}>{p.status}</span>
              </div>

              {/* Description */}
              {p.description && (
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.55 }}>
                  {p.description.slice(0, 100)}{p.description.length > 100 ? '...' : ''}
                </div>
              )}

              {/* Progress */}
              <div style={{ height: 6, background: '#f1ebe1', borderRadius: 999, overflow: 'hidden', margin: '12px 0 8px' }}>
                <div style={{ height: '100%', borderRadius: 999, background: p.color, width: `${pct}%`, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)' }}>
                <span>{done}/{pt.length} tasks</span>
                <span style={{ fontWeight: 500 }}>{pct}%</span>
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                {p.end && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Deadline · {fmtDate(p.end)}</span>}
                {overdue > 0 && <span style={{ fontSize: 11.5, color: 'var(--danger)' }}>{overdue} overdue</span>}
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{msCount} milestone{msCount !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{phCount} phase{phCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>

      {editing && <ProjectModal project={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
