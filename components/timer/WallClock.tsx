'use client';

/**
 * WallClock — live analog clock for the room sidebar. Above the dial sits a
 * small current-time readout; BELOW the dial is a line that shows either the
 * study-session timer (counts up for the visit) OR, when a Pomodoro is running,
 * the phase countdown. The фокус / перерыв / длинный tabs start / pause the
 * Pomodoro (25 / 5 / 15 min) and set the user's presence status — no new UI,
 * the design is unchanged, only the existing line + tabs gain behaviour.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/store/roomStore';
import { useTimerStore } from '@/store/timerStore';
import type { TimerPhase } from '@/types';
import { getSocket } from '@/lib/socket';
import { Settings as SettingsIcon } from 'lucide-react';
import PomodoroSettings from './PomodoroSettings';

function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function mmss(totalSec: number): string {
  const t = Math.max(0, Math.floor(totalSec));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

const PHASE_LABEL: Record<TimerPhase, string> = { focus: 'ФОКУС', shortBreak: 'ПЕРЕРЫВ', longBreak: 'ДЛИННЫЙ' };
const TAB_TO_PHASE: Record<'focus' | 'break' | 'long', TimerPhase> = { focus: 'focus', break: 'shortBreak', long: 'longBreak' };

// short, soft completion chime (WebAudio — no asset, gated in try/catch)
function playChime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.55);
    o.onended = () => { try { ctx.close(); } catch {} };
  } catch {}
}

export default function WallClock({ slug }: { slug: string }) {
  const { currentUser, updateMyStatus } = useRoomStore();
  const timer = useTimerStore();
  const [now, setNow] = useState<Date | null>(null);
  const [showCfg, setShowCfg] = useState(false);
  const startRef = useRef<number | null>(null);

  const syncPresence = (next: 'focus' | 'break') => {
    const cu = useRoomStore.getState().currentUser;
    updateMyStatus(next as any, cu?.currentTask);
    try {
      getSocket().emit('room:update-status', { roomId: slug, status: next, currentTask: cu?.currentTask });
    } catch {}
  };

  // Tick every second: drive the wall clock AND the Pomodoro countdown.
  useEffect(() => {
    startRef.current = Date.now();
    setNow(new Date());
    const i = setInterval(() => {
      setNow(new Date());
      const t = useTimerStore.getState();
      if (t.isRunning) {
        if (t.timeLeft <= 1) {
          const wasFocus = t.phase === 'focus';
          t.nextPhase(); // auto-advance focus↔break + bump store pomodoro count
          const np = useTimerStore.getState().phase;
          syncPresence(np === 'focus' ? 'focus' : 'break');
          if (wasFocus) {
            // reflect a completed pomodoro on my own participant card
            const cu = useRoomStore.getState().currentUser;
            if (cu) useRoomStore.getState().setCurrentUser({ ...cu, pomodoroCount: (cu.pomodoroCount || 0) + 1 });
          }
          playChime();
        } else {
          t.tick();
        }
      }
    }, 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeLabel = now
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    : '--:--';

  // Pomodoro active = running OR partially elapsed (paused mid-phase)
  const pomoActive = timer.isRunning || timer.timeLeft < timer.totalTime;
  const sessionLabel = pomoActive ? PHASE_LABEL[timer.phase] : 'Занятие';
  const sessionValue = pomoActive
    ? mmss(timer.timeLeft)
    : (now && startRef.current ? fmtDuration(now.getTime() - startRef.current) : '00:00');
  const paused = pomoActive && !timer.isRunning;

  const pick = (tab: 'focus' | 'break' | 'long') => {
    const t = useTimerStore.getState();
    const phase = TAB_TO_PHASE[tab];
    const samePhaseActive = t.phase === phase && (t.isRunning || t.timeLeft < t.totalTime);
    if (samePhaseActive) {
      t.setRunning(!t.isRunning); // toggle pause / resume (no new control needed)
    } else {
      t.setPhase(phase); // reset to phase duration
      t.setRunning(true); // start the Pomodoro
    }
    syncPresence(tab === 'focus' ? 'focus' : 'break');
  };

  const activeTab = timer.phase === 'focus' ? 'focus' : timer.phase === 'longBreak' ? 'long' : 'break';

  const tabs: { key: 'focus' | 'break' | 'long'; label: string }[] = [
    { key: 'focus', label: 'фокус' },
    { key: 'break', label: 'перерыв' },
    { key: 'long', label: 'длинный' },
  ];

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.3)] p-4 flex flex-col items-center gap-2">
      <button onClick={() => setShowCfg(true)} title="Настроить помодоро"
        className="self-end -mt-1 -mr-1 p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
        <SettingsIcon size={13} />
      </button>

      {/* digital clock */}
      <div className="flex items-baseline gap-1 py-1">
        <span className="text-[36px] font-bold tabular-nums tracking-[0.04em] text-[var(--text-primary)] leading-none">
          {timeLabel}
        </span>
        <span className="text-[13px] font-semibold tabular-nums text-[var(--text-muted)]">
          {now ? String(now.getSeconds()).padStart(2, '0') : '--'}
        </span>
      </div>

      {/* session / pomodoro line — below the dial (same slot for both) */}
      <div className="flex flex-col items-center leading-none -mt-0.5">
        <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{sessionLabel}</span>
        <span className={cn('text-[16px] font-bold tabular-nums tracking-[0.08em] text-[var(--accent)] mt-1', paused && 'opacity-50')}>
          {sessionValue}
        </span>
      </div>

      {/* Phase tabs — also start / pause the Pomodoro */}
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

      {showCfg && <PomodoroSettings onClose={() => setShowCfg(false)} />}
    </div>
  );
}
