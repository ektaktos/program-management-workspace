import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { fetchCalendarText } from '@/lib/calendarFetch';
import { occurrencesInRange } from '@/lib/ics';

export const dynamic = 'force-dynamic';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive). Padded by a day each side so the
// browser can bucket events into its own local days; it filters precisely.
export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const from = req.nextUrl.searchParams.get('from') ?? '';
  const to = req.nextUrl.searchParams.get('to') ?? '';
  const fresh = req.nextUrl.searchParams.get('fresh') === '1';   // "Refresh now": skip the 10-minute copy
  if (!ISO.test(from) || !ISO.test(to)) return NextResponse.json({ error: 'from and to must be YYYY-MM-DD' }, { status: 400 });
  const fromMs = Date.parse(from + 'T00:00:00Z') - 864e5;
  const toMs = Date.parse(to + 'T00:00:00Z') + 2 * 864e5;
  if (toMs - fromMs > 70 * 864e5) return NextResponse.json({ error: 'Range too large' }, { status: 400 });

  const sources = await prisma.calendarSource.findMany({ where: { userId, enabled: true } });
  const errors: { sourceId: string; message: string }[] = [];
  const results = await Promise.all(sources.map(async s => {
    try {
      const text = await fetchCalendarText(s.url, { fresh });
      return occurrencesInRange(text, fromMs, toMs).map(o => ({
        id: `${s.id}:${o.uid}:${o.startMs}`,
        sourceId: s.id,
        title: o.title,
        location: o.location,
        allDay: o.allDay,
        start: new Date(o.startMs).toISOString(),
        end: new Date(o.endMs).toISOString(),
        startDate: o.startDate,
        endDate: o.endDate,
      }));
    } catch (e) {
      errors.push({ sourceId: s.id, message: (e as Error).message });
      return [];
    }
  }));
  return NextResponse.json({ events: results.flat(), errors });
}
