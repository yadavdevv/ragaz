"use client";

import { useState } from "react";
import { getEngine } from "@/lib/audio";
import { Magnetic } from "@/components/Magnetic";
import { ragaOf } from "@/lib/site";

const NAMES: Record<string, string> = { S: "Sa", R: "Re", G: "Ga", P: "Pa", D: "Dha" };

export function YourTurn() {
  const [last, setLast] = useState<string[]>([]);
  const keys = [["S", 0], ["R", 0], ["G", 0], ["P", 0], ["D", 0], ["S", 1]] as const;
  const hit = async (s: string, o: number) => {
    const eng = getEngine();
    await eng.resume();
    const r = ragaOf("bhupali");
    if (r) eng.tune(r);
    eng.note(s, o, 0.7);
    setLast((l) => [...l.slice(-9), NAMES[s] + (o ? "′" : "")]);
  };
  return (
    <section className="relative overflow-hidden bg-saffron px-6 py-32 text-night sm:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="text-[12px] uppercase tracking-[0.24em] text-night/60">Compose</div>
        <h2 className="mt-4 font-display text-[clamp(80px,16vw,260px)] leading-[0.8]">Your <span className="italic">turn.</span></h2>
        <div className="mt-12 grid items-end gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="max-w-[40ch] text-[19px] leading-[1.55] text-night/75">Try Bhupali's five notes right here. In the composer you can write eight full bars, and the same program that scored the model will score you.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {keys.map(([s, o]) => (
                <button key={`${s}${o}`} data-cursor="Sing" onPointerDown={() => hit(s, o)}
                  className="h-24 w-20 rounded-2xl border-2 border-night/80 font-display text-[30px] transition-all duration-150 hover:bg-night hover:text-saffron active:translate-y-1 active:scale-95">
                  {NAMES[s]}{o ? "′" : ""}
                </button>
              ))}
            </div>
            <div className="mt-5 h-6 text-[15px] text-night/70">{last.join("  ·  ")}</div>
          </div>
          <div className="lg:justify-self-end"><Magnetic href="/compose" variant="dark" size="lg" cursor="Open">Open the composer →</Magnetic></div>
        </div>
      </div>
    </section>
  );
}
