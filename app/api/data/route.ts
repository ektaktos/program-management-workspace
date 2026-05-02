import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toTask, toNote } from '@/lib/apiHelpers';

export async function GET() {
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
