'use client';

/**
 * DeskWriter — a little person writing at a desk who follows the cursor with
 * eyes + head. Ported from desk-writer.html, with the wall/window removed so it
 * sits on our themed (white / dark) panel. Animations live in globals.css
 * (.dw-* / #dw-* — single instance, so ids are safe).
 */

import { useEffect, useRef } from 'react';

export default function DeskWriter({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const pLRef = useRef<SVGCircleElement>(null);
  const pRRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const svg = svgRef.current, head = headRef.current, pL = pLRef.current, pR = pRRef.current;
    if (!svg || !head || !pL || !pR) return;
    const L = { x: 111, y: 71 }, R = { x: 133, y: 71 };
    const PMAX = 2.6, HMAX = 2.2;
    const move = (cx: number, cy: number) => {
      const r = svg.getBoundingClientRect();
      const ox = r.left + r.width * 0.5;
      const oy = r.top + r.height * 0.33;
      const dx = cx - ox, dy = cy - oy;
      const a = Math.atan2(dy, dx);
      const k = Math.min(Math.hypot(dx, dy) / 280, 1);
      const ex = Math.cos(a) * PMAX * k, ey = Math.sin(a) * PMAX * k;
      pL.setAttribute('cx', (L.x + ex).toFixed(2)); pL.setAttribute('cy', (L.y + ey).toFixed(2));
      pR.setAttribute('cx', (R.x + ex).toFixed(2)); pR.setAttribute('cy', (R.y + ey).toFixed(2));
      const hx = Math.cos(a) * HMAX * k, hy = Math.sin(a) * HMAX * k * 0.5;
      const rot = Math.cos(a) * 5 * k;
      head.setAttribute('transform', `rotate(${rot.toFixed(2)} 121 92) translate(${hx.toFixed(2)} ${hy.toFixed(2)})`);
    };
    const onMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => { if (e.touches[0]) move(e.touches[0].clientX, e.touches[0].clientY); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
    };
  }, []);

  return (
    <div className={className}>
      <div className="flex items-center justify-center py-6 px-4 select-none">
        <svg ref={svgRef} viewBox="0 0 240 220" className="w-[260px] max-w-full h-auto" style={{ overflow: 'visible' }} aria-hidden="true">
          <g className="dw-float">
            {/* shadow */}
            <ellipse cx="120" cy="201" rx="84" ry="8.5" fill="#3a2f22" opacity="0.09" />

            {/* body / sweater */}
            <g>
              <path d="M111 88 q10 7 20 0 l1 18 q-11 6 -22 0 Z" fill="#e7bc92" />
              <path d="M111 92 q10 6 20 0 l0 5 q-10 5 -20 0 Z" fill="#dcab80" />
              <path d="M76 170 q-3 -54 44 -58 q47 4 44 58 Z" fill="#5e7060" />
              <path d="M102 99 q19 12 36 0 l0 11 q-18 12 -36 0 Z" fill="#4c5c4a" />
              <g stroke="#3f4d3d" strokeWidth="1.1" strokeLinecap="round" opacity="0.65">
                <line x1="106" y1="102.4" x2="106" y2="111.4" />
                <line x1="110" y1="104.2" x2="110" y2="113.2" />
                <line x1="114" y1="105.3" x2="114" y2="114.3" />
                <line x1="118" y1="105.9" x2="118" y2="114.9" />
                <line x1="122" y1="105.9" x2="122" y2="114.9" />
                <line x1="126" y1="105.3" x2="126" y2="114.3" />
                <line x1="130" y1="104.2" x2="130" y2="113.2" />
                <line x1="134" y1="102.4" x2="134" y2="111.4" />
              </g>
              <path d="M102 99 q19 12 36 0" fill="none" stroke="#6b7d68" strokeWidth="1.4" />
            </g>

            {/* head — follows the cursor */}
            <g id="dw-head" ref={headRef}>
              <circle cx="98" cy="74" r="5.5" fill="#e7bc92" />
              <path d="M96 70 q0 -28 25 -28 q25 0 25 29 q0 24 -25 26 q-25 -1 -25 -27 Z" fill="#f0c8a0" />
              <path d="M94 64 q-3 -30 28 -29 q30 0 26 27 q-7 -13 -26 -12 q-20 -1 -28 14 Z" fill="#4a3528" />
              <path d="M93 64 q2 -8 7 -11 q-2 9 1 16 q-6 1 -8 -5 Z" fill="#4a3528" />
              <path d="M104 63 q6 -3 11 0" stroke="#4a3528" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <path d="M128 63 q6 -3 11 0" stroke="#4a3528" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <ellipse cx="111" cy="70" rx="5.4" ry="5.8" fill="#fdfaf4" />
              <ellipse cx="133" cy="70" rx="5.4" ry="5.8" fill="#fdfaf4" />
              <circle ref={pLRef} className="dw-pupil" cx="111" cy="71" r="2.7" fill="#2e2a26" />
              <circle ref={pRRef} className="dw-pupil" cx="133" cy="71" r="2.7" fill="#2e2a26" />
              <path d="M121 73 q3 4 -1 7" stroke="#dba87e" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M114 84 q8 5 16 0" stroke="#a06a4b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </g>

            {/* chair legs */}
            <g stroke="#7a5a36" strokeWidth="6" strokeLinecap="round">
              <line x1="100" y1="166" x2="93" y2="196" />
              <line x1="142" y1="166" x2="149" y2="196" />
              <line x1="96" y1="184" x2="146" y2="184" />
            </g>

            {/* desk */}
            <rect x="26" y="149" width="188" height="9" rx="4" fill="#c79a5e" />
            <rect x="26" y="157" width="188" height="14" rx="5" fill="#a77b46" />

            {/* paper */}
            <g transform="rotate(-5 108 148)">
              <rect x="86" y="137" width="46" height="20" rx="2.5" fill="#fdfcf7" stroke="#e3ddcf" strokeWidth="1" />
              <line x1="91" y1="143" x2="127" y2="143" stroke="#d7dae0" strokeWidth="1.2" />
              <line x1="91" y1="148" x2="123" y2="148" stroke="#d7dae0" strokeWidth="1.2" />
              <line x1="91" y1="153" x2="118" y2="153" stroke="#d7dae0" strokeWidth="1.2" />
            </g>

            {/* mug + steam */}
            <g>
              <path className="dw-steam" d="M182 132 q4 -4 0 -8 q-4 -4 0 -8" stroke="#c9bda6" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path className="dw-steam s2" d="M189 132 q4 -4 0 -8 q-4 -4 0 -8" stroke="#c9bda6" strokeWidth="2" fill="none" strokeLinecap="round" />
              <rect x="176" y="138" width="20" height="14" rx="3" fill="#c2734e" />
              <path d="M196 141 q7 0 7 5 q0 5 -7 5" stroke="#c2734e" strokeWidth="2.6" fill="none" />
              <rect x="176" y="138" width="20" height="3.5" rx="1.5" fill="#a85a37" />
            </g>

            {/* left (support) arm */}
            <path d="M88 118 q-16 12 -4 32" fill="none" stroke="#5e7060" strokeWidth="14" strokeLinecap="round" />
            <circle cx="90" cy="150" r="6.5" fill="#f0c8a0" />

            {/* writing arm + pen */}
            <g id="dw-writingArm">
              <path d="M150 116 q15 8 5 26 q-7 13 -38 6" fill="none" stroke="#5e7060" strokeWidth="14" strokeLinecap="round" />
              <circle cx="116" cy="148" r="6.5" fill="#f0c8a0" />
              <g id="dw-pen">
                <line x1="116" y1="148" x2="139" y2="119" stroke="#3f4d63" strokeWidth="4" strokeLinecap="round" />
                <circle cx="139" cy="119" r="2.6" fill="#c2734e" />
                <line x1="116" y1="148" x2="110" y2="155" stroke="#2e2a26" strokeWidth="2.4" strokeLinecap="round" />
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
