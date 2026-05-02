import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTask, toNote } from '@/lib/apiHelpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  const [projects, tasks, milestones, phases, notes] = await Promise.all([
    prisma.project.findMany(),
    prisma.task.findMany(),
    prisma.milestone.findMany(),
    prisma.phase.findMany(),
    prisma.note.findMany({ orderBy: { createdAt: 'desc' } }),
  ]);

  return NextResponse.json({
    projects,
    tasks:      tasks.map(t => toTask(t as Record<string, unknown>)),
    milestones,
    phases,
    notes:      notes.map(n => toNote(n as Record<string, unknown>)),
  });
}
