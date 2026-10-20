'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PlannerEvent, PlannerAppointment, Task, CalendarEvent } from '@/lib/types';
import TaskModal from '../modals/TaskModal';
import WeeklyReviewModal from '../modals/WeeklyReviewModal';
import { uid, fmtMins, fmtDate, projectInArea, calendarEventsOn, localTimeOf, parseLocation } from '@/lib/utils';
import { ESTIMATE_OPTIONS } from '@/lib/constants';
import CapacitySelect from '../ui/CapacitySelect';

// ── Week helpers ──────────────────────────────────────────────────────────────

function getWeekStart(offset: number): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const monOffset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + monOffset + offset * 7);
  return d;
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATEGORIES = ['personal', 'work', 'health', 'social', 'learning', 'errand', 'rest'];

// ── Sub-components ─────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" style={{ width: 9, height: 9 }}>
      <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Event Modal ───────────────────────────────────────────────────────────────

interface EventModalProps {
  presetDate?: string;
  event?: PlannerEvent;
  onClose: () => void;
}

// Same layout, order and buttons as the project task form (TaskModal), limited to the fields planner tasks store
function EventModal({ presetDate, event, onClose }: EventModalProps) {
  const { addPlannerEvent, updatePlannerEvent, deletePlannerEvent, projects, archivedProjectIds } = useAppStore();
  const projectOptions = projects.filter(p => !archivedProjectIds.includes(p.id) || p.id === event?.projectId);
  const [form, setForm] = useState({
    title:     event?.title ?? '',
    notes:     event?.notes ?? '',
    projectId: event?.projectId ?? '',
    category:  event?.category ?? 'personal',
    done:      event?.done ?? false,
    date:      event?.date ?? presetDate ?? '',
    time:      event?.time ?? '',
    estimate:  event?.estimate ? String(event.estimate) : '',
  });
  const selectedProject = projects.find(p => p.id === form.projectId);

  function setF<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm(f => ({ ...f, [k]: v })); }

  function save() {
    if (!form.title.trim() || !form.date) return;
    const data = {
      title:     form.title.trim(),
      notes:     form.notes,
      projectId: form.projectId || undefined,
      category:  form.category,
      done:      form.done,
      date:      form.date,
      time:      form.time || undefined,
      estimate:  form.estimate ? Number(form.estimate) : undefined,
    };
    if (event) updatePlannerEvent(event.id, data);
    else addPlannerEvent(data);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{event ? 'Edit Task' : 'New Task'}</div>

        <div className="form-group">
          <label>Title</label>
          <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Task title" autoFocus />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} placeholder="Optional details..." />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Project
              {selectedProject && <span style={{ width: 8, height: 8, borderRadius: '50%', background: selectedProject.color, display: 'inline-block' }} />}
            </label>
            <select value={form.projectId} onChange={e => setF('projectId', e.target.value)}>
              <option value="">No project</option>
              {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Category
              {!selectedProject && <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--cat-${form.category})`, display: 'inline-block' }} />}
            </label>
            <select value={form.category} onChange={e => setF('category', e.target.value)} title={selectedProject ? 'Colour comes from the project while one is selected' : undefined}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select value={form.done ? 'done' : 'todo'} onChange={e => setF('done', e.target.value === 'done')}>
              <option value="todo">To Do</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="form-group">
            <label>Time estimate</label>
            <select value={form.estimate} onChange={e => setF('estimate', e.target.value)}>
              <option value="">None</option>
              {ESTIMATE_OPTIONS.map(m => <option key={m} value={m}>{fmtMins(m)}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input type="time" value={form.time} onChange={e => setF('time', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          {event && (
            <button className="btn btn-danger" onClick={() => { deletePlannerEvent(event.id); onClose(); }} style={{ marginRight: 'auto' }}>
              Delete
            </button>
          )}
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!form.title.trim() || !form.date}>
            {event ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Appointment Modal ─────────────────────────────────────────────────────────

interface ApptModalProps {
  presetDate?: string;
  appt?: PlannerAppointment;
  onClose: () => void;
}

const ALERT_OPTIONS = [
  { label: 'No alert',      value: -1 },
  { label: 'At start time', value: 0 },
  { label: '5 min before',  value: 5 },
  { label: '10 min before', value: 10 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before',value: 120 },
  { label: '1 day before',  value: 1440 },
];

function ApptModal({ presetDate, appt, onClose }: ApptModalProps) {
  const { addPlannerAppointment, updatePlannerAppointment, deletePlannerAppointment } = useAppStore();
  const [title, setTitle] = useState(appt?.title ?? '');
  const [date, setDate] = useState(appt?.date ?? presetDate ?? '');
  const [time, setTime] = useState(appt?.time ?? '09:00');
  const [notes, setNotes] = useState(appt?.notes ?? '');
  const [alertMinutes, setAlertMinutes] = useState<number>(appt?.alertMinutes ?? -1);

  function handleSave() {
    if (!title.trim() || !date || !time) return;
    const alertVal = alertMinutes >= 0 ? alertMinutes : undefined;
    if (appt) {
      updatePlannerAppointment(appt.id, { title: title.trim(), date, time, notes, alertMinutes: alertVal });
    } else {
      addPlannerAppointment({ title: title.trim(), date, time, notes, done: false, alertMinutes: alertVal });
    }
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-title">{appt ? 'Edit Meeting' : 'New Meeting'}</div>
        <div className="form-group">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title..." autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Alert</label>
            <select value={alertMinutes} onChange={e => setAlertMinutes(Number(e.target.value))}>
              {ALERT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
        </div>
        <div className="modal-footer">
          {appt && (
            <button className="btn btn-danger btn-sm" onClick={() => { deletePlannerAppointment(appt.id); onClose(); }} style={{ marginRight: 'auto' }}>
              Delete
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!title.trim() || !date || !time}>
            {appt ? 'Save' : 'Add Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WeeklyPlanner() {
  const {
    todos, addTodo, updateTodo, toggleTodo, deleteTodo,
    plannerEvents, updatePlannerEvent,
    plannerAppointments,
    projects,
    tasks, updateTask, toggleTaskDone, archivedTaskIds, archivedProjectIds, areaFilter,
    dailyCapacity,
    calendarSources, calendarEvents, ensureCalendarRange, setCalendarsOpen,
    plannerWeekly, updatePlannerWeekly,
    plannerWeekOffset, setPlannerWeekOffset,
    plannerModalTrigger, setPlannerModalTrigger,
    sidebarOpen,
  } = useAppStore();

  const [layout, setLayoutState] = useState<'journal' | 'blocks' | 'agenda'>('journal');
  useEffect(() => {
    try {
      const v = localStorage.getItem('pm_oyint_planner_layout');
      if (v === 'journal' || v === 'blocks' || v === 'agenda') setLayoutState(v);
    } catch {}
  }, []);
  function setLayout(v: 'journal' | 'blocks' | 'agenda') {
    setLayoutState(v);
    try { localStorage.setItem('pm_oyint_planner_layout', v); } catch {}
  }

  // Modal state
  const [newEventModal, setNewEventModal] = useState<{ open: boolean; presetDate?: string }>({ open: false });
  const [editEventModal, setEditEventModal] = useState<{ open: boolean; event?: PlannerEvent }>({ open: false });
  const [newApptModal, setNewApptModal] = useState<{ open: boolean; presetDate?: string }>({ open: false });
  const [editApptModal, setEditApptModal] = useState<{ open: boolean; appt?: PlannerAppointment }>({ open: false });

  // Watch store trigger from Topbar buttons
  useEffect(() => {
    if (plannerModalTrigger === 'task') {
      setNewEventModal({ open: true });
      setPlannerModalTrigger(null);
    } else if (plannerModalTrigger === 'appt') {
      setNewApptModal({ open: true });
      setPlannerModalTrigger(null);
    }
  }, [plannerModalTrigger]);

  // Todo input
  const [todoInput, setTodoInput] = useState('');
  const todoRef = useRef<HTMLInputElement>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  function startEditTodo(id: string, text: string) {
    setEditingTodoId(id);
    setEditingTodoText(text);
  }
  function saveEditTodo() {
    if (editingTodoId && editingTodoText.trim()) updateTodo(editingTodoId, editingTodoText.trim());
    setEditingTodoId(null);
    setEditingTodoText('');
  }
  function cancelEditTodo() { setEditingTodoId(null); setEditingTodoText(''); }

  // Goal input
  const [goalInput, setGoalInput] = useState('');
  const [goalInputVisible, setGoalInputVisible] = useState(false);

  // Focus items input
  const [focusInput, setFocusInput] = useState('');

  // Week data
  const weekStart = getWeekStart(plannerWeekOffset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekKey = isoOf(weekStart);
  const weekData = plannerWeekly[weekKey] ?? { goals: [], notes: '', focus: '' };

  const todayIso = isoOf(new Date());

  const weekEndDate = days[6];
  const weekLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekStart.getMonth() !== weekEndDate.getMonth() ? MONTH_NAMES[weekEndDate.getMonth()] + ' ' : ''}${weekEndDate.getDate()}, ${weekEndDate.getFullYear()}`;

  function handleAddTodo() {
    if (!todoInput.trim()) return;
    addTodo(todoInput.trim());
    setTodoInput('');
  }

  function handleAddGoal() {
    if (!goalInput.trim()) return;
    const newGoal = { id: uid(), text: goalInput.trim(), done: false };
    updatePlannerWeekly(weekKey, { goals: [...weekData.goals, newGoal] });
    setGoalInput('');
    setGoalInputVisible(false);
  }

  function deleteGoal(id: string) {
    updatePlannerWeekly(weekKey, { goals: weekData.goals.filter(g => g.id !== id) });
  }

  function handleAddFocusItem() {
    if (!focusInput.trim()) return;
    const existing = weekData.focusItems ?? [];
    updatePlannerWeekly(weekKey, {
      focusItems: [...existing, { id: uid(), text: focusInput.trim() }],
    });
    setFocusInput('');
  }

  function toggleGoal(id: string) {
    updatePlannerWeekly(weekKey, {
      goals: weekData.goals.map(g => g.id === id ? { ...g, done: !g.done } : g),
    });
  }

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  const openTodos = todos.filter(t => !t.done).length;

  const projectById = new Map(projects.map(p => [p.id, p]));
  const projectOf = (id?: string) => (id ? projectById.get(id) : undefined);

  // ── Project tasks scheduled onto planner days ──
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Meetings in the week grid: each day collapses to a count on its own (all collapsed by default)
  const [openMeetingDays, setOpenMeetingDays] = useState<Set<string>>(new Set());
  function toggleMeetings(iso: string) {
    setOpenMeetingDays(prev => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso); else next.add(iso);
      return next;
    });
  }
  const [trayOpen, setTrayOpen] = useState(true);
  const [trayProject, setTrayProject] = useState('');
  const [trayShowAll, setTrayShowAll] = useState(false);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const weekIsos = days.map(isoOf);

  // Subscribed calendars → shown in each day's Meetings and in the agenda
  useEffect(() => { ensureCalendarRange(weekIsos[0], weekIsos[6]); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekIsos[0], calendarSources, ensureCalendarRange]);
  const sourceById = new Map(calendarSources.map(c => [c.id, c]));
  const visibleCalEvents = calendarEvents.filter(e => sourceById.get(e.sourceId)?.enabled);
  const calOn = (iso: string) => calendarEventsOn(visibleCalEvents, iso);
  const calTitle = (e: CalendarEvent) => {
    const src = sourceById.get(e.sourceId);
    const when = e.allDay ? 'All day' : `${fmt12(localTimeOf(e.start))}–${fmt12(localTimeOf(e.end))}`;
    return [e.title, when, parseLocation(e.location)?.label, src ? `${src.name} calendar · read-only` : ''].filter(Boolean).join('\n');
  };
  const liveTasks = tasks.filter(t =>
    !archivedTaskIds.includes(t.id) && !archivedProjectIds.includes(t.projectId));
  // Index planned tasks by day once per render instead of rescanning all tasks per day
  const plannedByDay = new Map<string, Task[]>();
  for (const t of liveTasks) {
    if (!t.plannedDate) continue;
    const list = plannedByDay.get(t.plannedDate);
    if (list) list.push(t); else plannedByDay.set(t.plannedDate, [t]);
  }
  const plannedTasksOn = (iso: string) => plannedByDay.get(iso) ?? [];

  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const trayTasks = liveTasks
    .filter(t => t.status !== 'done' && !(t.plannedDate && t.plannedDate >= weekIsos[0]))
    .filter(t => projectInArea(projectOf(t.projectId), areaFilter))
    .filter(t => !trayProject || t.projectId === trayProject)
    .sort((a, b) => {
      if ((a.status === 'overdue') !== (b.status === 'overdue')) return a.status === 'overdue' ? -1 : 1;
      if (a.due && b.due && a.due !== b.due) return a.due.localeCompare(b.due);
      if (!!a.due !== !!b.due) return a.due ? -1 : 1;
      return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
    });
  const trayVisible = trayShowAll ? trayTasks : trayTasks.slice(0, 8);
  const trayProjects = projects.filter(p => !archivedProjectIds.includes(p.id) && projectInArea(p, areaFilter));

  // Planned minutes still to do on a day (planner tasks + planned project tasks)
  function dayLoad(iso: string) {
    const ev = plannerEvents.filter(e => e.date === iso && !e.done).reduce((n, e) => n + (e.estimate ?? 0), 0);
    const tk = plannedTasksOn(iso).filter(t => t.status !== 'done').reduce((n, t) => n + (t.estimate ?? 0), 0);
    return ev + tk;
  }

  // Drag & drop: project tasks and planner tasks onto days, or back onto the tray
  function startDrag(e: React.DragEvent, kind: 'task' | 'event', id: string) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ kind, id }));
    e.dataTransfer.effectAllowed = 'move';
  }
  function readDrag(e: React.DragEvent): { kind: 'task' | 'event'; id: string } | null {
    try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return null; }
  }
  function dropOnDay(e: React.DragEvent, iso: string) {
    e.preventDefault();
    setDragOverDay(null);
    const d = readDrag(e);
    if (!d) return;
    if (d.kind === 'task') updateTask(d.id, { plannedDate: iso });
    else updatePlannerEvent(d.id, { date: iso });
  }
  function dropOnTray(e: React.DragEvent) {
    e.preventDefault();
    setDragOverDay(null);
    const d = readDrag(e);
    if (d?.kind === 'task') updateTask(d.id, { plannedDate: undefined });
  }


  // ── Time blocks: an hourly calendar for the week (toggle in the toolbar) ──
  const [blocksWeekdays, setBlocksWeekdays] = useState(false);
  function renderBlocks() {
    type Blk = { key: string; start: number; end: number; title: string; sub?: string; color: string; bg: string; onClick?: () => void; tip: string; done?: boolean };
    const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + (m || 0); };
    const dayIdx = blocksWeekdays ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6];
    const perDay = dayIdx.map(i => {
      const iso = isoOf(days[i]);
      const timed: Blk[] = [];
      const anytime: { key: string; title: string; color: string; onClick?: () => void; done?: boolean }[] = [];
      for (const e of calOn(iso)) {
        const src = sourceById.get(e.sourceId);
        if (e.allDay) { anytime.push({ key: e.id, title: e.title, color: src?.color ?? 'var(--border-strong)' }); continue; }
        const st = toMin(localTimeOf(e.start));
        const endSameDay = isoOf(new Date(e.end)) === iso;
        const en = endSameDay ? toMin(localTimeOf(e.end)) : 24 * 60;
        timed.push({ key: e.id, start: st, end: Math.max(en, st + 20), title: e.title, sub: src?.name, color: src?.color ?? 'var(--border-strong)',
          bg: `color-mix(in srgb, ${src?.color ?? 'var(--border-strong)'} 22%, var(--surface))`, tip: calTitle(e) });
      }
      for (const a of plannerAppointments.filter(x => x.date === iso)) {
        const st = toMin(a.time);
        timed.push({ key: a.id, start: st, end: st + 30, title: a.title, sub: 'Meeting', color: 'var(--meeting)', bg: 'var(--meeting-bg-hover)',
          onClick: () => setEditApptModal({ open: true, appt: a }), tip: `${a.title} · ${fmt12(a.time)}`, done: a.done });
      }
      for (const ev of plannerEvents.filter(x => x.date === iso)) {
        const p = projectOf(ev.projectId);
        const color = p?.color ?? `var(--cat-${ev.category})`;
        if (ev.time) {
          const st = toMin(ev.time);
          timed.push({ key: ev.id, start: st, end: st + Math.max(ev.estimate ?? 30, 20), title: ev.title, sub: p?.name ?? ev.category, color,
            bg: `color-mix(in srgb, ${color} 18%, var(--surface))`, onClick: () => setEditEventModal({ open: true, event: ev }), tip: ev.title, done: ev.done });
        } else {
          anytime.push({ key: ev.id, title: ev.title, color, onClick: () => setEditEventModal({ open: true, event: ev }), done: ev.done });
        }
      }
      for (const t of plannedTasksOn(iso)) {
        anytime.push({ key: t.id, title: t.title, color: projectOf(t.projectId)?.color ?? 'var(--border-strong)', onClick: () => setEditTask(t), done: t.status === 'done' });
      }
      // side-by-side columns for overlapping blocks
      timed.sort((a, b) => a.start - b.start || b.end - a.end);
      const placed: (Blk & { col: number; cols: number })[] = [];
      let cluster: (Blk & { col: number; cols: number })[] = [];
      let clusterEnd = -1;
      const flush = () => { const n = Math.max(1, ...cluster.map(c => c.col + 1)); cluster.forEach(c => { c.cols = n; }); placed.push(...cluster); cluster = []; };
      for (const b of timed) {
        if (b.start >= clusterEnd && cluster.length) flush();
        const used = new Set(cluster.filter(c => c.end > b.start).map(c => c.col));
        let col = 0; while (used.has(col)) col++;
        cluster.push({ ...b, col, cols: 1 });
        clusterEnd = Math.max(clusterEnd, b.end);
      }
      if (cluster.length) flush();
      return { i, iso, placed, anytime };
    });
    const allTimed = perDay.flatMap(d => d.placed);
    const startH = Math.max(6, Math.min(8, ...allTimed.map(b => Math.floor(b.start / 60))));
    const endH = Math.min(24, Math.max(18, ...allTimed.map(b => Math.ceil(b.end / 60))));
    const PX = 44;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const cols = `48px repeat(${dayIdx.length}, minmax(96px, 1fr))`;

    return (
      <div className="card tblocks-card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <label className="quickadd-check">
            <input type="checkbox" checked={blocksWeekdays} onChange={e => setBlocksWeekdays(e.target.checked)} />
            Weekdays only
          </label>
        </div>
        <div className="tblocks" style={{ gridTemplateColumns: cols }}>
          <div className="tb-corner" />
          {perDay.map(d => (
            <div key={d.iso} className={`tb-dayhead${d.iso === todayIso ? ' today' : ''}`}>
              <span>{DAY_NAMES[d.i]}</span> <b>{days[d.i].getDate()}</b>
            </div>
          ))}
          <div className="tb-anylabel">Any&shy;time</div>
          {perDay.map(d => (
            <div key={d.iso} className="tb-any" onDragOver={e => e.preventDefault()} onDrop={e => dropOnDay(e, d.iso)}>
              {d.anytime.map(a => (
                <div key={a.key} className={`tb-chip${a.done ? ' done' : ''}`} style={{ borderLeftColor: a.color }} onClick={a.onClick} title={a.title}>{a.title}</div>
              ))}
            </div>
          ))}
          <div className="tb-hours" style={{ height: (endH - startH) * PX }}>
            {Array.from({ length: endH - startH }, (_, k) => (
              <span key={k} style={{ top: k * PX }}>{fmt12(`${String(startH + k).padStart(2, '0')}:00`).replace(':00', '')}</span>
            ))}
          </div>
          {perDay.map(d => (
            <div key={d.iso} className={`tb-col${d.iso === todayIso ? ' today' : ''}`} style={{ height: (endH - startH) * PX, backgroundSize: `100% ${PX}px` }}>
              {d.iso === todayIso && nowMin >= startH * 60 && nowMin <= endH * 60 && (
                <div className="tb-now" style={{ top: ((nowMin - startH * 60) / 60) * PX }} />
              )}
              {d.placed.map(b => (
                <div
                  key={b.key}
                  className={`tb-blk${b.onClick ? ' clickable' : ''}${b.done ? ' done' : ''}`}
                  title={b.tip}
                  onClick={b.onClick}
                  style={{
                    top: ((b.start - startH * 60) / 60) * PX + 1,
                    height: Math.max(((b.end - b.start) / 60) * PX - 2, 18),
                    left: `calc(${(100 / b.cols) * b.col}% + 2px)`,
                    width: `calc(${100 / b.cols}% - 4px)`,
                    background: b.bg, borderLeftColor: b.color,
                  }}
                >
                  <b>{fmt12(`${String(Math.floor(b.start / 60)).padStart(2, '0')}:${String(b.start % 60).padStart(2, '0')}`)}</b> {b.title}
                  {b.sub && (b.end - b.start) >= 45 && <div className="tb-blk-sub">{b.sub}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar — 3-column grid: empty | centered nav | seg control */}
      <div className="planner-toolbar" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        {/* Left: weekly review */}
        <div style={{ justifySelf: 'start' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setReviewOpen(true)} title="Review what got done and carry unfinished work forward">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            <span className="btn-label">Weekly review</span>
          </button>
          <button className="btn btn-outline btn-sm" style={{ marginLeft: 6 }} onClick={() => setCalendarsOpen(true)} title="Connect or manage calendars">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="btn-label">Calendars{calendarSources.length ? ` · ${calendarSources.filter(c => c.enabled).length}` : ''}</span>
          </button>
        </div>

        {/* Center: week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'center' }}>
          <button className="pweek-btn" onClick={() => setPlannerWeekOffset(plannerWeekOffset - 1)} title="Previous week">&#8249;</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 15, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {plannerWeekOffset === 0 ? 'This week' : plannerWeekOffset === 1 ? 'Next week' : plannerWeekOffset === -1 ? 'Last week' : weekLabel}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{weekLabel}</div>
          </div>
          <button className="pweek-btn" onClick={() => setPlannerWeekOffset(plannerWeekOffset + 1)} title="Next week">&#8250;</button>
          {plannerWeekOffset !== 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setPlannerWeekOffset(0)} style={{ fontSize: 12 }}>Today</button>
          )}
        </div>

        {/* Right: segmented view control */}
        <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'end', gap: 10 }}>
          <CapacitySelect />
          <div className="seg">
            <button className={`seg-btn${layout === 'journal' ? ' active' : ''}`} onClick={() => setLayout('journal')}>Journal</button>
            <button className={`seg-btn${layout === 'blocks' ? ' active' : ''}`} onClick={() => setLayout('blocks')}>Time blocks</button>
            <button className={`seg-btn${layout === 'agenda' ? ' active' : ''}`} onClick={() => setLayout('agenda')}>Agenda</button>
          </div>
        </div>
      </div>

      {/* Shell */}
      <div className="planner-shell">
        {/* Sidebar */}
        <div className="planner-side">

          {/* To-Do List */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                To-Do List
                {todos.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {openTodos} open &middot; {todos.length} total
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Quick captures — check off as you go.</div>
            <div className="todo-list">
              {sortedTodos.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '8px 4px' }}>No to-dos yet.</div>
              )}
              {sortedTodos.map(t => (
                <div key={t.id} className={`todo-item${t.done ? ' done' : ''}`}>
                  <span className={`todo-check${t.done ? ' checked' : ''}`} onClick={() => toggleTodo(t.id)}>
                    {t.done && <CheckIcon />}
                  </span>
                  {editingTodoId === t.id ? (
                    <input
                      className="todo-edit-input"
                      autoFocus
                      value={editingTodoText}
                      onChange={e => setEditingTodoText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditTodo(); if (e.key === 'Escape') cancelEditTodo(); }}
                      onBlur={saveEditTodo}
                    />
                  ) : (
                    <span className="todo-text" onClick={() => startEditTodo(t.id, t.text)}>{t.text}</span>
                  )}
                  <button className="todo-del" onClick={() => deleteTodo(t.id)} title="Delete">&#215;</button>
                </div>
              ))}
            </div>
            <div className="todo-input-row">
              <input
                ref={todoRef}
                value={todoInput}
                onChange={e => setTodoInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTodo(); }}
                placeholder="Add a to-do..."
              />
              <button onClick={handleAddTodo}>Add</button>
            </div>
          </div>

          {/* Due this week */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Due this week</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Where will most of your energy go this week?</div>
            <div className="todo-list">
              {(weekData.focusItems ?? []).length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '4px 4px 8px' }}>Nothing added yet.</div>
              )}
              {(weekData.focusItems ?? []).map(item => (
                <div key={item.id} className="todo-item">
                  <span className="todo-text" style={{ cursor: 'default' }}>{item.text}</span>
                  <button
                    className="todo-del"
                    title="Remove"
                    onClick={() => updatePlannerWeekly(weekKey, {
                      focusItems: (weekData.focusItems ?? []).filter(f => f.id !== item.id),
                    })}
                  >&#215;</button>
                </div>
              ))}
            </div>
            <div className="todo-input-row">
              <input
                value={focusInput}
                onChange={e => setFocusInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFocusItem(); }}
                placeholder="e.g. brand launch, deep work…"
              />
              <button onClick={handleAddFocusItem}>Add</button>
            </div>
          </div>

          {/* Reflection */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Reflection</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Notes, wins, or lessons from this week.</div>
            <textarea
              value={weekData.notes}
              onChange={e => updatePlannerWeekly(weekKey, { notes: e.target.value })}
              placeholder="How did the week go?..."
              style={{ minHeight: 100 }}
            />
          </div>
        </div>

        {/* Main */}
        <div className="planner-main">

          {/* Priorities card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Priorities</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Top tasks for this week</span>
            </div>
            {weekData.goals.length === 0 && !goalInputVisible && (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '12px 6px', textAlign: 'center', fontStyle: 'italic' }}>
                Set 1–3 intentions for the week.
              </div>
            )}
            {weekData.goals.map(g => (
              <div key={g.id} className={`pgoal${g.done ? ' done' : ''}`}>
                <span className={`pgoal-check${g.done ? ' checked' : ''}`} onClick={() => toggleGoal(g.id)}>
                  {g.done && <CheckIcon />}
                </span>
                <span className="pgoal-text">{g.text}</span>
                <button className="pgoal-del" onClick={() => deleteGoal(g.id)} title="Remove">×</button>
              </div>
            ))}
            {goalInputVisible && (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  autoFocus
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { handleAddGoal(); }
                    if (e.key === 'Escape') { setGoalInputVisible(false); setGoalInput(''); }
                  }}
                  placeholder="e.g. finish brand deck, ship v2…"
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddGoal}>Add</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setGoalInputVisible(false); setGoalInput(''); }}>✕</button>
              </div>
            )}
            {!goalInputVisible && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => setGoalInputVisible(true)}>
                + Add priority
              </button>
            )}
          </div>

          {/* Project tasks tray */}
          <div
            className={`card ptray${dragOverDay === '__tray__' ? ' drop-over' : ''}`}
            style={{ marginBottom: 16 }}
            onDragOver={e => { e.preventDefault(); setDragOverDay('__tray__'); }}
            onDragLeave={() => setDragOverDay(d => (d === '__tray__' ? null : d))}
            onDrop={dropOnTray}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <button className="ptray-toggle" onClick={() => setTrayOpen(o => !o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12, transform: trayOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Project tasks to plan</span>
                <span className="badge badge-gray">{trayTasks.length}</span>
              </button>
              {trayOpen && (
                <select value={trayProject} onChange={e => setTrayProject(e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
                  <option value="">All projects</option>
                  {trayProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
            {trayOpen && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 10px' }}>
                  Drag a task onto a day, or pick a day. Drag a planned task back here to unplan it.
                </div>
                {trayTasks.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '4px 2px' }}>Every open task is already planned for this week or later.</div>
                )}
                <div className="ptray-list">
                  {trayVisible.map(t => {
                    const proj = projectOf(t.projectId);
                    return (
                      <div key={t.id} className="ptray-item" draggable onDragStart={e => startDrag(e, 'task', t.id)}>
                        <span className="ptray-grip" aria-hidden>⠿</span>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: proj?.color ?? 'var(--border-strong)', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ptray-title" onClick={() => setEditTask(t)}>{t.title}</div>
                          <div className="ptray-meta">
                            {proj?.name}
                            {t.due && <span style={{ color: t.status === 'overdue' ? 'var(--danger)' : undefined }}> · due {fmtDate(t.due).replace(/ \d{4}$/, '')}</span>}
                            {t.estimate ? ` · ${fmtMins(t.estimate)}` : ''}
                          </div>
                        </div>
                        <select
                          className="ptray-plan"
                          value=""
                          onChange={e => { if (e.target.value) updateTask(t.id, { plannedDate: e.target.value }); }}
                          title="Plan for a day this week"
                        >
                          <option value="">Plan…</option>
                          {days.map((d, i) => <option key={i} value={isoOf(d)}>{DAY_NAMES[i]} {d.getDate()}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
                {trayTasks.length > 8 && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, marginTop: 6 }} onClick={() => setTrayShowAll(v => !v)}>
                    {trayShowAll ? 'Show fewer' : `Show all ${trayTasks.length}`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Journal spread: Mon–Wed on the left page, Thu–Sun on the right */}
          {layout === 'journal' && (
            <div className="jspread">
              {[[0, 1, 2], [3, 4, 5, 6]].map((page, pi) => (
              <div key={pi} className={`jpage jpage-${pi === 0 ? 'left' : 'right'}`}>
                {page.map(i => {
                  const day = days[i];
                  const iso = isoOf(day);
                  const isToday = iso === todayIso;
                  const isWeekend = i >= 5;
                  const dayAppts = plannerAppointments
                    .filter(a => a.date === iso)
                    .sort((a, b) => a.time.localeCompare(b.time));
                  const dayEvents = plannerEvents
                    .filter(e => e.date === iso)
                    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

                  return (
                    <div
                      key={iso}
                      className={`pday${isToday ? ' today' : ''}${isWeekend ? ' weekend' : ''}${dragOverDay === iso ? ' drop-over' : ''}`}
                      onDragOver={e => { e.preventDefault(); if (dragOverDay !== iso) setDragOverDay(iso); }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDay(d => (d === iso ? null : d)); }}
                      onDrop={e => dropOnDay(e, iso)}
                    >
                      <div className="pday-head">
                        <span className="pday-name">{FULL_DAY_NAMES[i]}</span>
                        <span className="pday-num">{MONTH_NAMES[day.getMonth()]} {day.getDate()}</span>
                        {isToday && <span className="pday-today-pill">Today</span>}
                        {(() => {
                          const all = [...plannedTasksOn(iso).map(t => t.status === 'done'), ...dayEvents.map(e => e.done)];
                          return all.length ? <span className="pday-count">{all.filter(Boolean).length}/{all.length}</span> : null;
                        })()}
                      </div>
                      {(() => {
                        const load = dayLoad(iso);
                        if (!load) return null;
                        const over = load > dailyCapacity;
                        return (
                          <div className={`pday-load${over ? ' over' : ''}`} title={over ? `Overbooked — more than ${fmtMins(dailyCapacity)} planned` : `${fmtMins(load)} planned`}>
                            <div className="pday-load-bar"><div style={{ width: `${Math.min(100, (load / dailyCapacity) * 100)}%` }} /></div>
                            <span>{fmtMins(load)}</span>
                          </div>
                        );
                      })()}

                      {/* Appointments */}
                      <div className={`pday-appts${openMeetingDays.has(iso) ? '' : ' collapsed'}`}>
                        <button
                          type="button"
                          className="pday-appts-label"
                          onClick={() => toggleMeetings(iso)}
                          aria-expanded={openMeetingDays.has(iso)}
                          title={openMeetingDays.has(iso) ? 'Hide this day’s meetings' : 'Show this day’s meetings'}
                        >
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 10, height: 10 }}><rect x="1" y="2" width="14" height="13" rx="2"/><line x1="1" y1="6" x2="15" y2="6"/><line x1="5" y1="1" x2="5" y2="4"/><line x1="11" y1="1" x2="11" y2="4"/></svg>
                          Meetings
                          {(dayAppts.length + calOn(iso).length) > 0 && (
                            <span className="pday-appts-count">{dayAppts.length + calOn(iso).length}</span>
                          )}
                          <svg className="pday-appts-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10, marginLeft: 'auto' }}><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        {openMeetingDays.has(iso) && <>
                        {dayAppts.length === 0 && calOn(iso).length === 0 && (
                          <div className="pday-empty">No meetings</div>
                        )}
                        {calOn(iso).map(e => (
                          <div key={e.id} className="pappt pappt-cal" title={calTitle(e)} style={{ borderLeftColor: sourceById.get(e.sourceId)?.color }}>
                            <span className="pappt-time">{e.allDay ? 'All day' : fmt12(localTimeOf(e.start))}</span>
                            <span className="pappt-title">{e.title}</span>
                          </div>
                        ))}
                        {dayAppts.map(a => (
                          <div key={a.id} className="pappt" onClick={() => setEditApptModal({ open: true, appt: a })}>
                            <span className="pappt-time">{fmt12(a.time)}</span>
                            <span className="pappt-title">{a.title}</span>
                          </div>
                        ))}
                        <div className="pday-add-appt" onClick={() => setNewApptModal({ open: true, presetDate: iso })}>
                          + meeting
                        </div>
                        </>}
                      </div>

                      {/* Tasks */}
                      <div className="pday-events">
                        {dayEvents.length === 0 && plannedTasksOn(iso).length === 0 && (
                          <div className="pday-empty">No tasks</div>
                        )}
                        {plannedTasksOn(iso).map(t => {
                          const proj = projectOf(t.projectId);
                          const tDone = t.status === 'done';
                          return (
                            <div
                              key={t.id}
                              className={`pevent pevent-ptask${tDone ? ' done' : ''}`}
                              style={{ borderLeftColor: proj?.color }}
                              draggable
                              onDragStart={e => startDrag(e, 'task', t.id)}
                              onClick={() => setEditTask(t)}
                              title="Project task — drag to another day"
                            >
                              <button
                                type="button"
                                className={`pevent-check${tDone ? ' checked' : ''}`}
                                aria-label={tDone ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`}
                                onMouseDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); e.preventDefault(); toggleTaskDone(t.id); }}
                              >
                                {tDone && (
                                  <svg viewBox="0 0 12 12" fill="none" style={{ width: 5, height: 5 }}>
                                    <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </button>
                              <div className="pevent-title">{t.title}</div>
                              {proj && (
                                <div className="pevent-proj" title={proj.name}>
                                  <span className="pevent-proj-dot" style={{ background: proj.color }} />
                                  <span className="pevent-proj-name">{proj.name}{t.estimate ? ` · ${fmtMins(t.estimate)}` : ''}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {dayEvents.map(ev => (
                          <div
                            key={ev.id}
                            className={`pevent cat-${ev.category}${ev.done ? ' done' : ''}`}
                            style={projectOf(ev.projectId) ? { borderLeftColor: projectOf(ev.projectId)!.color } : undefined}
                            draggable
                            onDragStart={e => startDrag(e, 'event', ev.id)}
                            onClick={() => setEditEventModal({ open: true, event: ev })}
                          >
                            <button
                              type="button"
                              className={`pevent-check${ev.done ? ' checked' : ''}`}
                              aria-label={ev.done ? `Mark "${ev.title}" as not done` : `Mark "${ev.title}" as done`}
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); e.preventDefault(); updatePlannerEvent(ev.id, { done: !ev.done }); }}
                            >
                              {ev.done && (
                                <svg viewBox="0 0 12 12" fill="none" style={{ width: 5, height: 5 }}>
                                  <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                            <div className="pevent-title">{ev.title}</div>
                            {projectOf(ev.projectId) && (
                              <div className="pevent-proj" title={projectOf(ev.projectId)!.name}>
                                <span className="pevent-proj-dot" style={{ background: projectOf(ev.projectId)!.color }} />
                                <span className="pevent-proj-name">{projectOf(ev.projectId)!.name}{ev.estimate ? ` · ${fmtMins(ev.estimate)}` : ''}</span>
                              </div>
                            )}
                            {!projectOf(ev.projectId) && !!ev.estimate && (
                              <div className="pevent-proj"><span className="pevent-proj-name">{fmtMins(ev.estimate)}</span></div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pday-add" onClick={() => setNewEventModal({ open: true, presetDate: iso })}>
                        + Add task
                      </div>
                    </div>
                  );
                })}
              </div>
              ))}
            </div>
          )}

          {layout === 'blocks' && renderBlocks()}

          {/* Agenda */}
          {layout === 'agenda' && (
            <div className="card">
              {days.map((day, i) => {
                const iso = isoOf(day);
                const isToday = iso === todayIso;
                const dayAppts = plannerAppointments
                  .filter(a => a.date === iso)
                  .sort((a, b) => a.time.localeCompare(b.time));
                const dayEvents = plannerEvents
                  .filter(e => e.date === iso)
                  .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
                const allItems = [
                  ...dayAppts.map(a => ({ type: 'appt' as const, item: a as PlannerAppointment | PlannerEvent | Task | CalendarEvent, sortKey: a.time })),
                  ...dayEvents.map(e => ({ type: 'event' as const, item: e as PlannerAppointment | PlannerEvent | Task | CalendarEvent, sortKey: e.time ?? '23:59' })),
                  ...plannedTasksOn(iso).map(t => ({ type: 'task' as const, item: t as PlannerAppointment | PlannerEvent | Task | CalendarEvent, sortKey: t.dueTime ?? '23:59' })),
                  ...calOn(iso).map(e => ({ type: 'cal' as const, item: e as PlannerAppointment | PlannerEvent | Task | CalendarEvent, sortKey: e.allDay ? '00:00' : localTimeOf(e.start) })),
                ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

                return (
                  <div key={iso} className={`pagenda-day${isToday ? ' today' : ''}`}>
                    <div className="pagenda-day-head">
                      <span>
                        {DAY_NAMES[i]}, {MONTH_NAMES[day.getMonth()]} {day.getDate()}
                        {isToday && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 999 }}>Today</span>}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setNewEventModal({ open: true, presetDate: iso })}>+ Task</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setNewApptModal({ open: true, presetDate: iso })}>+ Meeting</button>
                      </div>
                    </div>
                    {allItems.length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '4px 0' }}>Nothing scheduled</div>
                    )}
                    {allItems.map(({ type, item }) => {
                      if (type === 'appt') {
                        const a = item as PlannerAppointment;
                        return (
                          <div key={a.id} className="pagenda-event cat-social" onClick={() => setEditApptModal({ open: true, appt: a })}>
                            <div className="pagenda-time">{fmt12(a.time)}</div>
                            <div className="pagenda-body">
                              <div className="pagenda-title">{a.title}</div>
                              {a.notes && <div className="pagenda-meta">{a.notes}</div>}
                            </div>
                            <span className="pagenda-cat">Meeting</span>
                          </div>
                        );
                      } else if (type === 'cal') {
                        const ce = item as CalendarEvent;
                        const src = sourceById.get(ce.sourceId);
                        return (
                          <div key={ce.id} className="pagenda-event pagenda-cal" style={{ borderLeftColor: src?.color }} title={calTitle(ce)}>
                            <div className="pagenda-time">{ce.allDay ? 'All day' : fmt12(localTimeOf(ce.start))}</div>
                            <div className="pagenda-body">
                              <div className="pagenda-title">{ce.title}</div>
                              <div className="pagenda-meta">
                                {ce.allDay ? '' : `${fmt12(localTimeOf(ce.start))}–${fmt12(localTimeOf(ce.end))}`}{parseLocation(ce.location) ? `${ce.allDay ? '' : ' · '}${parseLocation(ce.location)!.label}` : ''}
                              </div>
                            </div>
                            <span className="pagenda-cat">{src?.name ?? 'Calendar'}</span>
                          </div>
                        );
                      } else if (type === 'task') {
                        const t = item as Task;
                        const proj = projectOf(t.projectId);
                        return (
                          <div key={t.id} className="pagenda-event" style={{ borderLeftColor: proj?.color }} onClick={() => setEditTask(t)}>
                            <div className="pagenda-time">{t.dueTime ? fmt12(t.dueTime) : '—'}</div>
                            <div className="pagenda-body">
                              <div className="pagenda-title" style={t.status === 'done' ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>{t.title}</div>
                              {proj && (
                                <div className="pagenda-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />
                                  {proj.name}{t.estimate ? ` · ${fmtMins(t.estimate)}` : ''}
                                </div>
                              )}
                            </div>
                            <span className="pagenda-cat">Project</span>
                          </div>
                        );
                      } else {
                        const e = item as PlannerEvent;
                        return (
                          <div
                            key={e.id}
                            className={`pagenda-event cat-${e.category}`}
                            style={projectOf(e.projectId) ? { borderLeftColor: projectOf(e.projectId)!.color } : undefined}
                            onClick={() => setEditEventModal({ open: true, event: e })}
                          >
                            <div className="pagenda-time">{e.time ? fmt12(e.time) : '—'}</div>
                            <div className="pagenda-body">
                              <div className="pagenda-title" style={e.done ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>{e.title}</div>
                              {projectOf(e.projectId) && (
                                <div className="pagenda-meta" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: projectOf(e.projectId)!.color, flexShrink: 0 }} />
                                  {projectOf(e.projectId)!.name}
                                </div>
                              )}
                              {e.notes && <div className="pagenda-meta">{e.notes}</div>}
                            </div>
                            <span className="pagenda-cat">{e.category}</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
      {reviewOpen && <WeeklyReviewModal weekKey={weekKey} weekLabel={weekLabel} onClose={() => setReviewOpen(false)} />}
      {newEventModal.open && (
        <EventModal presetDate={newEventModal.presetDate} onClose={() => setNewEventModal({ open: false })} />
      )}
      {editEventModal.open && editEventModal.event && (
        <EventModal event={editEventModal.event} onClose={() => setEditEventModal({ open: false })} />
      )}
      {newApptModal.open && (
        <ApptModal presetDate={newApptModal.presetDate} onClose={() => setNewApptModal({ open: false })} />
      )}
      {editApptModal.open && editApptModal.appt && (
        <ApptModal appt={editApptModal.appt} onClose={() => setEditApptModal({ open: false })} />
      )}
    </div>
  );
}
