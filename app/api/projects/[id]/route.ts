import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      name:        body.name,
      type:        body.type,
      description: body.description ?? '',
      status:      body.status,
      color:       body.color,
      start:       body.start ?? null,
      end:         body.end   ?? null,
    },
  });
  return NextResponse.json(project);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.project.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
