import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toNote } from '@/lib/apiHelpers';
import { notFound, ownsProject, requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const notes = await prisma.note.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(notes.map(n => toNote(n as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json();
  // A note may stand alone; if it names a project, that project must be the user's
  if (body.projectId && !(await ownsProject(userId, body.projectId))) return notFound();

  const note = await prisma.note.create({
    data: {
      id:        body.id,
      userId,
      projectId: body.projectId || null,
      title:     body.title,
      body:      body.body  ?? '',
      tags:      body.tags  ?? [],
      pinned:    body.pinned === true,
      createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
    },
  });
  return NextResponse.json(toNote(note as Record<string, unknown>), { status: 201 });
}
