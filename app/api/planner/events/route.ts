import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPlannerEvent } from '@/lib/apiHelpers';

export async function GET() {
  const events = await prisma.plannerEvent.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(events.map(e => toPlannerEvent(e as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const event = await prisma.plannerEvent.create({
    data: {
      id:       body.id,
      title:    body.title,
      date:     body.date,
      category: body.category,
      notes:    body.notes ?? '',
      done:     body.done ?? false,
      time:     body.time ?? null,
    },
  });
  return NextResponse.json(toPlannerEvent(event as Record<string, unknown>), { status: 201 });
}
