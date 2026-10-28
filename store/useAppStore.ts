'use client';

import { create } from 'zustand';
import { AppState, Project, Task, Milestone, Phase, Note, Todo, PlannerEvent, PlannerAppointment, PlannerWeekData, CalendarSource, CalendarEvent } from '@/lib/types';
import { uid, autoMarkOverdue, addDaysIso, todayIso } from '@/lib/utils';
import { cleanWorkspaceName, defaultWorkspaceName, isWorkspaceName } from '@/lib/workspaceName';
import { DAILY_CAPACITY_MIN } from '@/lib/constants';
import { DEFAULT_THEME, applyTheme, isThemeId } from '@/lib/themes';
import { StyleTheme, DEFAULT_STYLE, STYLE_CACHE_KEY, applyStyle, normalizeStyle } from '@/lib/styleThemes';
import { DayOrder, isDayOrder, pruneDayOrder } from '@/lib/dayOrder';
import { buildWeeklyReport, mondayOf, weekLabel } from '@/lib/report';
import { NotifItem, NotifKind, NotifPrefs, NotifTarget, DEFAULT_NOTIF_PREFS, normalizeNotifPrefs, inQuietHours, playSound } from '@/lib/notifications';

const NOTIFIED_KEY  = 'pm_oyint_notified';
const PLANNER_KEY   = 'pm_oyint_planner';
const ARCHIVED_KEY  = 'pm_oyint_archived';
const ORDER_KEY     = 'pm_oyint_proj_order';
const AREA_KEY      = 'pm_oyint_area_filter';
const CAPACITY_KEY  = 'pm_oyint_daily_capacity'; // legacy per-browser value, migrated to the DB on load
const NOTIFS_KEY    = 'pm_oyint_notifications';  // notification history (per device)
const SNOOZE_KEY    = 'pm_oyint_snoozed';
const DIGEST_KEY    = 'pm_oyint_digest_day';
const REPORT_KEY    = 'pm_oyint_report_week';   // last week whose report we announced
const NOTIFS_MAX    = 100;
const NOTIFIED_MAX  = 400;

// Per-browser UI state is namespaced by the signed-in user's id (set in loadAll).
let storageUserId = '';
function userKey(base: string): string {
  if (!storageUserId) return base;
  const key = `${base}:${storageUserId}`;
  // Move pre-auth values over to the first user who signs in on this browser.
  const legacy = localStorage.getItem(base);
  if (legacy !== null) {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, legacy);
    localStorage.removeItem(base);
  }
  return key;
}

function loadNotified(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(userKey(NOTIFIED_KEY)) ?? '[]'); } catch { return []; }
}
function saveNotified(ids: string[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(userKey(NOTIFIED_KEY), JSON.stringify(ids.slice(-NOTIFIED_MAX))); } catch {}
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function saveJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

interface Snoozed { due: number; item: Omit<NotifItem, 'id' | 'at' | 'read'> }

// System pop-up, only when the workspace isn't in front (the in-app toast covers that case).
// Goes through the service worker where possible so a click can bring the tab back.
function showOSNotification(title: string, body: string, tag: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible' && document.hasFocus()) return;
  const opts: NotificationOptions = { body, tag, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' };
  const fallback = () => {
    try { const n = new Notification(title, opts); n.onclick = () => { window.focus(); n.close(); }; } catch {}
  };
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => (reg ? reg.showNotification(title, opts) : fallback())).catch(fallback);
  } else fallback();
}

function fmtClock(hm: string): string {
  const [h, m] = hm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function leadLabel(mins: number): string {
  if (mins <= 0) return 'now';
  if (mins < 60) return `in ${mins} min`;
  if (mins < 1440) { const h = Math.round(mins / 60); return `in ${h} hr`; }
  const d = Math.round(mins / 1440);
  return d === 1 ? 'tomorrow' : `in ${d} days`;
}

// Today's calendar events for reminders: a small separate load so they keep working
// whatever week the planner happens to be showing.
let reminderEvents: CalendarEvent[] = [];
let reminderFetchedAt = 0;
let reminderFetching = false;

function loadArchived(): { projectIds: string[]; taskIds: string[] } {
  if (typeof window === 'undefined') return { projectIds: [], taskIds: [] };
  try { return JSON.parse(localStorage.getItem(userKey(ARCHIVED_KEY)) ?? '{"projectIds":[],"taskIds":[]}'); }
  catch { return { projectIds: [], taskIds: [] }; }
}
// Archive and project order are saved to the DB; the localStorage readers above remain only
// to migrate what older versions kept in each browser
function saveArchived(data: { projectIds: string[]; taskIds: string[] }) {
  api('/api/settings/archive', 'PUT', { value: data }).catch(console.error);
}

function loadProjectOrder(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(userKey(ORDER_KEY)) ?? '[]'); }
  catch { return []; }
}
function saveProjectOrder(order: string[]) {
  api('/api/settings/projectOrder', 'PUT', { value: order }).catch(console.error);
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

// Saves in flight and the time of the last one, so a background refresh never overwrites a change
// that hasn't reached the server yet
let pendingWrites = 0;
let lastWriteAt = 0;

async function api(path: string, method = 'GET', body?: unknown) {
  const isWrite = method !== 'GET';
  if (isWrite) { pendingWrites++; lastWriteAt = Date.now(); }
  try {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
    return res.json();
  } finally {
    if (isWrite) { pendingWrites--; lastWriteAt = Date.now(); }
  }
}

export interface Toast {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'alert';
  kind?: NotifKind;
  notifId?: string;      // history entry this toast belongs to (enables Open / Snooze)
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
  // Re-read data and synced settings from the server (other browsers' changes); safe to call often
  refreshFromServer: () => Promise<void>;

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

  // ── Notifications ──
  notifications:  NotifItem[];
  notifPrefs:     NotifPrefs;
  setNotifPrefs:  (patch: Partial<NotifPrefs>) => void;
  notify:         (n: { kind: NotifKind; title: string; message: string; target?: NotifTarget }) => void;
  openNotification: (id: string) => void;
  markNotifRead:  (id: string) => void;
  markAllNotifsRead: () => void;
  clearNotifications: () => void;
  snoozeNotification: (id: string, minutes: number) => void;
  downloadWeeklyReport: (weekStart: string) => Promise<void>;

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

  // ── Life-area filter ('' = all areas) ──
  areaFilter:    string;
  setAreaFilter: (area: string) => void;

  // ── Global quick add ──
  quickAddOpen:    boolean;
  setQuickAddOpen: (open: boolean) => void;

  // ── Daily time limit (minutes) for overbooking warnings ──
  dailyCapacity:    number;
  setDailyCapacity: (mins: number) => void;

  // ── Colour theme (synced via settings) ──
  theme:    string;
  setTheme: (id: string) => void;

  // ── Your order for each day's tasks (synced; see lib/dayOrder) ──
  dayOrder:    DayOrder;
  setDayOrder: (date: string, keys: string[]) => void;

  // ── Font / card / background style (synced via settings) ──
  styleTheme:    StyleTheme;
  setStyleTheme: (patch: Partial<StyleTheme>) => void;

  // ── Calendar events marked done in the workspace (synced; the calendar itself is untouched) ──
  doneCalendarEvents:      string[];
  toggleCalendarEventDone: (id: string) => void;

  // ── Sidebar menu order (synced via settings; [] = default order) ──
  navOrder:    string[];
  setNavOrder: (ids: string[]) => void;

  // ── Signed-in user and their workspace name (custom name synced via settings; '' = default) ──
  user:             { name: string; email: string } | null;
  workspaceName:    string;
  setWorkspaceName: (name: string) => void;

  // ── Subscribed calendars (read-only) ──
  calendarSources: CalendarSource[];
  calendarEvents:  CalendarEvent[];
  calendarErrors:  Record<string, string>;      // sourceId → last load error
  calendarWindow:  { from: string; to: string } | null;
  calendarsOpen:   boolean;
  setCalendarsOpen: (open: boolean) => void;
  ensureCalendarRange: (from: string, to: string, fresh?: boolean) => Promise<void>;
  refreshCalendars:    (opts?: { fresh?: boolean }) => Promise<void>;
  addCalendarSource:    (c: { name: string; url: string; color: string }) => Promise<string | null>;
  updateCalendarSource: (id: string, patch: Partial<Omit<CalendarSource, 'id'>>) => Promise<string | null>;
  deleteCalendarSource: (id: string) => Promise<void>;
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

  notifications:   [],
  notifPrefs:      DEFAULT_NOTIF_PREFS,

  // ── Archive ──
  archivedProjectIds: [],
  archivedTaskIds:    [],

  // ── Project ordering ──
  projectOrder: [],

  areaFilter:   '',
  quickAddOpen: false,
  dailyCapacity: DAILY_CAPACITY_MIN,
  theme: DEFAULT_THEME,
  navOrder: [],
  user: null,
  workspaceName: '',
  doneCalendarEvents: [],
  styleTheme: DEFAULT_STYLE,
  dayOrder: {},

  calendarSources: [],
  calendarEvents:  [],
  calendarErrors:  {},
  calendarWindow:  null,
  calendarsOpen:   false,

  // ── Bootstrap ──
  loadAll: async () => {
    try {
      const session = await fetch('/api/auth/session').then(r => r.json()).catch(() => null);
      storageUserId = session?.user?.id ?? '';
      if (session?.user) set({ user: { name: session.user.name ?? '', email: session.user.email ?? '' } });

      // Synced settings load alongside the data; a settings failure (null) must not block loading.
      const [data, plannerData, settingsRes, calendarsRes]: [AppState, {
        todos: Todo[];
        plannerEvents: PlannerEvent[];
        plannerAppointments: PlannerAppointment[];
        plannerWeekly: Record<string, PlannerWeekData>;
      }, Record<string, unknown> | null, CalendarSource[] | null] = await Promise.all([
        api('/api/data'),
        api('/api/planner/data'),
        api('/api/settings').catch(() => null),
        api('/api/calendars').catch(() => null),
      ]);
      if (Array.isArray(calendarsRes)) set({ calendarSources: calendarsRes });

      // Archive and project order live in the DB (synced). Older versions kept them per browser:
      // the first load in each browser merges its local copy in, then clears it.
      const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
      const localArch = loadArchived();
      const localOrder = loadProjectOrder();
      const dbArch = settingsRes?.archive as { projectIds?: unknown; taskIds?: unknown } | undefined;
      const archived = {
        projectIds: Array.from(new Set([...strList(dbArch?.projectIds), ...strList(localArch.projectIds)])),
        taskIds: Array.from(new Set([...strList(dbArch?.taskIds), ...strList(localArch.taskIds)])),
      };
      const dbOrder = strList(settingsRes?.projectOrder);
      const order = dbOrder.length ? dbOrder : strList(localOrder);
      if (settingsRes) {
        const archChanged = archived.projectIds.length !== strList(dbArch?.projectIds).length || archived.taskIds.length !== strList(dbArch?.taskIds).length;
        if (archChanged) api('/api/settings/archive', 'PUT', { value: archived }).catch(console.error);
        if (!dbOrder.length && order.length) api('/api/settings/projectOrder', 'PUT', { value: order }).catch(console.error);
        try { localStorage.removeItem(userKey(ARCHIVED_KEY)); localStorage.removeItem(userKey(ORDER_KEY)); } catch {}
      }
      let areaFilter = '';
      try { areaFilter = localStorage.getItem(AREA_KEY) ?? ''; } catch {}
      set({ areaFilter });

      // Theme: the DB is the source of truth; the layout's inline script already applied the cached one
      if (isThemeId(settingsRes?.theme)) {
        set({ theme: settingsRes!.theme as string });
        applyTheme(settingsRes!.theme as string);
      } else {
        let cached = '';
        try { cached = localStorage.getItem('pm_oyint_theme') ?? ''; } catch {}
        if (isThemeId(cached)) set({ theme: cached });
      }

      if (settingsRes?.notifPrefs) set({ notifPrefs: normalizeNotifPrefs(settingsRes.notifPrefs) });
      set({ notifications: loadJson<NotifItem[]>(NOTIFS_KEY, []).slice(0, NOTIFS_MAX) });

      // Style: DB first; otherwise keep what the boot script applied from the local cache
      if (settingsRes?.styleTheme) {
        const st = normalizeStyle(settingsRes.styleTheme);
        set({ styleTheme: st });
        applyStyle(st);
      } else {
        let cached: unknown = null;
        try { cached = JSON.parse(localStorage.getItem(STYLE_CACHE_KEY) ?? 'null'); } catch {}
        if (cached) set({ styleTheme: normalizeStyle(cached) });
      }

      if (isDayOrder(settingsRes?.dayOrder)) set({ dayOrder: settingsRes!.dayOrder as DayOrder });

      if (Array.isArray(settingsRes?.doneCalendarEvents)) {
        set({ doneCalendarEvents: (settingsRes!.doneCalendarEvents as unknown[]).filter((x): x is string => typeof x === 'string') });
      }

      if (isWorkspaceName(settingsRes?.workspaceName)) set({ workspaceName: settingsRes!.workspaceName as string });
      if (Array.isArray(settingsRes?.navOrder)) {
        set({ navOrder: (settingsRes!.navOrder as unknown[]).filter((x): x is string => typeof x === 'string') });
      }

      const dbCap = Number(settingsRes?.dailyCapacity);
      if (dbCap > 0) {
        set({ dailyCapacity: dbCap });
      } else if (settingsRes) {
        // Only when settings actually loaded: never overwrite the DB after a failed fetch
        // One-time move of a limit chosen before syncing existed (it was stored per browser)
        let localCap = 0;
        try { localCap = Number(localStorage.getItem(CAPACITY_KEY)); } catch {}
        if (localCap > 0) {
          set({ dailyCapacity: localCap });
          api('/api/settings/dailyCapacity', 'PUT', { value: localCap })
            .then(() => { try { localStorage.removeItem(CAPACITY_KEY); } catch {} })
            .catch(console.error);
        }
      }

      set({ ...data, notifiedAlerts: loadNotified(), ...plannerData, isLoaded: true, archivedProjectIds: archived.projectIds, archivedTaskIds: archived.taskIds, projectOrder: order });

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

  refreshFromServer: async () => {
    if (!get().isLoaded || pendingWrites > 0 || Date.now() - lastWriteAt < 4000) return;
    const startedAt = lastWriteAt;
    try {
      const [data, plannerData, settingsRes] = await Promise.all([
        api('/api/data') as Promise<AppState>,
        api('/api/planner/data') as Promise<{ todos: Todo[]; plannerEvents: PlannerEvent[]; plannerAppointments: PlannerAppointment[]; plannerWeekly: Record<string, PlannerWeekData> }>,
        api('/api/settings').catch(() => null) as Promise<Record<string, unknown> | null>,
      ]);
      // A change was saved while we were fetching: our copy may predate it, so skip this round
      if (pendingWrites > 0 || lastWriteAt !== startedAt) return;

      const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
      const patch: Partial<Store> = { ...data, ...plannerData };
      if (settingsRes) {
        const arch = settingsRes.archive as { projectIds?: unknown; taskIds?: unknown } | undefined;
        if (arch) { patch.archivedProjectIds = strList(arch.projectIds); patch.archivedTaskIds = strList(arch.taskIds); }
        if (Array.isArray(settingsRes.projectOrder)) patch.projectOrder = strList(settingsRes.projectOrder);
        if (Array.isArray(settingsRes.navOrder)) patch.navOrder = strList(settingsRes.navOrder);
        if (Array.isArray(settingsRes.doneCalendarEvents)) patch.doneCalendarEvents = strList(settingsRes.doneCalendarEvents);
        if (isDayOrder(settingsRes.dayOrder)) patch.dayOrder = settingsRes.dayOrder as DayOrder;
        if (settingsRes.notifPrefs) patch.notifPrefs = normalizeNotifPrefs(settingsRes.notifPrefs);
        if (isWorkspaceName(settingsRes.workspaceName)) patch.workspaceName = settingsRes.workspaceName as string;
        if (Number(settingsRes.dailyCapacity) > 0) patch.dailyCapacity = Number(settingsRes.dailyCapacity);
        if (isThemeId(settingsRes.theme) && settingsRes.theme !== get().theme) { patch.theme = settingsRes.theme as string; applyTheme(settingsRes.theme as string); }
        if (settingsRes.styleTheme) {
          const st = normalizeStyle(settingsRes.styleTheme);
          const cur = get().styleTheme;
          if (st.font !== cur.font || st.cards !== cur.cards || st.bg !== cur.bg) { patch.styleTheme = st; applyStyle(st); }
        }
      }
      set(patch);
    } catch (err) {
      console.error('refresh failed', err);
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
        // Track when a task transitions to/from done, so done tasks can be sorted by most-recently-completed
        if (t.status !== undefined && t.status !== x.status) {
          if (t.status === 'done') patch.completedAt = Date.now();
          else if (x.status === 'done') patch.completedAt = undefined;
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
        t.id !== id ? t : {
          ...t,
          status: t.status === 'done' ? 'todo' : 'done',
          completedAt: t.status === 'done' ? undefined : Date.now(),
        }
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
          completedAt: undefined,
          plannedDate: undefined,
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
    set(s => ({ plannerEvents: s.plannerEvents.map(e => {
      if (e.id !== id) return e;
      const next = { ...e, ...data };
      // Remember when it was ticked off (cleared if unticked) for the weekly report
      if (data.done !== undefined && data.done !== e.done) next.completedAt = data.done ? Date.now() : undefined;
      return next;
    }) }));
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
    set(s => ({ toasts: [...s.toasts, toast].slice(-4) }));
    setTimeout(() => get().removeToast(toast.id), t.type === 'alert' ? 15000 : 6000);
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

  // ── Notifications ──
  notify: ({ kind, title, message, target }) => {
    const { notifPrefs: p, addToast } = get();
    const item: NotifItem = { id: uid(), kind, title, message, at: Date.now(), read: false, target };
    const notifications = [item, ...get().notifications].slice(0, NOTIFS_MAX);
    set({ notifications });
    saveJson(NOTIFS_KEY, notifications);
    addToast({ title, message, type: 'alert', kind, notifId: item.id });
    // Quiet hours: still logged and shown in the app, just no sound or system pop-up
    if (inQuietHours(p)) return;
    if (p.sound) playSound(p.soundId, p.volume);
    if (p.desktop) showOSNotification(title, message, item.id);
  },

  openNotification: (id) => {
    const n = get().notifications.find(x => x.id === id);
    get().markNotifRead(id);
    set(s => ({ toasts: s.toasts.filter(t => t.notifId !== id) }));
    const t = n?.target;
    if (!t) return;
    if (t.view === 'report') { get().downloadWeeklyReport(t.week ?? addDaysIso(mondayOf(todayIso()), -7)); return; }
    if (t.taskId && t.projectId && get().tasks.some(x => x.id === t.taskId)) get().navigateToTask(t.taskId, t.projectId);
    else get().setView(t.view, t.projectId);
  },

  markNotifRead: (id) => {
    const notifications = get().notifications.map(n => (n.id === id ? { ...n, read: true } : n));
    set({ notifications });
    saveJson(NOTIFS_KEY, notifications);
  },

  markAllNotifsRead: () => {
    const notifications = get().notifications.map(n => (n.read ? n : { ...n, read: true }));
    set({ notifications });
    saveJson(NOTIFS_KEY, notifications);
  },

  clearNotifications: () => {
    set({ notifications: [] });
    saveJson(NOTIFS_KEY, []);
  },

  snoozeNotification: (id, minutes) => {
    const n = get().notifications.find(x => x.id === id);
    if (!n) return;
    const snoozed = loadJson<Snoozed[]>(SNOOZE_KEY, []);
    snoozed.push({ due: Date.now() + minutes * 60_000, item: { kind: n.kind, title: n.title, message: n.message, target: n.target } });
    saveJson(SNOOZE_KEY, snoozed);
    get().markNotifRead(id);
    set(s => ({ toasts: s.toasts.filter(t => t.notifId !== id) }));
    get().addToast({ title: 'Snoozed', message: `We'll remind you again in ${minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}.`, type: 'info' });
  },

  // Build a week's report (with calendar meetings) and download it as a PDF
  downloadWeeklyReport: async (weekStart) => {
    const s = get();
    const enabled = new Set(s.calendarSources.filter(c => c.enabled).map(c => c.id));
    let cal: CalendarEvent[] = [];
    if (enabled.size) {
      try {
        const res = await api(`/api/calendars/events?from=${addDaysIso(weekStart, -49)}&to=${addDaysIso(weekStart, 6)}`) as { events?: CalendarEvent[] };
        cal = (res.events ?? []).filter(e => enabled.has(e.sourceId));
      } catch { /* the report still works without calendar meetings */ }
    }
    const live = s.projects.filter(p => !s.archivedProjectIds.includes(p.id));
    const liveIds = new Set(live.map(p => p.id));
    const report = buildWeeklyReport({
      tasks: s.tasks.filter(t => !s.archivedTaskIds.includes(t.id) && liveIds.has(t.projectId)),
      projects: live, plannerEvents: s.plannerEvents, plannerAppointments: s.plannerAppointments,
      plannerWeekly: s.plannerWeekly, calendarEvents: cal, today: todayIso(),
    }, weekStart);
    const { buildReportPdf, saveBytes } = await import('@/lib/reportPdf');
    let accent = '';
    try { accent = getComputedStyle(document.documentElement).getPropertyValue('--primary-dark'); } catch {}
    saveBytes(buildReportPdf(report, { accentHex: accent, workspace: selectWorkspaceName(s) }), `Weekly report ${report.start}.pdf`);
  },

  setNotifPrefs: (patch) => {
    const notifPrefs = normalizeNotifPrefs({ ...get().notifPrefs, ...patch });
    set({ notifPrefs });
    api('/api/settings/notifPrefs', 'PUT', { value: notifPrefs }).catch(console.error);
  },

  // ── Alert check: runs every 30s; fired ids are remembered per device ──
  runAlertCheck: () => {
    const { tasks, projects, plannerAppointments, notifiedAlerts, notifPrefs: p, archivedTaskIds, archivedProjectIds, notify } = get();
    const now = Date.now();
    const today = todayIso();
    const tomorrow = addDaysIso(today, 1);
    const fired = new Set(notifiedAlerts);
    let changed = false;
    const mark = (id: string) => { fired.add(id); changed = true; };

    // Snoozed reminders coming back
    const snoozed = loadJson<Snoozed[]>(SNOOZE_KEY, []);
    if (snoozed.length) {
      const due = snoozed.filter(x => x.due <= now);
      if (due.length) {
        saveJson(SNOOZE_KEY, snoozed.filter(x => x.due > now));
        due.forEach(x => notify({ ...x.item, title: `${x.item.title} (snoozed)` }));
      }
    }

    // Task alerts
    const liveProjects = new Set(projects.filter(pr => !archivedProjectIds.includes(pr.id)).map(pr => pr.id));
    tasks.forEach(t => {
      if (!t.due || t.status === 'done' || !t.alerts?.length) return;
      if (archivedTaskIds.includes(t.id) || !liveProjects.has(t.projectId)) return;
      const dueAt = new Date(t.dueTime ? `${t.due}T${t.dueTime}` : `${t.due}T23:59:59`).getTime();
      (t.alerts ?? []).forEach((alert, i) => {
        // Keyed on the due date/time too, so rescheduling re-arms the alert (older ids had no suffix)
        const alertId = `${t.id}_${i}_${t.due}${t.dueTime ?? ''}`;
        if (fired.has(alertId) || fired.has(`${t.id}_${i}`)) return;
        const ms = alert.unit === 'minutes' ? alert.value * 60_000 : alert.unit === 'hours' ? alert.value * 3_600_000 : alert.value * 86_400_000;
        if (now < dueAt - ms) return;
        mark(alertId);
        // Long past (e.g. first visit on a new device): remember it quietly instead of a burst of old alerts
        if (now > dueAt + 12 * 3_600_000) return;
        if (!p.taskAlerts) return;
        const day = t.due === today ? 'today' : t.due === tomorrow ? 'tomorrow' : `on ${new Date(t.due + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
        const when = now > dueAt ? 'is now overdue' : t.dueTime ? `is due ${day} at ${fmtClock(t.dueTime)}` : `is due ${day}`;
        notify({ kind: 'task', title: 'Task reminder', message: `"${t.title}" ${when}`, target: { view: 'project', projectId: t.projectId, taskId: t.id } });
      });
    });

    // Planner meeting alerts
    plannerAppointments.forEach(a => {
      if (a.alertMinutes == null || a.alertMinutes < 0 || a.done || !a.time) return;
      const alertId = `appt_${a.id}_${a.date}T${a.time}_${a.alertMinutes}`;
      if (fired.has(alertId) || fired.has(`appt_${a.id}`)) return;
      const startAt = new Date(`${a.date}T${a.time}`).getTime();
      if (now < startAt - a.alertMinutes * 60_000) return;
      mark(alertId);
      if (now > startAt + 15 * 60_000 || !p.meetingAlerts) return;
      const mins = Math.round((startAt - now) / 60_000);
      notify({ kind: 'meeting', title: 'Meeting reminder', message: `"${a.title}" starts ${mins <= 0 ? 'now' : leadLabel(mins)} · ${fmtClock(a.time)}`, target: { view: 'planner' } });
    });

    if (changed) {
      const ids = Array.from(fired).slice(-NOTIFIED_MAX);
      set({ notifiedAlerts: ids });
      saveNotified(ids);
    }

    // Calendar reminders and the daily digest need today's calendar events
    const afterEvents = () => {
      const s = get();
      const fired2 = new Set(s.notifiedAlerts);
      let changed2 = false;
      const enabled = new Set(s.calendarSources.filter(c => c.enabled).map(c => c.id));
      const nameOf = new Map(s.calendarSources.map(c => [c.id, c.name]));
      const events = reminderEvents.filter(e => enabled.has(e.sourceId));

      if (p.calendarAlerts) {
        events.forEach(e => {
          if (e.allDay || s.doneCalendarEvents.includes(e.id)) return;   // ticked off already: no reminder
          const startAt = Date.parse(e.start);
          const alertId = `cal_${e.id}_${e.start}`;
          if (fired2.has(alertId) || now < startAt - p.calendarLead * 60_000) return;
          fired2.add(alertId); changed2 = true;
          if (now > startAt + 5 * 60_000) return;
          const mins = Math.round((startAt - now) / 60_000);
          const at = new Date(startAt);
          const clock = fmtClock(`${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`);
          notify({ kind: 'calendar', title: nameOf.get(e.sourceId) ?? 'Calendar', message: `"${e.title}" starts ${mins <= 0 ? 'now' : leadLabel(mins)} · ${clock}`, target: { view: 'today' } });
        });
      }

      // Morning digest, once a day, after the chosen time
      const nowD = new Date();
      const hm = `${String(nowD.getHours()).padStart(2, '0')}:${String(nowD.getMinutes()).padStart(2, '0')}`;
      if (p.digest && hm >= p.digestTime && loadJson<string>(DIGEST_KEY, '') !== today) {
        saveJson(DIGEST_KEY, today);
        const open = s.tasks.filter(t => t.status !== 'done' && !s.archivedTaskIds.includes(t.id) && liveProjects.has(t.projectId));
        const dueToday = open.filter(t => t.due === today).length;
        const overdue = open.filter(t => t.due && t.due < today).length;
        const meetings = s.plannerAppointments.filter(a => a.date === today).length
          + events.filter(e => (e.allDay ? (e.startDate ?? '') <= today && today < (e.endDate ?? '') : isoDate(new Date(e.start)) === today)).length;
        const parts = [
          dueToday && `${dueToday} task${dueToday !== 1 ? 's' : ''} due today`,
          overdue && `${overdue} overdue`,
          meetings && `${meetings} meeting${meetings !== 1 ? 's' : ''}`,
        ].filter(Boolean);
        if (parts.length) notify({ kind: 'digest', title: 'Your day', message: parts.join(' · '), target: { view: 'today' } });
      }

      // Weekly report: once per new week, after the summary time, announce last week's report
      const lastWeek = addDaysIso(mondayOf(today), -7);
      if (p.weeklyReport && hm >= p.digestTime && loadJson<string>(REPORT_KEY, '') !== lastWeek) {
        saveJson(REPORT_KEY, lastWeek);
        const live = s.projects.filter(pr => !s.archivedProjectIds.includes(pr.id));
        const r = buildWeeklyReport({
          tasks: s.tasks.filter(t => !s.archivedTaskIds.includes(t.id) && liveProjects.has(t.projectId)),
          projects: live, plannerEvents: s.plannerEvents, plannerAppointments: s.plannerAppointments,
          plannerWeekly: s.plannerWeekly, calendarEvents: [], today,
        }, lastWeek);
        if (r.done > 0 || r.planned > 0) {
          const parts = [`${r.done} finished`, r.rate !== null ? `${r.rate}% of plan` : '', r.overdueNow ? `${r.overdueNow} overdue` : ''].filter(Boolean);
          notify({ kind: 'digest', title: 'Your weekly report is ready', message: `${weekLabel(lastWeek)}: ${parts.join(' · ')}`, target: { view: 'report', week: lastWeek } });
        }
      }

      if (changed2) {
        const ids = Array.from(fired2).slice(-NOTIFIED_MAX);
        set({ notifiedAlerts: ids });
        saveNotified(ids);
      }
    };

    const wantEvents = get().calendarSources.some(c => c.enabled) && (p.calendarAlerts || p.digest);
    if (wantEvents && now - reminderFetchedAt > 10 * 60_000 && !reminderFetching) {
      reminderFetching = true;
      api(`/api/calendars/events?from=${today}&to=${tomorrow}`)
        .then((res: { events?: CalendarEvent[] }) => { reminderEvents = res.events ?? []; reminderFetchedAt = Date.now(); })
        .catch(() => { reminderFetchedAt = Date.now() - 8 * 60_000; })   // retry in ~2 min
        .finally(() => { reminderFetching = false; afterEvents(); });
    } else if (!reminderFetching) {
      if (!wantEvents) reminderEvents = [];
      afterEvents();
    }
  },

  // ── Archive ──
  // Archive is synced via the 'archive' setting so every browser shows the same thing
  archiveProject: (id) => {
    const s = get();
    const newIds = s.archivedProjectIds.includes(id) ? s.archivedProjectIds : [...s.archivedProjectIds, id];
    set({ archivedProjectIds: newIds });
    saveArchived({ projectIds: newIds, taskIds: s.archivedTaskIds });
  },
  unarchiveProject: (id) => {
    const s = get();
    const newIds = s.archivedProjectIds.filter(x => x !== id);
    set({ archivedProjectIds: newIds });
    saveArchived({ projectIds: newIds, taskIds: s.archivedTaskIds });
  },
  archiveTask: (id) => {
    const s = get();
    const newIds = s.archivedTaskIds.includes(id) ? s.archivedTaskIds : [...s.archivedTaskIds, id];
    set({ archivedTaskIds: newIds });
    saveArchived({ projectIds: s.archivedProjectIds, taskIds: newIds });
  },
  unarchiveTask: (id) => {
    const s = get();
    const newIds = s.archivedTaskIds.filter(x => x !== id);
    set({ archivedTaskIds: newIds });
    saveArchived({ projectIds: s.archivedProjectIds, taskIds: newIds });
  },

  // ── Project ordering ──
  setProjectOrder: (ids) => {
    set({ projectOrder: ids });
    saveProjectOrder(ids);
  },

  setAreaFilter: (area) => {
    try { localStorage.setItem(AREA_KEY, area); } catch {}
    set({ areaFilter: area });
  },

  setQuickAddOpen: (open) => set({ quickAddOpen: open }),

  setDayOrder: (date, keys) => {
    const dayOrder = pruneDayOrder({ ...get().dayOrder, [date]: keys.slice(0, 200) }, todayIso());
    set({ dayOrder });
    api('/api/settings/dayOrder', 'PUT', { value: dayOrder }).catch(console.error);
  },

  setStyleTheme: (patch) => {
    const st = normalizeStyle({ ...get().styleTheme, ...patch });
    set({ styleTheme: st });
    applyStyle(st);
    api('/api/settings/styleTheme', 'PUT', { value: st }).catch(console.error);
  },

  toggleCalendarEventDone: (id) => {
    const cur = get().doneCalendarEvents;
    // Newest last; keep the list bounded (old ticks for long-past events fall off)
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id].slice(-500);
    set({ doneCalendarEvents: next });
    api('/api/settings/doneCalendarEvents', 'PUT', { value: next }).catch(console.error);
  },

  setNavOrder: (ids) => {
    set({ navOrder: ids });
    api('/api/settings/navOrder', 'PUT', { value: ids }).catch(console.error);
  },

  setWorkspaceName: (name) => {
    const value = cleanWorkspaceName(name);
    // Typing the default back in is the same as resetting it
    const stored = value === defaultWorkspaceName(get().user) ? '' : value;
    set({ workspaceName: stored });
    api('/api/settings/workspaceName', 'PUT', { value: stored }).catch(console.error);
  },

  setTheme: (id) => {
    if (!isThemeId(id)) return;
    set({ theme: id });
    applyTheme(id);
    api('/api/settings/theme', 'PUT', { value: id }).catch(console.error);
  },

  // ── Subscribed calendars ──
  setCalendarsOpen: (open) => set({ calendarsOpen: open }),

  ensureCalendarRange: async (from, to, fresh = false) => {
    const { calendarWindow, calendarSources } = get();
    if (!calendarSources.some(c => c.enabled)) { set({ calendarEvents: [], calendarErrors: {} }); return; }
    if (!fresh && calendarWindow && calendarWindow.from <= from && calendarWindow.to >= to) return;
    // Fetch a window that also covers today (±1 week) when it's close by, so Today and the planner share one load
    const t = todayIso();
    let wFrom = from, wTo = to;
    if (addDaysIso(t, -7) < wFrom && wFrom <= addDaysIso(t, 35)) wFrom = addDaysIso(t, -7);
    if (wTo < addDaysIso(t, 7) && wTo >= addDaysIso(t, -35)) wTo = addDaysIso(t, 7);
    set({ calendarWindow: { from: wFrom, to: wTo } });
    try {
      const res = await api(`/api/calendars/events?from=${wFrom}&to=${wTo}${fresh ? '&fresh=1' : ''}`) as { events: CalendarEvent[]; errors: { sourceId: string; message: string }[] };
      // Ignore a stale response if the window moved while loading
      const w = get().calendarWindow;
      if (!w || w.from !== wFrom || w.to !== wTo) return;
      const calendarErrors: Record<string, string> = {};
      for (const e of res.errors ?? []) calendarErrors[e.sourceId] = e.message;
      set({ calendarEvents: res.events ?? [], calendarErrors });
    } catch (err) {
      console.error('calendar load failed', err);
      set({ calendarWindow: null });
    }
  },

  // fresh: ask the server to download each feed again instead of using its 10-minute copy
  refreshCalendars: async ({ fresh = false } = {}) => {
    const w = get().calendarWindow;
    set({ calendarWindow: null });
    const t = todayIso();
    if (fresh) reminderFetchedAt = 0;   // reminders pick up the new events on the next check
    await get().ensureCalendarRange(w?.from ?? t, w?.to ?? t, fresh);
  },

  addCalendarSource: async ({ name, url, color }) => {
    const res = await fetch('/api/calendars', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: uid(), name, url, color }),
    }).catch(() => null);
    if (!res) return "Couldn't reach the server. Check your connection and try again.";
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return body.error ?? "Couldn't add that calendar.";
    set(s => ({ calendarSources: [...s.calendarSources, body as CalendarSource] }));
    await get().refreshCalendars();
    return null;
  },

  updateCalendarSource: async (id, patch) => {
    const res = await fetch(`/api/calendars/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    }).catch(() => null);
    if (!res) return "Couldn't reach the server. Check your connection and try again.";
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return body.error ?? "Couldn't update that calendar.";
    set(s => ({ calendarSources: s.calendarSources.map(c => c.id === id ? body as CalendarSource : c) }));
    await get().refreshCalendars();
    return null;
  },

  deleteCalendarSource: async (id) => {
    set(s => ({
      calendarSources: s.calendarSources.filter(c => c.id !== id),
      calendarEvents: s.calendarEvents.filter(e => e.sourceId !== id),
    }));
    await api(`/api/calendars/${id}`, 'DELETE').catch(console.error);
  },

  setDailyCapacity: (mins) => {
    set({ dailyCapacity: mins });
    api('/api/settings/dailyCapacity', 'PUT', { value: mins }).catch(console.error);
  },
}));

/** The name to show: the user's custom name, or "{First name}'s workspace". */
export function selectWorkspaceName(s: { workspaceName: string; user: { name: string; email: string } | null }): string {
  return s.workspaceName || defaultWorkspaceName(s.user);
}
