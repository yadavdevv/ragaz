"use client";

import { useState } from "react";
import { Harmonium } from "@/components/Instruments";
import { Magnetic } from "@/components/Magnetic";
import { FloralBand, Folio, Rubric } from "@/components/Ornament";

const KEYS = [
  { s: "D", o: -1, label: "Dha" }, { s: "S", o: 0, label: "Sa" }, { s: "R", o: 0, label: "Re" }, { s: "G", o: 0, label: "Ga" },
  { s: "P", o: 0, label: "Pa" }, { s: "D", o: 0, label: "Dha" }, { s: "S", o: 1, label: "Sa′" }, { s: "R", o: 1, label: "Re′" },
];

/** Bhupali on a harmonium, right in the page. */
export function YourTurn() {
  const [last, setLast] = useState<string[]>([]);
  return (
    <section className="relative bg-gulal text-kajal">
      <FloralBand tone="gulal" />
      <div className="mx-auto max-w-[1400px] px-6 py-24 sm:px-10">
        <div className="flex items-center gap-4"><Folio n={11} /><Rubric tone="ink">Compose</Rubric></div>
        <h2 className="mt-4 font-display text-[clamp(80px,14vw,230px)] leading-[0.85]">Your <span className="italic text-paper">turn.</span></h2>
        <div className="mt-10 grid items-end gap-12 lg:grid-cols-[auto_1fr]">
          <div>
            <Harmonium keys={KEYS} onKey={(k) => setLast((l) => [...l.slice(-9), k.label])} />
            <div className="mt-5 h-7 font-display text-[22px] text-kajal/80">{last.join("  ·  ")}</div>
          </div>
          <div className="lg:justify-self-end lg:pb-16">
            <p className="max-w-[34ch] text-[20px] leading-[1.55] text-kajal/85">Bhupali's notes on a harmonium: move across the keys to play. In the composer you can write eight full bars, and the same program that scored the model will score you.</p>
            <div className="mt-8"><Magnetic href="/compose" variant="dark" size="lg" cursor="Open">Open the composer →</Magnetic></div>
          </div>
        </div>
      </div>
      <FloralBand tone="gulal" />
    </section>
  );
}
