'use client';

/**
 * WallClock — live analog clock for the room sidebar (ported from the lo-fi
 * prototype). Above the dial sits a small current-time readout; BELOW the dial
 * is a study-session timer that counts up for the current room visit. The
 * фокус / перерыв / длинный tabs set the user's presence status.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';

// warm paper palette
const FACE = '#f7f4ef';
const RIM = '#e0d8cc';
const RING = '#ede8e0';
const TICK = '#c0b0a0';
const HAND_H = '#5a4530';
const HAND_M = '#7a6045';
const HAND_S = '#c4784a';

function pt(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: 50 + Math.cos(rad) * r, y: 50 + Math.sin(rad) * r };
}

function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function WallClock({ slug }: { slug: string }) {
  const { currentUser, updateMyStatus } = useRoomStore();
  const [now, setNow] = useState<Date | null>(null);
  const startRef = useRef<number | null>(null);

  // Tick every second (initialised on the client to avoid SSR mismatch).
  useEffect(() => {
    startRef.current = Date.now();
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const s = now ? now.getSeconds() : 0;
  const m = (now ? now.getMinutes() : 0) + s / 60;
  const h = (now ? now.getHours() % 12 : 0) + m / 60;
  const sp = pt(s * 6, 37);
  const st = pt(s * 6 + 180, 7);
  const mp = pt(m * 6, 32);
  const hp = pt(h * 30, 22);
  const timeLabel = now
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    : '--:--';
  const sessionLabel = now && startRef.current ? fmtDuration(now.getTime() - startRef.current) : '00:00';

  // Phase tabs ↔ presence status
  const status = currentUser?.status ?? 'focus';
  const [longPicked, setLongPicked] = useState(false);
  const activeTab =
    status === 'away' ? null : status === 'break' ? (longPicked ? 'long' : 'break') : 'focus';

  const pick = (tab: 'focus' | 'break' | 'long') => {
    setLongPicked(tab === 'long');
    const next = tab === 'focus' ? 'focus' : 'break';
    updateMyStatus(next as any, currentUser?.currentTask);
    try {
      getSocket().emit('room:update-status', {
        roomId: slug,
        status: next,
        currentTask: currentUser?.currentTask,
      });
    } catch {}
  };

  const tabs: { key: 'focus' | 'break' | 'long'; label: string }[] = [
    { key: 'focus', label: 'фокус' },
    { key: 'break', label: 'перерыв' },
    { key: 'long', label: 'длинный' },
  ];

  const hourTicks = Array.from({ length: 12 }, (_, i) => {
    const a = pt(i * 30, 46);
    const b = pt(i * 30, i % 3 === 0 ? 40 : 42);
    return { a, b, major: i % 3 === 0 };
  });

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex flex-col items-center gap-2">
      {/* current time — moved up, simple */}
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
        <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
        сейчас {timeLabel}
      </div>

      {/* analog dial */}
      <svg width="112" height="112" viewBox="0 0 100 100" role="img" aria-label={`Часы ${timeLabel}`}>
        <circle cx="50" cy="50" r="46" fill={FACE} stroke={RIM} strokeWidth="1" />
        <circle cx="50" cy="50" r="42" fill="none" stroke={RING} strokeWidth="0.5" />
        <g stroke={TICK} strokeLinecap="round">
          {hourTicks.map((t, i) => (
            <line key={i} x1={t.a.x} y1={t.a.y} x2={t.b.x} y2={t.b.y} strokeWidth={t.major ? 2 : 1} />
          ))}
        </g>
        <line x1="50" y1="50" x2={hp.x} y2={hp.y} stroke={HAND_H} strokeWidth="3" strokeLinecap="round" />
        <line x1="50" y1="50" x2={mp.x} y2={mp.y} stroke={HAND_M} strokeWidth="2" strokeLinecap="round" />
        <line x1={st.x} y1={st.y} x2={sp.x} y2={sp.y} stroke={HAND_S} strokeWidth="1" strokeLinecap="round" />
        <circle cx="50" cy="50" r="3" fill={HAND_H} />
        <circle cx="50" cy="50" r="1.5" fill={HAND_S} />
      </svg>

      {/* study-session timer — below the dial */}
      <div className="flex flex-col items-center leading-none -mt-0.5">
        <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Занятие</span>
        <span className="text-[16px] font-bold tabular-nums tracking-[0.08em] text-[var(--accent)] mt-1">{sessionLabel}</span>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-1 w-full mt-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => pick(key)}
            className={cn(
              'flex-1 py-1.5 text-[10px] rounded-[8px] border transition-all duration-200 tracking-[0.04em]',
              activeTab === key
                ? 'text-[var(--accent)] border-[var(--border-accent)] bg-[var(--accent-light)] font-semibold'
                : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
