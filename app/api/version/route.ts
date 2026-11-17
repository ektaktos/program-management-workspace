import { NextResponse } from 'next/server';
import { LATEST_RELEASE } from '@/lib/changelog';

export const dynamic = 'force-dynamic';

// The deployed build's id (public: it is already in every page's script URLs) and its latest
// release note, so a tab still running older code can say what the update brings.
export function GET() {
  return NextResponse.json(
    { buildId: process.env.BUILD_ID, release: { id: LATEST_RELEASE.id, summary: LATEST_RELEASE.summary } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
