"use client";

// The hero, painted in the conventions of a Rajasthani ragamala folio (Mewar, Bundi, Sirohi):
// a thick vermilion border, an inscribed title band, a dark night sky edged with a curled
// cloud line, a white Rajput pavilion with a lotus-finial chhatri, a flowering tree, a terrace
// railing, and a lotus pond whose ripples are the model's own melodies (the ridgeline).

import type { ReactNode } from "react";

const INK = "#131A2B", INK2 = "#1F2840", PAPER = "#F1E6CF", LEAF = "#F8F0DF", RED = "#B23A22", ROSE = "#D9705A", GOLD = "#A8853C", PAPER2 = "#E8D8BA";

// painting area, in the SVG's 600 × 780 coordinates
export const POND = { x: 34, y: 520, w: 532, h: 214 };

function Cloudline({ y }: { y: number }) {
  // the band of curling clouds that edges the sky in Rajasthani painting
  const d = Array.from({ length: 23 }, (_, i) => {
    const x = 34 + i * 24;
    return `M ${x} ${y} q 6 -13 12 0 q 6 13 12 0`;
  }).join(" ");
  return (
    <g>
      <path d={d} fill="none" stroke={PAPER} strokeWidth="2.2" opacity=".85" />
      <path d={d} fill="none" stroke={GOLD} strokeWidth=".8" transform="translate(0 4)" opacity=".7" />
    </g>
  );
}

function Pavilion() {
  return (
    <g>
      {/* plinth */}
      <rect x="338" y="440" width="220" height="40" fill={LEAF} stroke={GOLD} strokeWidth="1" />
      {Array.from({ length: 10 }, (_, i) => <rect key={i} x={344 + i * 21.5} y="450" width="12" height="20" fill="none" stroke={RED} strokeWidth="1" opacity=".55" />)}
      {/* hall: straight lintel on columns, as Rajput pavilions are drawn */}
      <rect x="350" y="300" width="196" height="140" fill={LEAF} stroke={GOLD} strokeWidth="1" />
      <rect x="372" y="322" width="152" height="118" fill={ROSE} opacity=".85" />
      <rect x="386" y="336" width="124" height="104" fill={RED} opacity=".55" />
      {[358, 432, 506].map((x) => (
        <g key={x}>
          <rect x={x} y="306" width="14" height="134" fill={PAPER} stroke={GOLD} strokeWidth=".8" />
          <rect x={x - 3} y="306" width="20" height="8" fill={PAPER2} stroke={GOLD} strokeWidth=".6" />
          <rect x={x - 3} y="432" width="20" height="8" fill={PAPER2} stroke={GOLD} strokeWidth=".6" />
        </g>
      ))}
      {/* a lamp in the hall */}
      <g transform="translate(456 400)">
        <path d="M -6 22 L 6 22 L 3 6 L -3 6 Z" fill={GOLD} />
        <path d="M 0 -8 C 5 -2 4 4 0 6 C -4 4 -5 -2 0 -8 Z" fill="#F4C26B" />
        <circle r="16" fill="#F4C26B" opacity=".18" />
      </g>
      {/* eave (chhajja) and parapet */}
      <path d="M 330 300 L 566 300 L 552 286 L 344 286 Z" fill={PAPER2} stroke={GOLD} strokeWidth="1" />
      <rect x="344" y="270" width="208" height="16" fill={LEAF} stroke={GOLD} strokeWidth=".8" />
      {Array.from({ length: 13 }, (_, i) => <rect key={i} x={348 + i * 16} y="273" width="7" height="10" fill={ROSE} opacity=".6" />)}
      {/* chhatri: a domed kiosk on slender pillars, with a lotus finial */}
      <g transform="translate(448 0)">
        <rect x="-46" y="230" width="92" height="40" fill={LEAF} stroke={GOLD} strokeWidth=".8" />
        {[-40, -14, 12, 34].map((x) => <rect key={x} x={x} y="234" width="6" height="36" fill={PAPER} stroke={GOLD} strokeWidth=".6" />)}
        <path d="M -56 230 L 56 230 L 48 220 L -48 220 Z" fill={PAPER2} stroke={GOLD} strokeWidth=".8" />
        <path d="M -44 220 C -44 172 44 172 44 220 Z" fill={PAPER} stroke={GOLD} strokeWidth="1" />
        <path d="M -30 220 C -30 186 30 186 30 220" fill="none" stroke={GOLD} strokeWidth=".7" opacity=".7" />
        <circle cy="182" r="5" fill={GOLD} />
        {/* lotus finial (kalash) */}
        <path d="M 0 150 C 8 160 8 170 0 177 C -8 170 -8 160 0 150 Z" fill={GOLD} />
        <path d="M -10 178 C -4 170 4 170 10 178 Z" fill={GOLD} />
      </g>
      {/* small corner chhatris */}
      {[352, 544].map((cx) => (
        <g key={cx} transform={`translate(${cx} 0)`}>
          <path d="M -14 270 C -14 250 14 250 14 270 Z" fill={PAPER} stroke={GOLD} strokeWidth=".8" />
          <path d="M 0 238 C 4 243 4 248 0 251 C -4 248 -4 243 0 238 Z" fill={GOLD} />
        </g>
      ))}
    </g>
  );
}

function Tree() {
  // a flowering tree as the miniaturists paint it: a dark crown with a scalloped edge, and
  // hundreds of tiny leaves picked out in a lighter tone, blossoms scattered through it
  const cx = 122, cy = 300, rx = 92, ry = 84, N = 26;
  const pts = Array.from({ length: N }, (_, i) => {
    const a = (i / N) * Math.PI * 2;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a) * (Math.sin(a) > 0 ? 0.82 : 1)] as const;
  });
  let crown = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i <= N; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i % N];
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const ox = mx + (mx - cx) * 0.11, oy = my + (my - cy) * 0.11; // each scallop bulges outward
    crown += ` Q ${ox.toFixed(1)} ${oy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  const leaves: [number, number, number][] = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = cy - ry + 10; y < cy + ry * 0.78; y += 9)
    for (let x = cx - rx + 8; x < cx + rx; x += 9) {
      const dx = (x - cx) / rx, dy = (y - cy) / (ry * (y > cy ? 0.82 : 1));
      if (dx * dx + dy * dy < 0.86) leaves.push([+(x + rnd() * 5).toFixed(1), +(y + rnd() * 5).toFixed(1), Math.round(rnd() * 180)]);
    }
  return (
    <g>
      <path d="M 114 470 C 118 424 110 398 116 368 L 128 368 C 124 400 132 424 128 470 Z" fill="#2B2420" stroke={GOLD} strokeWidth=".7" />
      <path d={crown} fill="#18223D" stroke={INK} strokeWidth="1.2" />
      {leaves.map(([x, y, r], i) => (
        <path key={i} d={`M ${x - 3.6} ${y} Q ${x} ${y - 2.6} ${x + 3.6} ${y} Q ${x} ${y + 2.6} ${x - 3.6} ${y} Z`} transform={`rotate(${r} ${x} ${y})`}
          fill={i % 5 === 0 ? "#6B7BA3" : "#3D4C74"} opacity={i % 5 === 0 ? 0.8 : 0.9} />
      ))}
      {leaves.filter((_, i) => i % 9 === 4).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 2.4 : 3} fill={i % 2 ? ROSE : PAPER} />)}
    </g>
  );
}

function Lotus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="8" rx="20" ry="5" fill="#2E3B5C" stroke={GOLD} strokeWidth=".5" />
      {[-2, -1, 0, 1, 2].map((k) => <path key={k} d="M 0 4 C 5 -6 3 -14 0 -18 C -3 -14 -5 -6 0 4 Z" fill={k === 0 ? PAPER : ROSE} stroke={RED} strokeWidth=".5" transform={`rotate(${k * 24})`} />)}
    </g>
  );
}

/** The painting, with the ridgeline (children) laid into the pond. */
export function Miniature({ children, title = "राग · रचना", className = "" }: { children: ReactNode; title?: string; className?: string }) {
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: "600 / 780" }}>
      <svg viewBox="0 0 600 780" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="mn-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0E1322" />
            <stop offset="1" stopColor={INK2} />
          </linearGradient>
        </defs>
        {/* the folio: paper, a thick vermilion border, gold and ink rules */}
        <rect x="0" y="0" width="600" height="780" fill={RED} />
        <rect x="6" y="6" width="588" height="768" fill="none" stroke={GOLD} strokeWidth="1" opacity=".8" />
        <rect x="26" y="26" width="548" height="728" fill={PAPER} />
        <rect x="30" y="30" width="540" height="720" fill="none" stroke={INK} strokeWidth="1.4" />
        {/* inscribed title band, as the folios carry the raga's name and verse */}
        <rect x="34" y="34" width="532" height="40" fill="#EFD9A6" />
        <text x="300" y="62" textAnchor="middle" fontSize="22" fill={RED} fontFamily="var(--font-display)">॥ {title} ॥</text>
        <line x1="34" x2="566" y1="74" y2="74" stroke={INK} strokeWidth="1" />
        {/* sky */}
        <rect x="34" y="75" width="532" height="395" fill="url(#mn-sky)" />
        {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={40 + ((i * 137) % 520)} cy={96 + ((i * 89) % 150)} r={i % 5 ? 0.9 : 1.6} fill={PAPER} opacity={i % 3 ? 0.55 : 0.9} />)}
        <path d="M 210 118 A 20 20 0 1 0 210 158 A 15 15 0 1 1 210 118 Z" fill={PAPER} />
        <Cloudline y={88} />
        <Tree />
        <Pavilion />
        {/* terrace and its railing */}
        <rect x="34" y="470" width="532" height="50" fill={LEAF} />
        <line x1="34" x2="566" y1="470" y2="470" stroke={INK} strokeWidth="1" />
        {Array.from({ length: 34 }, (_, i) => <rect key={i} x={40 + i * 15.6} y="478" width="5" height="32" fill={PAPER2} stroke={GOLD} strokeWidth=".5" />)}
        <rect x="34" y="476" width="532" height="5" fill={ROSE} opacity=".8" />
        <rect x="34" y="508" width="532" height="5" fill={ROSE} opacity=".8" />
        <line x1="34" x2="566" y1="519" y2="519" stroke={INK} strokeWidth="1" />
        {/* the pond */}
        <rect x={POND.x} y={POND.y} width={POND.w} height={POND.h} fill={INK} />
      </svg>
      {/* the ridgeline: the melodies are the water */}
      <div className="absolute" style={{ left: pct(POND.x, 600), top: pct(POND.y, 780), width: pct(POND.w, 600), height: pct(POND.h, 780) }}>{children}</div>
      <svg viewBox="0 0 600 780" className="pointer-events-none absolute inset-0 h-full w-full">
        <Lotus x={92} y={712} s={1.1} />
        <Lotus x={510} y={706} />
        <Lotus x={300} y={728} s={0.8} />
        <rect x="34" y="734" width="532" height="16" fill={PAPER2} />
        <line x1="34" x2="566" y1="734" y2="734" stroke={INK} strokeWidth="1" />
      </svg>
    </div>
  );
}
