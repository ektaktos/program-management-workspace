import { Alert, Note, PlannerAppointment, PlannerEvent, PlannerWeekData, Subtask, Task, Todo } from './types';

function toMsOrUndefined(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') return new Date(v).getTime();
  return Number(v);
}

export function toTask(t: Record<string, unknown>): Task {
  return {
    id:          t.id as string,
    projectId:   t.projectId as string,
    phaseId:     (t.phaseId as string) ?? undefined,
    title:       t.title as string,
    description: t.description as string,
    status:      t.status as Task['status'],
    priority:    t.priority as Task['priority'],
    due:         (t.due as string) ?? undefined,
    dueTime:     (t.dueTime as string) ?? undefined,
    assignee:    (t.assignee as string) ?? undefined,
    alerts:      (t.alerts as Alert[]) ?? [],
    recurring:   (t.recurring as string) ?? undefined,
    subtasks:    (t.subtasks as Subtask[]) ?? [],
    completedAt: toMsOrUndefined(t.completedAt),
  };
}

export function toNote(n: Record<string, unknown>): Note {
  return {
    id:        n.id as string,
    projectId: n.projectId as string,
    title:     n.title as string,
    body:      n.body as string,
    tags:      (n.tags as string[]) ?? [],
    createdAt: n.createdAt instanceof Date
      ? n.createdAt.getTime()
      : typeof n.createdAt === 'string'
        ? new Date(n.createdAt).getTime()
        : Number(n.createdAt),
  };
}

function toMs(createdAt: unknown): number {
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === 'string') return new Date(createdAt).getTime();
  return Number(createdAt);
}

export function toTodo(t: Record<string, unknown>): Todo {
  return {
    id:        t.id as string,
    text:      t.text as string,
    done:      Boolean(t.done),
    createdAt: toMs(t.createdAt),
  };
}

export function toPlannerEvent(e: Record<string, unknown>): PlannerEvent {
  return {
    id:        e.id as string,
    title:     e.title as string,
    date:      e.date as string,
    category:  e.category as string,
    notes:     (e.notes as string) ?? '',
    done:      Boolean(e.done),
    time:      (e.time as string) ?? undefined,
    createdAt: toMs(e.createdAt),
  };
}

export function toPlannerAppointment(a: Record<string, unknown>): PlannerAppointment {
  return {
    id:        a.id as string,
    title:     a.title as string,
    date:      a.date as string,
    time:      a.time as string,
    notes:     (a.notes as string) ?? '',
    done:      Boolean(a.done),
    createdAt: toMs(a.createdAt),
  };
}

export function toPlannerWeekly(w: Record<string, unknown>): { weekKey: string; data: PlannerWeekData } {
  return {
    weekKey: w.weekKey as string,
    data: {
      goals:      (w.goals as PlannerWeekData['goals']) ?? [],
      notes:      (w.notes as string) ?? '',
      focus:      (w.focus as string) ?? '',
      focusItems: (w.focusItems as PlannerWeekData['focusItems']) ?? [],
    },
  };
}
