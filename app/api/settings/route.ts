import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireUserId } from '@/lib/auth';

// Always read live values — without this Next.js prerenders the GET at build time and every device gets a stale snapshot
export const dynamic = 'force-dynamic';

// Returns the user's settings as { key: parsedValue }
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const rows = await prisma.setting.findMany({ where: { userId } });
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  return NextResponse.json(out);
}
