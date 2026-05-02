'use client';

import { create } from 'zustand';
import { AppState, Project, Task, Milestone, Phase, Note } from '@/lib/types';
import { uid, autoMarkOverdue } from '@/lib/utils';

const NOTIFIED_KEY = 'pm_oyint_notified';

function loadNotified(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]'); } catch { return []; }
}
function saveNotified(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(ids));
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

interface Store extends AppState, UIState {
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
}

export const useAppStore = create<Store>((set, get) => ({
  // ── Data ──
  projects:       [],
  tasks:          [],
  milestones:     [],
  phases:         [],
  notes:          [],
  notifiedAlerts: [],

  // ── UI ──
  isLoaded:        false,
  currentView:     'dashboard',
  activeProjectId: null,
  highlightedTaskId: null,
  searchQuery:     '',
  toasts:          [],
  sidebarOpen:     true,

  // ── Bootstrap ──
  loadAll: async () => {
    try {
      const data: AppState = await api('/api/data');
      if (data.projects.length === 0) {
        await api('/api/seed', 'POST');
        const seeded: AppState = await api('/api/data');
        set({ ...seeded, notifiedAlerts: loadNotified(), isLoaded: true });
      } else {
        set({ ...data, notifiedAlerts: loadNotified(), isLoaded: true });
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
    set(s => ({ tasks: s.tasks.map(x => x.id === id ? { ...x, ...t } : x) }));
    const updated = get().tasks.find(x => x.id === id);
    await api(`/api/tasks/${id}`, 'PUT', updated).catch(console.error);
  },
  deleteTask: async (id) => {
    set(s => ({ tasks: s.tasks.filter(x => x.id !== id) }));
    await api(`/api/tasks/${id}`, 'DELETE').catch(console.error);
  },
  toggleTaskDone: async (id) => {
    set(s => ({
      tasks: s.tasks.map(t =>
        t.id !== id ? t : { ...t, status: t.status === 'done' ? 'todo' : 'done' }
      ),
    }));
    const updated = get().tasks.find(x => x.id === id);
    await api(`/api/tasks/${id}`, 'PUT', updated).catch(console.error);
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
    const { tasks, notifiedAlerts, addToast } = get();
    const now = new Date();
    const newNotified = [...notifiedAlerts];

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
        }
      });
    });

    if (newNotified.length !== notifiedAlerts.length) {
      set({ notifiedAlerts: newNotified });
      saveNotified(newNotified);
    }
  },
}));
