import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTodo } from '@/lib/apiHelpers';

export async function GET() {
  const todos = await prisma.plannerTodo.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(todos.map(t => toTodo(t as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const todo = await prisma.plannerTodo.create({
    data: {
      id:   body.id,
      text: body.text,
      done: body.done ?? false,
    },
  });
  return NextResponse.json(toTodo(todo as Record<string, unknown>), { status: 201 });
}
