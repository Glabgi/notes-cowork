'use client';

/**
 * I.C-E.F Notes brand logo — compact horizontal lockup for the top bar.
 * Navy "I.C-E.F" + cyan "notes" with the bespectacled-mustache 'o' mark,
 * matching the project's brand image.
 */
export default function IcefLogo({ size = 28 }: { size?: number }) {
  const NAVY = '#16307A';
  const CYAN = '#36B3E8';
  return (
    <span className="inline-flex items-center gap-2 group-hover:opacity-90 transition-opacity select-none">
      {/* Mark: bespectacled circle (the "notes" mascot) */}
      <span
        className="relative inline-flex items-center justify-center rounded-full flex-shrink-0"
        style={{ width: size, height: size, background: '#EAF6FD', border: `2px solid ${CYAN}` }}
        aria-hidden
      >
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
          {/* glasses */}
          <circle cx="7.5" cy="10" r="3.2" stroke={NAVY} strokeWidth="1.6" />
          <circle cx="16.5" cy="10" r="3.2" stroke={NAVY} strokeWidth="1.6" />
          <path d="M10.7 10h2.6" stroke={NAVY} strokeWidth="1.6" strokeLinecap="round" />
          {/* mustache */}
          <path d="M6 15c1.6 1.8 3.3 1.8 6 1.8s4.4 0 6-1.8c-1.5.6-3 .6-3.4-.2-.5 1-1.7 1-2.6 1s-2.1 0-2.6-1c-.4.8-1.9.8-3.4.2Z" fill={NAVY} />
        </svg>
      </span>
      {/* Wordmark */}
      <span className="hidden sm:flex flex-col leading-none">
        <span className="font-black tracking-tight text-[13px]" style={{ color: NAVY }}>
          I.C-E.F
        </span>
        <span className="font-extrabold tracking-tight text-[12px] -mt-0.5" style={{ color: CYAN }}>
          notes<span className="text-[var(--text-muted)] font-medium text-[9px] ml-1">cowork</span>
        </span>
      </span>
    </span>
  );
}
