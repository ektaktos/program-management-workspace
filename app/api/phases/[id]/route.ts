import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notFound, ownsProject, requireUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  if (!(await ownsProject(userId, body.projectId))) return notFound();

  const { count } = await prisma.phase.updateMany({
    where: { id: params.id, project: { userId } },
    data: {
      projectId: body.projectId,
      name:      body.name,
      notes:     body.notes    ?? '',
      start:     body.start    ?? null,
      end:       body.end      ?? null,
      progress:  body.progress ?? 0,
    },
  });
  if (!count) return notFound();

  const phase = await prisma.phase.findUnique({ where: { id: params.id } });
  return NextResponse.json(phase);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { count } = await prisma.phase.deleteMany({ where: { id: params.id, project: { userId } } });
  if (!count) return notFound();
  return NextResponse.json({ ok: true });
}
