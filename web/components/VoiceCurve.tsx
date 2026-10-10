"use client";

// A real singer's voice as a line: the pitch curve of a concert recording, with every
// slide (meend) and shake (gamak) that notation can't write. While it is sung back,
// the sung part brightens and a light rides the curve.

import { useEffect, useMemo, useRef } from "react";
import { peekEngine } from "@/lib/audio";
import { SWARAS } from "@/lib/music";
import type { Voice } from "@/lib/site";

const NAMES: Record<string, string> = { S: "Sa", r: "Re", R: "Re", g: "Ga", G: "Ga", m: "Ma", M: "Ma", P: "Pa", d: "Dha", D: "Dha", n: "Ni", N: "Ni" };

export function VoiceCurve({ voice, axis, aspect = 3.4, color = "#131A2B", className = "" }: { voice: Voice; axis?: string[]; aspect?: number; color?: string; className?: string }) {
  const W = 1000, H = W / aspect, L = axis ? 56 : 6, P = 12;
  const tag = `voice-${voice.raga}`;
  const vals = voice.cents.filter((c): c is number => c !== null);
  const lo = Math.floor(Math.min(...vals) / 100) - 1, hi = Math.ceil(Math.max(...vals) / 100) + 1;
  const x = (i: number) => L + (i / (voice.cents.length - 1)) * (W - L - P);
  const y = (c: number) => P + (1 - (c / 100 - lo) / (hi - lo)) * (H - 2 * P);
  const d = useMemo(() => {
    let s = "", pen = false;
    voice.cents.forEach((c, i) => {
      if (c === null) return (pen = false);
      s += `${pen ? "L" : "M"} ${x(i).toFixed(1)} ${y(c).toFixed(1)} `;
      pen = true;
    });
    return s;
  }, [voice]); // eslint-disable-line react-hooks/exhaustive-deps
  const clip = useRef<SVGRectElement>(null);
  const dot = useRef<SVGGElement>(null);
  const main = useRef<SVGPathElement>(null);
  const id = useMemo(() => Math.random().toString(36).slice(2), []);

  useEffect(() => {
    const p = main.current!;
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      p.style.transition = "stroke-dashoffset 3.2s cubic-bezier(.16,1,.3,1)";
      p.style.strokeDashoffset = "0";
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(p);
    return () => io.disconnect();
  }, [d]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const eng = peekEngine();
      const cv = eng?.curve;
      const on = !!(eng && cv && cv.tag === tag);
      const i = on ? (eng!.now - cv!.t0) / cv!.hop : -1;
      if (clip.current) clip.current.setAttribute("width", on ? String(x(Math.max(0, Math.min(voice.cents.length - 1, i)))) : "0");
      if (dot.current) {
        const c = on && i >= 0 ? voice.cents[Math.min(voice.cents.length - 1, Math.floor(i))] : null;
        dot.current.style.opacity = c !== null && c !== undefined ? "1" : "0";
        if (c !== null && c !== undefined) dot.current.setAttribute("transform", `translate(${x(i)} ${y(c)})`);
      }
      if (main.current) main.current.style.strokeOpacity = on ? "0.3" : "1";
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [voice, tag]); // eslint-disable-line react-hooks/exhaustive-deps

  const ticks: number[] = [];
  if (axis) for (let s = lo; s <= hi; s++) if (axis.includes(SWARAS[((s % 12) + 12) % 12]) && (!ticks.length || s - ticks[ticks.length - 1] >= 2)) ticks.push(s);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`block w-full overflow-visible ${className}`}>
      <defs>
        <filter id={`vg-${id}`} x="-5%" y="-40%" width="110%" height="180%"><feGaussianBlur stdDeviation="6" /></filter>
        <clipPath id={`vc-${id}`}><rect ref={clip} x="0" y="-50" width="0" height={H + 100} /></clipPath>
      </defs>
      {ticks.map((s) => (
        <g key={s}>
          <line x1={L} x2={W - P} y1={y(s * 100)} y2={y(s * 100)} stroke="currentColor" strokeOpacity={s % 12 === 0 ? 0.18 : 0.07} strokeDasharray={s % 12 === 0 ? "" : "3 9"} />
          <text x={L - 14} y={y(s * 100) + 5} textAnchor="end" fontSize="15" fill="currentColor" opacity="0.5">{NAMES[SWARAS[((s % 12) + 12) % 12]]}{s >= 12 ? "′" : s < 0 ? "," : ""}</text>
        </g>
      ))}
      <path ref={main} d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ transition: "stroke-opacity .4s" }} />
      <g clipPath={`url(#vc-${id})`}>
        <path d={d} fill="none" stroke={color} strokeWidth={9} strokeOpacity="0.28" filter={`url(#vg-${id})`} />
        <path d={d} fill="none" stroke={color} strokeWidth={2.2} vectorEffect="non-scaling-stroke" />
      </g>
      <g ref={dot} style={{ opacity: 0 }}>
        <circle r="20" fill={color} fillOpacity="0.18" />
        <circle r="6" fill={color} />
      </g>
    </svg>
  );
}
