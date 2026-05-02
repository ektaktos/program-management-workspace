'use client';

import { useAppStore } from '@/store/useAppStore';
import { calcProjectProgress, fmtDate } from '@/lib/utils';
import ProgressBar from '../ui/ProgressBar';

export default function Dashboard() {
  const { projects, tasks, milestones, notes, setView, navigateToTask } = useAppStore();

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
  const activeProjects = projects.filter(p => p.status === 'Active');
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const upcomingTasks = tasks
    .filter(t => t.due && t.status !== 'done')
    .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime())
    .slice(0, 6);

  const recentNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  const statCards = [
    {
      label: 'Projects', value: projects.length, sub: `${activeProjects.length} active`,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
      onClick: () => setView('projects'),
    },
    {
      label: 'Tasks', value: totalTasks, sub: `${doneTasks} completed`,
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
      onClick: () => setView('tasks'),
    },
    {
      label: 'Completion', value: `${completionPct}%`, sub: 'across all projects',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
      onClick: undefined,
    },
    {
      label: 'Overdue', value: overdueTasks, sub: overdueTasks > 0 ? 'needs attention' : 'all on track',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={overdueTasks > 0 ? 'var(--danger)' : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
      onClick: overdueTasks > 0 ? () => setView('tasks') : undefined,
    },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {statCards.map(c => (
          <div
            key={c.label}
            className="card"
            onClick={c.onClick}
            style={{ padding: '20px', cursor: c.onClick ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
            onMouseOver={e => { if (c.onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>{c.icon}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-serif), serif', fontSize: 32, color: 'var(--text)', lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 4 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Active Projects */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16, color: 'var(--text)' }}>Active Projects</div>
          {activeProjects.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active projects.</div>
          ) : (
            activeProjects.map(p => {
              const pct = calcProjectProgress(p.id, tasks);
              const nonDone = tasks.filter(t => t.projectId === p.id && t.status !== 'done').length;
              return (
                <div
                  key={p.id}
                  onClick={() => setView('project', p.id)}
                  style={{ marginBottom: 16, cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius-sm)', transition: 'background 0.15s' }}
                  onMouseOver={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
                  onMouseOut={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pct}%</span>
                  </div>
                  <ProgressBar value={pct} color={p.color} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{nonDone} task{nonDone !== 1 ? 's' : ''} remaining</div>
                </div>
              );
            })
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upcoming deadlines */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14, color: 'var(--text)' }}>Upcoming Deadlines</div>
            {upcomingTasks.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No upcoming deadlines.</div>
            ) : (
              upcomingTasks.map(t => {
                const proj = projects.find(p => p.id === t.projectId);
                return (
                  <div
                    key={t.id}
                    onClick={() => navigateToTask(t.id, t.projectId)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'opacity 0.15s' }}
                    onMouseOver={e => (e.currentTarget as HTMLDivElement).style.opacity = '0.75'}
                    onMouseOut={e => (e.currentTarget as HTMLDivElement).style.opacity = '1'}
                  >
                    {proj && <span style={{ width: 6, height: 6, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />}
                    <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                    <span style={{ fontSize: 11, color: t.status === 'overdue' ? 'var(--danger)' : 'var(--text-muted)', flexShrink: 0 }}>
                      {fmtDate(t.due!)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Recent notes */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14, color: 'var(--text)' }}>Recent Notes</div>
            {recentNotes.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes yet.</div>
            ) : (
              recentNotes.map(n => {
                const proj = projects.find(p => p.id === n.projectId);
                return (
                  <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {proj?.name} &middot; {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
