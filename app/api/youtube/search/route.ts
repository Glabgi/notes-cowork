import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

type Item = { videoId: string; title: string; channel: string; thumb: string };

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Brace-match a JSON object that follows `marker` in a blob of HTML.
function extractJson(html: string, marker: string): any | null {
  const i = html.indexOf(marker);
  if (i < 0) return null;
  const start = html.indexOf('{', i);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let j = start; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, j + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

// Primary keyless path: scrape YouTube's own search page (ytInitialData).
async function viaScrape(q: string): Promise<Item[] | null> {
  try {
    const r = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en&gl=US`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(9000),
        headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      },
    );
    if (!r.ok) return null;
    const html = await r.text();
    const data = extractJson(html, 'ytInitialData = ') || extractJson(html, 'ytInitialData"]=');
    if (!data) return null;
    const sections =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const items: Item[] = [];
    for (const sec of sections) {
      const list = sec?.itemSectionRenderer?.contents || [];
      for (const it of list) {
        const v = it?.videoRenderer;
        if (!v?.videoId) continue;
        const thumbs = v.thumbnail?.thumbnails || [];
        items.push({
          videoId: v.videoId,
          title: v.title?.runs?.[0]?.text || v.title?.simpleText || '',
          channel: v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || '',
          thumb: thumbs[thumbs.length - 1]?.url || thumbs[0]?.url || '',
        });
        if (items.length >= 18) break;
      }
      if (items.length >= 18) break;
    }
    return items.length ? items : null;
  } catch {
    return null;
  }
}

// Fallback keyless path: public Piped instances.
const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.leptons.xyz',
  'https://api.piped.private.coffee',
];
async function viaPiped(q: string): Promise<Item[] | null> {
  for (const base of PIPED) {
    try {
      const r = await fetch(`${base}/search?q=${encodeURIComponent(q)}&filter=videos`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      });
      if (!r.ok) continue;
      const data = await r.json();
      const arr: any[] = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(arr)) continue;
      const items: Item[] = arr
        .map((it) => {
          const m = String(it.url || '').match(/[?&]v=([^&]+)/);
          return {
            videoId: m ? m[1] : (it.videoId || ''),
            title: it.title || '',
            channel: it.uploaderName || it.uploader || '',
            thumb: it.thumbnail || '',
          };
        })
        .filter((t) => t.videoId)
        .slice(0, 18);
      if (items.length) return items;
    } catch { /* next */ }
  }
  return null;
}

// Optional: official Data API if a key is configured (most reliable).
async function viaGoogle(q: string, key: string): Promise<Item[] | null> {
  const u = new URL('https://www.googleapis.com/youtube/v3/search');
  u.searchParams.set('part', 'snippet');
  u.searchParams.set('type', 'video');
  u.searchParams.set('maxResults', '18');
  u.searchParams.set('q', q);
  u.searchParams.set('key', key);
  const r = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const data = await r.json();
  return (data.items || [])
    .filter((it: any) => it.id?.videoId)
    .map((it: any) => ({
      videoId: it.id.videoId,
      title: it.snippet?.title || '',
      channel: it.snippet?.channelTitle || '',
      thumb: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || '',
    }));
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ items: [] });

  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    try { const g = await viaGoogle(q, key); if (g && g.length) return NextResponse.json({ items: g }); } catch {}
  }
  const scraped = await viaScrape(q);
  if (scraped) return NextResponse.json({ items: scraped });
  const piped = await viaPiped(q);
  if (piped) return NextResponse.json({ items: piped });

  return NextResponse.json({ error: 'unavailable', items: [] }, { status: 200 });
}
