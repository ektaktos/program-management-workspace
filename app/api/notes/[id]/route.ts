import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toNote } from '@/lib/apiHelpers';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const note = await prisma.note.update({
    where: { id: params.id },
    data: {
      projectId: body.projectId,
      title:     body.title,
      body:      body.body ?? '',
      tags:      body.tags ?? [],
    },
  });
  return NextResponse.json(toNote(note as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.note.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
