'use client';

/**
 * WallClock — live analog clock for the room sidebar, ported from the lo-fi
 * prototype (lofi_focus_animated_status.html). Replaces the Pomodoro countdown.
 * Below the dial sit the фокус / перерыв / длинный phase tabs, which set the
 * user's presence status (kept in sync with the StatusSelector via the store).
 */

import { useEffect, useState } from 'react';
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

export default function WallClock({ slug }: { slug: string }) {
  const { currentUser, updateMyStatus } = useRoomStore();
  const [now, setNow] = useState<Date | null>(null);

  // Tick every second (initialised on the client to avoid SSR mismatch).
  useEffect(() => {
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
  const label = now
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    : '--:--';

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

  // Tick marks: 12 hour ticks (long) + a thin ring of minor accents.
  const hourTicks = Array.from({ length: 12 }, (_, i) => {
    const a = pt(i * 30, 46);
    const b = pt(i * 30, i % 3 === 0 ? 40 : 42);
    return { a, b, major: i % 3 === 0 };
  });

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] shadow-[0_1px_3px_rgba(15,23,42,0.04)] p-4 flex flex-col items-center gap-3">
      <div className="flex items-center justify-center pt-1">
        <svg width="116" height="116" viewBox="0 0 100 100" role="img" aria-label={`Часы ${label}`}>
          <circle cx="50" cy="50" r="46" fill={FACE} stroke={RIM} strokeWidth="1" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={RING} strokeWidth="0.5" />
          <g stroke={TICK} strokeLinecap="round">
            {hourTicks.map((t, i) => (
              <line
                key={i}
                x1={t.a.x}
                y1={t.a.y}
                x2={t.b.x}
                y2={t.b.y}
                strokeWidth={t.major ? 2 : 1}
              />
            ))}
          </g>
          {/* hour */}
          <line x1="50" y1="50" x2={hp.x} y2={hp.y} stroke={HAND_H} strokeWidth="3" strokeLinecap="round" />
          {/* minute */}
          <line x1="50" y1="50" x2={mp.x} y2={mp.y} stroke={HAND_M} strokeWidth="2" strokeLinecap="round" />
          {/* second */}
          <line x1={st.x} y1={st.y} x2={sp.x} y2={sp.y} stroke={HAND_S} strokeWidth="1" strokeLinecap="round" />
          <circle cx="50" cy="50" r="3" fill={HAND_H} />
          <circle cx="50" cy="50" r="1.5" fill={HAND_S} />
        </svg>
      </div>

      <div className="text-[11px] font-bold tabular-nums tracking-[0.18em] text-[var(--text-secondary)] -mt-1">
        {label}
      </div>

      {/* Phase tabs */}
      <div className="flex gap-1 w-full">
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
