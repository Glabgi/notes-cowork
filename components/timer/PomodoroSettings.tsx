'use client';
import { Check, X } from 'lucide-react';
import { useTimerStore } from '@/store/timerStore';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: '25 / 5', f: 25, s: 5, l: 15 },
  { label: '50 / 10', f: 50, s: 10, l: 20 },
  { label: '90 / 20', f: 90, s: 20, l: 30 },
];

export default function PomodoroSettings({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useTimerStore();
  const rows: { key: 'focusDuration' | 'shortBreakDuration' | 'longBreakDuration'; label: string; min: number; max: number }[] = [
    { key: 'focusDuration', label: 'Фокус (мин)', min: 5, max: 90 },
    { key: 'shortBreakDuration', label: 'Перерыв (мин)', min: 1, max: 30 },
    { key: 'longBreakDuration', label: 'Длинный (мин)', min: 5, max: 60 },
  ];
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] w-full max-w-xs p-5 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[var(--text-primary)] text-sm">Помодоро</h3>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={16} /></button>
        </div>

        {/* quick presets — фокус / перерыв */}
        <div className="flex gap-1.5">
          {PRESETS.map(p => {
            const active = settings.focusDuration === p.f && settings.shortBreakDuration === p.s;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => updateSettings({ focusDuration: p.f, shortBreakDuration: p.s, longBreakDuration: p.l })}
                className={cn(
                  'flex-1 py-1.5 rounded-[8px] text-xs border transition-colors tabular-nums',
                  active
                    ? 'bg-[var(--accent-light)] border-[var(--border-accent)] text-[var(--accent)] font-semibold'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {rows.map(r => (
          <label key={r.key} className="flex items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
            {r.label}
            <input type="number" min={r.min} max={r.max} value={settings[r.key]}
              onChange={e => updateSettings({ [r.key]: Math.max(r.min, Math.min(r.max, +e.target.value || r.min)) } as any)}
              className="w-16 bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 py-1 text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--accent)]" />
          </label>
        ))}
        <label className="flex items-center justify-between gap-2 text-sm text-[var(--text-secondary)]">
          Длинный каждые
          <input type="number" min={2} max={8} value={settings.longBreakInterval}
            onChange={e => updateSettings({ longBreakInterval: Math.max(2, Math.min(8, +e.target.value || 4)) })}
            className="w-16 bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 py-1 text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input type="checkbox" checked={settings.autoStart} onChange={e => updateSettings({ autoStart: e.target.checked })} className="accent-[var(--accent)]" />
          Авто-старт следующей фазы
        </label>
        <button onClick={onClose} className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-[10px] bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)]">
          <Check size={15} /> Готово
        </button>
      </div>
    </div>
  );
}
