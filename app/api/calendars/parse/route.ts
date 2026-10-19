import { NextRequest, NextResponse } from 'next/server';
import { occurrencesInRange } from '@/lib/ics';

// Diagnostic: expand pasted iCal text for a date range without saving anything.
// Body: { ics: string, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.ics !== 'string' || body.ics.length > 1024 * 1024) return NextResponse.json({ error: 'Send { ics, from, to } (max 1 MB)' }, { status: 400 });
  const fromMs = Date.parse(`${body.from}T00:00:00Z`);
  const toMs = Date.parse(`${body.to}T00:00:00Z`) + 864e5;
  if (isNaN(fromMs) || isNaN(toMs)) return NextResponse.json({ error: 'from and to must be YYYY-MM-DD' }, { status: 400 });
  const occ = occurrencesInRange(body.ics, fromMs, toMs);
  return NextResponse.json(occ.map(o => ({ title: o.title, allDay: o.allDay, start: new Date(o.startMs).toISOString(), end: new Date(o.endMs).toISOString(), startDate: o.startDate, endDate: o.endDate })));
}
