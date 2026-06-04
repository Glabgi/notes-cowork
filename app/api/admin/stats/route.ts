import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_URL || 'http://localhost:3001';

// Admin stats proxy. Validates the operator key against ADMIN_KEY (server-side,
// never exposed), then forwards to the rooms server's /stats endpoint.
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key') || '';
  const expected = process.env.ADMIN_KEY;

  if (!expected) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  if (key !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const r = await fetch(`${SOCKET_URL.replace(/\/$/, '')}/stats?key=${encodeURIComponent(key)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return NextResponse.json({ error: 'upstream', status: r.status }, { status: 502 });
    const data = await r.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'unreachable' }, { status: 502 });
  }
}
