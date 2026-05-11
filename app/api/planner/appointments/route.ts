import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPlannerAppointment } from '@/lib/apiHelpers';

export async function GET() {
  const appts = await prisma.plannerAppointment.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(appts.map(a => toPlannerAppointment(a as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const appt = await prisma.plannerAppointment.create({
    data: {
      id:    body.id,
      title: body.title,
      date:  body.date,
      time:  body.time,
      notes: body.notes ?? '',
      done:  body.done ?? false,
    },
  });
  return NextResponse.json(toPlannerAppointment(appt as Record<string, unknown>), { status: 201 });
}
