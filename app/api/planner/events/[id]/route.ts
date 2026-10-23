import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPlannerEvent } from '@/lib/apiHelpers';
import { notFound, requireUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const { count } = await prisma.plannerEvent.updateMany({
    where: { id: params.id, userId },
    data: {
      title:    body.title,
      date:     body.date,
      category: body.category,
      notes:    body.notes ?? '',
      done:     body.done ?? false,
      time:     body.time ?? null,
      projectId: body.projectId ?? null,
      estimate:  body.estimate ?? null,
      completedAt: body.done && body.completedAt ? new Date(body.completedAt) : null,
    },
  });
  if (!count) return notFound();

  const event = await prisma.plannerEvent.findUnique({ where: { id: params.id } });
  return NextResponse.json(toPlannerEvent(event as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { count } = await prisma.plannerEvent.deleteMany({ where: { id: params.id, userId } });
  if (!count) return notFound();
  return NextResponse.json({ ok: true });
}
