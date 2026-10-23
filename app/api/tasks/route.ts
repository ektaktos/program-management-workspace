import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTask } from '@/lib/apiHelpers';
import { notFound, ownsProject, requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const tasks = await prisma.task.findMany({ where: { project: { userId } } });
  return NextResponse.json(tasks.map(t => toTask(t as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  if (!(await ownsProject(userId, body.projectId))) return notFound();

  const task = await prisma.task.create({
    data: {
      id:          body.id,
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
  return NextResponse.json(toTask(task as Record<string, unknown>), { status: 201 });
}
