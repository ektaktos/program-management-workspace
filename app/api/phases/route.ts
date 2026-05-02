import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const phases = await prisma.phase.findMany();
  return NextResponse.json(phases);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
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
