import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPlannerAppointment } from '@/lib/apiHelpers';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const appt = await prisma.plannerAppointment.update({
    where: { id: params.id },
    data: {
      title: body.title,
      date:  body.date,
      time:  body.time,
      notes: body.notes ?? '',
      done:  body.done ?? false,
    },
  });
  return NextResponse.json(toPlannerAppointment(appt as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.plannerAppointment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
