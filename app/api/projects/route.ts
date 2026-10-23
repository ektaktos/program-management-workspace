import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const projects = await prisma.project.findMany({ where: { userId } });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      id:          body.id,
      userId,
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
  return NextResponse.json(project, { status: 201 });
}
