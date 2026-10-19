'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { addDaysIso, fmtDate, fmtMins, projectInArea, todayIso } from '@/lib/utils';
import CapacitySelect from '../ui/CapacitySelect';
import { Task } from '@/lib/types';
import TaskModal from '../modals/TaskModal';

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" style={{ width: 9, height: 9 }}>
      <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

type PlanItem =
  | { kind: 'meeting'; id: string; title: string; time: string; done: boolean; color?: string; sub?: string }
  | { kind: 'planner'; id: string; title: string; time?: string; done: boolean; color?: string; sub?: string; estimate?: number }
  | { kind: 'task'; id: string; title: string; time?: string; done: boolean; color?: string; sub?: string; estimate?: number; task: Task };

export default function Today() {
  const {
    projects, tasks, todos, plannerEvents, plannerAppointments,
    archivedTaskIds, archivedProjectIds, areaFilter, dailyCapacity,
    toggleTaskDone, updateTask, updatePlannerEvent, updatePlannerAppointment,
    addPlannerEvent, addTodo, toggleTodo, navigateToTask, setView, setQuickAddOpen,
  } = useAppStore();
  const [planInput, setPlanInput] = useState('');
  const [todoInput, setTodoInput] = useState('');
  const [editTask, setEditTask] = useState<Task | null>(null);

  const today = todayIso();
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const projectOf = (id?: string) => (id ? projects.find(p => p.id === id) : undefined);
  const liveTasks = tasks.filter(t =>
    !archivedTaskIds.includes(t.id) && !archivedProjectIds.includes(t.projectId) &&
    projectInArea(projectOf(t.projectId), areaFilter));

  // ── Today's plan: meetings, planner tasks and project tasks planned for today ──
  const items: PlanItem[] = [
    ...plannerAppointments.filter(a => a.date === today).map(a => ({
      kind: 'meeting' as const, id: a.id, title: a.title, time: a.time, done: a.done, sub: 'Meeting',
    })),
    ...plannerEvents.filter(e => e.date === today).map(e => {
      const p = projectOf(e.projectId);
      return { kind: 'planner' as const, id: e.id, title: e.title, time: e.time, done: e.done, color: p?.color, sub: p?.name ?? e.category, estimate: e.estimate };
    }),
    ...liveTasks.filter(t => t.plannedDate === today).map(t => {
      const p = projectOf(t.projectId);
      return { kind: 'task' as const, id: t.id, title: t.title, time: t.dueTime, done: t.status === 'done', color: p?.color, sub: p?.name, estimate: t.estimate, task: t };
    }),
  ].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });

  const plannedMins = items.filter(i => !i.done && i.kind !== 'meeting')
    .reduce((n, i) => n + ((i as { estimate?: number }).estimate ?? 0), 0);
  const over = plannedMins > dailyCapacity;
  const openCount = items.filter(i => !i.done).length;

  function toggleItem(i: PlanItem) {
    if (i.kind === 'meeting') updatePlannerAppointment(i.id, { done: !i.done });
    else if (i.kind === 'planner') updatePlannerEvent(i.id, { done: !i.done });
    else toggleTaskDone(i.id);
  }

  function addPlanItem() {
    if (!planInput.trim()) return;
    addPlannerEvent({ title: planInput.trim(), date: today, category: 'personal', notes: '', done: false });
    setPlanInput('');
  }

  // ── Due today & overdue ──
  const dueNow = liveTasks
    .filter(t => t.status !== 'done' && t.due && (t.due <= today || t.status === 'overdue'))
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));
  const overdueCount = dueNow.filter(t => t.due! < today || t.status === 'overdue').length;

  // ── Done today ──
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const doneToday = liveTasks.filter(t => t.status === 'done' && (t.completedAt ?? 0) >= startOfDay.getTime()).length
    + plannerEvents.filter(e => e.date === today && e.done).length;

  const openTodos = [...todos].filter(t => !t.done).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      {/* Summary */}
      <div className="card today-summary">
        <div>
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 26, color: 'var(--text)', lineHeight: 1.15 }}>{dateLabel}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
            {openCount} to do · {doneToday} done today
            {overdueCount > 0 && <span style={{ color: 'var(--danger)' }}> · {overdueCount} overdue</span>}
            {areaFilter && <> · showing {areaFilter}</>}
          </div>
        </div>
        <div style={{ minWidth: 200 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: over ? 'var(--danger)' : 'var(--text-muted)', marginBottom: 5, fontWeight: over ? 600 : 400 }}>
            <span>{plannedMins ? `${fmtMins(plannedMins)} planned` : 'No time estimates yet'}</span>
            <CapacitySelect />
          </div>
          <div className="pday-load-bar" style={{ height: 6 }}>
            <div style={{ width: `${Math.min(100, (plannedMins / dailyCapacity) * 100)}%`, background: over ? 'var(--danger)' : undefined }} />
          </div>
          {over && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 5 }}>Overbooked — consider moving something to tomorrow.</div>}
        </div>
      </div>

      <div className="today-grid">
        {/* Left: today's plan */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Today&rsquo;s plan</div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setView('planner')}>Open planner</button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Meetings, planner tasks and project tasks planned for today.</div>

          {items.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '8px 4px' }}>
              Nothing planned yet. Add something below, or plan project tasks from the Weekly Planner.
            </div>
          )}
          <div className="todo-list">
            {items.map(i => (
              <div key={`${i.kind}-${i.id}`} className={`todo-item today-item${i.done ? ' done' : ''}`} style={{ borderLeftColor: i.kind === 'meeting' ? '#f5c5d3' : i.color ?? 'transparent' }}>
                <span className={`todo-check${i.done ? ' checked' : ''}`} onClick={() => toggleItem(i)}>
                  {i.done && <CheckIcon />}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    className="today-item-title"
                    onClick={() => { if (i.kind === 'task') setEditTask(i.task); else setView('planner'); }}
                  >{i.title}</div>
                  <div className="today-item-meta">
                    {i.time && <span>{fmt12(i.time)}</span>}
                    {i.color && <span className="today-dot" style={{ background: i.color }} />}
                    {i.sub && <span style={{ textTransform: i.kind === 'planner' && !i.color ? 'capitalize' : undefined }}>{i.sub}</span>}
                    {i.kind !== 'meeting' && i.estimate ? <span>· {fmtMins(i.estimate)}</span> : null}
                  </div>
                </div>
                {i.kind === 'task' && !i.done && (
                  <button className="todo-del" title="Move to tomorrow" style={{ opacity: 1, fontSize: 12 }}
                    onClick={() => updateTask(i.id, { plannedDate: addDaysIso(today, 1) })}
                  >→</button>
                )}
              </div>
            ))}
          </div>
          <div className="todo-input-row">
            <input
              value={planInput}
              onChange={e => setPlanInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addPlanItem(); }}
              placeholder="Add something for today…"
            />
            <button onClick={addPlanItem}>Add</button>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              Due today &amp; overdue
              {dueNow.length > 0 && <span className="badge badge-gray" style={{ marginLeft: 8 }}>{dueNow.length}</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Project deadlines that need you now.</div>
            {dueNow.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '4px' }}>Nothing due. Nice.</div>
            )}
            <div className="todo-list">
              {dueNow.map(t => {
                const p = projectOf(t.projectId);
                const late = t.due! < today || t.status === 'overdue';
                return (
                  <div key={t.id} className="todo-item today-item" style={{ borderLeftColor: p?.color ?? 'transparent' }}>
                    <span className="todo-check" onClick={() => toggleTaskDone(t.id)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="today-item-title" onClick={() => navigateToTask(t.id, t.projectId)}>{t.title}</div>
                      <div className="today-item-meta">
                        <span style={{ color: late ? 'var(--danger)' : undefined, fontWeight: late ? 600 : 400 }}>
                          {late ? `Overdue · ${fmtDate(t.due!).replace(/ \d{4}$/, '')}` : 'Due today'}
                        </span>
                        {p && <><span className="today-dot" style={{ background: p.color }} /><span>{p.name}</span></>}
                        {t.estimate ? <span>· {fmtMins(t.estimate)}</span> : null}
                      </div>
                    </div>
                    {t.plannedDate !== today ? (
                      <button className="btn btn-outline btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => updateTask(t.id, { plannedDate: today })}>
                        Plan today
                      </button>
                    ) : (
                      <span className="badge badge-primary" style={{ fontSize: 10.5 }}>Planned</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Open to-dos</div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setQuickAddOpen(true)}>Quick add ⌘K</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Quick captures, from anywhere.</div>
            {openTodos.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '4px' }}>All clear.</div>
            )}
            <div className="todo-list">
              {openTodos.map(t => (
                <div key={t.id} className="todo-item">
                  <span className="todo-check" onClick={() => toggleTodo(t.id)} />
                  <span className="todo-text" style={{ cursor: 'default' }}>{t.text}</span>
                </div>
              ))}
            </div>
            <div className="todo-input-row">
              <input
                value={todoInput}
                onChange={e => setTodoInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && todoInput.trim()) { addTodo(todoInput.trim()); setTodoInput(''); } }}
                placeholder="Add a to-do…"
              />
              <button onClick={() => { if (todoInput.trim()) { addTodo(todoInput.trim()); setTodoInput(''); } }}>Add</button>
            </div>
          </div>
        </div>
      </div>

      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  );
}
