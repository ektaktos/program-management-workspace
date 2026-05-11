import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTodo } from '@/lib/apiHelpers';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const todo = await prisma.plannerTodo.update({
    where: { id: params.id },
    data: {
      text: body.text,
      done: body.done,
    },
  });
  return NextResponse.json(toTodo(todo as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.plannerTodo.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
