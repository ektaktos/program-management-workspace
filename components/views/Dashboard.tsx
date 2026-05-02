'use client';

import { useAppStore } from '@/store/useAppStore';
import { calcProjectProgress, fmtDate } from '@/lib/utils';
import ProgressBar from '../ui/ProgressBar';

function daysLeft(iso: string): string {
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return `${diff}d left`;
}

export default function Dashboard() {
  const { projects, tasks, notes, setView, navigateToTask } = useAppStore();

  const totalTasks      = tasks.length;
  const doneTasks       = tasks.filter(t => t.status === 'done').length;
  const overdueTasks    = tasks.filter(t => t.status === 'overdue').length;
  const activeProjects  = projects.filter(p => p.status === 'Active');
  const completionPct   = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const upcomingTasks = tasks
    .filter(t => t.due && t.status !== 'done')
    .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime())
    .slice(0, 6);

  const recentNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  const statCards = [
    { label: 'Projects',   value: projects.length, sub: `${activeProjects.length} active`,   onClick: () => setView('projects') },
    { label: 'Tasks',      value: totalTasks,        sub: `${doneTasks} completed`,           onClick: () => setView('tasks') },
    { label: 'Completion', value: completionPct,     pct: true, sub: 'across all projects',   onClick: undefined },
    {
      label: 'Overdue', value: overdueTasks,
      sub: overdueTasks > 0 ? 'needs attention' : 'all on track',
      danger: overdueTasks > 0,
      onClick: overdueTasks > 0 ? () => setView('tasks') : undefined,
    },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map(c => (
          <div
            key={c.label}
            onClick={c.onClick}
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 22px',
              border: '1px solid var(--border)',
              cursor: c.onClick ? 'pointer' : 'default',
              transition: 'all 0.18s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseOver={e => { if (c.onClick) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; } }}
            onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              {c.label}
            </div>
            <div style={{
              fontSize: 44, fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: '-0.025em', lineHeight: 1,
              color: c.danger ? 'var(--danger)' : 'var(--text)',
            }}>
              {c.value}{c.pct && <span style={{ fontSize: 24, color: 'var(--text-muted)', fontWeight: 600 }}>%</span>}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Active Projects */}
        <div>
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text)' }}>
              Active Projects
              <span style={{ fontSize: 12, color: 'var(--primary-dark)', cursor: 'pointer', fontWeight: 500 }} onClick={() => setView('projects')}>View all</span>
            </div>
            {activeProjects.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active projects.</div>
            ) : (
              activeProjects.map(p => {
                const pct = calcProjectProgress(p.id, tasks);
                return (
                  <div
                    key={p.id}
                    onClick={() => setView('project', p.id)}
                    style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={p.color} height={6} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Upcoming deadlines */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 0, color: 'var(--text)' }}>Upcoming Deadlines</div>
            {upcomingTasks.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 14 }}>No upcoming deadlines.</div>
            ) : (
              upcomingTasks.map(t => {
                const proj = projects.find(p => p.id === t.projectId);
                const dl = daysLeft(t.due!);
                return (
                  <div
                    key={t.id}
                    onClick={() => navigateToTask(t.id, t.projectId)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseOver={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
                    onMouseOut={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                  >
                    {proj && <div style={{ width: 8, height: 8, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      {proj && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{proj.name}</div>}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: dl === 'overdue' ? 'var(--danger)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dl}</div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                );
              })
            )}
          </div>

          {/* Recent notes */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Recent Notes</div>
            {recentNotes.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes yet.</div>
            ) : (
              recentNotes.map(n => {
                const proj = projects.find(p => p.id === n.projectId);
                return (
                  <div key={n.id} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{n.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      {proj?.name} &middot; {new Date(n.createdAt).toLocaleDateString('en-US')}
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
