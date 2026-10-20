'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { addDaysIso, calendarEventsOn, fmtMins, fmt12hr, localTimeOf, parseLocation, projectInArea, todayIso } from '@/lib/utils';
import { Task } from '@/lib/types';
import TaskModal from '../modals/TaskModal';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RANGES = [7, 14, 30];
const WEEK_RANGES = [2, 4, 8];
const MODE_KEY = 'pm_oyint_upcoming_mode';

function dayDiff(iso: string, today: string) {
  return Math.round((new Date(iso + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 864e5);
}
function relLabel(n: number) {
  if (n < -1) return `${-n} days overdue`;
  if (n === -1) return 'Yesterday';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 7) return `In ${n} days`;
  if (n < 14) return 'Next week';
  return `In ${Math.round(n / 7)} weeks`;
}
function mondayOf(iso: string) {
  return addDaysIso(iso, -((new Date(iso + 'T00:00:00').getDay() + 6) % 7));
}
function weekRel(n: number) {
  return n === 0 ? 'This week' : n === 1 ? 'Next week' : `In ${n} weeks`;
}
function weekSpan(mon: string) {
  const a = new Date(mon + 'T00:00:00'), b = new Date(addDaysIso(mon, 6) + 'T00:00:00');
  return a.getMonth() === b.getMonth()
    ? `${MONTHS[a.getMonth()]} ${a.getDate()} – ${b.getDate()}`
    : `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
}
function dayLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}${d.getFullYear() !== new Date().getFullYear() ? `, ${d.getFullYear()}` : ''}`;
}

type Kind = 'due' | 'planned' | 'planner' | 'meeting' | 'calendar';
interface RailItem {
  key: string;
  kind: Kind;
  date: string;
  sortKey: string;
  title: string;
  color: string;
  time?: string;
  endTime?: string;
  meta: string[];
  location?: string;
  projectId?: string;
  task?: Task;
  plannerId?: string;
  apptId?: string;
}

const KIND_LABEL: Record<Kind, string> = { due: 'Due', planned: 'Planned', planner: 'Planner task', meeting: 'Meeting', calendar: 'Calendar' };

// Upcoming: everything ahead on one timeline rail — project deadlines, planned project tasks, planner
// tasks, planner meetings and subscribed-calendar events — day by day (7/14/30 days) or week by week
// (2/4/8 weeks), overdue folded on top
export default function Upcoming() {
  const {
    tasks, projects, plannerEvents, plannerAppointments, calendarSources, calendarEvents,
    archivedTaskIds, archivedProjectIds, areaFilter,
    toggleTaskDone, updatePlannerEvent, updatePlannerAppointment, ensureCalendarRange, setView,
  } = useAppStore();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [range, setRange] = useState(14);
  const [weeks, setWeeks] = useState(4);
  const [mode, setMode] = useState<'days' | 'weeks'>('days');
  const [showOverdue, setShowOverdue] = useState(false);
  const today = todayIso();
  const thisMonday = mondayOf(today);
  // Week mode runs to the Sunday of the last week shown
  const end = mode === 'days' ? addDaysIso(today, range - 1) : addDaysIso(thisMonday, weeks * 7 - 1);
  const span = dayDiff(end, today) + 1;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODE_KEY) ?? 'null');
      if (saved?.mode === 'days' || saved?.mode === 'weeks') setMode(saved.mode);
      if (RANGES.includes(saved?.range)) setRange(saved.range);
      if (WEEK_RANGES.includes(saved?.weeks)) setWeeks(saved.weeks);
    } catch {}
  }, []);
  function remember(next: { mode?: 'days' | 'weeks'; range?: number; weeks?: number }) {
    const v = { mode, range, weeks, ...next };
    if (next.mode) setMode(next.mode);
    if (next.range) setRange(next.range);
    if (next.weeks) setWeeks(next.weeks);
    try { localStorage.setItem(MODE_KEY, JSON.stringify(v)); } catch {}
  }

  useEffect(() => { ensureCalendarRange(today, end); }, [today, end, calendarSources, ensureCalendarRange]);

  const projectOf = (id?: string) => (id ? projects.find(p => p.id === id) : undefined);
  const liveTasks = tasks.filter(t =>
    t.status !== 'done' && !archivedTaskIds.includes(t.id) && !archivedProjectIds.includes(t.projectId) &&
    projectInArea(projectOf(t.projectId), areaFilter));
  const inRange = (iso?: string) => !!iso && iso >= today && iso <= end;

  const items: RailItem[] = [];
  for (const t of liveTasks) {
    const p = projectOf(t.projectId);
    if (inRange(t.due)) {
      items.push({ key: `due-${t.id}`, kind: 'due', date: t.due!, sortKey: t.dueTime ?? '99:98', title: t.title, color: p?.color ?? 'var(--border-strong)',
        time: t.dueTime, meta: [t.estimate ? fmtMins(t.estimate) : '', t.priority === 'high' ? 'High priority' : ''].filter(Boolean), projectId: t.projectId, task: t });
    }
    if (inRange(t.plannedDate) && t.plannedDate !== t.due) {
      items.push({ key: `plan-${t.id}`, kind: 'planned', date: t.plannedDate!, sortKey: '99:99', title: t.title, color: p?.color ?? 'var(--border-strong)',
        meta: [t.due ? `due ${dayLabel(t.due)}` : '', t.estimate ? fmtMins(t.estimate) : ''].filter(Boolean), projectId: t.projectId, task: t });
    }
  }
  for (const e of plannerEvents) {
    if (e.done || !inRange(e.date)) continue;
    const p = projectOf(e.projectId);
    if (e.projectId && !projectInArea(p, areaFilter)) continue;
    items.push({ key: `ev-${e.id}`, kind: 'planner', date: e.date, sortKey: e.time ?? '99:99', title: e.title, color: p?.color ?? `var(--cat-${e.category})`,
      time: e.time, meta: [p?.name ?? e.category, e.estimate ? fmtMins(e.estimate) : ''].filter(Boolean), plannerId: e.id });
  }
  for (const a of plannerAppointments) {
    if (a.done || !inRange(a.date)) continue;
    items.push({ key: `ap-${a.id}`, kind: 'meeting', date: a.date, sortKey: a.time, title: a.title, color: 'var(--meeting)', time: a.time, meta: ['Planner meeting'], apptId: a.id });
  }
  const sourceById = new Map(calendarSources.map(c => [c.id, c]));
  const visibleCal = calendarEvents.filter(e => sourceById.get(e.sourceId)?.enabled);
  for (let i = 0; i < span; i++) {
    const iso = addDaysIso(today, i);
    for (const e of calendarEventsOn(visibleCal, iso)) {
      const src = sourceById.get(e.sourceId);
      // all-day events spanning several days show once, on their first visible day
      if (e.allDay && e.startDate && e.startDate < iso && iso !== today) continue;
      items.push({ key: `cal-${e.id}-${iso}`, kind: 'calendar', date: iso, sortKey: e.allDay ? '00:00' : localTimeOf(e.start), title: e.title,
        color: src?.color ?? 'var(--border-strong)', time: e.allDay ? undefined : localTimeOf(e.start), endTime: e.allDay ? undefined : localTimeOf(e.end),
        meta: [src?.name ?? 'Calendar', e.allDay ? 'All day' : ''].filter(Boolean), location: e.location });
    }
  }

  const overdue = liveTasks.filter(t => (t.due && t.due < today) || t.status === 'overdue')
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));

  const byDay = new Map<string, RailItem[]>();
  for (const it of items) (byDay.get(it.date) ?? byDay.set(it.date, []).get(it.date)!).push(it);
  const days = Array.from(byDay.keys()).sort();
  if (!days.includes(today)) days.unshift(today);
  const total = items.length;

  function toggle(it: RailItem) {
    if (it.task) toggleTaskDone(it.task.id);
    else if (it.plannerId) updatePlannerEvent(it.plannerId, { done: true });
    else if (it.apptId) updatePlannerAppointment(it.apptId, { done: true });
  }
  function open(it: RailItem) {
    if (it.task) setEditTask(it.task);
    else if (it.kind !== 'calendar') setView('planner');
  }

  const row = (it: RailItem, withDay = false) => {
    const p = projectOf(it.projectId);
    const d = withDay ? new Date(it.date + 'T00:00:00') : null;
    const readOnly = it.kind === 'calendar';
    return (
      <div key={it.key} className={`rail-item kind-${it.kind}`} style={{ borderLeftColor: it.color }}>
        {readOnly ? (
          <span className="today-cal-icon" style={{ color: it.color }} title="From a connected calendar (read-only)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
        ) : (
          <button type="button" className="section-task-check" title="Mark as done" aria-label={`Mark "${it.title}" as done`} onClick={() => toggle(it)} />
        )}
        {d ? (
          <span className={`rail-item-time rail-item-day${it.date === today ? ' is-today' : ''}`}>
            {it.date === today ? 'Today' : `${WEEKDAYS[d.getDay()]} ${d.getDate()}`}
            {it.time && <span>{fmt12hr(it.time)}</span>}
          </span>
        ) : it.time && (
          <span className="rail-item-time">{fmt12hr(it.time)}{it.endTime ? <span>{fmt12hr(it.endTime)}</span> : null}</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="rail-item-title" onClick={() => open(it)} title={readOnly ? it.title : 'Open'} style={readOnly ? { cursor: 'default' } : undefined}>{it.title}</div>
          <div className="rail-item-meta">
            <span className={`rail-kind rail-kind-${it.kind}`}>{KIND_LABEL[it.kind]}</span>
            {p && (
              <button type="button" className="rail-item-proj" onClick={() => setView('project', p.id)} title={`Open ${p.name}`}>
                <span className="today-dot" style={{ background: p.color }} />{p.name}
              </button>
            )}
            {it.meta.map(m => <span key={m} style={{ textTransform: it.kind === 'planner' ? 'capitalize' : undefined }}>· {m}</span>)}
            {(() => {
              const loc = parseLocation(it.location);
              if (!loc) return null;
              return loc.url
                ? <a className="rail-join" href={loc.url} target="_blank" rel="noopener noreferrer" title={it.location}>· {loc.label}</a>
                : <span title={it.location}>· {loc.label}</span>;
            })()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <div className="section-title" style={{ margin: 0 }}>
          <span>Coming up</span>
          <span className="badge badge-gray">{total}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="seg" role="group" aria-label="Group by">
            <button className={`seg-btn${mode === 'days' ? ' active' : ''}`} aria-pressed={mode === 'days'} onClick={() => remember({ mode: 'days' })}>Days</button>
            <button className={`seg-btn${mode === 'weeks' ? ' active' : ''}`} aria-pressed={mode === 'weeks'} onClick={() => remember({ mode: 'weeks' })}>Weeks</button>
          </div>
          <div className="seg" role="group" aria-label="How far ahead">
            {mode === 'days'
              ? RANGES.map(r => (
                <button key={r} className={`seg-btn${range === r ? ' active' : ''}`} onClick={() => remember({ range: r })}>{r} days</button>
              ))
              : WEEK_RANGES.map(w => (
                <button key={w} className={`seg-btn${weeks === w ? ' active' : ''}`} onClick={() => remember({ weeks: w })}>{w} weeks</button>
              ))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
        Deadlines, planned work, planner tasks, meetings and calendar events {mode === 'days' ? `for the next ${range} days` : `for the next ${weeks} weeks, week by week`}.
      </div>

      {overdue.length > 0 && (
        <div className="rail-overdue">
          <button type="button" className="rail-overdue-head" onClick={() => setShowOverdue(v => !v)} aria-expanded={showOverdue}>
            <span className="rail-overdue-dot" />
            <span>{overdue.length} overdue</span>
            <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· catch up on these first</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, marginLeft: 'auto', transform: showOverdue ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showOverdue && (
            <div className="rail-items" style={{ marginTop: 8 }}>
              {overdue.map(t => {
                const p = projectOf(t.projectId);
                return row({ key: `od-${t.id}`, kind: 'due', date: t.due ?? today, sortKey: '', title: t.title, color: p?.color ?? 'var(--border-strong)',
                  meta: [t.due ? `${relLabel(dayDiff(t.due, today))}` : 'overdue'], projectId: t.projectId, task: t });
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'weeks' ? (
      <div className="rail-up">
        {Array.from({ length: weeks }, (_, w) => addDaysIso(thisMonday, w * 7)).map((mon, w) => {
          const sun = addDaysIso(mon, 6);
          const list = items.filter(it => it.date >= mon && it.date <= sun)
            .sort((a, b) => (a.date === b.date ? a.sortKey.localeCompare(b.sortKey) : a.date.localeCompare(b.date)));
          const dueN = list.filter(it => it.kind === 'due').length;
          const meetN = list.filter(it => it.kind === 'meeting' || it.kind === 'calendar').length;
          const summary = [
            `${list.length} item${list.length !== 1 ? 's' : ''}`,
            dueN && `${dueN} due`,
            meetN && `${meetN} meeting${meetN !== 1 ? 's' : ''}`,
          ].filter(Boolean).join(' · ');
          return (
            <div key={mon} className={`rail-day rail-week${w === 0 ? ' is-today' : ''}`}>
              <span className="rail-node" aria-hidden />
              <div className="rail-date">
                <div className="rail-date-main">{weekRel(w)}</div>
                <div className="rail-date-rel">{weekSpan(mon)}</div>
                {list.length > 0 && <div className="rail-week-sum">{summary}</div>}
              </div>
              <div className="rail-items">
                {list.length === 0
                  ? <div className="rail-empty">Nothing scheduled this week yet.</div>
                  : list.map(it => row(it, true))}
              </div>
            </div>
          );
        })}
      </div>
      ) : (
      <div className="rail-up">
        {days.map(iso => {
          const n = dayDiff(iso, today);
          const list = (byDay.get(iso) ?? []).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
          return (
            <div key={iso} className={`rail-day${n === 0 ? ' is-today' : ''}`}>
              <span className="rail-node" aria-hidden />
              <div className="rail-date">
                <div className="rail-date-main">{n === 0 ? 'Today' : dayLabel(iso)}</div>
                <div className="rail-date-rel">{n === 0 ? dayLabel(iso) : relLabel(n)}</div>
              </div>
              <div className="rail-items">
                {list.length === 0
                  ? <div className="rail-empty">Nothing scheduled — a good day to plan ahead.</div>
                  : list.map(it => row(it))}
              </div>
            </div>
          );
        })}
        {total === 0 && (
          <div className="rail-empty" style={{ marginTop: 6 }}>Nothing in the next {range} days. Plan tasks from the Weekly Planner or give tasks a due date.</div>
        )}
      </div>
      )}

      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  );
}
