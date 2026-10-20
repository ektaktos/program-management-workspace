'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { addDaysIso, calendarEventsOn, fmtDate, fmtMins, projectInArea, todayIso } from '@/lib/utils';
import CapacitySelect from '../ui/CapacitySelect';
import { Task } from '@/lib/types';
import TaskModal from '../modals/TaskModal';
import TodayMeetingsCard from '../ui/TodayMeetings';

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

// Meetings and calendar events live in their own card (TodayMeetingsCard); the plan is tasks only
type PlanItem =
  | { kind: 'planner'; id: string; title: string; time?: string; done: boolean; color?: string; sub?: string; estimate?: number }
  | { kind: 'task'; id: string; title: string; time?: string; done: boolean; color?: string; sub?: string; estimate?: number; task: Task };

export default function Today() {
  const {
    projects, tasks, todos, plannerEvents, plannerAppointments, calendarSources, calendarEvents, ensureCalendarRange,
    archivedTaskIds, archivedProjectIds, areaFilter, dailyCapacity,
    toggleTaskDone, updateTask, updatePlannerEvent,
    addPlannerEvent, addTodo, toggleTodo, navigateToTask, setView, setQuickAddOpen,
  } = useAppStore();
  const [planInput, setPlanInput] = useState('');
  const [todoInput, setTodoInput] = useState('');
  const [editTask, setEditTask] = useState<Task | null>(null);

  const today = todayIso();

  // ── Focus day: a strip for this week; the chosen day gets the full layout (defaults to today) ──
  const [focus, setFocus] = useState(today);
  const todayDow = new Date(today + 'T00:00:00').getDay();
  const weekStart = addDaysIso(today, todayDow === 0 ? -6 : 1 - todayDow);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));
  useEffect(() => { ensureCalendarRange(weekDays[0], weekDays[6]); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekStart, calendarSources, ensureCalendarRange]);
  const isToday = focus === today;
  const focusDate = new Date(focus + 'T00:00:00');
  const focusName = focusDate.toLocaleDateString('en-GB', { weekday: 'long' });
  const dateLabel = focusDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const projectOf = (id?: string) => (id ? projects.find(p => p.id === id) : undefined);
  // Planner tasks follow the area filter only when linked to a project; unlinked ones always show
  const inAreaEvent = (projectId?: string) => !projectId || projectInArea(projectOf(projectId), areaFilter);
  const liveTasks = tasks.filter(t =>
    !archivedTaskIds.includes(t.id) && !archivedProjectIds.includes(t.projectId) &&
    projectInArea(projectOf(t.projectId), areaFilter));

  // ── The focused day's plan: planner tasks and project tasks planned for it ──
  const planFor = (iso: string): PlanItem[] => [
    ...plannerEvents.filter(e => e.date === iso && inAreaEvent(e.projectId)).map(e => {
      const p = projectOf(e.projectId);
      // Same rule as the planner: project colour when linked, otherwise the category colour
      return { kind: 'planner' as const, id: e.id, title: e.title, time: e.time, done: e.done, color: p?.color ?? `var(--cat-${e.category})`, sub: p?.name ?? e.category, estimate: e.estimate };
    }),
    ...liveTasks.filter(t => t.plannedDate === iso).map(t => {
      const p = projectOf(t.projectId);
      return { kind: 'task' as const, id: t.id, title: t.title, time: t.dueTime, done: t.status === 'done', color: p?.color, sub: p?.name, estimate: t.estimate, task: t };
    }),
  ].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
  });
  const items = planFor(focus);

  // Strip data: tasks done/total and meetings per day of this week
  const enabledCal = calendarEvents.filter(e => calendarSources.find(c => c.id === e.sourceId)?.enabled);
  const strip = weekDays.map(iso => {
    const plan = planFor(iso);
    const meetings = plannerAppointments.filter(a => a.date === iso).length + calendarEventsOn(enabledCal, iso).length;
    return { iso, total: plan.length, done: plan.filter(i => i.done).length, meetings,
      mins: plan.filter(i => !i.done).reduce((n, i) => n + (i.estimate ?? 0), 0) };
  });

  const plannedMins = items.filter(i => !i.done).reduce((n, i) => n + (i.estimate ?? 0), 0);
  const over = plannedMins > dailyCapacity;
  const openCount = items.filter(i => !i.done).length;

  function toggleItem(i: PlanItem) {
    if (i.kind === 'planner') updatePlannerEvent(i.id, { done: !i.done });
    else toggleTaskDone(i.id);
  }

  function addPlanItem() {
    if (!planInput.trim()) return;
    addPlannerEvent({ title: planInput.trim(), date: focus, category: 'personal', notes: '', done: false });
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
    + plannerEvents.filter(e => e.date === today && e.done && inAreaEvent(e.projectId)).length;

  const openTodos = [...todos].filter(t => !t.done).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      {/* Summary */}
      <div className="card today-summary">
        <div>
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 26, color: 'var(--text)', lineHeight: 1.15 }}>{dateLabel}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
            {openCount} to do{isToday ? ` · ${doneToday} done today` : ` · ${items.length - openCount} done`}
            {overdueCount > 0 && <span style={{ color: 'var(--danger)' }}> · {overdueCount} overdue</span>}
            {areaFilter && <> · showing {areaFilter}</>}
          </div>
        </div>
        <div style={{ minWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontSize: 12, color: over ? 'var(--danger)' : 'var(--text-muted)', marginBottom: 6, fontWeight: over ? 600 : 400 }}>
            <span>{plannedMins ? `${fmtMins(plannedMins)} planned` : 'No time estimates yet'}</span>
            <CapacitySelect />
          </div>
          <div className="pday-load-bar" style={{ height: 6 }}>
            <div style={{ width: `${Math.min(100, (plannedMins / dailyCapacity) * 100)}%`, background: over ? 'var(--danger)' : undefined }} />
          </div>
          {over && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 5 }}>Overbooked — consider moving something to the next day.</div>}
        </div>
      </div>

      {/* Week strip — pick a day to focus on */}
      <div className="focus-strip" role="tablist" aria-label="This week">
        {strip.map(d => {
          const dt = new Date(d.iso + 'T00:00:00');
          return (
            <button
              key={d.iso}
              role="tab"
              aria-selected={d.iso === focus}
              className={`focus-pill${d.iso === focus ? ' on' : ''}${d.iso === today ? ' is-today' : ''}${d.iso < today ? ' past' : ''}`}
              onClick={() => setFocus(d.iso)}
              title={`${d.total} task${d.total !== 1 ? 's' : ''}, ${d.meetings} meeting${d.meetings !== 1 ? 's' : ''}`}
            >
              <span className="focus-pill-day">{d.iso === today ? 'Today' : dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
              <span className="focus-pill-num">{dt.getDate()}</span>
              <span className="focus-pill-dots" aria-hidden>
                {Array.from({ length: Math.min(d.meetings, 4) }, (_, k) => <i key={k} />)}
              </span>
              <span className="focus-pill-bar" aria-hidden><i style={{ width: `${d.total ? (100 * d.done) / d.total : 0}%` }} /></span>
              <span className="focus-pill-meta">{d.total ? `${d.done}/${d.total}` : '—'}</span>
            </button>
          );
        })}
        {!isToday && (
          <button className="btn btn-ghost btn-sm focus-back" onClick={() => setFocus(today)}>Back to today</button>
        )}
      </div>

      {/* Four aligned panels, as sketched: plan | meetings on top, due | to-dos below */}
      <div className="today-quad">
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{isToday ? 'Today’s plan' : `${focusName}’s plan`}</div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setView('planner')}>Open planner</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{isToday ? 'Planner tasks and project tasks planned for today.' : `Planner tasks and project tasks planned for ${focusName}.`}</div>

            {items.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '8px 4px' }}>
                Nothing planned yet. Add something below, or plan project tasks from the Weekly Planner.
              </div>
            )}
            <div className="todo-list">
              {items.map(i => (
                <div key={`${i.kind}-${i.id}`} className={`todo-item today-item${i.done ? ' done' : ''}`} style={{ borderLeftColor: i.color ?? 'transparent' }}>
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
                      {i.sub && <span style={{ textTransform: i.kind === 'planner' ? 'capitalize' : undefined }}>{i.sub}</span>}
                      {i.estimate ? <span>· {fmtMins(i.estimate)}</span> : null}
                    </div>
                  </div>
                  {i.kind === 'task' && !i.done && (
                    <button className="todo-del" title="Move to tomorrow" style={{ opacity: 1, fontSize: 12 }}
                      onClick={() => updateTask(i.id, { plannedDate: addDaysIso(focus, 1) })}
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
                placeholder={isToday ? 'Add something for today…' : `Add something for ${focusName}…`}
              />
              <button onClick={addPlanItem}>Add</button>
            </div>
          </div>
        <TodayMeetingsCard date={focus} />


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

      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  );
}
