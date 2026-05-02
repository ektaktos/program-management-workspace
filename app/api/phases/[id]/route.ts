import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const phase = await prisma.phase.update({
    where: { id: params.id },
    data: {
      projectId: body.projectId,
      name:      body.name,
      notes:     body.notes    ?? '',
      start:     body.start    ?? null,
      end:       body.end      ?? null,
      progress:  body.progress ?? 0,
    },
  });
  return NextResponse.json(phase);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.phase.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
