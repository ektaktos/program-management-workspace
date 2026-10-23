import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPlannerAppointment } from '@/lib/apiHelpers';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const appts = await prisma.plannerAppointment.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(appts.map(a => toPlannerAppointment(a as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const appt = await prisma.plannerAppointment.create({
    data: {
      id:    body.id,
      userId,
      title: body.title,
      date:  body.date,
      time:  body.time,
      notes: body.notes ?? '',
      done:  body.done ?? false,
    },
  });
  return NextResponse.json(toPlannerAppointment(appt as Record<string, unknown>), { status: 201 });
}
