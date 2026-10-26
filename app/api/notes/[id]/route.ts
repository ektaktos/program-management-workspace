import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toNote } from '@/lib/apiHelpers';
import { notFound, ownsProject, requireUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  if (body.projectId && !(await ownsProject(userId, body.projectId))) return notFound();

  const { count } = await prisma.note.updateMany({
    where: { id: params.id, userId },
    data: {
      projectId: body.projectId || null,
      title:     body.title,
      body:      body.body ?? '',
      tags:      body.tags ?? [],
      pinned:    body.pinned === true,
    },
  });
  if (!count) return notFound();

  const note = await prisma.note.findUnique({ where: { id: params.id } });
  return NextResponse.json(toNote(note as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { count } = await prisma.note.deleteMany({ where: { id: params.id, userId } });
  if (!count) return notFound();
  return NextResponse.json({ ok: true });
}
