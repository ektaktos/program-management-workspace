import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notFound, ownsProject, requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const milestones = await prisma.milestone.findMany({ where: { project: { userId } } });
  return NextResponse.json(milestones);
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  if (!(await ownsProject(userId, body.projectId))) return notFound();

  const milestone = await prisma.milestone.create({
    data: {
      id:        body.id,
      projectId: body.projectId,
      title:     body.title,
      desc:      body.desc  ?? '',
      date:      body.date  ?? null,
      status:    body.status,
    },
  });
  return NextResponse.json(milestone, { status: 201 });
}
