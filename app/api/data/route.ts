import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTask, toNote } from '@/lib/apiHelpers';
import { requireUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;
  const owned = { project: { userId } };

  const [projects, tasks, milestones, phases, notes] = await Promise.all([
    prisma.project.findMany({ where: { userId } }),
    prisma.task.findMany({ where: owned }),
    prisma.milestone.findMany({ where: owned }),
    prisma.phase.findMany({ where: owned }),
    prisma.note.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
  ]);

  return NextResponse.json({
    projects,
    tasks:      tasks.map(t => toTask(t as Record<string, unknown>)),
    milestones,
    phases,
    notes:      notes.map(n => toNote(n as Record<string, unknown>)),
  });
}
