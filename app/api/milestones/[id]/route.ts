import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notFound, ownsProject, requireUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  if (!(await ownsProject(userId, body.projectId))) return notFound();

  const { count } = await prisma.milestone.updateMany({
    where: { id: params.id, project: { userId } },
    data: {
      projectId: body.projectId,
      title:     body.title,
      desc:      body.desc  ?? '',
      date:      body.date  ?? null,
      status:    body.status,
    },
  });
  if (!count) return notFound();

  const milestone = await prisma.milestone.findUnique({ where: { id: params.id } });
  return NextResponse.json(milestone);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { count } = await prisma.milestone.deleteMany({ where: { id: params.id, project: { userId } } });
  if (!count) return notFound();
  return NextResponse.json({ ok: true });
}
