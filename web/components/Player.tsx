"use client";

// The one player: a floating mini bar anywhere on the site, and a full-screen mode
// where the line fills the screen and each note pops up as it sounds.

import { useEffect, useMemo, useState } from "react";
import { peekEngine } from "@/lib/audio";
import { semis } from "@/lib/music";
import { play, stop, tick, useSite } from "@/lib/site";
import { usePlayhead } from "@/lib/usePlayhead";
import { Line } from "./Line";

const NAMES: Record<string, string> = { S: "Sa", r: "Re", R: "Re", g: "Ga", G: "Ga", m: "Ma", M: "Ma", P: "Pa", d: "Dha", D: "Dha", n: "Ni", N: "Ni" };
const QUAL: Record<string, string> = { r: "komal", g: "komal", d: "komal", n: "komal", M: "tivra" };

function useNow(active: boolean) {
  const [, f] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => f((x) => x + 1), 250);
    return () => window.clearInterval(t);
  }, [active]);
}

export function Player() {
  const { track, playing, open, tempo, queue } = useSite();
  const data = useSite((s) => s.data);
  const head = usePlayhead(track?.notes ?? null);
  useNow(playing);
  const raga = data?.ragas.find((r) => r.key === track?.raga);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") useSite.getState().set({ open: false });
      if (e.key === " ") {
        e.preventDefault();
        if (track) (playing ? stop() : play(track));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, playing, track]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  const cur = useMemo(() => (track && head !== null ? track.notes.find((n) => n.t <= head && head < n.t + n.d) ?? null : null), [track, head]);
  const curIndex = cur && track ? track.notes.indexOf(cur) : -1;
  if (!track) return null;

  const eng = peekEngine();
  const pb = eng?.playback;
  const elapsed = pb && pb.tag === track.id ? Math.max(0, eng!.now - pb.t0) : 0;
  const total = (track.notes[track.notes.length - 1].t + track.notes[track.notes.length - 1].d) * (60 / tempo);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const next = () => {
    const i = queue.findIndex((q) => q.id === track.id);
    const n = queue[(i + 1) % Math.max(1, queue.length)];
    if (n) play(n);
  };

  return (
    <>
      {/* mini bar */}
      <div className={`fixed bottom-5 left-1/2 z-[70] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 transition-all duration-700 ease-out ${open ? "pointer-events-none translate-y-32 opacity-0" : ""}`}>
        <div className="flex items-center gap-4 rounded-full border border-smoke bg-coal/90 py-2 pl-2 pr-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,.8)] backdrop-blur-xl">
          <button data-cursor={playing ? "Pause" : "Play"} onClick={() => { tick(); playing ? stop() : play(track); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-saffron text-night transition-transform duration-300 hover:scale-105">
            {playing ? <span className="text-[13px]">❚❚</span> : <span className="ml-0.5 text-[14px]">▶</span>}
          </button>
          <div className="min-w-0 shrink-0">
            <div className="truncate text-[15px] text-ivory">{track.title}</div>
            <div className="text-[12px] tabular-nums text-mute">{fmt(elapsed)} / {fmt(total)}</div>
          </div>
          <div className="min-w-0 flex-1 text-ivory"><Line notes={track.notes} trackId={track.id} aspect={14} width={1.5} glow={false} draw={false} base="ivory" /></div>
          <button data-cursor="Open" onClick={() => { tick(); useSite.getState().set({ open: true }); }} className="text-[13px] text-mute transition-colors hover:text-saffron">Full screen ↗</button>
        </div>
      </div>

      {/* full screen */}
      <div className={`fixed inset-0 z-[80] flex flex-col bg-night transition-[opacity,clip-path] duration-[900ms] ease-out ${open ? "opacity-100 [clip-path:circle(150%_at_50%_95%)]" : "pointer-events-none opacity-0 [clip-path:circle(0%_at_50%_95%)]"}`}>
        <div className="pointer-events-none absolute inset-0 transition-[background] duration-300" style={{ background: `radial-gradient(60% 50% at ${cur ? 20 + (cur.t / (track.notes[track.notes.length - 1].t + 1)) * 60 : 50}% ${cur ? 70 - ((semis(cur) + 12) / 36) * 60 : 50}%, rgba(240,163,58,${cur ? 0.16 : 0.06}), transparent 70%)` }} />
        <div className="relative flex items-start justify-between px-6 pt-6 sm:px-10 sm:pt-8">
          <div>
            <div className="text-[12px] uppercase tracking-[0.2em] text-mute">Now playing</div>
            <div className="mt-1 font-display text-[40px] leading-none text-ivory sm:text-[56px]">{track.title}</div>
            <div className="mt-2 text-[15px] text-mute">{track.sub}</div>
          </div>
          <button data-cursor="Close" onClick={() => { tick(); useSite.getState().set({ open: false }); }} className="rounded-full border border-smoke px-5 py-2.5 text-[14px] text-ivory transition-colors hover:border-saffron hover:text-saffron">Close · Esc</button>
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          <div key={curIndex} className="note-pop pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2 text-center">
            {cur && (
              <>
                <div className="font-display text-[120px] leading-none text-saffron sm:text-[180px]">{NAMES[cur.s]}</div>
                <div className="text-[15px] tracking-[0.2em] text-mute">{QUAL[cur.s] ? `${QUAL[cur.s]} · ` : ""}{cur.o > 0 ? "upper octave" : cur.o < 0 ? "lower octave" : "middle octave"}</div>
              </>
            )}
          </div>
          <div className="w-full px-6 pt-40 text-ivory sm:px-10">
            <Line notes={track.notes} trackId={track.id} aspect={4.2} width={2.5} axis={raga?.swaras} base="ivory" draw={false} />
          </div>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 pb-8 sm:px-10">
          <div className="flex items-center gap-3">
            <button data-cursor={playing ? "Pause" : "Play"} onClick={() => { tick(); playing ? stop() : play(track); }} className="flex h-16 w-16 items-center justify-center rounded-full bg-saffron text-night transition-transform duration-300 hover:scale-105">
              {playing ? "❚❚" : <span className="ml-1 text-[20px]">▶</span>}
            </button>
            {queue.length > 1 && <button data-cursor="Next" onClick={() => { tick(); next(); }} className="rounded-full border border-smoke px-5 py-3 text-[14px] text-ivory hover:border-saffron">Next ⏭</button>}
          </div>
          <div className="flex items-center gap-6 text-[14px] text-mute">
            <span className="tabular-nums">bar {cur ? cur.bar + 1 : "–"} · beat {head !== null ? Math.floor(head % 4) + 1 : "–"}</span>
            <label className="flex items-center gap-3">tempo
              <input type="range" min={50} max={130} value={tempo} onChange={(e) => useSite.getState().set({ tempo: +e.target.value })} className="w-32 accent-[#F0A33A]" />
              <span className="w-14 tabular-nums text-ivory">{tempo} bpm</span>
            </label>
            {track.reward !== undefined && <span>score <span className="text-ivory">{track.reward.toFixed(2)}</span></span>}
          </div>
          {track.notation && <div className="w-full truncate font-mono text-[13px] tracking-wider text-mute/70">{track.notation}</div>}
        </div>
      </div>
    </>
  );
}
