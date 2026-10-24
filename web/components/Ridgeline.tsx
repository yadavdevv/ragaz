"use client";

// The hero: the model's compositions stacked as ridges (Unknown Pleasures, made of melodies).
// Every ridge is a real piece. Near the pointer the ridges swell like plucked strings; a
// light sweeps across them in time; click a ridge to hear that piece; scroll tilts it away.

import { useEffect, useRef } from "react";
import { peekEngine } from "@/lib/audio";
import { semis } from "@/lib/music";
import { type Track, toggle, useSite } from "@/lib/site";

type Row = { track: Track; pts: { x: number; v: number }[]; end: number };

export function Ridgeline({ tracks, onHover, tilt = true, band = [0.16, 0.74] }: { tracks: Track[]; onHover?: (t: Track | null) => void; tilt?: boolean; band?: [number, number] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  useEffect(() => {
    const c = canvas.current!;
    const g = c.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0, hover = -1;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const start = performance.now();

    // Normalised melody per row: v in 0..1 (pitch), x in 0..1 (time).
    const rows: Row[] = tracksRef.current.map((track) => {
      const end = track.notes[track.notes.length - 1].t + track.notes[track.notes.length - 1].d;
      const pts: { x: number; v: number }[] = [];
      for (const n of track.notes) {
        const v = (semis(n) + 5) / 19;
        if (n.d >= 2) pts.push({ x: (n.t + 0.4) / end, v }, { x: (n.t + n.d - 0.4) / end, v });
        else pts.push({ x: (n.t + n.d / 2) / end, v });
      }
      return { track, pts, end };
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = c.clientWidth;
      H = c.clientHeight;
      c.width = W * dpr;
      c.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const geom = () => {
      const top = H * band[0], bottom = H * band[1];
      const gap = (bottom - top) / Math.max(1, rows.length - 1);
      const left = W * 0.06, right = W * 0.94;
      return { top, gap, left, right, amp: gap * 3.2 };
    };

    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      pointer.tx = e.clientX - r.left;
      pointer.ty = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.tx = pointer.ty = -9999;
      hover = -1;
      onHover?.(null);
    };
    const onClick = () => {
      if (hover >= 0) toggle(rows[hover].track);
    };
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerleave", onLeave);
    c.addEventListener("click", onClick);

    const draw = () => {
      const t = (performance.now() - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.15;
      pointer.y += (pointer.ty - pointer.y) * 0.15;
      const { top, gap, left, right, amp } = geom();
      const eng = peekEngine();
      const pb = eng?.playback;
      const active = useSite.getState().playing ? useSite.getState().track?.id : null;
      g.clearRect(0, 0, W, H);

      // Which ridge is under the pointer (nearest baseline above it).
      let nearest = -1, best = Infinity;
      rows.forEach((_, i) => {
        const base = top + i * gap;
        const d = Math.abs(pointer.y - (base - amp * 0.35));
        if (d < best && pointer.x > left && pointer.x < right) {
          best = d;
          nearest = i;
        }
      });
      const nextHover = best < gap * 1.6 ? nearest : -1;
      if (nextHover !== hover) {
        hover = nextHover;
        onHover?.(hover >= 0 ? rows[hover].track : null);
        c.dataset.cursor = hover >= 0 ? (active === rows[hover].track.id ? "Pause" : "Play") : "";
        c.style.cursor = hover >= 0 ? "pointer" : "default";
      }

      const sweep = ((t * 0.11) % 1.3) - 0.15; // a slow light moving left to right
      rows.forEach((row, i) => {
        const base = top + i * gap;
        const depth = i / rows.length; // 0 = back, 1 = front
        const appear = reduced ? 1 : Math.min(1, Math.max(0, (t - 0.25 - (rows.length - i) * 0.035) / 0.7));
        if (appear <= 0) return;
        const isActive = row.track.id === active;
        const isHover = i === hover;
        const breathe = 1 + 0.06 * Math.sin(t * 0.9 + i * 0.5);
        const head = isActive && pb && pb.tag === row.track.id && eng ? (eng.now - pb.t0) / pb.beat / row.end : -1;

        const P = row.pts.map((p) => {
          const x = left + p.x * (right - left);
          const dx = x - pointer.x, dy = base - pointer.y;
          const lens = Math.exp(-(dx * dx) / (2 * 140 * 140) - (dy * dy) / (2 * 110 * 110));
          const env = Math.sin(Math.PI * p.x) ** 0.6; // calm at the edges, alive in the middle
          const a = amp * env * breathe * (1 + 1.1 * lens) * (isActive || isHover ? 1.25 : 1) * appear;
          return [x, base - p.v * a] as [number, number];
        });

        const path = () => {
          g.beginPath();
          g.moveTo(left - 30, base);
          g.lineTo(P[0][0] - 10, base);
          const k = 1 / 6;
          g.lineTo(P[0][0], P[0][1]);
          for (let j = 0; j < P.length - 1; j++) {
            const p0 = P[Math.max(0, j - 1)], p1 = P[j], p2 = P[j + 1], p3 = P[Math.min(P.length - 1, j + 2)];
            g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
          }
          g.lineTo(P[P.length - 1][0] + 10, base);
          g.lineTo(right + 30, base);
        };

        // Occlude the ridges behind.
        path();
        g.lineTo(right + 30, H);
        g.lineTo(left - 30, H);
        g.closePath();
        g.fillStyle = "#131A2B";
        g.fill();

        // The ridge itself; the sweep brightens a band of it.
        path();
        const grad = g.createLinearGradient(left, 0, right, 0);
        const baseA = (0.22 + 0.55 * depth) * appear;
        const s0 = Math.min(1, Math.max(0, sweep - 0.08)), s1 = Math.min(1, Math.max(0, sweep)), s2 = Math.min(1, Math.max(0, sweep + 0.08));
        if (isActive || isHover) {
          g.strokeStyle = isActive ? "#D9705A" : "rgba(217,112,90,0.95)";
          g.lineWidth = 2;
          g.shadowColor = "rgba(217,112,90,0.85)";
          g.shadowBlur = 16;
        } else {
          grad.addColorStop(0, `rgba(241,230,207,${baseA})`);
          grad.addColorStop(s0, `rgba(241,230,207,${baseA})`);
          grad.addColorStop(s1, `rgba(241,230,207,${Math.min(1, baseA + 0.45)})`);
          grad.addColorStop(s2, `rgba(241,230,207,${baseA})`);
          grad.addColorStop(1, `rgba(241,230,207,${baseA})`);
          g.strokeStyle = grad;
          g.lineWidth = 1.1;
          g.shadowBlur = 0;
        }
        g.stroke();
        g.shadowBlur = 0;

        // While a ridge plays, a dot rides its current note.
        if (head >= 0 && head <= 1) {
          let x = left + head * (right - left);
          const j = Math.max(0, P.findIndex((p) => p[0] >= x));
          const y = P[j]?.[1] ?? base;
          x = Math.min(x, right);
          g.beginPath();
          g.fillStyle = "#F1E6CF";
          g.shadowColor = "#D9705A";
          g.shadowBlur = 24;
          g.arc(x, y, 5, 0, Math.PI * 2);
          g.fill();
          g.shadowBlur = 0;
        }
      });

      // Scroll: the field tilts back and dims.
      if (wrap.current && tilt) {
        const p = Math.min(1, window.scrollY / (window.innerHeight * 0.9));
        wrap.current.style.transform = `perspective(1200px) rotateX(${p * 30}deg) translateY(${-p * 40}px)`;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerleave", onLeave);
      c.removeEventListener("click", onClick);
    };
  }, [onHover, tilt, band[0], band[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrap} className="absolute inset-0 origin-[50%_80%] will-change-transform">
      <canvas ref={canvas} className="h-full w-full" />
    </div>
  );
}
