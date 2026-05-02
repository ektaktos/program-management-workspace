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
  return {
    projects: [
      { id: 'mond8mndfiqx', name: 'SCD Symposium 2026', type: 'Team / Work', status: 'Active', start: '2026-05-01', end: '2026-09-10', description: 'Supporting the planning of the upcoming sickle cell disease symposium 2026', color: '#d4b896' },
    ],
    tasks: [
      { id: 'mondhwtavpir', projectId: 'mond8mndfiqx', phaseId: 'monda3m58l72', title: 'Email Sarim to update Slide deck', description: '', priority: 'medium', status: 'done', due: '2026-05-01', dueTime: '22:30', assignee: 'Oyin', alerts: [{ amount: 10, unit: 'minutes' }] },
      { id: 'monhzjdp8ild', projectId: 'mond8mndfiqx', phaseId: 'monda3m58l72', title: 'Send meeting Summary', description: '', priority: 'medium', status: 'done', due: '2026-05-01', dueTime: '20:00', assignee: 'Oyin', alerts: [{ amount: 30, unit: 'minutes' }] },
      { id: 'moni8blze391', projectId: 'mond8mndfiqx', phaseId: 'monda3m58l72', title: 'Create two versions of posters', description: '', priority: 'high', status: 'inreview', due: '2026-05-04', dueTime: '12:00', assignee: 'Oyin', alerts: [{ amount: 1, unit: 'days' }] },
      { id: 'monimjeebu0v', projectId: 'mond8mndfiqx', phaseId: 'monda3m58l72', title: 'Update Agenda', description: '', priority: 'medium', status: 'todo', due: '2026-05-05', dueTime: '17:00', assignee: '', alerts: [] },
      { id: 'monio3cre0x6', projectId: 'mond8mndfiqx', phaseId: 'monda3m58l72', title: 'Email to Nafesa', description: '', priority: 'medium', status: 'overdue', due: '2026-05-02', dueTime: '09:00', assignee: '', alerts: [] },
      { id: 'monjc4fwf7pk', projectId: 'mond8mndfiqx', phaseId: 'monda3m58l72', title: 'Panelist Invitation Draft', description: '', priority: 'medium', status: 'todo', due: '2026-05-05', dueTime: '13:00', assignee: 'Oyin', alerts: [] },
      { id: 'monk0oq53m0z', projectId: 'mond8mndfiqx', phaseId: 'monda3m58l72', title: 'Follow up on Sarim for slide deck', description: '', priority: 'medium', status: 'todo', due: '2026-05-05', dueTime: '11:00', assignee: '', alerts: [] },
    ],
    milestones: [],
    phases: [
      { id: 'monda3m58l72', projectId: 'mond8mndfiqx', name: 'Pre-event planning (May)', start: '2026-05-01', end: '2026-05-31', progress: 0, notes: '' },
      { id: 'mondbu6vb2i8', projectId: 'mond8mndfiqx', name: 'Event pahse', start: '2026-08-01', end: '2026-09-10', progress: 0, notes: '' },
    ],
    notes: [],
    notifiedAlerts: [],
  };
}
