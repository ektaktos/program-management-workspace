'use client';

import { useAppStore } from '@/store/useAppStore';
import { fmtDate } from '@/lib/utils';
import TaskCard from '../project/TaskCard';

export default function Upcoming() {
  const { tasks, milestones, projects } = useAppStore();

  const upcomingTasks = tasks
    .filter(t => t.due && t.status !== 'done')
    .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime());

  const upcomingMs = milestones
    .filter(m => m.date && m.status !== 'done')
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  return (
    <div>
      {/* Tasks section */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          Upcoming Tasks
          <span className="badge badge-gray">{upcomingTasks.length}</span>
        </div>
        {upcomingTasks.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No upcoming tasks with deadlines.</div>
        ) : (
          upcomingTasks.map(t => <TaskCard key={t.id} task={t} showProject />)
        )}
      </div>

      {/* Milestones section */}
      <div>
        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Upcoming Milestones
          <span className="badge badge-gray">{upcomingMs.length}</span>
        </div>
        {upcomingMs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No upcoming milestones.</div>
        ) : (
          upcomingMs.map(m => {
            const proj = projects.find(p => p.id === m.projectId);
            return (
              <div key={m.id} className="card" style={{ marginBottom: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                {proj && <span style={{ width: 8, height: 8, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{m.title}</div>
                  {m.desc && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.desc}</div>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {m.date ? fmtDate(m.date) : ''}
                </div>
                {proj && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{proj.name}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
