import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch from Socket.io server which has the real room data
    const res = await fetch('http://localhost:3001/rooms', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) throw new Error('server error');
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Socket server not reachable or no rooms — return empty
    return NextResponse.json([]);
  }
}
