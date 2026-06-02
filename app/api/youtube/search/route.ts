import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ items: [] });
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return NextResponse.json({ error: 'no_key' }, { status: 200 });
  try {
    const u = new URL('https://www.googleapis.com/youtube/v3/search');
    u.searchParams.set('part', 'snippet');
    u.searchParams.set('type', 'video');
    u.searchParams.set('videoCategoryId', '10'); // Music
    u.searchParams.set('maxResults', '15');
    u.searchParams.set('q', q);
    u.searchParams.set('key', key);
    const r = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return NextResponse.json({ error: 'yt_error', status: r.status }, { status: 200 });
    const data = await r.json();
    const items = (data.items || [])
      .filter((it: any) => it.id?.videoId)
      .map((it: any) => ({
        videoId: it.id.videoId,
        title: it.snippet?.title || '',
        channel: it.snippet?.channelTitle || '',
        thumb: it.snippet?.thumbnails?.default?.url || '',
      }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 200 });
  }
}
