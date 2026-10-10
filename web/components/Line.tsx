"use client";

// A piece as its melody line. Draws itself in when it scrolls into view; while its
// track plays, the played part lights up and a dot rides the current note.

import { useEffect, useMemo, useRef } from "react";
import { peekEngine } from "@/lib/audio";
import { linePoints, pathFrom, pieceEnd, pitchRange } from "@/lib/line";
import { type Note, SWARAS, semis } from "@/lib/music";

const COLORS = { saffron: "#F0A33A", ivory: "#F4EDE1", ink: "#1A1410" };
const NAMES: Record<string, string> = { S: "Sa", r: "Re", R: "Re", g: "Ga", G: "Ga", m: "Ma", M: "Ma", P: "Pa", d: "Dha", D: "Dha", n: "Ni", N: "Ni" };

type Props = {
  notes: Note[];
  trackId?: string;
  aspect?: number; // width / height
  color?: keyof typeof COLORS;
  base?: keyof typeof COLORS; // colour of the unplayed line while playing
  width?: number;
  glow?: boolean;
  draw?: boolean;
  axis?: string[]; // swaras to label
  range?: [number, number];
  className?: string;
};

export function Line({ notes, trackId, aspect = 4, color = "saffron", base, width = 2, glow = true, draw = true, axis, range, className = "" }: Props) {
  const W = 1000, H = W / aspect;
  const L = axis ? 56 : 8, P = 10;
  const svg = useRef<SVGSVGElement>(null);
  const clip = useRef<SVGRectElement>(null);
  const dot = useRef<SVGGElement>(null);
  const main = useRef<SVGPathElement>(null);
  const [lo, hi] = range ?? pitchRange(notes, 1);
  const end = pieceEnd(notes);
  const x = (t: number) => L + (t / end) * (W - L - P);
  const y = (s: number) => P + (1 - (s - lo) / (hi - lo)) * (H - 2 * P);
  const d = useMemo(() => pathFrom(linePoints(notes, x, y)), [notes, lo, hi, aspect, axis]); // eslint-disable-line react-hooks/exhaustive-deps
  const id = useMemo(() => Math.random().toString(36).slice(2), []);
  const c = COLORS[color];

  // Draw in on first view.
  useEffect(() => {
    const p = main.current;
    if (!p || !draw) return;
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      p.style.transition = "stroke-dashoffset 2.2s cubic-bezier(.16,1,.3,1)";
      p.style.strokeDashoffset = "0";
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(p);
    return () => io.disconnect();
  }, [d, draw]);

  // Live playhead from the audio clock.
  useEffect(() => {
    if (!trackId) return;
    let raf = 0;
    const loop = () => {
      const eng = peekEngine();
      const pb = eng?.playback;
      const on = !!(eng && pb && pb.tag === trackId && eng.now <= pb.end + 0.2);
      const head = on ? Math.max(0, (eng!.now - pb!.t0) / pb!.beat) : 0;
      if (clip.current) clip.current.setAttribute("width", on ? String(x(Math.min(head, end))) : "0");
      if (dot.current) {
        const n = on ? notes.find((k) => k.t <= head && head < k.t + k.d) : undefined;
        dot.current.style.opacity = n ? "1" : "0";
        if (n) dot.current.setAttribute("transform", `translate(${x(head)} ${y(semis(n))})`);
      }
      if (svg.current && svg.current.dataset.playing !== (on ? "1" : "0")) {
        svg.current.dataset.playing = on ? "1" : "0";
        // while playing, the unplayed part steps back so the played part can glow
        if (main.current) {
          main.current.style.stroke = on && base ? COLORS[base] : c;
          main.current.style.strokeOpacity = on && base ? "0.3" : "1";
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [trackId, notes, end, base, c]); // eslint-disable-line react-hooks/exhaustive-deps

  const ticks: number[] = [];
  if (axis) for (let s = Math.ceil(lo); s <= hi; s++) if (axis.includes(SWARAS[((s % 12) + 12) % 12]) && (!ticks.length || s - ticks[ticks.length - 1] >= 2)) ticks.push(s);

  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className={`group/line block w-full overflow-visible ${className}`} data-playing="0">
      <defs>
        <filter id={`glow-${id}`} x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="7" /></filter>
        <clipPath id={`clip-${id}`}><rect ref={clip} x="0" y="-50" width="0" height={H + 100} /></clipPath>
      </defs>
      {ticks.map((s) => (
        <g key={s}>
          <line x1={L} x2={W - P} y1={y(s)} y2={y(s)} stroke="currentColor" strokeOpacity={s % 12 === 0 ? 0.18 : 0.08} strokeDasharray={s % 12 === 0 ? "" : "3 9"} vectorEffect="non-scaling-stroke" />
          <text x={L - 14} y={y(s) + 5} textAnchor="end" fontSize="15" fill="currentColor" opacity="0.5">{NAMES[SWARAS[((s % 12) + 12) % 12]]}{s >= 12 ? "′" : s < 0 ? "," : ""}</text>
        </g>
      ))}
      {glow && <path d={d} fill="none" stroke={c} strokeWidth={width * 6} strokeOpacity="0.16" filter={`url(#glow-${id})`} className="transition-opacity duration-700 group-hover/line:opacity-100" />}
      <path ref={main} d={d} fill="none" stroke={c} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={{ transition: "stroke .4s, stroke-opacity .4s, stroke-dashoffset 2.2s cubic-bezier(.16,1,.3,1)" }} />
      {trackId && (
        <g clipPath={`url(#clip-${id})`}>
          <path d={d} fill="none" stroke={c} strokeWidth={width * 6} strokeOpacity="0.35" filter={`url(#glow-${id})`} />
          <path d={d} fill="none" stroke={c} strokeWidth={width * 1.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      )}
      {trackId && (
        <g ref={dot} style={{ opacity: 0 }}>
          <circle r="22" fill={c} fillOpacity="0.18" />
          <circle r="7" fill={c} />
        </g>
      )}
    </svg>
  );
}
