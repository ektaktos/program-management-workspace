import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { ids } = await req.json() as { ids: string[] };
  if (!ids?.length) return NextResponse.json({ updated: 0 });

  const result = await prisma.task.updateMany({
    where: { id: { in: ids }, project: { userId } },
    data:  { status: 'overdue' },
  });
  return NextResponse.json({ updated: result.count });
}
