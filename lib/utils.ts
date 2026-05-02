import { Task, AppState } from './types';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function taskDueDateTime(t: Task): Date {
  return t.dueTime
    ? new Date(`${t.due}T${t.dueTime}`)
    : new Date(`${t.due}T23:59:59`);
}

export function autoMarkOverdue(tasks: Task[]): { tasks: Task[]; changed: boolean } {
  const now = new Date();
  let changed = false;
  const updated = tasks.map(t => {
    if (t.status !== 'done' && t.status !== 'overdue' && t.due) {
      const due = taskDueDateTime(t);
      if (due < now) {
        changed = true;
        return { ...t, status: 'overdue' as const };
      }
    }
    return t;
  });
  return { tasks: updated, changed };
}

export function sortTasks(tasks: Task[]): Task[] {
  const statusRank: Record<string, number> = { overdue: 0, inprogress: 1, inreview: 2, todo: 3, done: 99 };
  const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    const ra = statusRank[a.status] ?? 3;
    const rb = statusRank[b.status] ?? 3;
    if (ra !== rb) return ra - rb;
    return (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function calcProjectProgress(projectId: string, tasks: Task[]): number {
  const pt = tasks.filter(t => t.projectId === projectId);
  if (pt.length === 0) return 0;
  const done = pt.filter(t => t.status === 'done').length;
  return Math.round((done / pt.length) * 100);
}

export function getOverdueCount(projectId: string, tasks: Task[]): number {
  return tasks.filter(t => t.projectId === projectId && t.status === 'overdue').length;
}

export function getSeedData(): AppState {
  const now = new Date();
  const p1id = uid(), p2id = uid(), p3id = uid();
  const t1 = uid(), t2 = uid(), t3 = uid(), t4 = uid();
  const t5 = uid(), t6 = uid(), t7 = uid();
  const t8 = uid(), t9 = uid();
  const m1 = uid(), m2 = uid();
  const n1 = uid(), n2 = uid();

  return {
    projects: [
      { id: p1id, name: 'Spring Brand Refresh', type: 'Team / Work', description: 'Refreshing our brand identity for Q2 — new palette, typography, and updated copy across all touchpoints.', status: 'Active', color: '#b6a4e8', start: '2026-04-01', end: '2026-05-23' },
      { id: p2id, name: 'Quarterly Research Report', type: 'Research / Academic', description: 'Synthesising user interview findings and usage data into a polished quarterly report for stakeholders.', status: 'Active', color: '#f5c5d3', start: '2026-04-15', end: '2026-05-12' },
      { id: p3id, name: 'Garden Renovation', type: 'Personal / Side Project', description: 'Planning and executing a full redesign of the back garden — new layout, raised beds, and planting scheme.', status: 'Planning', color: '#b9dfc8', end: '2026-07-01' },
    ],
    tasks: [
      { id: t1, projectId: p1id, title: 'Finalize new color palette', description: 'Review shortlisted swatches and lock in primary + accent colors.', status: 'inreview', priority: 'high', due: '2026-05-04', assignee: 'Mira', alerts: [] },
      { id: t2, projectId: p1id, title: 'Draft typography guidelines', description: 'Define heading and body typefaces, scale, and usage rules.', status: 'inprogress', priority: 'medium', due: '2026-05-07', assignee: 'You', alerts: [] },
      { id: t3, projectId: p1id, title: 'Audit homepage copy', description: 'Review all homepage copy against new brand voice guidelines.', status: 'todo', priority: 'low', due: '2026-05-11', alerts: [] },
      { id: t4, projectId: p1id, title: 'Kickoff sync notes', description: 'Write up and share the notes from the brand kickoff meeting.', status: 'done', priority: 'low', alerts: [] },
      { id: t5, projectId: p2id, title: 'Synthesize interview themes', description: 'Group findings from 12 interviews into clear thematic clusters.', status: 'inprogress', priority: 'high', due: '2026-05-03', assignee: 'You', alerts: [] },
      { id: t6, projectId: p2id, title: 'Draft executive summary', description: 'Write the two-page executive summary for non-technical stakeholders.', status: 'todo', priority: 'high', due: '2026-05-09', alerts: [] },
      { id: t7, projectId: p2id, title: 'Send report for review', description: 'Share the near-final report with the research lead for sign-off.', status: 'todo', priority: 'medium', due: '2026-05-11', alerts: [] },
      { id: t8, projectId: p3id, title: 'Sketch layout options', description: 'Draw up three different layout options for the new garden design.', status: 'todo', priority: 'medium', due: '2026-05-14', alerts: [] },
      { id: t9, projectId: p3id, title: 'Research raised bed suppliers', description: 'Get quotes from at least two raised bed suppliers.', status: 'done', priority: 'low', alerts: [] },
    ],
    milestones: [
      { id: m1, projectId: p1id, title: 'Brand Guidelines v1', desc: 'First complete version of the brand guidelines document.', date: '2026-05-15', status: 'upcoming' },
      { id: m2, projectId: p2id, title: 'Report submitted', desc: 'Final report delivered to stakeholders.', date: '2026-05-12', status: 'upcoming' },
    ],
    phases: [],
    notes: [
      { id: n1, projectId: p2id, title: 'Interview themes — round one', body: 'Three recurring themes emerged from the round one interviews: (1) users want faster onboarding, (2) reporting features feel buried, (3) mobile experience is a growing priority.', tags: ['research', 'themes'], createdAt: now.getTime() - 86400000 * 2 },
      { id: n2, projectId: p2id, title: 'Color direction notes', body: 'Stakeholders responded positively to the warm palette. Keep the blush and butter tones as primaries, use sky blue as a secondary accent.', tags: ['design', 'color'], createdAt: now.getTime() - 86400000 },
    ],
    notifiedAlerts: [],
  };
}
