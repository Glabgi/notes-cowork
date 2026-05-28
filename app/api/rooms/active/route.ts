import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// The Socket.io server holds the live room registry. Use the configured
// socket URL (Render in prod, localhost in dev) — NOT a hardcoded localhost,
// otherwise the serverless function on Vercel can never reach it.
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.SOCKET_URL ||
  'http://localhost:3001';

export async function GET() {
  try {
    const res = await fetch(`${SOCKET_URL.replace(/\/$/, '')}/rooms`, {
      // Render free tier can be slow to wake — allow more time
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('server error');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
