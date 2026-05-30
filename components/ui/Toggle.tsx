'use client';

import { cn } from '@/lib/utils';

/**
 * Shared on/off switch. Single source of truth for every тумблер в приложении,
 * чтобы не плодить разные (и местами нерабочие) реализации.
 *
 * Реализация на flex (knob — flex-ребёнок, без absolute), поэтому бегунок
 * никогда не уезжает/не вылезает за трек в разных браузерах.
 */
export default function Toggle({
  on,
  onToggle,
  disabled = false,
  'aria-label': ariaLabel,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-pressed={on}
      aria-label={ariaLabel}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) onToggle(); }}
      disabled={disabled}
      className={cn(
        'inline-flex items-center w-12 h-7 rounded-full p-1 transition-colors duration-200 flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        on ? 'bg-[var(--accent)] justify-end' : 'bg-[var(--border-strong)] justify-start'
      )}
    >
      <span className="block w-5 h-5 bg-white rounded-full shadow-[0_1px_3px_rgba(15,23,42,0.25)] transition-transform duration-200" />
    </button>
  );
}
