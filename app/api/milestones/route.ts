import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const milestones = await prisma.milestone.findMany();
  return NextResponse.json(milestones);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
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
