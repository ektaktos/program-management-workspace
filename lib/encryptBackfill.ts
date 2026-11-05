// One-time conversion of existing plaintext rows to encrypted form. Runs at server start
// (instrumentation.ts) and is safe to repeat: it only touches values that aren't encrypted yet.

import { prismaBase } from './db';
import { ENCRYPTED_FIELDS, encryptJson, encryptText, encryptionEnabled, isEncrypted } from './fieldCrypto';

const DELEGATE: Record<string, string> = {
  Project: 'project', Task: 'task', Milestone: 'milestone', Phase: 'phase', Note: 'note',
  PlannerTodo: 'plannerTodo', PlannerEvent: 'plannerEvent', PlannerAppointment: 'plannerAppointment',
  PlannerWeekly: 'plannerWeekly', CalendarSource: 'calendarSource',
};

type Row = Record<string, unknown> & { id: string };
interface Delegate {
  findMany(args: unknown): Promise<Row[]>;
  updateMany(args: unknown): Promise<{ count: number }>;
}

let started = false;

export async function runEncryptionBackfill() {
  if (started || !encryptionEnabled()) return;
  started = true;
  const client = prismaBase as unknown as Record<string, Delegate>;
  for (const [model, spec] of Object.entries(ENCRYPTED_FIELDS)) {
    const d = client[DELEGATE[model]];
    const select: Record<string, true> = { id: true };
    [...spec.text, ...spec.json].forEach(f => { select[f] = true; });
    let cursor: string | undefined;
    let converted = 0;
    for (;;) {
      const rows = await d.findMany({ select, orderBy: { id: 'asc' }, take: 200, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
      if (!rows.length) break;
      for (const row of rows) {
        const data: Record<string, unknown> = {};
        const unchanged: Record<string, unknown> = { id: row.id };
        for (const f of spec.text) {
          const v = row[f];
          if (typeof v === 'string' && v !== '' && !isEncrypted(v)) { data[f] = encryptText(v); unchanged[f] = v; }
        }
        for (const f of spec.json) {
          const v = row[f];
          if (v !== null && v !== undefined && !isEncrypted(v)) data[f] = encryptJson(v);
        }
        if (Object.keys(data).length) {
          // Only if the text is still what we read, so an edit made meanwhile is never overwritten
          const { count } = await d.updateMany({ where: unchanged, data });
          converted += count;
        }
      }
      cursor = rows[rows.length - 1].id;
    }
    if (converted) console.log(`[encryption] encrypted ${converted} existing ${model} row(s)`);
  }
}
