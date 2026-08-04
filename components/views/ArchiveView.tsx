'use client';

import { useAppStore } from '@/store/useAppStore';
import { fmtDate } from '@/lib/utils';
import StatusPill from '../ui/StatusPill';

export default function ArchiveView() {
  const {
    projects, tasks,
    archivedProjectIds, archivedTaskIds,
    unarchiveProject, unarchiveTask, deleteProject, deleteTask,
    setView,
  } = useAppStore();

  const archivedProjects = projects.filter(p => archivedProjectIds.includes(p.id));
  const archivedTasks    = tasks.filter(t => archivedTaskIds.includes(t.id));

  const PRIORITY_DOT: Record<string, string> = {
    high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)',
  };

  const isEmpty = archivedProjects.length === 0 && archivedTasks.length === 0;

  // Group archived tasks by their project
  const taskGroups: { projectId: string | null; projectName: string; projectColor: string; tasks: typeof archivedTasks }[] = [];
  for (const t of archivedTasks) {
    const proj = projects.find(p => p.id === t.projectId);
    const key  = proj ? proj.id : null;
    let group = taskGroups.find(g => g.projectId === key);
    if (!group) {
      group = { projectId: key, projectName: proj?.name ?? 'No project', projectColor: proj?.color ?? 'var(--text-faint)', tasks: [] };
      taskGroups.push(group);
    }
    group.tasks.push(t);
  }
  taskGroups.sort((a, b) => a.projectName.localeCompare(b.projectName));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 26, fontWeight: 400, margin: 0, color: 'var(--text)' }}>Archive</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
          Projects and tasks you've set aside. Restore them any time.
        </p>
      </div>

      {isEmpty && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40, color: 'var(--text-faint)', marginBottom: 12 }}>
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5" rx="1"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
          <h3>Archive is empty</h3>
          <p>Archive projects or tasks from their menus to store them here.</p>
        </div>
      )}

      {/* Archived Projects */}
      {archivedProjects.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>
            Projects · {archivedProjects.length}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {archivedProjects.map(p => {
              const pt = tasks.filter(t => t.projectId === p.id);
              const done = pt.filter(t => t.status === 'done').length;
              const pct  = pt.length ? Math.round((done / pt.length) * 100) : 0;
              return (
                <div key={p.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '18px 20px',
                  opacity: 0.82,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 17, fontWeight: 400, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{p.type}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: 12 }}
                        onClick={() => unarchiveProject(p.id)}
                        title="Restore project"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                        </svg>
                        Restore
                      </button>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--danger)' }}
                        title="Permanently delete project"
                        onClick={() => { if (confirm(`Permanently delete "${p.name}" and all its data?`)) deleteProject(p.id); }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  {p.description && (
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                      {p.description.slice(0, 80)}{p.description.length > 80 ? '…' : ''}
                    </div>
                  )}
                  <div style={{ height: 5, background: '#f1ebe1', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', background: p.color, borderRadius: 999, width: `${pct}%` }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{done}/{pt.length} tasks · {pct}%</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Archived Tasks — grouped by project */}
      {archivedTasks.length > 0 && (
        <section>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-faint)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>
            Tasks · {archivedTasks.length}
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {taskGroups.map(group => (
              <div key={group.projectId ?? '__none__'}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                    cursor: group.projectId ? 'pointer' : 'default',
                  }}
                  onClick={() => { if (group.projectId) setView('project', group.projectId); }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.projectColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{group.projectName}</span>
                  <span className="badge badge-gray">{group.tasks.length}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.tasks.map(t => (
                    <div key={t.id} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)', padding: '12px 18px',
                      display: 'flex', alignItems: 'center', gap: 12, opacity: 0.82,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_DOT[t.priority] ?? 'var(--border-strong)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <StatusPill status={t.status} />
                          {t.due && <span className="badge badge-gray">Due {fmtDate(t.due)}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: 12 }}
                          onClick={() => unarchiveTask(t.id)}
                          title="Restore task"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                          </svg>
                          Restore
                        </button>
                        <button
                          className="btn-icon"
                          style={{ color: 'var(--danger)' }}
                          title="Permanently delete task"
                          onClick={() => { if (confirm(`Permanently delete "${t.title}"?`)) deleteTask(t.id); }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
