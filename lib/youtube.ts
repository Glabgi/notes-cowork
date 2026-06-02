// Client helpers for the legal YouTube IFrame Player + localStorage persistence.
// No downloads, no yt-dlp — everything goes through the official YT IFrame API.

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YtTrack {
  videoId: string;
  title: string;
  channel: string;
  thumb: string;
}

// ── Search proxy ────────────────────────────────────────────────────────────
export async function searchYouTube(
  q: string,
): Promise<{ items: YtTrack[]; error?: string }> {
  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return {
      items: Array.isArray(data?.items) ? (data.items as YtTrack[]) : [],
      error: typeof data?.error === 'string' ? data.error : undefined,
    };
  } catch {
    return { items: [] };
  }
}

// ── IFrame API loader (singleton) ────────────────────────────────────────────
let iframePromise: Promise<any> | null = null;

export function loadYouTubeIframeAPI(): Promise<any> {
  if (typeof window === 'undefined') {
    // SSR — never resolves on the server; callers only invoke this in effects.
    return new Promise(() => {});
  }
  if (iframePromise) return iframePromise;

  iframePromise = new Promise((resolve) => {
    // Already loaded.
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    // Chain onto any pre-existing ready callback so we don't clobber it.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.();
      } catch {
        /* ignore */
      }
      resolve(window.YT);
    };

    // Inject the script only once.
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
  });

  return iframePromise;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const LIKES_KEY = 'icf_yt_likes';
const PLAYLISTS_KEY = 'icf_yt_playlists';
const CHANGED_EVENT = 'icf-yt-changed';

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGED_EVENT));
  } catch {
    /* ignore quota / serialization errors */
  }
}

// Likes ----------------------------------------------------------------------
export function getLikes(): YtTrack[] {
  const list = readJSON<YtTrack[]>(LIKES_KEY, []);
  return Array.isArray(list) ? list.filter((t) => t && t.videoId) : [];
}

export function isLiked(id: string): boolean {
  return getLikes().some((t) => t.videoId === id);
}

export function toggleLike(t: YtTrack): YtTrack[] {
  const list = getLikes();
  const idx = list.findIndex((x) => x.videoId === t.videoId);
  let next: YtTrack[];
  if (idx >= 0) {
    next = list.filter((x) => x.videoId !== t.videoId);
  } else {
    next = [{ videoId: t.videoId, title: t.title, channel: t.channel, thumb: t.thumb }, ...list];
  }
  writeJSON(LIKES_KEY, next);
  return next;
}

// Playlists -------------------------------------------------------------------
export function getPlaylists(): Record<string, YtTrack[]> {
  const obj = readJSON<Record<string, YtTrack[]>>(PLAYLISTS_KEY, {});
  if (!obj || typeof obj !== 'object') return {};
  const clean: Record<string, YtTrack[]> = {};
  for (const [name, tracks] of Object.entries(obj)) {
    if (Array.isArray(tracks)) clean[name] = tracks.filter((t) => t && t.videoId);
  }
  return clean;
}

export function savePlaylist(name: string, tracks: YtTrack[]): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const all = getPlaylists();
  all[trimmed] = tracks
    .filter((t) => t && t.videoId)
    .map((t) => ({ videoId: t.videoId, title: t.title, channel: t.channel, thumb: t.thumb }));
  writeJSON(PLAYLISTS_KEY, all);
}

export function deletePlaylist(name: string): void {
  const all = getPlaylists();
  if (name in all) {
    delete all[name];
    writeJSON(PLAYLISTS_KEY, all);
  }
}

export function addToPlaylist(name: string, t: YtTrack): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const all = getPlaylists();
  const list = all[trimmed] || [];
  if (!list.some((x) => x.videoId === t.videoId)) {
    list.push({ videoId: t.videoId, title: t.title, channel: t.channel, thumb: t.thumb });
  }
  all[trimmed] = list;
  writeJSON(PLAYLISTS_KEY, all);
}

export const YT_CHANGED_EVENT = CHANGED_EVENT;
