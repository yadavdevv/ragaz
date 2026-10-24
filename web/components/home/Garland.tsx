"use client";

// Ragamala: a garland of ragas. Real folios from Rajasthan, Malwa and the hills, 1630–1714,
// each painting one raga as a scene of its mood and hour. Drag the rail; open any folio.

import { useRef } from "react";
import { FloralBand, Folio, Rubric } from "@/components/Ornament";
import { Plate } from "@/components/Plate";
import { Reveal } from "@/components/Text";
import { GARLAND } from "@/lib/garland";

export function Garland() {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef({ on: false, x: 0, left: 0, moved: false });
  return (
    <section className="relative overflow-hidden bg-paper2/70 py-24">
      <FloralBand />
      <div className="mx-auto mt-16 flex max-w-[1400px] flex-wrap items-end justify-between gap-6 px-6 sm:px-10">
        <Reveal>
          <div className="flex items-center gap-4"><Folio n={7} /><Rubric>Ragamala</Rubric></div>
          <h2 className="mt-6 font-display text-[clamp(46px,6.4vw,104px)] leading-[0.95] text-kajal">A garland <span className="italic text-sindoor">of ragas.</span></h2>
          <p className="mt-6 max-w-[54ch] text-[19px] leading-[1.6] text-sepia">For three centuries, painters in Rajasthan, Malwa and the hills gave every raga a scene: its hour, its season, its mood. These folios were painted between 1630 and 1714. Drag the row; open any page.</p>
        </Reveal>
      </div>
      <div
        ref={rail}
        className="no-scrollbar mt-14 flex cursor-grab items-start gap-10 overflow-x-auto px-6 pb-8 active:cursor-grabbing sm:px-10"
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
        {GARLAND.map((f, i) => (
          <div key={f.id} className={`w-[min(62vw,250px)] shrink-0 ${i % 2 ? "mt-10 rotate-[1deg]" : "-rotate-[1deg]"}`}>
            <Plate tone="paper" p={{ src: f.src, title: f.title, place: f.place, date: f.date, museum: "The Metropolitan Museum of Art", credit: f.credit, licence: "Public domain (CC0)", url: f.url, note: f.note }} />
          </div>
        ))}
      </div>
      <FloralBand />
    </section>
  );
}
