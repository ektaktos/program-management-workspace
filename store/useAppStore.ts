'use client';

import { create } from 'zustand';
import { AppState, Project, Task, Milestone, Phase, Note, Todo, PlannerEvent, PlannerAppointment, PlannerWeekData } from '@/lib/types';
import { uid, autoMarkOverdue } from '@/lib/utils';

const NOTIFIED_KEY  = 'pm_oyint_notified';
const PLANNER_KEY   = 'pm_oyint_planner';
const ARCHIVED_KEY  = 'pm_oyint_archived';
const ORDER_KEY     = 'pm_oyint_proj_order';

function loadNotified(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]'); } catch { return []; }
}
function saveNotified(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(ids));
}

function loadArchived(): { projectIds: string[]; taskIds: string[] } {
  if (typeof window === 'undefined') return { projectIds: [], taskIds: [] };
  try { return JSON.parse(localStorage.getItem(ARCHIVED_KEY) ?? '{"projectIds":[],"taskIds":[]}'); }
  catch { return { projectIds: [], taskIds: [] }; }
}
function saveArchived(data: { projectIds: string[]; taskIds: string[] }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ARCHIVED_KEY, JSON.stringify(data));
}

function loadProjectOrder(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]'); }
  catch { return []; }
}
function saveProjectOrder(order: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

// Read legacy localStorage planner data for one-time migration
function readLegacyPlannerData() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLANNER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as {
      todos?: Todo[];
      plannerEvents?: PlannerEvent[];
      plannerAppointments?: PlannerAppointment[];
      plannerWeekly?: Record<string, PlannerWeekData>;
    };
  } catch { return null; }
}
function clearLegacyPlannerData() {
  if (typeof window !== 'undefined') localStorage.removeItem(PLANNER_KEY);
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calcNextDue(iso: string, pattern: string): string | null {
  const d = new Date(iso + 'T00:00:00');
  switch (pattern) {
    case 'daily':   d.setDate(d.getDate() + 1); break;
    case 'weekly':  d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly':  d.setFullYear(d.getFullYear() + 1); break;
    default: return null;
  }
  return isoDate(d);
}

async function api(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
  return res.json();
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'alert';
}

interface UIState {
  isLoaded: boolean;
  currentView: string;
  activeProjectId: string | null;
  highlightedTaskId: string | null;
  searchQuery: string;
  toasts: Toast[];
  sidebarOpen: boolean;
}

interface PlannerState {
  todos: Todo[];
  plannerEvents: PlannerEvent[];
  plannerAppointments: PlannerAppointment[];
  plannerWeekly: Record<string, PlannerWeekData>;
  plannerWeekOffset: number;
}

interface Store extends AppState, UIState, PlannerState {
  loadAll: () => Promise<void>;

  setView: (view: string, projectId?: string) => void;
  navigateToTask: (taskId: string, projectId: string) => void;
  clearHighlight: () => void;
  setSearch: (q: string) => void;
  setSidebarOpen: (open: boolean) => void;

  addProject:    (p: Omit<Project, 'id'>)    => Promise<void>;
  updateProject: (id: string, p: Partial<Project>) => Promise<void>;
  deleteProject: (id: string)                => Promise<void>;

  addTask:       (t: Omit<Task, 'id'>)       => Promise<void>;
  updateTask:    (id: string, t: Partial<Task>) => Promise<void>;
  deleteTask:    (id: string)                => Promise<void>;
  toggleTaskDone:(id: string)                => Promise<void>;

  addMilestone:    (m: Omit<Milestone, 'id'>)    => Promise<void>;
  updateMilestone: (id: string, m: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (id: string)                  => Promise<void>;

  addPhase:    (p: Omit<Phase, 'id'>)    => Promise<void>;
  updatePhase: (id: string, p: Partial<Phase>) => Promise<void>;
  deletePhase: (id: string)              => Promise<void>;

  addNote:    (n: Omit<Note, 'id' | 'createdAt'>) => Promise<void>;
  updateNote: (id: string, n: Partial<Note>)       => Promise<void>;
  deleteNote: (id: string)                         => Promise<void>;

  addToast:     (t: Omit<Toast, 'id'>) => void;
  removeToast:  (id: string)           => void;
  runAlertCheck:  () => void;
  runAutoOverdue: () => Promise<void>;

  addTodo: (text: string) => void;
  updateTodo: (id: string, text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;

  addPlannerEvent: (ev: Omit<PlannerEvent, 'id' | 'createdAt'>) => void;
  updatePlannerEvent: (id: string, data: Partial<PlannerEvent>) => void;
  deletePlannerEvent: (id: string) => void;

  addPlannerAppointment: (appt: Omit<PlannerAppointment, 'id' | 'createdAt'>) => void;
  updatePlannerAppointment: (id: string, data: Partial<PlannerAppointment>) => void;
  deletePlannerAppointment: (id: string) => void;

  setPlannerWeekOffset: (n: number) => void;
  updatePlannerWeekly: (weekKey: string, data: Partial<PlannerWeekData>) => void;

  plannerModalTrigger: 'task' | 'appt' | null;
  setPlannerModalTrigger: (v: 'task' | 'appt' | null) => void;

  // ── Archive ──
  archivedProjectIds: string[];
  archivedTaskIds:    string[];
  archiveProject:   (id: string) => void;
  unarchiveProject: (id: string) => void;
  archiveTask:      (id: string) => void;
  unarchiveTask:    (id: string) => void;

  // ── Project ordering ──
  projectOrder:    string[];
  setProjectOrder: (ids: string[]) => void;
}

export const useAppStore = create<Store>((set, get) => ({
  // ── Data ──
  projects:       [],
  tasks:          [],
  milestones:     [],
  phases:         [],
  notes:          [],
  notifiedAlerts: [],

  // ── Planner ──
  todos:                [],
  plannerEvents:        [],
  plannerAppointments:  [],
  plannerWeekly:        {},
  plannerModalTrigger:  null,
  plannerWeekOffset:    0,

  // ── UI ──
  isLoaded:        false,
  currentView:     'dashboard',
  activeProjectId: null,
  highlightedTaskId: null,
  searchQuery:     '',
  toasts:          [],
  sidebarOpen:     true,

  // ── Archive ──
  archivedProjectIds: [],
  archivedTaskIds:    [],

  // ── Project ordering ──
  projectOrder: [],

  // ── Bootstrap ──
  loadAll: async () => {
    try {
      const [data, plannerData]: [AppState, {
        todos: Todo[];
        plannerEvents: PlannerEvent[];
        plannerAppointments: PlannerAppointment[];
        plannerWeekly: Record<string, PlannerWeekData>;
      }] = await Promise.all([
        api('/api/data'),
        api('/api/planner/data'),
      ]);

      const archived = loadArchived();
      const order    = loadProjectOrder();

      if (data.projects.length === 0) {
        await api('/api/seed', 'POST');
        const seeded: AppState = await api('/api/data');
        set({ ...seeded, notifiedAlerts: loadNotified(), ...plannerData, isLoaded: true, archivedProjectIds: archived.projectIds, archivedTaskIds: archived.taskIds, projectOrder: order });
      } else {
        set({ ...data, notifiedAlerts: loadNotified(), ...plannerData, isLoaded: true, archivedProjectIds: archived.projectIds, archivedTaskIds: archived.taskIds, projectOrder: order });
      }

      // One-time migration: if DB planner is empty but localStorage has data, migrate it
      const legacy = readLegacyPlannerData();
      if (legacy && plannerData.todos.length === 0 && plannerData.plannerEvents.length === 0 && plannerData.plannerAppointments.length === 0) {
        const migrationCalls: Promise<unknown>[] = [];
        for (const t of legacy.todos ?? []) migrationCalls.push(api('/api/planner/todos', 'POST', t).catch(() => {}));
        for (const e of legacy.plannerEvents ?? []) migrationCalls.push(api('/api/planner/events', 'POST', e).catch(() => {}));
        for (const a of legacy.plannerAppointments ?? []) migrationCalls.push(api('/api/planner/appointments', 'POST', a).catch(() => {}));
        for (const [weekKey, weekData] of Object.entries(legacy.plannerWeekly ?? {})) {
          migrationCalls.push(api(`/api/planner/weekly/${weekKey}`, 'PUT', weekData).catch(() => {}));
        }
        if (migrationCalls.length > 0) {
          await Promise.all(migrationCalls);
          set({
            todos:               legacy.todos ?? [],
            plannerEvents:       legacy.plannerEvents ?? [],
            plannerAppointments: legacy.plannerAppointments ?? [],
            plannerWeekly:       legacy.plannerWeekly ?? {},
          });
        }
        clearLegacyPlannerData();
      }
    } catch (err) {
      console.error('loadAll failed:', err);
      set({ isLoaded: true });
    }
  },

  // ── Navigation ──
  setView: (view, projectId) =>
    set(s => ({ currentView: view, activeProjectId: projectId ?? s.activeProjectId })),

  navigateToTask: (taskId, projectId) => {
    set({ currentView: 'project', activeProjectId: projectId, highlightedTaskId: taskId });
    setTimeout(() => {
      document.getElementById(`task-${taskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    setTimeout(() => set({ highlightedTaskId: null }), 2100);
  },

  clearHighlight:  () => set({ highlightedTaskId: null }),
  setSearch:       (q) => set({ searchQuery: q }),
  setSidebarOpen:  (open) => set({ sidebarOpen: open }),

  // ── Projects ──
  addProject: async (p) => {
    const project: Project = { ...p, id: uid() };
    set(s => ({ projects: [...s.projects, project] }));
    await api('/api/projects', 'POST', project).catch(console.error);
  },
  updateProject: async (id, p) => {
    set(s => ({ projects: s.projects.map(x => x.id === id ? { ...x, ...p } : x) }));
    const updated = get().projects.find(x => x.id === id);
    await api(`/api/projects/${id}`, 'PUT', updated).catch(console.error);
  },
  deleteProject: async (id) => {
    set(s => ({
      projects:   s.projects.filter(x => x.id !== id),
      tasks:      s.tasks.filter(x => x.projectId !== id),
      milestones: s.milestones.filter(x => x.projectId !== id),
      phases:     s.phases.filter(x => x.projectId !== id),
      notes:      s.notes.filter(x => x.projectId !== id),
    }));
    await api(`/api/projects/${id}`, 'DELETE').catch(console.error);
  },

  // ── Tasks ──
  addTask: async (t) => {
    const task: Task = { ...t, id: uid() };
    set(s => ({ tasks: [...s.tasks, task] }));
    await api('/api/tasks', 'POST', task).catch(console.error);
  },
  updateTask: async (id, t) => {
    set(s => ({
      tasks: s.tasks.map(x => {
        if (x.id !== id) return x;
        const patch: Task = { ...x, ...t };
        // If a new due date is supplied and task was overdue, revert to todo if the new date is today or future
        if (t.due !== undefined && x.status === 'overdue') {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const newDue = new Date(t.due + 'T00:00:00'); newDue.setHours(0, 0, 0, 0);
          if (newDue >= today) patch.status = 'todo';
        }
        return patch;
      }),
    }));
    const updated = get().tasks.find(x => x.id === id);
    await api(`/api/tasks/${id}`, 'PUT', updated).catch(console.error);
  },
  deleteTask: async (id) => {
    set(s => ({ tasks: s.tasks.filter(x => x.id !== id) }));
    await api(`/api/tasks/${id}`, 'DELETE').catch(console.error);
  },
  toggleTaskDone: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;

    const isMarkingDone = task.status !== 'done';

    // Toggle the current task
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id !== id ? t : { ...t, status: t.status === 'done' ? 'todo' : 'done' }
      ),
    }));
    const updated = get().tasks.find(x => x.id === id);
    await api(`/api/tasks/${id}`, 'PUT', updated).catch(console.error);

    // When marking done, spawn the next recurrence instance
    if (isMarkingDone && task.recurring && task.due) {
      const nextDue = calcNextDue(task.due, task.recurring);
      if (nextDue) {
        const nextTask: Task = {
          ...task,
          id: uid(),
          status: 'todo',
          due: nextDue,
        };
        set(s => ({ tasks: [...s.tasks, nextTask] }));
        await api('/api/tasks', 'POST', nextTask).catch(console.error);
        get().addToast({
          title: 'Recurring task',
          message: `Next "${task.title}" scheduled for ${nextDue}`,
          type: 'info',
        });
      }
    }
  },

  // ── Milestones ──
  addMilestone: async (m) => {
    const ms: Milestone = { ...m, id: uid() };
    set(s => ({ milestones: [...s.milestones, ms] }));
    await api('/api/milestones', 'POST', ms).catch(console.error);
  },
  updateMilestone: async (id, m) => {
    set(s => ({ milestones: s.milestones.map(x => x.id === id ? { ...x, ...m } : x) }));
    const updated = get().milestones.find(x => x.id === id);
    await api(`/api/milestones/${id}`, 'PUT', updated).catch(console.error);
  },
  deleteMilestone: async (id) => {
    set(s => ({ milestones: s.milestones.filter(x => x.id !== id) }));
    await api(`/api/milestones/${id}`, 'DELETE').catch(console.error);
  },

  // ── Phases ──
  addPhase: async (p) => {
    const phase: Phase = { ...p, id: uid() };
    set(s => ({ phases: [...s.phases, phase] }));
    await api('/api/phases', 'POST', phase).catch(console.error);
  },
  updatePhase: async (id, p) => {
    set(s => ({ phases: s.phases.map(x => x.id === id ? { ...x, ...p } : x) }));
    const updated = get().phases.find(x => x.id === id);
    await api(`/api/phases/${id}`, 'PUT', updated).catch(console.error);
  },
  deletePhase: async (id) => {
    set(s => ({ phases: s.phases.filter(x => x.id !== id) }));
    await api(`/api/phases/${id}`, 'DELETE').catch(console.error);
  },

  // ── Notes ──
  addNote: async (n) => {
    const note: Note = { ...n, id: uid(), createdAt: Date.now() };
    set(s => ({ notes: [note, ...s.notes] }));
    await api('/api/notes', 'POST', note).catch(console.error);
  },
  updateNote: async (id, n) => {
    set(s => ({ notes: s.notes.map(x => x.id === id ? { ...x, ...n } : x) }));
    const updated = get().notes.find(x => x.id === id);
    await api(`/api/notes/${id}`, 'PUT', updated).catch(console.error);
  },
  deleteNote: async (id) => {
    set(s => ({ notes: s.notes.filter(x => x.id !== id) }));
    await api(`/api/notes/${id}`, 'DELETE').catch(console.error);
  },

  // ── Todos ──
  addTodo: (text) => {
    const todo: Todo = { id: uid(), text, done: false, createdAt: Date.now() };
    set(s => ({ todos: [todo, ...s.todos] }));
    api('/api/planner/todos', 'POST', todo).catch(console.error);
  },
  updateTodo: (id, text) => {
    set(s => ({ todos: s.todos.map(t => t.id === id ? { ...t, text } : t) }));
    const updated = get().todos.find(t => t.id === id);
    api(`/api/planner/todos/${id}`, 'PUT', updated).catch(console.error);
  },
  toggleTodo: (id) => {
    set(s => ({ todos: s.todos.map(t => t.id === id ? { ...t, done: !t.done } : t) }));
    const updated = get().todos.find(t => t.id === id);
    api(`/api/planner/todos/${id}`, 'PUT', updated).catch(console.error);
  },
  deleteTodo: (id) => {
    set(s => ({ todos: s.todos.filter(t => t.id !== id) }));
    api(`/api/planner/todos/${id}`, 'DELETE').catch(console.error);
  },

  // ── Planner Events ──
  addPlannerEvent: (ev) => {
    const event: PlannerEvent = { ...ev, id: uid(), createdAt: Date.now() };
    set(s => ({ plannerEvents: [...s.plannerEvents, event] }));
    api('/api/planner/events', 'POST', event).catch(console.error);
  },
  updatePlannerEvent: (id, data) => {
    set(s => ({ plannerEvents: s.plannerEvents.map(e => e.id === id ? { ...e, ...data } : e) }));
    const updated = get().plannerEvents.find(e => e.id === id);
    api(`/api/planner/events/${id}`, 'PUT', updated).catch(console.error);
  },
  deletePlannerEvent: (id) => {
    set(s => ({ plannerEvents: s.plannerEvents.filter(e => e.id !== id) }));
    api(`/api/planner/events/${id}`, 'DELETE').catch(console.error);
  },

  // ── Planner Appointments ──
  addPlannerAppointment: (appt) => {
    const appointment: PlannerAppointment = { ...appt, id: uid(), createdAt: Date.now() };
    set(s => ({ plannerAppointments: [...s.plannerAppointments, appointment] }));
    api('/api/planner/appointments', 'POST', appointment).catch(console.error);
  },
  updatePlannerAppointment: (id, data) => {
    set(s => ({ plannerAppointments: s.plannerAppointments.map(a => a.id === id ? { ...a, ...data } : a) }));
    const updated = get().plannerAppointments.find(a => a.id === id);
    api(`/api/planner/appointments/${id}`, 'PUT', updated).catch(console.error);
  },
  deletePlannerAppointment: (id) => {
    set(s => ({ plannerAppointments: s.plannerAppointments.filter(a => a.id !== id) }));
    api(`/api/planner/appointments/${id}`, 'DELETE').catch(console.error);
  },

  // ── Planner weekly meta ──
  setPlannerWeekOffset: (n) => set({ plannerWeekOffset: n }),
  setPlannerModalTrigger: (v) => set({ plannerModalTrigger: v }),

  updatePlannerWeekly: (weekKey, data) => {
    set(s => {
      const defaults: PlannerWeekData = { goals: [], notes: '', focus: '', focusItems: [] };
      const existing = s.plannerWeekly[weekKey] ?? defaults;
      const merged = { ...existing, ...data };
      return { plannerWeekly: { ...s.plannerWeekly, [weekKey]: merged } };
    });
    const weekData = get().plannerWeekly[weekKey];
    api(`/api/planner/weekly/${weekKey}`, 'PUT', weekData).catch(console.error);
  },

  // ── Toasts ──
  addToast: (t) => {
    const toast: Toast = { ...t, id: uid() };
    set(s => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => get().removeToast(toast.id), 6000);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Auto-overdue ──
  runAutoOverdue: async () => {
    const { tasks } = get();
    const { tasks: updated, changed } = autoMarkOverdue(tasks);
    if (!changed) return;

    const overdueIds = updated
      .filter((t, i) => t.status === 'overdue' && tasks[i]?.status !== 'overdue')
      .map(t => t.id);

    set({ tasks: updated });
    if (overdueIds.length > 0) {
      await api('/api/tasks/mark-overdue', 'POST', { ids: overdueIds }).catch(console.error);
    }
  },

  // ── Alert check (localStorage-backed notifiedAlerts) ──
  runAlertCheck: () => {
    const { tasks, plannerAppointments, notifiedAlerts, addToast } = get();
    const now = new Date();
    const newNotified = [...notifiedAlerts];

    function playAlertTone() {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        osc.onended = () => ctx.close();
      } catch (_) {}
    }

    // Task alerts
    tasks.forEach(t => {
      if (!t.due || t.status === 'done' || !t.alerts?.length) return;
      const due = t.dueTime
        ? new Date(`${t.due}T${t.dueTime}`)
        : new Date(`${t.due}T23:59:59`);

      t.alerts!.forEach((alert, i) => {
        const alertId = `${t.id}_${i}`;
        if (newNotified.includes(alertId)) return;
        const ms =
          alert.unit === 'minutes' ? alert.value * 60_000 :
          alert.unit === 'hours'   ? alert.value * 3_600_000 :
                                     alert.value * 86_400_000;
        if (now >= new Date(due.getTime() - ms)) {
          addToast({ title: 'Task reminder', message: `"${t.title}" is due soon`, type: 'alert' });
          newNotified.push(alertId);
          playAlertTone();
        }
      });
    });

    // Meeting alerts
    plannerAppointments.forEach(a => {
      if (!a.alertMinutes || a.alertMinutes < 0 || a.done) return;
      const alertId = `appt_${a.id}`;
      if (newNotified.includes(alertId)) return;
      const meetingTime = new Date(`${a.date}T${a.time}`);
      if (now >= new Date(meetingTime.getTime() - a.alertMinutes * 60_000)) {
        const label = a.alertMinutes < 60
          ? `${a.alertMinutes} min`
          : a.alertMinutes < 1440
            ? `${a.alertMinutes / 60} hr`
            : '1 day';
        addToast({ title: 'Meeting reminder', message: `"${a.title}" starts in ${label}`, type: 'alert' });
        newNotified.push(alertId);
        playAlertTone();
      }
    });

    if (newNotified.length !== notifiedAlerts.length) {
      set({ notifiedAlerts: newNotified });
      saveNotified(newNotified);
    }
  },

  // ── Archive ──
  archiveProject: (id) => {
    const s = get();
    const newIds = [...s.archivedProjectIds, id];
    saveArchived({ projectIds: newIds, taskIds: s.archivedTaskIds });
    set({ archivedProjectIds: newIds });
  },
  unarchiveProject: (id) => {
    const s = get();
    const newIds = s.archivedProjectIds.filter(x => x !== id);
    saveArchived({ projectIds: newIds, taskIds: s.archivedTaskIds });
    set({ archivedProjectIds: newIds });
  },
  archiveTask: (id) => {
    const s = get();
    const newIds = [...s.archivedTaskIds, id];
    saveArchived({ projectIds: s.archivedProjectIds, taskIds: newIds });
    set({ archivedTaskIds: newIds });
  },
  unarchiveTask: (id) => {
    const s = get();
    const newIds = s.archivedTaskIds.filter(x => x !== id);
    saveArchived({ projectIds: s.archivedProjectIds, taskIds: newIds });
    set({ archivedTaskIds: newIds });
  },

  // ── Project ordering ──
  setProjectOrder: (ids) => {
    saveProjectOrder(ids);
    set({ projectOrder: ids });
  },
}));
