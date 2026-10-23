import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPlannerAppointment } from '@/lib/apiHelpers';
import { notFound, requireUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const { count } = await prisma.plannerAppointment.updateMany({
    where: { id: params.id, userId },
    data: {
      title: body.title,
      date:  body.date,
      time:  body.time,
      notes: body.notes ?? '',
      done:  body.done ?? false,
    },
  });
  if (!count) return notFound();

  const appt = await prisma.plannerAppointment.findUnique({ where: { id: params.id } });
  return NextResponse.json(toPlannerAppointment(appt as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { count } = await prisma.plannerAppointment.deleteMany({ where: { id: params.id, userId } });
  if (!count) return notFound();
  return NextResponse.json({ ok: true });
}
