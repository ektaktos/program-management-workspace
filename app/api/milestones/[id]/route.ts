import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const milestone = await prisma.milestone.update({
    where: { id: params.id },
    data: {
      projectId: body.projectId,
      title:     body.title,
      desc:      body.desc  ?? '',
      date:      body.date  ?? null,
      status:    body.status,
    },
  });
  return NextResponse.json(milestone);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.milestone.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
