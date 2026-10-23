import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notFound, requireUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const { count } = await prisma.project.updateMany({
    where: { id: params.id, userId },
    data: {
      name:        body.name,
      type:        body.type,
      description: body.description ?? '',
      status:      body.status,
      color:       body.color,
      start:       body.start ?? null,
      end:         body.end   ?? null,
      area:        body.area  || null,
    },
  });
  if (!count) return notFound();

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  return NextResponse.json(project);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { count } = await prisma.project.deleteMany({ where: { id: params.id, userId } });
  if (!count) return notFound();
  return NextResponse.json({ ok: true });
}
