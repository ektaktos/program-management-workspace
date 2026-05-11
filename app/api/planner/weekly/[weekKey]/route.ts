import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPlannerWeekly } from '@/lib/apiHelpers';

export async function PUT(req: NextRequest, { params }: { params: { weekKey: string } }) {
  const body = await req.json();
  const weekly = await prisma.plannerWeekly.upsert({
    where: { weekKey: params.weekKey },
    create: {
      weekKey:    params.weekKey,
      goals:      body.goals      ?? [],
      notes:      body.notes      ?? '',
      focus:      body.focus      ?? '',
      focusItems: body.focusItems ?? [],
    },
    update: {
      goals:      body.goals      ?? [],
      notes:      body.notes      ?? '',
      focus:      body.focus      ?? '',
      focusItems: body.focusItems ?? [],
    },
  });
  const { data } = toPlannerWeekly(weekly as Record<string, unknown>);
  return NextResponse.json(data);
}
