'use client';

/**
 * ICF Notes — horizontal lockup for the top bar.
 * Bespectacled study mark + "ICF / notes" wordmark (theme-aware).
 */
export default function IcefLogo({ size = 40 }: { size?: number }) {
  const INK = 'var(--text-primary)';
  const BLUE = 'var(--accent)';
  return (
    <span className="inline-flex items-center gap-2.5 group-hover:opacity-90 transition-opacity select-none">
      {/* Mark: bespectacled circle (the "notes" mascot) */}
      <span
        className="relative inline-flex items-center justify-center rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(91,140,255,0.30)]"
        style={{ width: size, height: size, background: 'var(--bg-elevated)', border: `2.5px solid ${BLUE}` }}
        aria-hidden
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <circle cx="7.5" cy="10" r="3.2" stroke={INK} strokeWidth="1.7" />
          <circle cx="16.5" cy="10" r="3.2" stroke={INK} strokeWidth="1.7" />
          <path d="M10.7 10h2.6" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
          <path d="M6 15c1.6 1.8 3.3 1.8 6 1.8s4.4 0 6-1.8c-1.5.6-3 .6-3.4-.2-.5 1-1.7 1-2.6 1s-2.1 0-2.6-1c-.4.8-1.9.8-3.4.2Z" fill={INK} />
        </svg>
      </span>
      {/* Wordmark */}
      <span className="hidden sm:flex flex-col leading-none">
        <span className="font-black tracking-tight text-[17px]" style={{ color: INK }}>
          ICF
        </span>
        <span className="font-extrabold tracking-tight text-[13px] -mt-0.5 lowercase" style={{ color: BLUE }}>
          notes
        </span>
      </span>
    </span>
  );
}
