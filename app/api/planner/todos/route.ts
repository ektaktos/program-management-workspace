import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTodo } from '@/lib/apiHelpers';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const todos = await prisma.plannerTodo.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(todos.map(t => toTodo(t as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const todo = await prisma.plannerTodo.create({
    data: {
      id:   body.id,
      userId,
      text: body.text,
      done: body.done ?? false,
    },
  });
  return NextResponse.json(toTodo(todo as Record<string, unknown>), { status: 201 });
}
