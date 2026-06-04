'use client';

/**
 * WallClock — room sidebar timer. Small current-time readout on top, then a
 * prominent Pomodoro countdown (MM:SS) with explicit play/pause + reset, and
 * the фокус / перерыв / длинный phase tabs (which pick the phase + set the
 * user's presence status). Durations are configurable via the gear.
 */

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useRoomStore } from '@/store/roomStore';
import { useTimerStore } from '@/store/timerStore';
import type { TimerPhase } from '@/types';
import { getSocket } from '@/lib/socket';
import { Settings as SettingsIcon, Play, Pause, RotateCcw } from 'lucide-react';
import PomodoroSettings from './PomodoroSettings';

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
  const { updateMyStatus } = useRoomStore();
  const timer = useTimerStore();
  const [now, setNow] = useState<Date | null>(null);
  const [showCfg, setShowCfg] = useState(false);

  const syncPresence = (next: 'focus' | 'break') => {
    const cu = useRoomStore.getState().currentUser;
    updateMyStatus(next as any, cu?.currentTask);
    try {
      getSocket().emit('room:update-status', { roomId: slug, status: next, currentTask: cu?.currentTask });
    } catch {}
  };

  // Tick every second: update the wall clock + drive the Pomodoro countdown.
  useEffect(() => {
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

  const running = timer.isRunning;
  const paused = !running && timer.timeLeft < timer.totalTime;

  // Play / pause the current phase
  const toggle = () => {
    const t = useTimerStore.getState();
    const nextRunning = !t.isRunning;
    t.setRunning(nextRunning);
    if (nextRunning) syncPresence(t.phase === 'focus' ? 'focus' : 'break');
  };
  const resetTimer = () => useTimerStore.getState().reset();

  // Pick a phase (sets its duration, stopped) + presence; play starts it.
  const pick = (tab: 'focus' | 'break' | 'long') => {
    useTimerStore.getState().setPhase(TAB_TO_PHASE[tab]);
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

      {/* current time */}
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)] -mt-1">
        <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
        сейчас {timeLabel}
      </div>

      {/* Pomodoro countdown */}
      <div className="flex flex-col items-center leading-none mt-1">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {PHASE_LABEL[timer.phase]}{paused && ' · пауза'}
        </span>
        <span className={cn(
          'text-[42px] font-bold tabular-nums tracking-[0.02em] mt-1.5 leading-none transition-colors',
          running ? 'text-[var(--accent)]' : paused ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
        )}>
          {mmss(timer.timeLeft)}
        </span>
      </div>

      {/* controls: reset + play/pause */}
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={resetTimer}
          title="Сбросить"
          className="w-8 h-8 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] flex items-center justify-center transition-colors active:scale-95"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={toggle}
          title={running ? 'Пауза' : 'Старт'}
          className="w-12 h-12 rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] flex items-center justify-center transition-all active:scale-95 shadow-glow"
        >
          {running ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        </button>
      </div>

      {/* phase tabs — pick the phase */}
      <div className="flex gap-1 w-full mt-2">
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
