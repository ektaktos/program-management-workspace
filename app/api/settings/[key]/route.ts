import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Body: { value: <any JSON> }
export async function PUT(req: NextRequest, { params }: { params: { key: string } }) {
  const body = await req.json();
  const value = JSON.stringify(body.value ?? null);
  await prisma.setting.upsert({
    where:  { key: params.key },
    create: { key: params.key, value },
    update: { value },
  });
  return NextResponse.json({ key: params.key, value: body.value ?? null });
}
