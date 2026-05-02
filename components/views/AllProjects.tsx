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

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
        {projects.map(p => {
          const pct = calcProjectProgress(p.id, tasks);
          const pt = tasks.filter(t => t.projectId === p.id);
          const done = pt.filter(t => t.status === 'done').length;
          const overdueCount = getOverdueCount(p.id, tasks);
          const msCount = milestones.filter(m => m.projectId === p.id).length;
          const phCount = phases.filter(ph => ph.projectId === p.id).length;
          const statusMeta = PROJECT_STATUS_META[p.status] ?? { badgeClass: 'badge-gray' };

          return (
            <div
              key={p.id}
              className="card"
              onClick={() => setView('project', p.id)}
              style={{ padding: 20, cursor: 'pointer', position: 'relative', transition: 'box-shadow 0.15s' }}
              onMouseOver={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
                const btn = (e.currentTarget as HTMLDivElement).querySelector('.edit-btn') as HTMLElement;
                if (btn) btn.style.opacity = '1';
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)';
                const btn = (e.currentTarget as HTMLDivElement).querySelector('.edit-btn') as HTMLElement;
                if (btn) btn.style.opacity = '0';
              }}
            >
              {/* Edit button */}
              <button
                className="edit-btn"
                onClick={e => { e.stopPropagation(); setEditing(p); }}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.15s',
                  cursor: 'pointer',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0, marginTop: 5 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-serif), serif', fontSize: 18, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.type}</div>
                </div>
              </div>

              <span className={`badge ${statusMeta.badgeClass}`} style={{ marginBottom: 10 }}>{p.status}</span>

              {p.description && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
                  {p.description.slice(0, 100)}{p.description.length > 100 ? '...' : ''}
                </p>
              )}

              <div style={{ marginBottom: 8 }}>
                <ProgressBar value={pct} color={p.color} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                {done}/{pt.length} tasks &mdash; {pct}%
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                {p.end && <span>Due {fmtDate(p.end)}</span>}
                {overdueCount > 0 && <span style={{ color: 'var(--danger)' }}>{overdueCount} overdue</span>}
                {msCount > 0 && <span>{msCount} milestone{msCount !== 1 ? 's' : ''}</span>}
                {phCount > 0 && <span>{phCount} phase{phCount !== 1 ? 's' : ''}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>No projects yet</div>
          <div style={{ fontSize: 13 }}>Click the + button in the sidebar to create your first project.</div>
        </div>
      )}

      {editing && <ProjectModal project={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
