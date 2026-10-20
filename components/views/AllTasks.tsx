'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Task } from '@/lib/types';
import { fmtDate, sortTasks, projectInArea, todayIso } from '@/lib/utils';
import { PRIORITY_META, STATUS_META, STATUS_ORDER } from '@/lib/constants';
import TaskModal from '../modals/TaskModal';

type SortKey = 'task' | 'project' | 'status' | 'due' | 'priority';
const SORT_KEY = 'pm_oyint_tasks_sort';
const SORT_KEYS: SortKey[] = ['task', 'project', 'status', 'due', 'priority'];
const PRI_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_DOT: Record<string, string> = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };

const shortDate = (iso: string) => fmtDate(iso).replace(/ \d{4}$/, '');

// All Tasks as a ledger: one row per task, sortable columns, tick to complete, click to edit.
// Done tasks always sink to the bottom so open work stays in view whatever the sort.
export default function AllTasks() {
  const { tasks: allTasks, projects, searchQuery, setSearch, archivedTaskIds, archivedProjectIds, areaFilter, toggleTaskDone, setView } = useAppStore();
  const [statusFilter, setStatusFilter]     = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'due', dir: 1 });
  const [editing, setEditing] = useState<Task | null>(null);
  const today = todayIso();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SORT_KEY) ?? 'null');
      if (saved && SORT_KEYS.includes(saved.key) && (saved.dir === 1 || saved.dir === -1)) setSort(saved);
    } catch {}
  }, []);

  function sortBy(key: SortKey) {
    const next = { key, dir: (sort.key === key ? -sort.dir : 1) as 1 | -1 };
    setSort(next);
    try { localStorage.setItem(SORT_KEY, JSON.stringify(next)); } catch {}
  }

  const projectOf = (id: string) => projects.find(p => p.id === id);
  const tasks = allTasks.filter(t =>
    !archivedTaskIds.includes(t.id) && !archivedProjectIds.includes(t.projectId) &&
    projectInArea(projectOf(t.projectId), areaFilter));

  const filtered = sortTasks(
    tasks.filter(t => {
      const q   = searchQuery.toLowerCase();
      const mQ  = !q || t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q);
      const mS  = !statusFilter   || (statusFilter === 'open' ? t.status !== 'done' : t.status === statusFilter);
      const mP  = !priorityFilter || t.priority === priorityFilter;
      return mQ && mS && mP;
    })
  );

  // Stable sort on top of the default order; empty values (no due date) always last
  const rows = filtered.map((t, i) => ({ t, i })).sort((a, b) => {
    const da = a.t.status === 'done' ? 1 : 0, db = b.t.status === 'done' ? 1 : 0;
    if (da !== db) return da - db;
    let x: string | number, y: string | number;
    switch (sort.key) {
      case 'task':     x = a.t.title.toLowerCase(); y = b.t.title.toLowerCase(); break;
      case 'project':  x = (projectOf(a.t.projectId)?.name ?? '').toLowerCase(); y = (projectOf(b.t.projectId)?.name ?? '').toLowerCase(); break;
      case 'status':   x = STATUS_ORDER.indexOf(a.t.status); y = STATUS_ORDER.indexOf(b.t.status); break;
      case 'priority': x = PRI_RANK[a.t.priority] ?? 1; y = PRI_RANK[b.t.priority] ?? 1; break;
      default:
        if (!a.t.due !== !b.t.due) return a.t.due ? -1 : 1;
        x = `${a.t.due ?? ''}${a.t.dueTime ?? '99:99'}`; y = `${b.t.due ?? ''}${b.t.dueTime ?? '99:99'}`;
    }
    return x < y ? -sort.dir : x > y ? sort.dir : a.i - b.i;
  }).map(r => r.t);

  const openCount = rows.filter(t => t.status !== 'done').length;

  const th = (key: SortKey, label: string, cls = '') => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={`lg-sort${sort.key === key ? ' on' : ''}`} onClick={() => sortBy(key)}>
        {label}
        <span className="lg-arrow" aria-hidden>{sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : '↕'}</span>
      </button>
    </th>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="alltasks-toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <input
          className="toolbar-input"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <select
          className="toolbar-input"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: 'auto', minWidth: 140 }}
        >
          <option value="">All Statuses</option>
          <option value="open">Open (not done)</option>
          <option value="todo">To Do</option>
          <option value="inprogress">In Progress</option>
          <option value="inreview">In Review</option>
          <option value="done">Done</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          className="toolbar-input"
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ width: 'auto', minWidth: 130 }}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <h3>{searchQuery || statusFilter || priorityFilter ? 'No matching tasks' : 'No tasks yet'}</h3>
          <p>{searchQuery ? `No tasks matching "${searchQuery}"` : 'Tasks you create will appear here.'}</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            {rows.length} task{rows.length !== 1 ? 's' : ''}{openCount !== rows.length ? ` · ${openCount} open` : ''} · click a column to sort
          </div>
          <div className="lg-wrap">
            <table className="lg-table">
              <thead>
                <tr>
                  <th className="lg-c-check" aria-label="Done" />
                  {th('task', 'Task')}
                  {th('project', 'Project', 'lg-c-project')}
                  {th('status', 'Status', 'lg-c-status')}
                  {th('due', 'Due', 'lg-c-due')}
                  {th('priority', 'Priority', 'lg-c-pri')}
                </tr>
              </thead>
              <tbody>
                {rows.map(t => {
                  const p = projectOf(t.projectId);
                  const done = t.status === 'done';
                  const meta = STATUS_META[t.status];
                  const subs = t.subtasks ?? [];
                  const planned = t.plannedDate && t.plannedDate >= today && t.plannedDate !== t.due ? t.plannedDate : '';
                  return (
                    <tr key={t.id} className={done ? 'done' : ''} onClick={() => setEditing(t)} title="Edit task">
                      <td className="lg-c-check">
                        <button
                          type="button"
                          className={`section-task-check${done ? ' checked' : ''}`}
                          aria-label={done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`}
                          title={done ? 'Mark as not done' : 'Mark as done'}
                          onClick={e => { e.stopPropagation(); toggleTaskDone(t.id); }}
                        >
                          {done && (
                            <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}>
                              <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="lg-c-task">
                        <div className="lg-task">
                        <span className="lg-title" title={t.title}>{t.title}</span>
                        <span className="lg-tags">
                          {subs.length > 0 && <span className="lg-tag" title="Subtasks done">{subs.filter(s => s.done).length}/{subs.length}</span>}
                          {planned && <span className="lg-tag lg-tag-plan">Planned {shortDate(planned)}</span>}
                          {p && <span className="lg-proj-inline"><span className="today-dot" style={{ background: p.color }} />{p.name}</span>}
                        </span>
                        </div>
                      </td>
                      <td className="lg-c-project">
                        {p && (
                          <button type="button" className="lg-proj" title={`Open ${p.name}`} onClick={e => { e.stopPropagation(); setView('project', p.id); }}>
                            <span className="today-dot" style={{ background: p.color }} />
                            <span className="lg-proj-name">{p.name}</span>
                          </button>
                        )}
                      </td>
                      <td className="lg-c-status"><span className={`badge ${meta.badgeClass}`}>{meta.label}</span></td>
                      <td className={`lg-c-due${t.status === 'overdue' || (!done && t.due && t.due < today) ? ' late' : ''}`}>
                        {t.due ? shortDate(t.due) : '—'}
                      </td>
                      <td className="lg-c-pri">
                        <span className="today-dot" style={{ background: PRIORITY_DOT[t.priority] }} />{(PRIORITY_META[t.priority] ?? PRIORITY_META.medium).label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && <TaskModal task={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
