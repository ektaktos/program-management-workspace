import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTodo } from '@/lib/apiHelpers';
import { notFound, requireUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const { count } = await prisma.plannerTodo.updateMany({
    where: { id: params.id, userId },
    data: {
      text: body.text,
      done: body.done,
    },
  });
  if (!count) return notFound();

  const todo = await prisma.plannerTodo.findUnique({ where: { id: params.id } });
  return NextResponse.json(toTodo(todo as Record<string, unknown>));
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { count } = await prisma.plannerTodo.deleteMany({ where: { id: params.id, userId } });
  if (!count) return notFound();
  return NextResponse.json({ ok: true });
}
