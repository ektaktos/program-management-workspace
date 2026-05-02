import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTask } from '@/lib/apiHelpers';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const task = await prisma.task.update({
    where: { id: params.id },
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
    },
  });
  return NextResponse.json(toTask(task as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
