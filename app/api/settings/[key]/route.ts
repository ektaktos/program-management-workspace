import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isThemeId } from '@/lib/themes';

// Only known, validated settings can be written
const VALIDATORS: Record<string, (v: unknown) => boolean> = {
  dailyCapacity: v => typeof v === 'number' && Number.isFinite(v) && v >= 30 && v <= 24 * 60,
  theme: v => isThemeId(v),
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
