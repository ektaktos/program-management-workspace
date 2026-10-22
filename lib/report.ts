// Weekly report: one pure function turns the workspace data into a week's numbers, an 8-week
// trend and plain-language observations. Used by the Report view and the Monday notification.

import { CalendarEvent, PlannerAppointment, PlannerEvent, PlannerWeekData, Project, Task } from './types';
import { addDaysIso, isoOf } from './utils';

export interface ReportInput {
  tasks: Task[];
  projects: Project[];
  plannerEvents: PlannerEvent[];
  plannerAppointments: PlannerAppointment[];
  plannerWeekly: Record<string, PlannerWeekData>;
  calendarEvents: CalendarEvent[];     // already limited to enabled calendars
  today: string;                       // YYYY-MM-DD
}

export interface DayStat { iso: string; label: string; planned: number; done: number; meetings: number; meetingMins: number }
export interface WeekPoint { start: string; label: string; done: number; planned: number; rate: number | null }
export interface ProjectRow { id: string; name: string; color: string; done: number; open: number; overdue: number; daysSince: number | null; stalled: boolean }
export interface Insight { tone: 'good' | 'watch' | 'info'; text: string }

export interface WeeklyReport {
  start: string; end: string; label: string; partial: boolean;
  done: number; planned: number; donePlanned: number; extraDone: number;
  rate: number | null; prevDone: number; prevRate: number | null; avgDone: number;
  dueInWeek: number; onTime: number; late: number; missed: number; onTimeRate: number | null;
  overdueNow: number; highOverdue: number; oldestOverdueDays: number | null;
  meetings: number; meetingMins: number; prevMeetings: number;
  goalsDone: number; goalsTotal: number;
  carryOver: { title: string; date: string; project?: string }[];
  days: DayStat[];
  trend: WeekPoint[];
  byPriority: { priority: 'high' | 'medium' | 'low'; done: number; open: number }[];
  byCategory: { name: string; done: number }[];
  hours: { label: string; count: number }[];   // completions by 2-hour block, last 8 weeks
  hoursSample: number;
  projects: ProjectRow[];
  insights: Insight[];
}

const DAY = 864e5;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function mondayOf(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return addDaysIso(iso, -((d.getDay() + 6) % 7));
}

export function weekLabel(start: string): string {
  const a = new Date(start + 'T00:00:00'), b = new Date(addDaysIso(start, 6) + 'T00:00:00');
  return a.getMonth() === b.getMonth()
    ? `${MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}`
    : `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}`;
}

const inRange = (iso: string | undefined, a: string, b: string) => !!iso && iso >= a && iso <= b;
const dayOfMs = (ms: number) => isoOf(new Date(ms));
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

// The day a project task counts as finished: its completion time, or (older tasks without one) its planned day
function taskDoneDay(t: Task): string | undefined {
  if (t.status !== 'done') return undefined;
  if (t.completedAt) return dayOfMs(t.completedAt);
  return t.plannedDate;
}

function calMinutes(e: CalendarEvent): number {
  if (e.allDay) return 0;
  return Math.max(0, Math.round((Date.parse(e.end) - Date.parse(e.start)) / 60000));
}

// Week totals used for both the chosen week and the trend
function weekCore(inp: ReportInput, start: string) {
  const end = addDaysIso(start, 6);
  const events = inp.plannerEvents.filter(e => inRange(e.date, start, end));
  const plannedTasks = inp.tasks.filter(t => inRange(t.plannedDate, start, end));
  const finishedTasks = inp.tasks.filter(t => inRange(taskDoneDay(t), start, end));
  const donePlanned = events.filter(e => e.done).length + plannedTasks.filter(t => t.status === 'done').length;
  const planned = events.length + plannedTasks.length;
  const plannedIds = new Set(plannedTasks.map(t => t.id));
  const extraDone = finishedTasks.filter(t => !plannedIds.has(t.id)).length;
  return { end, events, plannedTasks, finishedTasks, planned, donePlanned, extraDone, done: donePlanned + extraDone };
}

export function buildWeeklyReport(inp: ReportInput, start: string): WeeklyReport {
  const core = weekCore(inp, start);
  const { end } = core;
  const partial = inp.today <= end;
  const prev = weekCore(inp, addDaysIso(start, -7));

  // ── Day by day ──
  const days: DayStat[] = Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysIso(start, i);
    const ev = core.events.filter(e => e.date === iso);
    const pt = core.plannedTasks.filter(t => t.plannedDate === iso);
    const extra = core.finishedTasks.filter(t => taskDoneDay(t) === iso && !core.plannedTasks.includes(t)).length;
    const appts = inp.plannerAppointments.filter(a => a.date === iso);
    const cal = inp.calendarEvents.filter(e => !e.allDay && dayOfMs(Date.parse(e.start)) === iso);
    const d = new Date(iso + 'T00:00:00');
    return {
      iso, label: `${WEEKDAYS[i]} ${d.getDate()}`,
      planned: ev.length + pt.length,
      done: ev.filter(e => e.done).length + pt.filter(t => t.status === 'done').length + extra,
      meetings: appts.length + cal.length,
      meetingMins: cal.reduce((n, e) => n + calMinutes(e), 0),
    };
  });
  const meetings = days.reduce((n, d) => n + d.meetings, 0);
  const meetingMins = days.reduce((n, d) => n + d.meetingMins, 0);
  const prevMeetings = inp.plannerAppointments.filter(a => inRange(a.date, addDaysIso(start, -7), addDaysIso(start, -1))).length
    + inp.calendarEvents.filter(e => !e.allDay && inRange(dayOfMs(Date.parse(e.start)), addDaysIso(start, -7), addDaysIso(start, -1))).length;

  // ── 8-week trend (oldest first, ending with this week) ──
  const trend: WeekPoint[] = Array.from({ length: 8 }, (_, k) => {
    const s = addDaysIso(start, -7 * (7 - k));
    const c = weekCore(inp, s);
    return { start: s, label: weekLabel(s), done: c.done, planned: c.planned, rate: pct(c.donePlanned, c.planned) };
  });
  const earlier = trend.slice(0, 7).filter(w => w.done > 0 || w.planned > 0);
  const avgDone = earlier.length ? Math.round(earlier.reduce((n, w) => n + w.done, 0) / earlier.length) : 0;

  // ── Deadlines that fell in the week ──
  const dueTasks = inp.tasks.filter(t => inRange(t.due, start, end));
  let onTime = 0, late = 0, missed = 0;
  dueTasks.forEach(t => {
    const dueEnd = new Date(`${t.due}T${t.dueTime ?? '23:59'}:59`).getTime();
    if (t.status === 'done') {
      if (!t.completedAt || t.completedAt <= dueEnd) onTime++; else late++;
    } else if (!partial || t.due! < inp.today) missed++;
  });

  // ── Overdue right now ──
  const liveProjectIds = new Set(inp.projects.map(p => p.id));
  const openTasks = inp.tasks.filter(t => t.status !== 'done' && liveProjectIds.has(t.projectId));
  const overdue = openTasks.filter(t => t.status === 'overdue' || (t.due && t.due < inp.today));
  const oldest = overdue.reduce<string | null>((m, t) => (t.due && (!m || t.due < m) ? t.due : m), null);
  const oldestOverdueDays = oldest ? Math.round((Date.parse(inp.today) - Date.parse(oldest)) / DAY) : null;

  // ── Weekly priorities set in the planner ──
  const goals = inp.plannerWeekly[start]?.goals ?? [];

  // ── Carried over: planned this week, not done ──
  const carryOver = [
    ...core.events.filter(e => !e.done).map(e => ({ title: e.title, date: e.date, project: inp.projects.find(p => p.id === e.projectId)?.name })),
    ...core.plannedTasks.filter(t => t.status !== 'done').map(t => ({ title: t.title, date: t.plannedDate!, project: inp.projects.find(p => p.id === t.projectId)?.name })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // ── Mix: priority (project tasks) and planner categories ──
  const byPriority = (['high', 'medium', 'low'] as const).map(priority => ({
    priority,
    done: core.finishedTasks.filter(t => t.priority === priority).length,
    open: openTasks.filter(t => t.priority === priority).length,
  }));
  const catMap = new Map<string, number>();
  core.events.filter(e => e.done).forEach(e => catMap.set(e.category, (catMap.get(e.category) ?? 0) + 1));
  if (core.finishedTasks.length) catMap.set('project tasks', (catMap.get('project tasks') ?? 0) + core.finishedTasks.length);
  const byCategory = Array.from(catMap.entries()).map(([name, done]) => ({ name, done })).sort((a, b) => b.done - a.done);

  // ── When you get things done: completion times over the last 8 weeks ──
  const since = Date.parse(addDaysIso(start, -49) + 'T00:00:00');
  const until = Date.parse(end + 'T23:59:59');
  const stamps = [
    ...inp.tasks.map(t => t.completedAt),
    ...inp.plannerEvents.map(e => (e.done ? e.completedAt : undefined)),
  ].filter((ms): ms is number => !!ms && ms >= since && ms <= until);
  const hours = Array.from({ length: 12 }, (_, b) => {
    const h = b * 2;
    const fmt = (x: number) => `${x % 12 || 12}${x < 12 ? 'a' : 'p'}`;
    return { label: `${fmt(h)}–${fmt((h + 2) % 24)}`, count: stamps.filter(ms => Math.floor(new Date(ms).getHours() / 2) === b).length };
  });

  // ── Projects: this week's progress and how long since anything moved ──
  const lastMove = (pid: string) => {
    const ms = [
      ...inp.tasks.filter(t => t.projectId === pid && t.status === 'done').map(t => t.completedAt ?? (t.plannedDate ? Date.parse(t.plannedDate) : 0)),
      ...inp.plannerEvents.filter(e => e.projectId === pid && e.done).map(e => e.completedAt ?? Date.parse(e.date)),
    ].filter(Boolean);
    return ms.length ? Math.max(...ms) : null;
  };
  const endMs = Date.parse((partial ? inp.today : end) + 'T23:59:59');
  const projects: ProjectRow[] = inp.projects.map(p => {
    const pt = inp.tasks.filter(t => t.projectId === p.id);
    const open = pt.filter(t => t.status !== 'done');
    const lm = lastMove(p.id);
    const daysSince = lm ? Math.max(0, Math.floor((endMs - lm) / DAY)) : null;
    return {
      id: p.id, name: p.name, color: p.color,
      done: core.finishedTasks.filter(t => t.projectId === p.id).length
        + core.events.filter(e => e.projectId === p.id && e.done).length,
      open: open.length,
      overdue: open.filter(t => t.status === 'overdue' || (t.due && t.due < inp.today)).length,
      daysSince,
      stalled: p.status === 'Active' && open.length > 0 && (daysSince === null || daysSince >= 14),
    };
  }).sort((a, b) => b.done - a.done || b.overdue - a.overdue || a.name.localeCompare(b.name));

  const rate = pct(core.donePlanned, core.planned);
  const prevRate = pct(prev.donePlanned, prev.planned);
  const report: WeeklyReport = {
    start, end, label: weekLabel(start), partial,
    done: core.done, planned: core.planned, donePlanned: core.donePlanned, extraDone: core.extraDone,
    rate, prevDone: prev.done, prevRate, avgDone,
    dueInWeek: dueTasks.length, onTime, late, missed, onTimeRate: pct(onTime, onTime + late + missed),
    overdueNow: overdue.length, highOverdue: overdue.filter(t => t.priority === 'high').length, oldestOverdueDays,
    meetings, meetingMins, prevMeetings,
    goalsDone: goals.filter(g => g.done).length, goalsTotal: goals.length,
    carryOver, days, trend, byPriority, byCategory, hours, hoursSample: stamps.length, projects,
    insights: [],
  };
  report.insights = buildInsights(report);
  return report;
}

function buildInsights(r: WeeklyReport): Insight[] {
  const out: Insight[] = [];
  const diff = r.done - r.prevDone;

  if (r.done === 0 && r.planned === 0) {
    out.push({ tone: 'info', text: r.partial ? 'Nothing planned or finished yet this week.' : 'A quiet week: nothing was planned or finished.' });
    return out;
  }

  // Output vs last week and the 8-week norm
  if (r.prevDone > 0 || r.done > 0) {
    const vs = diff === 0 ? 'the same as last week' : `${Math.abs(diff)} ${diff > 0 ? 'more' : 'fewer'} than last week`;
    out.push({ tone: diff >= 0 ? 'good' : 'watch', text: `You finished ${plural(r.done, 'task')}${r.partial ? ' so far' : ''}, ${vs}.` });
  }
  if (!r.partial && r.avgDone > 0 && Math.abs(r.done - r.avgDone) >= Math.max(3, r.avgDone * 0.25)) {
    out.push({ tone: r.done > r.avgDone ? 'good' : 'watch', text: `That's ${r.done > r.avgDone ? 'above' : 'below'} your recent norm of about ${r.avgDone} a week.` });
  }

  // Plan follow-through
  if (r.rate !== null) {
    const tone = r.rate >= 75 ? 'good' : r.rate >= 50 ? 'info' : 'watch';
    let t = `You completed ${r.rate}% of what you planned (${r.donePlanned} of ${r.planned})`;
    if (r.prevRate !== null && r.prevRate !== r.rate) t += `, ${r.rate > r.prevRate ? 'up' : 'down'} from ${r.prevRate}%`;
    out.push({ tone, text: t + '.' });
  }
  if (r.extraDone >= 3) out.push({ tone: 'info', text: `${plural(r.extraDone, 'task')} got done that weren't on the plan. Planning them in would make your workload easier to see.` });

  // Days: strongest day, and meetings crowding out work
  const worked = r.days.filter(d => d.planned > 0 || d.done > 0);
  if (worked.length >= 3) {
    const best = [...r.days].sort((a, b) => b.done - a.done)[0];
    if (best.done > 0) out.push({ tone: 'good', text: `${best.label.split(' ')[0]} was your most productive day, with ${plural(best.done, 'task')} done.` });
    const heavy = [...r.days].sort((a, b) => b.meetings - a.meetings)[0];
    if (heavy.meetings >= 4) {
      const hr = heavy.planned ? Math.round((Math.min(heavy.done, heavy.planned) / heavy.planned) * 100) : null;
      out.push({
        tone: hr !== null && hr < 50 ? 'watch' : 'info',
        text: `${heavy.label.split(' ')[0]} was your heaviest meeting day (${heavy.meetings} meetings)${hr !== null ? `, and you finished ${hr}% of that day's plan` : ''}.${hr !== null && hr < 50 ? ' Consider planning lighter on big meeting days.' : ''}`,
      });
    }
  }

  // Meeting load
  if (r.meetingMins >= 600) out.push({ tone: 'watch', text: `About ${Math.round(r.meetingMins / 60)} hours went to calendar meetings this week. That leaves less room for focused work.` });
  else if (r.meetings > 0 && r.prevMeetings > 0 && r.meetings >= r.prevMeetings * 1.5) out.push({ tone: 'info', text: `Meetings jumped to ${r.meetings} from ${r.prevMeetings} last week.` });

  // Deadlines
  if (r.onTimeRate !== null && r.onTime + r.late + r.missed >= 2) {
    out.push({ tone: r.onTimeRate >= 80 ? 'good' : 'watch', text: `${r.onTimeRate}% of this week's deadlines were met on time (${r.onTime} of ${r.onTime + r.late + r.missed}).` });
  }
  if (r.overdueNow > 0) {
    let t = `${plural(r.overdueNow, 'task')} ${r.overdueNow === 1 ? 'is' : 'are'} overdue`;
    if (r.highOverdue) t += `, ${r.highOverdue} of them high priority`;
    if (r.oldestOverdueDays && r.oldestOverdueDays >= 14) t += `; the oldest is ${r.oldestOverdueDays} days late`;
    out.push({ tone: 'watch', text: t + '. Reschedule or drop what no longer matters.' });
  }

  // Stalled projects
  const stalled = r.projects.filter(p => p.stalled);
  if (stalled.length) {
    const names = stalled.slice(0, 3).map(p => p.name).join(', ');
    out.push({ tone: 'watch', text: `${stalled.length === 1 ? 'One project hasn’t' : `${stalled.length} projects haven’t`} moved in two weeks or more: ${names}${stalled.length > 3 ? '…' : ''}.` });
  }

  // Weekly priorities
  if (r.goalsTotal > 0) out.push({ tone: r.goalsDone === r.goalsTotal ? 'good' : 'info', text: `Weekly priorities: ${r.goalsDone} of ${r.goalsTotal} done.` });

  // Carry-over
  if (r.carryOver.length >= 3 && !r.partial) out.push({ tone: 'info', text: `${plural(r.carryOver.length, 'planned task')} didn't get done. Carry them into next week or let them go.` });

  // Time of day (only with enough data to mean anything)
  if (r.hoursSample >= 10) {
    const peak = [...r.hours].sort((a, b) => b.count - a.count)[0];
    out.push({ tone: 'info', text: `Over the last 8 weeks you tick things off most often between ${peak.label.replace('–', ' and ')}.` });
  }

  return out;
}
