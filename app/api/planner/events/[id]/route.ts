import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPlannerEvent } from '@/lib/apiHelpers';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const event = await prisma.plannerEvent.update({
    where: { id: params.id },
    data: {
      title:    body.title,
      date:     body.date,
      category: body.category,
      notes:    body.notes ?? '',
      done:     body.done ?? false,
      time:     body.time ?? null,
    },
  });
  return NextResponse.json(toPlannerEvent(event as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.plannerEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
