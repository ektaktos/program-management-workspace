import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTodo, toPlannerEvent, toPlannerAppointment, toPlannerWeekly } from '@/lib/apiHelpers';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const [todos, events, appointments, weeklies] = await Promise.all([
    prisma.plannerTodo.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.plannerEvent.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.plannerAppointment.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    prisma.plannerWeekly.findMany({ where: { userId } }),
  ]);

  const plannerWeekly: Record<string, unknown> = {};
  for (const w of weeklies) {
    const { weekKey, data } = toPlannerWeekly(w as Record<string, unknown>);
    plannerWeekly[weekKey] = data;
  }

  return NextResponse.json({
    todos:                todos.map(t => toTodo(t as Record<string, unknown>)),
    plannerEvents:        events.map(e => toPlannerEvent(e as Record<string, unknown>)),
    plannerAppointments:  appointments.map(a => toPlannerAppointment(a as Record<string, unknown>)),
    plannerWeekly,
  });
}
