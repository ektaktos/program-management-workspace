'use client';

import { create } from 'zustand';
import { AppState, Project, Task, Milestone, Phase, Note } from '@/lib/types';
import { uid, autoMarkOverdue, getSeedData } from '@/lib/utils';

const STORAGE_KEY = 'pm_oyint_data';

function loadState(): AppState {
  if (typeof window === 'undefined') return getSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {}
  return getSeedData();
}

function saveState(state: AppState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

interface UIState {
  currentView: string;
  activeProjectId: string | null;
  highlightedTaskId: string | null;
  searchQuery: string;
  toasts: Toast[];
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'alert';
}

interface Store extends AppState, UIState {
  // Navigation
  setView: (view: string, projectId?: string) => void;
  navigateToTask: (taskId: string, projectId: string) => void;
  clearHighlight: () => void;
  setSearch: (q: string) => void;

  // Projects
  addProject: (p: Omit<Project, 'id'>) => void;
  updateProject: (id: string, p: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Tasks
  addTask: (t: Omit<Task, 'id'>) => void;
  updateTask: (id: string, t: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskDone: (id: string) => void;

  // Milestones
  addMilestone: (m: Omit<Milestone, 'id'>) => void;
  updateMilestone: (id: string, m: Partial<Milestone>) => void;
  deleteMilestone: (id: string) => void;

  // Phases
  addPhase: (p: Omit<Phase, 'id'>) => void;
  updatePhase: (id: string, p: Partial<Phase>) => void;
  deletePhase: (id: string) => void;

  // Notes
  addNote: (n: Omit<Note, 'id' | 'createdAt'>) => void;
  updateNote: (id: string, n: Partial<Note>) => void;
  deleteNote: (id: string) => void;

  // Alerts/Toasts
  addToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  runAlertCheck: () => void;
  runAutoOverdue: () => void;
}

function persist(get: () => Store) {
  const { projects, tasks, milestones, phases, notes, notifiedAlerts } = get();
  saveState({ projects, tasks, milestones, phases, notes, notifiedAlerts });
}

export const useAppStore = create<Store>((set, get) => {
  const initial = loadState();

  return {
    ...initial,
    currentView: 'dashboard',
    activeProjectId: null,
    highlightedTaskId: null,
    searchQuery: '',
    toasts: [],

    setView: (view, projectId) => set(s => ({
      currentView: view,
      activeProjectId: projectId ?? s.activeProjectId,
    })),

    navigateToTask: (taskId, projectId) => {
      set({ currentView: 'project', activeProjectId: projectId, highlightedTaskId: taskId });
      setTimeout(() => {
        const el = document.getElementById(`task-${taskId}`);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      }, 80);
      setTimeout(() => set({ highlightedTaskId: null }), 2100);
    },

    clearHighlight: () => set({ highlightedTaskId: null }),
    setSearch: (q) => set({ searchQuery: q }),

    addProject: (p) => {
      const project = { ...p, id: uid() };
      set(s => ({ projects: [...s.projects, project] }));
      persist(get);
    },
    updateProject: (id, p) => {
      set(s => ({ projects: s.projects.map(x => x.id === id ? { ...x, ...p } : x) }));
      persist(get);
    },
    deleteProject: (id) => {
      set(s => ({
        projects:   s.projects.filter(x => x.id !== id),
        tasks:      s.tasks.filter(x => x.projectId !== id),
        milestones: s.milestones.filter(x => x.projectId !== id),
        phases:     s.phases.filter(x => x.projectId !== id),
        notes:      s.notes.filter(x => x.projectId !== id),
      }));
      persist(get);
    },

    addTask: (t) => {
      const task = { ...t, id: uid() };
      set(s => ({ tasks: [...s.tasks, task] }));
      persist(get);
    },
    updateTask: (id, t) => {
      set(s => ({ tasks: s.tasks.map(x => x.id === id ? { ...x, ...t } : x) }));
      persist(get);
    },
    deleteTask: (id) => {
      set(s => ({ tasks: s.tasks.filter(x => x.id !== id) }));
      persist(get);
    },
    toggleTaskDone: (id) => {
      set(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== id) return t;
          return { ...t, status: t.status === 'done' ? 'todo' : 'done' };
        }),
      }));
      persist(get);
    },

    addMilestone: (m) => {
      const ms = { ...m, id: uid() };
      set(s => ({ milestones: [...s.milestones, ms] }));
      persist(get);
    },
    updateMilestone: (id, m) => {
      set(s => ({ milestones: s.milestones.map(x => x.id === id ? { ...x, ...m } : x) }));
      persist(get);
    },
    deleteMilestone: (id) => {
      set(s => ({ milestones: s.milestones.filter(x => x.id !== id) }));
      persist(get);
    },

    addPhase: (p) => {
      const phase = { ...p, id: uid() };
      set(s => ({ phases: [...s.phases, phase] }));
      persist(get);
    },
    updatePhase: (id, p) => {
      set(s => ({ phases: s.phases.map(x => x.id === id ? { ...x, ...p } : x) }));
      persist(get);
    },
    deletePhase: (id) => {
      set(s => ({ phases: s.phases.filter(x => x.id !== id) }));
      persist(get);
    },

    addNote: (n) => {
      const note = { ...n, id: uid(), createdAt: Date.now() };
      set(s => ({ notes: [...s.notes, note] }));
      persist(get);
    },
    updateNote: (id, n) => {
      set(s => ({ notes: s.notes.map(x => x.id === id ? { ...x, ...n } : x) }));
      persist(get);
    },
    deleteNote: (id) => {
      set(s => ({ notes: s.notes.filter(x => x.id !== id) }));
      persist(get);
    },

    addToast: (t) => {
      const toast = { ...t, id: uid() };
      set(s => ({ toasts: [...s.toasts, toast] }));
      setTimeout(() => get().removeToast(toast.id), 6000);
    },
    removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

    runAutoOverdue: () => {
      const { tasks } = get();
      const { tasks: updated, changed } = autoMarkOverdue(tasks);
      if (changed) {
        set({ tasks: updated });
        persist(get);
      }
    },

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
          const ms = alert.unit === 'minutes' ? alert.value * 60000
            : alert.unit === 'hours' ? alert.value * 3600000
            : alert.value * 86400000;
          const fireAt = new Date(due.getTime() - ms);
          if (now >= fireAt) {
            addToast({ title: 'Task reminder', message: `"${t.title}" is due soon`, type: 'alert' });
            newNotified.push(alertId);
          }
        });
      });
      if (newNotified.length !== notifiedAlerts.length) {
        set({ notifiedAlerts: newNotified });
        persist(get);
      }
    },
  };
});
