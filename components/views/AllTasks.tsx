'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PlannerEvent, Task } from '@/lib/types';
import { sortTasks, projectInArea, todayIso, fmtDate, fmt12hr } from '@/lib/utils';
import { STATUS_ORDER } from '@/lib/constants';
import TaskModal from '../modals/TaskModal';
import { EventModal } from './WeeklyPlanner';
import { InlineAssigneeBadge } from '../project/TaskCard';
import ConfirmModal from '../modals/ConfirmModal';
import { DueEdit, ExtrasToggle, PrioritySelect, RepeatSelect, StatusSelect, useLedgerExtras } from '../ui/InlineQualifiers';

type SortKey = 'task' | 'project' | 'status' | 'due' | 'priority';
const SORT_KEY = 'pm_oyint_tasks_sort';
const SORT_KEYS: SortKey[] = ['task', 'project', 'status', 'due', 'priority'];
const PRI_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const SOURCE_KEY = 'pm_oyint_tasks_source';

// The ledger lists project tasks and tasks added straight to the Weekly Planner (to-dos stay out).
// A planner task has no status or priority of its own: it is Done, Overdue (its day has passed) or To Do.
type Row = { kind: 'task'; t: Task } | { kind: 'plan'; e: PlannerEvent };
type PlanStatus = 'todo' | 'overdue' | 'done';
function planStatus(e: PlannerEvent, today: string): PlanStatus {
  return e.done ? 'done' : e.date && e.date < today ? 'overdue' : 'todo';
}


// All Tasks as a ledger: one row per task, sortable columns, tick to complete, click to edit.
// Done tasks always sink to the bottom so open work stays in view whatever the sort.
export default function AllTasks() {
  const { tasks: allTasks, plannerEvents, projects, searchQuery, setSearch, archivedTaskIds, archivedProjectIds, areaFilter, toggleTaskDone, updateTask, deleteTask, updatePlannerEvent, deletePlannerEvent, setView } = useAppStore();
  const [statusFilter, setStatusFilter]     = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [source, setSource] = useState<'' | 'projects' | 'planner'>('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'due', dir: 1 });
  const [editing, setEditing] = useState<Task | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlannerEvent | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [extras, toggleExtras] = useLedgerExtras();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SORT_KEY) ?? 'null');
      if (saved && SORT_KEYS.includes(saved.key) && (saved.dir === 1 || saved.dir === -1)) setSort(saved);
      const src = localStorage.getItem(SOURCE_KEY);
      if (src === 'projects' || src === 'planner') setSource(src);
    } catch {}
  }, []);

  function chooseSource(next: '' | 'projects' | 'planner') {
    setSource(next);
    try { next ? localStorage.setItem(SOURCE_KEY, next) : localStorage.removeItem(SOURCE_KEY); } catch {}
  }

  function sortBy(key: SortKey) {
    const next = { key, dir: (sort.key === key ? -sort.dir : 1) as 1 | -1 };
    setSort(next);
    try { localStorage.setItem(SORT_KEY, JSON.stringify(next)); } catch {}
  }

  const projectOf = (id: string) => projects.find(p => p.id === id);
  const tasks = allTasks.filter(t =>
    !archivedTaskIds.includes(t.id) && !archivedProjectIds.includes(t.projectId) &&
    projectInArea(projectOf(t.projectId), areaFilter));

  const today = todayIso();
  const q = searchQuery.toLowerCase();
  const filtered = sortTasks(
    tasks.filter(t => {
      const mQ  = !q || t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q);
      const mS  = !statusFilter   || (statusFilter === 'open' ? t.status !== 'done' : t.status === statusFilter);
      const mP  = !priorityFilter || t.priority === priorityFilter;
      return mQ && mS && mP;
    })
  );
  // Planner tasks: linked ones follow their project (archived or outside the area filter: hidden);
  // unlinked ones belong to no area, so an area filter hides them
  const planTasks = plannerEvents.filter(e => {
    if (e.projectId) {
      const p = projectOf(e.projectId);
      if (p && (archivedProjectIds.includes(p.id) || !projectInArea(p, areaFilter))) return false;
    } else if (areaFilter) return false;
    const st = planStatus(e, today);
    const mQ = !q || e.title.toLowerCase().includes(q) || (e.notes ?? '').toLowerCase().includes(q);
    const mS = !statusFilter || (statusFilter === 'open' ? st !== 'done' : st === statusFilter);
    return mQ && mS && !priorityFilter;   // planner tasks have no priority
  });

  const all: Row[] = [
    ...(source === 'planner' ? [] : filtered.map(t => ({ kind: 'task' as const, t }))),
    ...(source === 'projects' ? [] : planTasks.map(e => ({ kind: 'plan' as const, e }))),
  ];
  const isDone = (r: Row) => (r.kind === 'task' ? r.t.status === 'done' : r.e.done);
  const titleOf = (r: Row) => (r.kind === 'task' ? r.t.title : r.e.title);
  const projectIdOf = (r: Row) => (r.kind === 'task' ? r.t.projectId : r.e.projectId);
  const statusRank = (r: Row) => STATUS_ORDER.indexOf(r.kind === 'task' ? r.t.status : planStatus(r.e, today));
  const dueKey = (r: Row) => (r.kind === 'task' ? (r.t.due ? `${r.t.due}${r.t.dueTime ?? '99:99'}` : '') : (r.e.date ? `${r.e.date}${r.e.time ?? '99:99'}` : ''));

  // Stable sort on top of the default order; empty values (no due date) always last
  const rows = all.map((r, i) => ({ r, i })).sort((a, b) => {
    const da = isDone(a.r) ? 1 : 0, db = isDone(b.r) ? 1 : 0;
    if (da !== db) return da - db;
    let x: string | number, y: string | number;
    switch (sort.key) {
      case 'task':     x = titleOf(a.r).toLowerCase(); y = titleOf(b.r).toLowerCase(); break;
      case 'project':  x = (projectOf(projectIdOf(a.r) ?? '')?.name ?? (a.r.kind === 'plan' ? 'weekly planner' : '')).toLowerCase(); y = (projectOf(projectIdOf(b.r) ?? '')?.name ?? (b.r.kind === 'plan' ? 'weekly planner' : '')).toLowerCase(); break;
      case 'status':   x = statusRank(a.r); y = statusRank(b.r); break;
      case 'priority': x = a.r.kind === 'task' ? PRI_RANK[a.r.t.priority] ?? 1 : 3; y = b.r.kind === 'task' ? PRI_RANK[b.r.t.priority] ?? 1 : 3; break;
      default: {
        const ka = dueKey(a.r), kb = dueKey(b.r);
        if (!ka !== !kb) return ka ? -1 : 1;
        x = ka; y = kb;
      }
    }
    return x < y ? -sort.dir : x > y ? sort.dir : a.i - b.i;
  }).map(x => x.r);

  const openCount = rows.filter(r => !isDone(r)).length;
  const planCount = rows.filter(r => r.kind === 'plan').length;
  const filtering = !!(searchQuery || statusFilter || priorityFilter || source);

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
          aria-label="Search tasks"
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <select
          className="toolbar-input"
          aria-label="Filter by status"
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
          aria-label="Filter by priority"
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ width: 'auto', minWidth: 130 }}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          className="toolbar-input"
          aria-label="Filter by where the task lives"
          value={source}
          onChange={e => chooseSource(e.target.value as '' | 'projects' | 'planner')}
          style={{ width: 'auto', minWidth: 150 }}
        >
          <option value="">Projects and planner</option>
          <option value="projects">Projects only</option>
          <option value="planner">Weekly planner only</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <h3>{filtering ? 'No matching tasks' : 'No tasks yet'}</h3>
          <p>{searchQuery ? `No tasks matching "${searchQuery}"` : 'Tasks you create will appear here.'}</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            {rows.length} task{rows.length !== 1 ? 's' : ''}{openCount !== rows.length ? ` · ${openCount} open` : ''}{planCount && planCount !== rows.length ? ` · ${planCount} from the planner` : ''} · click a column to sort
          </div>
          <div className="lg-wrap">
            <table className={`lg-table${extras ? ' extras' : ''}`}>
              <thead>
                <tr>
                  <th className="lg-c-check" aria-label="Done" />
                  {th('task', 'Task')}
                  {th('project', 'Project', 'lg-c-project')}
                  {th('status', 'Status', 'lg-c-status')}
                  {th('due', 'Due', 'lg-c-due')}
                  {th('priority', 'Priority', 'lg-c-pri')}
                  {extras && <th className="lg-c-x"><span className="lg-th-plain">Assignee</span></th>}
                  {extras && <th className="lg-c-x"><span className="lg-th-plain">Repeat</span></th>}
                  <th className="lg-c-del"><ExtrasToggle open={extras} onToggle={toggleExtras} /></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  if (r.kind === 'plan') {
                    const e = r.e;
                    const p = e.projectId ? projectOf(e.projectId) : undefined;
                    const st = planStatus(e, today);
                    return (
                      <tr key={`plan-${e.id}`} className={e.done ? 'done' : ''} onClick={() => setEditingPlan(e)} title="Edit planner task">
                        <td className="lg-c-check">
                          <button
                            type="button"
                            className={`section-task-check${e.done ? ' checked' : ''}`}
                            aria-label={e.done ? `Mark "${e.title}" as not done` : `Mark "${e.title}" as done`}
                            title={e.done ? 'Mark as not done' : 'Mark as done'}
                            onClick={ev => { ev.stopPropagation(); updatePlannerEvent(e.id, { done: !e.done }); }}
                          >
                            {e.done && (
                              <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}>
                                <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        </td>
                        <td className="lg-c-task">
                          <div className="lg-task">
                          <div className="lg-task-line">
                          <span className="lg-title" title={e.title}>{e.title}</span>
                          <span className="lg-tags">
                            <span className="lg-tag lg-tag-plan" title="Added in the Weekly Planner">Planner</span>
                            {p && <span className="lg-proj-inline"><span className="today-dot" style={{ background: p.color }} />{p.name}</span>}
                          </span>
                          </div>
                          </div>
                        </td>
                        <td className="lg-c-project">
                          {p ? (
                            <button type="button" className="lg-proj" title={`Open ${p.name}`} onClick={ev => { ev.stopPropagation(); setView('project', p.id); }}>
                              <span className="today-dot" style={{ background: p.color }} />
                              <span className="lg-proj-name">{p.name}</span>
                            </button>
                          ) : (
                            <button type="button" className="lg-proj" title="Open the Weekly Planner" onClick={ev => { ev.stopPropagation(); setView('planner'); }}>
                              <span className="lg-proj-name" style={{ color: 'var(--text-muted)' }}>Weekly planner</span>
                            </button>
                          )}
                        </td>
                        <td className="lg-c-status">
                          <span className={`badge ${st === 'done' ? 'badge-success' : st === 'overdue' ? 'badge-danger' : 'badge-gray'}`} title="Tick it off, or open it to change its day">
                            {st === 'done' ? 'Done' : st === 'overdue' ? 'Overdue' : 'To Do'}
                          </span>
                        </td>
                        <td className="lg-c-due">
                          <span className={`q-due${st === 'overdue' ? ' late' : ''}${e.date ? '' : ' empty'}`} title="Planned day">
                            {e.date ? <>{fmtDate(e.date).replace(/ \d{4}$/, '')}{e.time && <span className="q-due-time">{fmt12hr(e.time)}</span>}</> : '—'}
                          </span>
                        </td>
                        <td className="lg-c-pri"><span className="x-empty">—</span></td>
                        {extras && <td className="lg-c-x"><span className="x-empty">—</span></td>}
                        {extras && <td className="lg-c-x"><span className="x-empty">—</span></td>}
                        <td className="lg-c-del">
                          <button type="button" className="row-delete" title="Delete planner task" aria-label={`Delete "${e.title}"`}
                            onClick={ev => { ev.stopPropagation(); setDeleting(r); }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  const t = r.t;
                  const p = projectOf(t.projectId);
                  const done = t.status === 'done';
                  const subs = t.subtasks ?? [];
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
                        <div className="lg-task-line">
                        <span className="lg-title" title={t.title}>{t.title}</span>
                        <span className="lg-tags">
                          {subs.length > 0 && <span className="lg-tag" title="Subtasks done">{subs.filter(s => s.done).length}/{subs.length}</span>}
                          {p && <span className="lg-proj-inline"><span className="today-dot" style={{ background: p.color }} />{p.name}</span>}
                        </span>
                        </div>
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
                      <td className="lg-c-status"><StatusSelect task={t} /></td>
                      <td className="lg-c-due"><DueEdit task={t} /></td>
                      <td className="lg-c-pri"><PrioritySelect task={t} /></td>
                      {extras && (
                        <td className="lg-c-x" onClick={e => e.stopPropagation()}>
                          {t.assignee ? <InlineAssigneeBadge assignee={t.assignee} onSave={val => updateTask(t.id, { assignee: val })} /> : <span className="x-empty">—</span>}
                        </td>
                      )}
                      {extras && (
                        <td className="lg-c-x" onClick={e => e.stopPropagation()}>
                          <RepeatSelect task={t} />
                        </td>
                      )}
                      <td className="lg-c-del">
                        <button type="button" className="row-delete" title="Delete task" aria-label={`Delete "${t.title}"`}
                          onClick={e => { e.stopPropagation(); setDeleting(r); }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                        </button>
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
      {editingPlan && <EventModal event={editingPlan} onClose={() => setEditingPlan(null)} />}
      {deleting && (
        <ConfirmModal
          message={`Delete "${titleOf(deleting)}"? This can't be undone.`}
          onConfirm={() => {
            if (deleting.kind === 'task') deleteTask(deleting.t.id); else deletePlannerEvent(deleting.e.id);
            setDeleting(null);
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
