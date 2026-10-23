import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notFound, requireUserId } from '@/lib/auth';
import { fetchCalendarText, forgetCalendar, normalizeCalendarUrl } from '@/lib/calendarFetch';

// Body: any of { name, color, enabled, url }
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const data: { name?: string; color?: string; enabled?: boolean; url?: string } = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 80);
  if (typeof body.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(body.color)) data.color = body.color;
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled;
  if (typeof body.url === 'string') {
    const url = normalizeCalendarUrl(body.url);
    if (!url) return NextResponse.json({ error: "That doesn't look like a calendar link." }, { status: 400 });
    try { await fetchCalendarText(url, { fresh: true }); }
    catch (e) { return NextResponse.json({ error: `Couldn't load that calendar: ${(e as Error).message}.` }, { status: 400 }); }
    data.url = url;
  }
  const { count } = await prisma.calendarSource.updateMany({ where: { id: params.id, userId }, data });
  if (!count) return notFound();
  const s = (await prisma.calendarSource.findUnique({ where: { id: params.id } }))!;
  return NextResponse.json({ id: s.id, name: s.name, url: s.url, color: s.color, enabled: s.enabled });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const s = await prisma.calendarSource.findFirst({ where: { id: params.id, userId } });
  if (!s) return notFound();
  await prisma.calendarSource.delete({ where: { id: s.id } });
  forgetCalendar(s.url);
  return NextResponse.json({ ok: true });
}
