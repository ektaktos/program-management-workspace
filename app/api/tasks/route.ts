import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTask } from '@/lib/apiHelpers';

export async function GET() {
  const tasks = await prisma.task.findMany();
  return NextResponse.json(tasks.map(t => toTask(t as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
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
    },
  });
  return NextResponse.json(toTask(task as Record<string, unknown>), { status: 201 });
}
