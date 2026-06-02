'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Coffee, TreePine, Wind, Waves, Flame, Moon, Volume2, VolumeX, Disc3, Play, Pause,
  Youtube, Music2, Search, SkipBack, SkipForward, Heart, ListMusic, Trash2, ListPlus, Save,
} from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { getAmbientEngine } from '@/lib/ambientAudio';
import { cn } from '@/lib/utils';
import {
  searchYouTube, loadYouTubeIframeAPI,
  getLikes, isLiked, toggleLike,
  getPlaylists, savePlaylist, deletePlaylist,
  YT_CHANGED_EVENT, type YtTrack,
} from '@/lib/youtube';

type SoundId = 'cafe' | 'forest' | 'white-noise' | 'rain' | 'ocean' | 'fire' | 'night';

const TRACKS: { id: SoundId; title: string; desc: string; Icon: React.ElementType }[] = [
  { id: 'cafe',        title: 'Уютная кофейня',   desc: 'Тёплый гул кафе',   Icon: Coffee },
  { id: 'forest',      title: 'Лесное утро',      desc: 'Птицы и листва',    Icon: TreePine },
  { id: 'rain',        title: 'Тихий дождь',      desc: 'Капли по стеклу',   Icon: Waves },
  { id: 'ocean',       title: 'Океан',            desc: 'Шум прибоя',        Icon: Waves },
  { id: 'fire',        title: 'Камин',            desc: 'Треск камина',      Icon: Flame },
  { id: 'night',       title: 'Ночь',             desc: 'Сверчки в ночи',    Icon: Moon },
  { id: 'white-noise', title: 'Белый шум',        desc: 'Глубокий фокус',    Icon: Wind },
];

type Mode = 'ambient' | 'youtube';

export default function MusicPanel() {
  const [mode, setMode] = useState<Mode>('ambient');

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] min-h-0">
      {/* Mode toggle */}
      <div className="px-3 pt-3 pb-2 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex-shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-[10px] bg-[var(--bg-input)] border border-[var(--border)]">
          <button
            onClick={() => setMode('ambient')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[8px] text-xs font-medium transition-colors',
              mode === 'ambient'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Music2 size={13} /> Фон
          </button>
          <button
            onClick={() => setMode('youtube')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[8px] text-xs font-medium transition-colors',
              mode === 'youtube'
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Youtube size={13} /> YouTube
          </button>
        </div>
      </div>

      {mode === 'ambient' ? <AmbientMode /> : <YouTubeMode />}
    </div>
  );
}

function AmbientMode() {
  const { ambientSound, ambientVolume, setAmbientSound, setAmbientVolume } = useSettingsStore();
  const active = ambientSound as string;
  const playing = active !== 'none';
  const current = TRACKS.find(t => t.id === active);

  const play = (id: SoundId) => {
    const engine = getAmbientEngine();
    if (active === id) {
      engine.stop();
      setAmbientSound('none');
    } else {
      engine.play(id as any, ambientVolume);
      setAmbientSound(id as any);
    }
  };

  const stop = () => {
    getAmbientEngine().stop();
    setAmbientSound('none');
  };

  const handleVolume = (v: number) => {
    setAmbientVolume(v);
    getAmbientEngine().setVolume(v);
  };

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex-shrink-0">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm">Музыка для фокуса</h3>
        <p className="text-xs text-[var(--text-muted)]">
          {playing ? 'Сейчас играет' : 'Выберите атмосферу'}
        </p>
      </div>

      {/* Now playing — vinyl disc */}
      <div className="px-4 py-5 flex flex-col items-center gap-3 border-b border-[var(--border)]">
        <div className="relative">
          <motion.div
            className="w-28 h-28 rounded-full flex items-center justify-center shadow-md"
            style={{ background: 'radial-gradient(circle at 50% 50%, #3a322a 0 30%, #2a2018 31% 100%)' }}
            animate={playing ? { rotate: 360 } : { rotate: 0 }}
            transition={playing
              ? { repeat: Infinity, ease: 'linear', duration: 8 }
              : { duration: 0.4 }}
          >
            {/* grooves */}
            <div className="absolute inset-2 rounded-full border border-[rgba(255,255,255,0.05)]" />
            <div className="absolute inset-4 rounded-full border border-[rgba(255,255,255,0.05)]" />
            <div className="absolute inset-6 rounded-full border border-[rgba(255,255,255,0.05)]" />
            {/* label */}
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center">
              {current
                ? (() => { const Icon = current.Icon; return <Icon size={18} className="text-white" />; })()
                : <Disc3 size={18} className="text-white/80" />}
            </div>
            <div className="absolute w-2 h-2 rounded-full bg-[var(--bg-card)]" />
          </motion.div>

          {/* play / pause */}
          <button
            onClick={() => playing ? stop() : play((current?.id || 'cafe') as SoundId)}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-md transition-colors active:scale-95"
            title={playing ? 'Пауза' : 'Играть'}
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-[1px]" />}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {current?.title || 'Ничего не играет'}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {current?.desc || 'Выберите трек ниже'}
          </p>
        </div>

        {/* equalizer */}
        {playing && (
          <span className="inline-flex items-end gap-[3px] h-4">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.span
                key={i}
                className="w-[3px] bg-[var(--accent)] rounded-full"
                animate={{ height: ['25%', '95%', '40%', '80%', '25%'] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
              />
            ))}
          </span>
        )}

        {/* volume */}
        <div className="flex items-center gap-2 w-full max-w-[200px] mt-1">
          <VolumeX size={13} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={ambientVolume}
            onChange={e => handleVolume(+e.target.value)}
            className="flex-1 h-1 accent-[var(--accent)] cursor-pointer"
            title={`Громкость: ${Math.round(ambientVolume * 100)}%`}
          />
          <Volume2 size={13} className="text-[var(--text-muted)] flex-shrink-0" />
        </div>
      </div>

      {/* Playlist */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {TRACKS.map(({ id, title, desc, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => play(id)}
              className={cn(
                'w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] border transition-all text-left',
                isActive
                  ? 'bg-[var(--accent-light)] border-[var(--border-accent)]'
                  : 'border-transparent hover:bg-[var(--bg-hover)]'
              )}
            >
              <span className={cn(
                'w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0',
                isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
              )}>
                <Icon size={16} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={cn(
                  'block text-sm font-medium truncate',
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                )}>{title}</span>
                <span className="block text-[11px] text-[var(--text-muted)] truncate">{desc}</span>
              </span>
              {isActive
                ? <Pause size={14} className="text-[var(--accent)] flex-shrink-0" />
                : <Play size={14} className="text-[var(--text-muted)] flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ── YouTube mode ──────────────────────────────────────────────────────────────
type YtTab = 'search' | 'liked' | 'playlists';

function YouTubeMode() {
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const createdRef = useRef(false);
  const queueRef = useRef<YtTrack[]>([]);
  const currentIdRef = useRef<string | null>(null);

  const [tab, setTab] = useState<YtTab>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YtTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [queue, setQueue] = useState<YtTrack[]>([]);
  const [current, setCurrent] = useState<YtTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [likes, setLikes] = useState<YtTrack[]>([]);
  const [playlists, setPlaylists] = useState<Record<string, YtTrack[]>>({});

  // Keep refs in sync so player callbacks see fresh values.
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentIdRef.current = current?.videoId ?? null; }, [current]);

  // Refresh liked / playlists from storage on mount and on any write.
  const refreshStorage = useCallback(() => {
    setLikes(getLikes());
    setPlaylists(getPlaylists());
  }, []);
  useEffect(() => {
    refreshStorage();
    const handler = () => refreshStorage();
    window.addEventListener(YT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(YT_CHANGED_EVENT, handler);
  }, [refreshStorage]);

  const playAt = useCallback((index: number) => {
    const q = queueRef.current;
    if (index < 0 || index >= q.length) return;
    const track = q[index];
    setCurrent(track);
    currentIdRef.current = track.videoId;
    const player = playerRef.current;
    if (player && playerReadyRef.current && typeof player.loadVideoById === 'function') {
      try { player.loadVideoById(track.videoId); } catch { /* ignore */ }
    }
  }, []);

  const advance = useCallback((dir: 1 | -1) => {
    const q = queueRef.current;
    if (!q.length) return;
    const idx = q.findIndex((t) => t.videoId === currentIdRef.current);
    const base = idx < 0 ? 0 : idx;
    const next = (base + dir + q.length) % q.length;
    playAt(next);
  }, [playAt]);

  // Create the hidden player exactly once when entering YouTube mode.
  useEffect(() => {
    let cancelled = false;
    loadYouTubeIframeAPI().then((YT) => {
      if (cancelled || !YT || !YT.Player) return;
      if (createdRef.current) return;
      createdRef.current = true;
      playerRef.current = new YT.Player('icf-yt-player', {
        height: '0',
        width: '0',
        playerVars: { playsinline: 1 },
        events: {
          onReady: () => { playerReadyRef.current = true; },
          onStateChange: (e: any) => {
            const State = window.YT?.PlayerState;
            if (!State) return;
            if (e.data === State.ENDED) {
              advance(1);
            } else if (e.data === State.PLAYING) {
              setIsPlaying(true);
            } else if (e.data === State.PAUSED) {
              setIsPlaying(false);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      // Keep the player instance alive across mode toggles so it isn't
      // recreated; teardown only on full unmount.
      const player = playerRef.current;
      if (player && typeof player.destroy === 'function') {
        try { player.destroy(); } catch { /* ignore */ }
      }
      playerRef.current = null;
      createdRef.current = false;
      playerReadyRef.current = false;
    };
  }, [advance]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setNoticeKey(null);
    const { items, error } = await searchYouTube(q);
    setSearching(false);
    if (error === 'no_key') { setNoticeKey('no_key'); setResults([]); return; }
    if (error) { setNoticeKey('error'); setResults([]); return; }
    setResults(items);
    if (!items.length) setNoticeKey('empty');
  }, [query]);

  const playTrack = useCallback((track: YtTrack, newQueue: YtTrack[]) => {
    setQueue(newQueue);
    queueRef.current = newQueue;
    setCurrent(track);
    currentIdRef.current = track.videoId;
    const player = playerRef.current;
    if (player && playerReadyRef.current && typeof player.loadVideoById === 'function') {
      try { player.loadVideoById(track.videoId); } catch { /* ignore */ }
    }
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || !playerReadyRef.current) return;
    try {
      if (isPlaying) player.pauseVideo();
      else player.playVideo();
    } catch { /* ignore */ }
  }, [isPlaying]);

  const onLike = useCallback((track: YtTrack) => {
    setLikes(toggleLike(track));
  }, []);

  const handleSavePlaylist = useCallback(() => {
    if (!queue.length) return;
    const name = window.prompt('Название плейлиста:')?.trim();
    if (!name) return;
    savePlaylist(name, queue);
    setPlaylists(getPlaylists());
  }, [queue]);

  const handleDeletePlaylist = useCallback((name: string) => {
    deletePlaylist(name);
    setPlaylists(getPlaylists());
  }, []);

  return (
    <>
      {/* Persistent hidden player mount — always present in youtube mode */}
      <div id="icf-yt-player" className="hidden" />

      {/* Now-playing bar */}
      <div className="px-3 py-2.5 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-9 h-9 rounded-[8px] bg-[var(--bg-input)] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {current?.thumb
              ? <img src={current.thumb} alt="" className="w-full h-full object-cover" />
              : <Disc3 size={16} className="text-[var(--text-muted)]" />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {current?.title || 'Ничего не играет'}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {current?.channel || 'Найдите трек ниже'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <button
            onClick={() => advance(-1)}
            disabled={!queue.length}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
            title="Назад"
          >
            <SkipBack size={15} />
          </button>
          <button
            onClick={togglePlay}
            disabled={!current}
            className="w-9 h-9 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center disabled:opacity-40 transition-colors active:scale-95"
            title={isPlaying ? 'Пауза' : 'Играть'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="translate-x-[1px]" />}
          </button>
          <button
            onClick={() => advance(1)}
            disabled={!queue.length}
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 transition-colors"
            title="Вперёд"
          >
            <SkipForward size={15} />
          </button>
          <button
            onClick={() => current && onLike(current)}
            disabled={!current}
            className={cn(
              'w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors disabled:opacity-40',
              current && isLiked(current.videoId)
                ? 'text-[var(--danger)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            )}
            title="В любимое"
          >
            <Heart size={15} className={current && isLiked(current.videoId) ? 'fill-current' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] flex-shrink-0">
        {([
          ['search', 'Поиск', Search],
          ['liked', 'Любимое', Heart],
          ['playlists', 'Плейлисты', ListMusic],
        ] as [YtTab, string, React.ElementType][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-[7px] text-[11px] font-medium transition-colors',
              tab === id
                ? 'bg-[var(--accent-light)] text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
            )}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 min-h-0">
        {tab === 'search' && (
          <div className="space-y-2">
            <form
              onSubmit={(e) => { e.preventDefault(); runSearch(); }}
              className="flex items-center gap-1.5"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Найти музыку…"
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-[8px] bg-[var(--bg-input)] border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-accent)]"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="w-8 h-8 rounded-[8px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-colors"
                title="Искать"
              >
                <Search size={14} />
              </button>
            </form>

            {searching && (
              <p className="text-[11px] text-[var(--text-muted)] px-1 py-2">Поиск…</p>
            )}

            {noticeKey === 'no_key' && (
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 py-2 text-[11px] text-[var(--text-secondary)]">
                Поиск недоступен: не задан YOUTUBE_API_KEY
              </div>
            )}
            {noticeKey === 'error' && (
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 py-2 text-[11px] text-[var(--text-secondary)]">
                Не удалось выполнить поиск. Попробуйте позже.
              </div>
            )}
            {noticeKey === 'empty' && !searching && (
              <p className="text-[11px] text-[var(--text-muted)] px-1 py-2">Ничего не найдено.</p>
            )}

            {!!results.length && (
              <div className="space-y-0.5">
                {results.map((t) => (
                  <TrackRow
                    key={t.videoId}
                    track={t}
                    active={current?.videoId === t.videoId}
                    liked={isLiked(t.videoId)}
                    onPlay={() => playTrack(t, results)}
                    onLike={() => onLike(t)}
                  />
                ))}
                <button
                  onClick={handleSavePlaylist}
                  className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-[8px] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <Save size={12} /> Сохранить плейлист
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'liked' && (
          <div className="space-y-0.5">
            {likes.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)] px-1 py-3 text-center">
                Пока нет любимых треков.
              </p>
            ) : (
              likes.map((t) => (
                <TrackRow
                  key={t.videoId}
                  track={t}
                  active={current?.videoId === t.videoId}
                  liked
                  onPlay={() => playTrack(t, likes)}
                  onLike={() => onLike(t)}
                />
              ))
            )}
          </div>
        )}

        {tab === 'playlists' && (
          <div className="space-y-1.5">
            {Object.keys(playlists).length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)] px-1 py-3 text-center">
                Нет сохранённых плейлистов.
              </p>
            ) : (
              Object.entries(playlists).map(([name, tracks]) => (
                <div
                  key={name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-[8px] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <button
                    onClick={() => { if (tracks.length) playTrack(tracks[0], tracks); }}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left"
                  >
                    <ListPlus size={14} className="text-[var(--accent)] flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-medium text-[var(--text-primary)] truncate">{name}</span>
                      <span className="block text-[10px] text-[var(--text-muted)]">{tracks.length} трек.</span>
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeletePlaylist(name)}
                    className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-hover)] flex-shrink-0 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

function TrackRow({
  track, active, liked, onPlay, onLike,
}: {
  track: YtTrack;
  active: boolean;
  liked: boolean;
  onPlay: () => void;
  onLike: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-1.5 py-1.5 rounded-[8px] border transition-colors',
        active ? 'bg-[var(--accent-light)] border-[var(--border-accent)]' : 'border-transparent hover:bg-[var(--bg-hover)]'
      )}
    >
      <button onClick={onPlay} className="flex-1 min-w-0 flex items-center gap-2 text-left">
        <span className="w-8 h-8 rounded-[6px] bg-[var(--bg-input)] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {track.thumb
            ? <img src={track.thumb} alt="" className="w-full h-full object-cover" />
            : <Music2 size={14} className="text-[var(--text-muted)]" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className={cn(
            'block text-[11px] font-medium truncate',
            active ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
          )}>{track.title}</span>
          <span className="block text-[10px] text-[var(--text-muted)] truncate">{track.channel}</span>
        </span>
      </button>
      <button
        onClick={onLike}
        className={cn(
          'w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0 transition-colors',
          liked ? 'text-[var(--danger)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
        )}
        title="В любимое"
      >
        <Heart size={13} className={liked ? 'fill-current' : ''} />
      </button>
    </div>
  );
}
