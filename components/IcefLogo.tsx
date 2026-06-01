'use client';

/**
 * «тихий зал» brand logo — horizontal lockup for the top bar.
 * Ink "тихий" + teal "зал" with the bespectacled study mark.
 */
export default function IcefLogo({ size = 40 }: { size?: number }) {
  const NAVY = '#2a2018';
  const CYAN = '#4a8a78';
  return (
    <span className="inline-flex items-center gap-2.5 group-hover:opacity-90 transition-opacity select-none">
      {/* Mark: bespectacled circle (the "notes" mascot) */}
      <span
        className="relative inline-flex items-center justify-center rounded-full flex-shrink-0 shadow-[0_2px_8px_rgba(54,179,232,0.25)]"
        style={{ width: size, height: size, background: '#f7efe6', border: `2.5px solid ${CYAN}` }}
        aria-hidden
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
          <circle cx="7.5" cy="10" r="3.2" stroke={NAVY} strokeWidth="1.7" />
          <circle cx="16.5" cy="10" r="3.2" stroke={NAVY} strokeWidth="1.7" />
          <path d="M10.7 10h2.6" stroke={NAVY} strokeWidth="1.7" strokeLinecap="round" />
          <path d="M6 15c1.6 1.8 3.3 1.8 6 1.8s4.4 0 6-1.8c-1.5.6-3 .6-3.4-.2-.5 1-1.7 1-2.6 1s-2.1 0-2.6-1c-.4.8-1.9.8-3.4.2Z" fill={NAVY} />
        </svg>
      </span>
      {/* Wordmark */}
      <span className="hidden sm:flex flex-col leading-none">
        <span className="font-black tracking-tight text-[18px] lowercase" style={{ color: NAVY }}>
          тихий
        </span>
        <span className="font-extrabold tracking-tight text-[15px] -mt-0.5 flex items-baseline gap-1.5 lowercase" style={{ color: CYAN }}>
          зал
          <span className="text-[var(--text-muted)] font-semibold text-[10px] uppercase tracking-wider">учимся вместе</span>
        </span>
      </span>
    </span>
  );
}
