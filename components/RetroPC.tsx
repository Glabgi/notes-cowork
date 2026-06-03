'use client';

/**
 * RetroPC — an 80s monochrome desktop PC with a green CRT terminal, ported from
 * the lo-fi prototype (80s_pc_detail.html). The chassis is static SVG; the seven
 * screen lines cycle through themed sets and the cursor blinks, both React-driven.
 */

import { useState, useEffect } from 'react';

const GREEN_A = '#3adc34';
const GREEN_B = '#2aac26';

const SETS: string[][] = [
  ['C:\\> STUDY.EXE', 'Loading...', 'ICEF NOTES', 'ver 1.0  (c)1984', 'session start...', 'lo-fi mode ON', 'focus: ACTIVE'],
  ['ICEF NOTES', '───────────────', 'Садись и учись.', 'Lo-fi играет.', 'Рядом — тишина.', 'Все в фокусе.', 'together'],
  ['C:\\> RUN FOCUS', 'OK...', '> session start', '> mode: quiet', '> music: lo-fi', '> status: ON', 'учимся вместе'],
];

export default function RetroPC({ className }: { className?: string }) {
  const [set, setSet] = useState(0);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setSet(s => (s + 1) % SETS.length), 3200);
    const c = setInterval(() => setCursor(v => !v), 600);
    return () => { clearInterval(t); clearInterval(c); };
  }, []);

  const lines = SETS[set];

  return (
    <svg viewBox="0 0 680 420" className={className} role="img" aria-label="Ретро-компьютер из 80-х">
      <defs>
        <clipPath id="retro-scr-clip">
          <rect x="258" y="108" width="136" height="88" rx="2" />
        </clipPath>
        <pattern id="retro-scan" x="0" y="0" width="1" height="4" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="1" height="3" fill="transparent" />
          <rect x="0" y="3" width="1" height="1" fill="#000" opacity="0.22" />
        </pattern>
      </defs>

      {/* ground line + desk */}
      <line x1="0" y1="310" x2="680" y2="310" stroke="#e8e0d0" strokeWidth="1" />
      <rect x="200" y="305" width="480" height="8" rx="2" fill="#d8d0c0" />
      <rect x="200" y="310" width="480" height="4" rx="0" fill="#c8c0b0" />

      {/* monitor body */}
      <rect x="240" y="90" width="172" height="128" rx="6" fill="#c8c2b4" />
      <rect x="241" y="91" width="170" height="60" rx="4" fill="#b8b2a4" />
      <rect x="242" y="92" width="168" height="58" rx="3" fill="#c0bab2" />
      <rect x="244" y="94" width="164" height="118" rx="4" fill="#b0aaa0" />
      <rect x="248" y="98" width="156" height="96" rx="3" fill="#1a1a10" />
      <rect x="250" y="100" width="152" height="92" rx="2" fill="#0a0f04" />
      <rect x="258" y="108" width="136" height="88" rx="2" fill="#080e03" />

      {/* CRT screen */}
      <g clipPath="url(#retro-scr-clip)">
        <rect x="258" y="108" width="136" height="88" fill="#080e03" />
        {lines.map((txt, i) => (
          <text
            key={i}
            x="262"
            y={122 + i * 10}
            fontFamily="'Courier New',monospace"
            fontSize="7"
            fill={i % 2 === 0 ? GREEN_A : GREEN_B}
            letterSpacing="0.5"
          >
            {i === 6 ? (
              <>
                {txt}
                <tspan fill={GREEN_A}>{cursor ? '_' : ' '}</tspan>
              </>
            ) : (
              txt
            )}
          </text>
        ))}
        <rect x="258" y="108" width="136" height="88" fill="url(#retro-scan)" opacity="0.9" />
        <rect x="258" y="108" width="136" height="12" fill={GREEN_A} opacity="0.04" />
      </g>

      <rect x="248" y="98" width="156" height="96" rx="3" fill="none" stroke="#0a0a06" strokeWidth="1" />

      {/* monitor stand + power LED */}
      <rect x="285" y="216" width="82" height="6" rx="1" fill="#a8a29a" />
      <rect x="380" y="196" width="8" height="26" rx="1" fill="#b0aa9e" />
      <circle cx="408" cy="202" r="4" fill="#9a9490" />
      <circle cx="408" cy="202" r="2" fill={GREEN_A} opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* nameplate */}
      <rect x="245" y="220" width="162" height="12" rx="3" fill="#a8a29a" />
      <text x="326" y="229" fontFamily="'Courier New',monospace" fontSize="6" fill="#7a7470" textAnchor="middle" letterSpacing="1">
        ICEF-PC
      </text>
      <rect x="255" y="232" width="48" height="5" rx="1" fill="#b8b2aa" />
      <rect x="309" y="232" width="30" height="5" rx="1" fill="#b8b2aa" />
      <rect x="345" y="232" width="20" height="5" rx="1" fill="#b8b2aa" />
      <rect x="371" y="232" width="34" height="5" rx="1" fill="#b8b2aa" />

      {/* keyboard */}
      <rect x="240" y="237" width="172" height="78" rx="4" fill="#c0bab0" />
      <g fill="#d4cec6" stroke="#a8a29a" strokeWidth="0.5">
        <rect x="248" y="246" width="12" height="10" rx="1.5" />
        <rect x="262" y="246" width="12" height="10" rx="1.5" />
        <rect x="276" y="246" width="12" height="10" rx="1.5" />
        <rect x="290" y="246" width="12" height="10" rx="1.5" />
        <rect x="304" y="246" width="12" height="10" rx="1.5" />
        <rect x="318" y="246" width="12" height="10" rx="1.5" />
        <rect x="332" y="246" width="12" height="10" rx="1.5" />
        <rect x="346" y="246" width="12" height="10" rx="1.5" />
        <rect x="360" y="246" width="12" height="10" rx="1.5" />
        <rect x="374" y="246" width="18" height="10" rx="1.5" />
        <rect x="248" y="259" width="16" height="10" rx="1.5" />
        <rect x="266" y="259" width="12" height="10" rx="1.5" />
        <rect x="280" y="259" width="12" height="10" rx="1.5" />
        <rect x="294" y="259" width="12" height="10" rx="1.5" />
        <rect x="308" y="259" width="12" height="10" rx="1.5" />
        <rect x="322" y="259" width="12" height="10" rx="1.5" />
        <rect x="336" y="259" width="12" height="10" rx="1.5" />
        <rect x="350" y="259" width="12" height="10" rx="1.5" />
        <rect x="364" y="259" width="28" height="10" rx="1.5" />
        <rect x="248" y="272" width="20" height="10" rx="1.5" />
        <rect x="270" y="272" width="12" height="10" rx="1.5" />
        <rect x="284" y="272" width="12" height="10" rx="1.5" />
        <rect x="298" y="272" width="12" height="10" rx="1.5" />
        <rect x="312" y="272" width="12" height="10" rx="1.5" />
        <rect x="326" y="272" width="12" height="10" rx="1.5" />
        <rect x="340" y="272" width="12" height="10" rx="1.5" />
        <rect x="354" y="272" width="38" height="10" rx="1.5" />
        <rect x="256" y="285" width="82" height="10" rx="1.5" />
        <rect x="350" y="285" width="14" height="10" rx="1.5" />
        <rect x="366" y="285" width="14" height="10" rx="1.5" />
      </g>
      <rect x="240" y="315" width="172" height="6" rx="2" fill="#b0aa9e" />
      <rect x="260" y="304" width="132" height="6" rx="1" fill="#c8c0b0" opacity="0.5" />
      <rect x="285" y="321" width="82" height="12" rx="3" fill="#b8b2a8" />
      <rect x="285" y="321" width="82" height="5" rx="2" fill="#c8c2b8" />
      <rect x="287" y="333" width="78" height="6" rx="3" fill="#a8a29a" />

      <rect x="200" y="309" width="480" height="2" rx="1" fill="#b0a898" />

      {/* floppy drive */}
      <rect x="220" y="270" width="14" height="52" rx="1" fill="#b8b2a8" />
      <rect x="220" y="270" width="14" height="8" rx="1" fill="#c8c2b8" />
      <rect x="222" y="282" width="10" height="36" rx="1" fill="#a8a29a" />
      <rect x="222" y="282" width="10" height="4" rx="0.5" fill="#b8b2aa" />
      <rect x="222" y="290" width="10" height="4" rx="0.5" fill="#b8b2aa" />
      <rect x="222" y="298" width="10" height="4" rx="0.5" fill="#b8b2aa" />

      {/* sticky note */}
      <rect x="185" y="290" width="32" height="24" rx="3" fill="#c8c2b8" />
      <rect x="186" y="291" width="30" height="22" rx="2" fill="#b8b2a8" />
      <rect x="190" y="294" width="22" height="3" rx="0.5" fill="#a8a298" />
      <rect x="190" y="300" width="18" height="3" rx="0.5" fill="#a8a298" />
      <rect x="190" y="306" width="20" height="3" rx="0.5" fill="#a8a298" />
      <circle cx="214" cy="296" r="2" fill="#c4784a" opacity="0.7" />

      {/* manuals + mouse */}
      <rect x="415" y="248" width="40" height="60" rx="3" fill="#c0bab0" />
      <rect x="416" y="249" width="38" height="58" rx="2" fill="#b0aa9e" />
      <rect x="419" y="252" width="32" height="4" rx="0.5" fill="#a0998e" />
      <rect x="419" y="259" width="32" height="4" rx="0.5" fill="#a0998e" />
      <rect x="419" y="266" width="32" height="4" rx="0.5" fill="#a0998e" />
      <rect x="419" y="273" width="22" height="4" rx="0.5" fill="#a0998e" />
      <circle cx="435" cy="298" r="5" fill="#a8a29a" />
      <circle cx="435" cy="298" r="3" fill="#b8b2a8" />
    </svg>
  );
}
