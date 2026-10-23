import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPlannerEvent } from '@/lib/apiHelpers';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const events = await prisma.plannerEvent.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(events.map(e => toPlannerEvent(e as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const event = await prisma.plannerEvent.create({
    data: {
      id:       body.id,
      userId,
      title:    body.title,
      date:     body.date,
      category: body.category,
      notes:    body.notes ?? '',
      done:     body.done ?? false,
      time:     body.time ?? null,
      projectId: body.projectId ?? null,
      estimate:  body.estimate ?? null,
    },
  });
  return NextResponse.json(toPlannerEvent(event as Record<string, unknown>), { status: 201 });
}
