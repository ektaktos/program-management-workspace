import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Always read live values — without this Next.js prerenders the GET at build time and every device gets a stale snapshot
export const dynamic = 'force-dynamic';

// Returns all settings as { key: parsedValue }
export async function GET() {
  const rows = await prisma.setting.findMany();
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  return NextResponse.json(out);
}
