'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings, User, Users, Timer, Bell, Music2, Cpu, VolumeX } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useAuth } from '@/components/AuthProvider';
import { recordPomodoro } from '@/lib/supabase';
import type { TimerSettings } from '@/types';

const PHASE_COLORS = {
  focus:      { stroke: '#16A34A', bg: '#F0FDF4', text: '#15803D', label: 'Фокус',            dot: '#16A34A' },
  shortBreak: { stroke: '#D97706', bg: '#FFFBEB', text: '#B45309', label: 'Перерыв',          dot: '#D97706' },
  longBreak:  { stroke: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8', label: 'Долгий перерыв',   dot: '#2563EB' },
};

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function PomodoroTimer() {
  const { phase, isRunning, timeLeft, totalTime, pomodoroCount, settings, isPersonal, setRunning, nextPhase, reset, updateSettings, setPersonal } = useTimerStore();
  const { room } = useRoomStore();
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const phaseColors = PHASE_COLORS[phase];
  const progress = totalTime > 0 ? (totalTime - timeLeft) / totalTime : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const playPhaseSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (settings.sound === 'none') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    const frequencies: Record<string, number[]> = { bell: [880, 660, 440], gong: [220, 110], chip: [880, 880, 660] };
    const freqs = frequencies[settings.sound] || frequencies.bell;
    oscillator.frequency.setValueAtTime(freqs[0], ctx.currentTime);
    freqs.forEach((f, i) => oscillator.frequency.setValueAtTime(f, ctx.currentTime + i * 0.15));
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);
  }, [settings.sound]);

  useEffect(() => {
    if (!isPersonal || !isRunning) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      useTimerStore.getState().tick();
      const { timeLeft: tl } = useTimerStore.getState();
      if (tl <= 0) {
        clearInterval(tickRef.current!);
        playPhaseSound();
        // Only fire a browser notification if the user enabled the setting AND granted permission.
        if (
          useSettingsStore.getState().pushNotifications &&
          typeof window !== 'undefined' &&
          'Notification' in window &&
          Notification.permission === 'granted'
        ) {
          try {
            new Notification('Таймер закончился!', {
              body: phase === 'focus' ? 'Время отдохнуть' : 'Назад к работе!',
            });
          } catch {}
        }
        // Persist completed session to DB (fire-and-forget)
        if (user) {
          const minutes = phase === 'focus' ? settings.focusDuration
            : phase === 'shortBreak' ? settings.shortBreakDuration
            : settings.longBreakDuration;
          recordPomodoro(minutes, phase, room?.slug).catch(() => {});
        }
        useTimerStore.getState().nextPhase();
      }
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [isPersonal, isRunning, phase, playPhaseSound]);

  useEffect(() => {
    if (!room || isPersonal) return;
    const s = getSocket();
    s.on('timer:state', (timerState) => {
      const store = useTimerStore.getState();
      store.setPhase(timerState.phase);
      store.setRunning(timerState.isRunning);
      store.setTimeLeft(timerState.timeLeft);
    });
    s.on('timer:tick', (tl) => { useTimerStore.getState().setTimeLeft(tl); });
    return () => { s.off('timer:state'); s.off('timer:tick'); };
  }, [room, isPersonal]);

  const handlePlayPause = () => {
    if (isPersonal) {
      setRunning(!isRunning);
    } else if (room) {
      const s = getSocket();
      if (isRunning) s.emit('timer:pause', room.slug);
      else s.emit('timer:start', { roomId: room.slug, settings });
    }
  };

  const handleReset = () => {
    if (isPersonal) reset();
    else if (room) getSocket().emit('timer:reset', room.slug);
  };

  return (
    <>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] shadow-[0_4px_16px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.04)] p-4 flex flex-col items-center gap-3">

        {/* Top bar: phase label + mode toggle + settings */}
        <div className="flex items-center gap-2 w-full justify-between">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border"
            style={{ background: phaseColors.bg, color: phaseColors.text, borderColor: phaseColors.stroke + '40' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: phaseColors.dot }} />
            {phaseColors.label}
          </span>
          <div className="flex items-center gap-1.5">
            {room && (
              <button
                onClick={() => setPersonal(!isPersonal)}
                className={cn(
                  'inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors duration-150',
                  isPersonal
                    ? 'bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-secondary)]'
                    : 'bg-[var(--accent-light)] border-[var(--border-accent)] text-[var(--accent)]'
                )}
              >
                {isPersonal ? <><User size={11} /> Личный</> : <><Users size={11} /> Общий</>}
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
              <Settings size={14} className="text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        {/* Circular progress — click to play/pause. Time is rendered INSIDE the
            SVG with text-anchor=middle / dominant-baseline=central so it sits
            mathematically at the geometric center of the circle. */}
        <button
          onClick={handlePlayPause}
          className="relative group rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent)]/20"
          title={isRunning ? 'Пауза' : 'Запустить'}
          style={{ width: 168, height: 168 }}
        >
          {isRunning && (
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
              style={{ backgroundColor: phaseColors.stroke + '30' }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <svg width="168" height="168" viewBox="0 0 168 168" className="absolute inset-0">
            {/* Ring — rotated only via group so the text inside stays upright */}
            <g transform="rotate(-90 84 84)">
              <circle cx="84" cy="84" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="6" />
              <motion.circle
                cx="84" cy="84" r={RADIUS}
                fill="none"
                stroke={phaseColors.stroke}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                transition={{ duration: 0.5 }}
                style={{ filter: isRunning ? `drop-shadow(0 0 6px ${phaseColors.stroke}60)` : 'none' }}
              />
            </g>
            {/* Center text — guaranteed perfect center via SVG text alignment */}
            <text
              x="84"
              y="84"
              textAnchor="middle"
              dominantBaseline="central"
              className="font-black tabular-nums tracking-tight select-none"
              style={{
                fontSize: '38px',
                fill: isRunning ? phaseColors.text : 'var(--text-primary)',
              }}
            >
              {formatTime(timeLeft)}
            </text>
          </svg>
          {!isRunning && (
            <span className="absolute bottom-2 left-0 right-0 text-center text-[9px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              нажмите для старта
            </span>
          )}
        </button>
        {/* Phase label OUTSIDE the circle */}
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.2em] -mt-1 transition-colors text-center"
          style={{ color: phaseColors.dot, opacity: 0.75 }}
        >
          {phaseColors.label}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={handleReset} className="p-2.5 hover:bg-[var(--bg-hover)] rounded-xl transition-colors">
            <RotateCcw size={16} className="text-[var(--text-muted)]" />
          </button>

          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={handlePlayPause}
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(37,99,235,0.25)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors duration-150"
          >
            {isRunning
              ? <Pause size={22} className="text-white fill-white" />
              : <Play size={22} className="text-white fill-white ml-0.5" />
            }
          </motion.button>

          {/* Pomodoro dots + count */}
          <div className="p-2.5 flex flex-col items-center gap-1">
            <div className="flex gap-1">
              {Array.from({ length: Math.min(settings.longBreakInterval, 8) }).map((_, i) => (
                <div key={i} className={cn('w-2.5 h-2.5 rounded-full transition-colors',
                  i < (pomodoroCount % settings.longBreakInterval) ? 'bg-[var(--accent)]' : 'bg-[#E2E8F0]'
                )} />
              ))}
            </div>
            <span className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1"><Timer size={10} /> {pomodoroCount}</span>
          </div>
        </div>

        {/* Phase switcher */}
        <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[12px] p-1 flex gap-1 w-full">
          {(['focus', 'shortBreak', 'longBreak'] as const).map((p) => (
            <button
              key={p}
              onClick={() => useTimerStore.getState().setPhase(p)}
              className={cn(
                'flex-1 text-xs py-1.5 rounded-[10px] transition-all duration-150',
                phase === p
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[0_1px_3px_rgba(15,23,42,0.06)] font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {p === 'focus' ? 'Фокус' : p === 'shortBreak' ? 'Перерыв' : 'Длинный'}
            </button>
          ))}
        </div>
      </div>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Настройки таймера" size="sm">
        <TimerSettingsForm settings={settings} onUpdate={updateSettings} onClose={() => setShowSettings(false)} />
      </Modal>
    </>
  );
}

function TimerSettingsForm({ settings, onUpdate, onClose }: {
  settings: TimerSettings;
  onUpdate: (s: Partial<TimerSettings>) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState(settings);
  const durations = [15, 25, 45, 60];
  const breaks = [5, 10, 15];
  const longBreaks = [15, 20, 30];

  const OptionBtn = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick}
      className={cn('px-3 py-1.5 rounded-[10px] text-sm transition-colors duration-150 border',
        active ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)] font-medium' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
      )}>
      {children}
    </button>
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <label className="text-sm text-[var(--text-secondary)] mb-2 block font-medium">Фокус (мин)</label>
        <div className="flex gap-2 flex-wrap">
          {durations.map(d => <OptionBtn key={d} active={local.focusDuration === d} onClick={() => setLocal(p => ({ ...p, focusDuration: d }))}>{d}</OptionBtn>)}
        </div>
      </div>
      <div>
        <label className="text-sm text-[var(--text-secondary)] mb-2 block font-medium">Короткий перерыв (мин)</label>
        <div className="flex gap-2">
          {breaks.map(d => <OptionBtn key={d} active={local.shortBreakDuration === d} onClick={() => setLocal(p => ({ ...p, shortBreakDuration: d }))}>{d}</OptionBtn>)}
        </div>
      </div>
      <div>
        <label className="text-sm text-[var(--text-secondary)] mb-2 block font-medium">Длинный перерыв (мин)</label>
        <div className="flex gap-2">
          {longBreaks.map(d => <OptionBtn key={d} active={local.longBreakDuration === d} onClick={() => setLocal(p => ({ ...p, longBreakDuration: d }))}>{d}</OptionBtn>)}
        </div>
      </div>
      <div>
        <label className="text-sm text-[var(--text-secondary)] mb-2 block font-medium">Звук</label>
        <div className="flex gap-2 flex-wrap">
          {(['bell', 'gong', 'chip', 'none'] as const).map(s => {
            const Icon = s === 'bell' ? Bell : s === 'gong' ? Music2 : s === 'chip' ? Cpu : VolumeX;
            const label = s === 'bell' ? 'Колокол' : s === 'gong' ? 'Гонг' : s === 'chip' ? 'Чип' : 'Тихо';
            return (
              <OptionBtn key={s} active={local.sound === s} onClick={() => setLocal(p => ({ ...p, sound: s }))}>
                <span className="inline-flex items-center gap-1.5"><Icon size={12} /> {label}</span>
              </OptionBtn>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-secondary)]">Авто-запуск следующей фазы</span>
        <button onClick={() => setLocal(p => ({ ...p, autoStart: !p.autoStart }))}
          className={cn('relative w-11 h-6 rounded-full transition-colors duration-150', local.autoStart ? 'bg-[var(--accent)]' : 'bg-[#E2E8F0]')}>
          <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm', local.autoStart ? 'translate-x-6' : 'translate-x-1')} />
        </button>
      </div>
      <div className="flex gap-3 pt-1">
        <Button variant="ghost" className="flex-1" onClick={onClose}>Отмена</Button>
        <Button className="flex-1" onClick={() => { onUpdate(local); onClose(); }}>Сохранить</Button>
      </div>
    </div>
  );
}
