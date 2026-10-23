import { prisma } from './db';

// Data created before auth existed has no owner. The very first account claims it.
export async function claimOrphanData(userId: string) {
  if ((await prisma.user.count()) !== 1) return;

  const where = { userId: null };
  const data  = { userId };
  await prisma.$transaction([
    prisma.project.updateMany({ where, data }),
    prisma.plannerTodo.updateMany({ where, data }),
    prisma.plannerEvent.updateMany({ where, data }),
    prisma.plannerAppointment.updateMany({ where, data }),
    prisma.plannerWeekly.updateMany({ where, data }),
    prisma.note.updateMany({ where, data }),
    prisma.setting.updateMany({ where, data }),
    prisma.calendarSource.updateMany({ where, data }),
  ]);
}
