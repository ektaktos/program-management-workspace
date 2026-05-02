import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const projects = await prisma.project.findMany();
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = await prisma.project.create({
    data: {
      id:          body.id,
      name:        body.name,
      type:        body.type,
      description: body.description ?? '',
      status:      body.status,
      color:       body.color,
      start:       body.start ?? null,
      end:         body.end   ?? null,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
