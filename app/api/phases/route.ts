import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notFound, ownsProject, requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const phases = await prisma.phase.findMany({ where: { project: { userId } } });
  return NextResponse.json(phases);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  if (!(await ownsProject(userId, body.projectId))) return notFound();

  const phase = await prisma.phase.create({
    data: {
      id:        body.id,
      projectId: body.projectId,
      name:      body.name,
      notes:     body.notes    ?? '',
      start:     body.start    ?? null,
      end:       body.end      ?? null,
      progress:  body.progress ?? 0,
    },
  });
  return NextResponse.json(phase, { status: 201 });
}
