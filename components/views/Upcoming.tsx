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
        <div className="section-title">
          <span>Upcoming Tasks</span>
          <span className="badge badge-gray">{upcomingTasks.length}</span>
        </div>
        {upcomingTasks.length === 0 ? (
          <div className="empty-state">
            <h3>All clear</h3>
            <p>No upcoming tasks with deadlines.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomingTasks.map(t => <TaskCard key={t.id} task={t} showProject />)}
          </div>
        )}
      </div>

      {/* Milestones section */}
      <div>
        <div className="section-title">
          <span>Upcoming Milestones</span>
          <span className="badge badge-gray">{upcomingMs.length}</span>
        </div>
        {upcomingMs.length === 0 ? (
          <div className="empty-state">
            <h3>No milestones yet</h3>
            <p>Upcoming milestones will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingMs.map(m => {
              const proj = projects.find(p => p.id === m.projectId);
              return (
                <div key={m.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: 18,
                  display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: m.status === 'done' ? 'var(--accent-mint-light)' : m.status === 'overdue' ? 'var(--accent-blush-light)' : 'var(--primary-light)',
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={m.status === 'done' ? '#4f8366' : m.status === 'overdue' ? '#b06868' : 'var(--primary-dark)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                      {m.status === 'done'
                        ? <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                        : <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
                      }
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.title}</div>
                    {m.desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{m.desc}</div>}
                    {m.date && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{fmtDate(m.date)}</div>}
                  </div>
                  {proj && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: proj.color }} />
                      {proj.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
