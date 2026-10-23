import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTask } from '@/lib/apiHelpers';
import { notFound, ownsProject, requireUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  if (!(await ownsProject(userId, body.projectId))) return notFound();

  const { count } = await prisma.task.updateMany({
    where: { id: params.id, project: { userId } },
    data: {
      projectId:   body.projectId,
      phaseId:     body.phaseId   ?? null,
      title:       body.title,
      description: body.description ?? '',
      status:      body.status,
      priority:    body.priority,
      due:         body.due      ?? null,
      dueTime:     body.dueTime  ?? null,
      assignee:    body.assignee ?? null,
      alerts:      body.alerts   ?? [],
      recurring:   body.recurring ?? null,
      subtasks:    body.subtasks  ?? [],
      completedAt: body.completedAt ? new Date(body.completedAt) : null,
      estimate:    body.estimate ?? null,
      plannedDate: body.plannedDate ?? null,
    },
  });
  if (!count) return notFound();

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  return NextResponse.json(toTask(task as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { count } = await prisma.task.deleteMany({ where: { id: params.id, project: { userId } } });
  if (!count) return notFound();
  return NextResponse.json({ ok: true });
}
