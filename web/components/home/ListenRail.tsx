"use client";

import { useMemo, useRef } from "react";
import { Magnetic } from "@/components/Magnetic";
import { PieceCard } from "@/components/PieceCard";
import { Reveal } from "@/components/Text";
import { type Data, pieceTrack } from "@/lib/site";

export function ListenRail({ data }: { data: Data }) {
  const tracks = useMemo(() => {
    const out = [];
    for (const k of ["yaman", "bhupali", "malkauns"]) out.push(...data.pieces.filter((p) => p.model === "v2" && p.raga === k).sort((a, b) => b.reward - a.reward).slice(0, 3));
    return out.map((p) => pieceTrack(p));
  }, [data]);
  const rail = useRef<HTMLDivElement>(null);
  // drag to scroll
  const drag = useRef({ on: false, x: 0, left: 0, moved: false });

  return (
    <section className="relative overflow-hidden bg-night py-32">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-6 px-6 sm:px-10">
        <Reveal>
          <div className="text-[12px] uppercase tracking-[0.24em] text-mute">Listen</div>
          <h2 className="mt-4 font-display text-[clamp(48px,7vw,112px)] leading-[0.92]">Each piece has<br /><span className="italic text-saffron">a shape.</span></h2>
          <p className="mt-6 max-w-[42ch] text-[18px] leading-[1.6] text-mute">The line is the melody: time runs left to right, pitch rises and falls. Press any card to hear it and watch the line light up as it plays.</p>
        </Reveal>
        <Magnetic href="/listen" cursor="Open">All 144 pieces →</Magnetic>
      </div>
      <div
        ref={rail}
        className="no-scrollbar mt-16 flex cursor-grab gap-5 overflow-x-auto px-6 pb-4 active:cursor-grabbing sm:px-10"
        onPointerDown={(e) => { drag.current = { on: true, x: e.clientX, left: rail.current!.scrollLeft, moved: false }; }}
        onPointerMove={(e) => {
          if (!drag.current.on) return;
          const dx = e.clientX - drag.current.x;
          if (Math.abs(dx) > 4) drag.current.moved = true;
          rail.current!.scrollLeft = drag.current.left - dx;
        }}
        onPointerUp={() => (drag.current.on = false)}
        onPointerLeave={() => (drag.current.on = false)}
        onClickCapture={(e) => { if (drag.current.moved) { e.stopPropagation(); drag.current.moved = false; } }}
      >
        {tracks.map((t) => (
          <div key={t.id} className="w-[min(82vw,440px)] shrink-0"><PieceCard track={t} queue={tracks} /></div>
        ))}
      </div>
    </section>
  );
}
