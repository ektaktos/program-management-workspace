import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { ids } = await req.json() as { ids: string[] };
  if (!ids?.length) return NextResponse.json({ updated: 0 });

  const result = await prisma.task.updateMany({
    where: { id: { in: ids } },
    data:  { status: 'overdue' },
  });
  return NextResponse.json({ updated: result.count });
}
