import { Alert, Note, Subtask, Task } from './types';

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
