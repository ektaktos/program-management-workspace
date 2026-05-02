import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toNote } from '@/lib/apiHelpers';

export async function GET() {
  const notes = await prisma.note.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(notes.map(n => toNote(n as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const note = await prisma.note.create({
    data: {
      id:        body.id,
      projectId: body.projectId,
      title:     body.title,
      body:      body.body  ?? '',
      tags:      body.tags  ?? [],
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
    },
  });
  return NextResponse.json(toNote(note as Record<string, unknown>), { status: 201 });
}
