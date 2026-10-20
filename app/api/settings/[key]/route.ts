import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isThemeId } from '@/lib/themes';
import { NAV_IDS } from '@/lib/constants';
import { isNotifPrefs } from '@/lib/notifications';

// Only known, validated settings can be written
const VALIDATORS: Record<string, (v: unknown) => boolean> = {
  dailyCapacity: v => typeof v === 'number' && Number.isFinite(v) && v >= 30 && v <= 24 * 60,
  theme: v => isThemeId(v),
  notifPrefs: v => isNotifPrefs(v),
  // Calendar events ticked off in the workspace (the calendar itself is read-only)
  doneCalendarEvents: v => Array.isArray(v) && v.length <= 1000 && v.every(x => typeof x === 'string' && x.length <= 400),
  navOrder: v => Array.isArray(v) && v.length <= NAV_IDS.length && v.every(x => typeof x === 'string' && NAV_IDS.includes(x)),
};

// Body: { value: <JSON> }
export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  const validate = VALIDATORS[params.key];
  if (!validate) return NextResponse.json({ error: 'Unknown setting' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || !validate(body.value)) return NextResponse.json({ error: 'Invalid value' }, { status: 400 });

  const value = JSON.stringify(body.value);
  await prisma.setting.upsert({
    where:  { key: params.key },
    create: { key: params.key, value },
    update: { value },
  });
  return NextResponse.json({ key: params.key, value: body.value });
}
