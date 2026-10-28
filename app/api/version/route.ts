import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// The deployed build's id. Public: it is already visible in every page's script URLs.
export function GET() {
  return NextResponse.json(
    { buildId: process.env.BUILD_ID },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
