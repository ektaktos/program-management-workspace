import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import { fetchCalendarText, normalizeCalendarUrl } from '@/lib/calendarFetch';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const sources = await prisma.calendarSource.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  return NextResponse.json(sources.map(s => ({ id: s.id, name: s.name, url: s.url, color: s.color, enabled: s.enabled })));
}

// Body: { id, name, url, color } — the link is test-loaded before it's saved
export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const color = typeof body?.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : '#93a6b2';
  const id = typeof body?.id === 'string' && body.id ? body.id.slice(0, 64) : null;
  const url = typeof body?.url === 'string' ? normalizeCalendarUrl(body.url) : null;
  if (!id || !name) return NextResponse.json({ error: 'Give the calendar a name.' }, { status: 400 });
  if (!url) return NextResponse.json({ error: "That doesn't look like a calendar link. Use the iCal / ICS address (https:// or webcal://)." }, { status: 400 });

  try {
    await fetchCalendarText(url, { fresh: true });
  } catch (e) {
    return NextResponse.json({ error: `Couldn't load that calendar: ${(e as Error).message}.` }, { status: 400 });
  }

  const s = await prisma.calendarSource.create({ data: { id, userId, name, url, color, enabled: true } });
  return NextResponse.json({ id: s.id, name: s.name, url: s.url, color: s.color, enabled: s.enabled }, { status: 201 });
}
