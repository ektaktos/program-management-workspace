import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSeedData } from '@/lib/utils';

export async function POST() {
  const count = await prisma.project.count();
  if (count > 0) return NextResponse.json({ seeded: false });

  const seed = getSeedData();

  await prisma.project.createMany({ data: seed.projects });
  await prisma.phase.createMany({ data: seed.phases.map(p => ({ ...p, start: p.start ?? null, end: p.end ?? null, notes: p.notes ?? null })) });
  await prisma.task.createMany({
    data: seed.tasks.map(t => ({
      ...t,
      phaseId:  t.phaseId  ?? null,
      due:      t.due      ?? null,
      dueTime:  t.dueTime  ?? null,
      assignee: t.assignee ?? null,
      alerts:   (t.alerts ?? []) as unknown as Prisma.InputJsonValue,
    })),
  });
  await prisma.milestone.createMany({
    data: seed.milestones.map(m => ({ ...m, date: m.date ?? null })),
  });
  await prisma.note.createMany({
    data: seed.notes.map(n => ({
      id:        n.id,
      projectId: n.projectId,
      title:     n.title,
      body:      n.body,
      tags:      n.tags as unknown as Prisma.InputJsonValue,
      createdAt: new Date(n.createdAt),
    })),
  });

  return NextResponse.json({ seeded: true });
}
