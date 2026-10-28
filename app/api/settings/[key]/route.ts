import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { isThemeId } from '@/lib/themes';
import { NAV_IDS } from '@/lib/constants';
import { isNotifPrefs } from '@/lib/notifications';
import { isStyleTheme } from '@/lib/styleThemes';
import { isDayOrder } from '@/lib/dayOrder';
import { isWorkspaceName } from '@/lib/workspaceName';

// Only known, validated settings can be written
const VALIDATORS: Record<string, (v: unknown) => boolean> = {
  dailyCapacity: v => typeof v === 'number' && Number.isFinite(v) && v >= 30 && v <= 24 * 60,
  theme: v => isThemeId(v),
  notifPrefs: v => isNotifPrefs(v),
  styleTheme: v => isStyleTheme(v),
  dayOrder: v => isDayOrder(v),
  // Archived project and task ids, and the sidebar's project order (all synced across browsers)
  archive: v => !!v && typeof v === 'object' && !Array.isArray(v)
    && Object.keys(v as object).every(k => k === 'projectIds' || k === 'taskIds')
    && ['projectIds', 'taskIds'].every(k => { const a = (v as Record<string, unknown>)[k]; return Array.isArray(a) && a.length <= 5000 && a.every(x => typeof x === 'string' && x.length <= 100); }),
  projectOrder: v => Array.isArray(v) && v.length <= 1000 && v.every(x => typeof x === 'string' && x.length <= 100),
  // Calendar events ticked off in the workspace (the calendar itself is read-only)
  doneCalendarEvents: v => Array.isArray(v) && v.length <= 1000 && v.every(x => typeof x === 'string' && x.length <= 400),
  // Custom workspace name; '' falls back to the default from the user's name
  workspaceName: v => isWorkspaceName(v),
  navOrder: v => Array.isArray(v) && v.length <= NAV_IDS.length && v.every(x => typeof x === 'string' && NAV_IDS.includes(x)),
};

// Body: { value: <JSON> }
export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const validate = VALIDATORS[params.key];
  if (!validate) return NextResponse.json({ error: 'Unknown setting' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || !validate(body.value)) return NextResponse.json({ error: 'Invalid value' }, { status: 400 });

  const value = JSON.stringify(body.value);
  await prisma.setting.upsert({
    where:  { userId_key: { userId, key: params.key } },
    create: { userId, key: params.key, value },
    update: { value },
  });
  return NextResponse.json({ key: params.key, value: body.value });
}
