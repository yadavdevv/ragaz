"use client";

// Three ragas as full-screen panels that slide past horizontally while you scroll.
// Tap the notes: allowed ones sing, forbidden ones refuse.

import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { getEngine } from "@/lib/audio";
import { Line } from "@/components/Line";
import { Magnetic } from "@/components/Magnetic";
import { Folio } from "@/components/Ornament";
import { Plate } from "@/components/Plate";
import { PAINTINGS } from "@/lib/art";
import { type Raga, SWARAS } from "@/lib/music";
import { type Data, type Track, toggle, useSite } from "@/lib/site";
import { parse } from "@/lib/verify";

const NAMES: Record<string, string> = { S: "Sa", r: "Re", R: "Re", g: "Ga", G: "Ga", m: "Ma", M: "Ma", P: "Pa", d: "Dha", D: "Dha", n: "Ni", N: "Ni" };
const BLURB: Record<string, string> = {
  bhupali: "Five notes and no tension: no Ma, no Ni. Sung as the night begins; calm, devotional, open.",
  yaman: "Every note natural except a sharp Ma. The first raga most students learn, sung at dusk.",
  malkauns: "Flat Ga, Dha and Ni, and no Re or Pa at all. Deep, slow, meditative: a raga for after midnight.",
};
const TONES = [
  { bg: "wasli", fg: "text-kajal", sub: "text-sepia", line: "ink" as const, tile: "border-kajal/15", on: "bg-kajal text-paper border-kajal", btn: "ink" as const, plate: "paper" as const },
  { bg: "bg-gulal", fg: "text-kajal", sub: "text-kajal/70", line: "ink" as const, tile: "border-kajal/20", on: "bg-kajal text-paper border-kajal", btn: "dark" as const, plate: "gulal" as const },
  { bg: "night-sky", fg: "text-paper", sub: "text-paper/65", line: "gulal" as const, tile: "border-paper/20", on: "bg-gulal text-kajal border-gulal", btn: "night" as const, plate: "night" as const },
];

function NoteTiles({ raga, tone }: { raga: Raga; tone: (typeof TONES)[number] }) {
  const [shake, setShake] = useState<number | null>(null);
  const [lit, setLit] = useState<number | null>(null);
  const hit = async (pc: number) => {
    const eng = getEngine();
    await eng.resume();
    eng.tune(raga);
    const ok = raga.notes.includes(pc);
    eng.note(SWARAS[pc], 0, ok ? 0.8 : 0.35, ok ? "note" : "wrong");
    if (ok) {
      setLit(pc);
      window.setTimeout(() => setLit(null), 450);
    } else {
      setShake(pc);
      window.setTimeout(() => setShake(null), 450);
    }
  };
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
      {Array.from({ length: 12 }, (_, pc) => {
        const ok = raga.notes.includes(pc);
        const s = SWARAS[pc];
        return (
          <button key={pc} data-cursor={ok ? "Sing" : "Not allowed"} onClick={() => hit(pc)}
            className={`flex h-[4.5rem] flex-col items-center justify-end rounded-2xl border pb-3 transition-all duration-300 ease-out ${ok ? tone.on : `${tone.tile} opacity-40`} ${lit === pc ? "-translate-y-2 scale-105" : ""}`}
            style={{ animation: shake === pc ? "shake .4s" : undefined }}>
            <span className="font-display text-[19px]">{NAMES[s]}</span>
            <span className="text-[10px] opacity-70">{"rgdn".includes(s) ? "komal" : s === "M" ? "tivra" : " "}</span>
          </button>
        );
      })}
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
    </div>
  );
}

export function RagaPanels({ data }: { data: Data }) {
  const wrap = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const current = useSite((s) => (s.playing ? s.track?.id : null));
  const ragas = ["bhupali", "yaman", "malkauns"].map((k) => data.ragas.find((r) => r.key === k)!);
  const pakads: Track[] = useMemo(() => ragas.map((r) => ({ id: `pakad-${r.key}`, title: `${r.name} · its signature phrase`, sub: "the pakad, the phrase a listener recognises it by", raga: r.key, notes: parse(r.pakad).notes })), [data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", () => {
      const t = gsap.to(strip.current, {
        x: () => -(strip.current!.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: { trigger: wrap.current, start: "top top", end: () => `+=${strip.current!.scrollWidth - window.innerWidth}`, scrub: 0.6, pin: true, invalidateOnRefresh: true, anticipatePin: 1 },
      });
      return () => t.scrollTrigger?.kill();
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={wrap} className="relative overflow-hidden">
      <div ref={strip} className="flex flex-col lg:w-max lg:flex-row">
        {ragas.map((r, i) => {
          const tone = TONES[i];
          const active = current === pakads[i].id;
          return (
            <div key={r.key} className={`relative flex min-h-[100svh] w-full flex-col justify-between gap-10 px-6 pb-28 pt-28 sm:px-12 lg:h-[100svh] lg:w-screen ${tone.bg} ${tone.fg}`}>
              <span className={`pointer-events-none absolute inset-4 border ${i === 2 ? "border-sona/50" : "border-sindoor/40"}`} />
              <span className={`pointer-events-none absolute inset-[22px] border ${i === 2 ? "border-paper/10" : "border-kajal/10"}`} />
              <div className="flex items-start justify-between gap-10">
                <div>
                  <div className={`flex items-center gap-3 font-sans text-[12px] uppercase tracking-[0.24em] ${tone.sub}`}><Folio n={5} /> Raga {i + 1} of 3 · {r.time.split(" (")[0]}</div>
                  <h2 className="mt-3 font-display text-[clamp(72px,10.5vw,180px)] leading-[0.86]">{r.name}</h2>
                  <div className={`mt-3 font-deva text-[clamp(28px,3.2vw,46px)] ${tone.sub}`}>{r.devanagari}</div>
                  <p className={`mt-6 hidden max-w-[34ch] text-[19px] leading-[1.55] lg:block ${tone.sub}`}>{BLURB[r.key]}</p>
                </div>
                <Plate p={PAINTINGS[r.key]} tone={tone.plate} className={`hidden w-[min(19vw,270px)] shrink-0 lg:block ${i % 2 ? "rotate-[1.5deg]" : "-rotate-[1.5deg]"}`} />
              </div>
              <div className="grid items-end gap-10 lg:grid-cols-[1fr_1.1fr]">
                <div>
                  <div className={`mb-3 font-sans text-[13px] uppercase tracking-[0.2em] ${tone.sub}`}>Tap the notes · {r.notes.length} of 12 allowed</div>
                  <NoteTiles raga={r} tone={tone} />
                  <p className={`mt-4 text-[16px] lg:hidden ${tone.sub}`}>{BLURB[r.key]}</p>
                </div>
                <div>
                  <div className={`mb-3 flex items-center justify-between font-sans text-[13px] uppercase tracking-[0.2em] ${tone.sub}`}>
                    <span>Its signature phrase</span>
                    <button data-cursor="Play" onClick={() => toggle(pakads[i])} className="normal-case tracking-normal underline-offset-4 hover:underline">{active ? "Stop" : "▶ Play it"}</button>
                  </div>
                  <button data-cursor="Play" onClick={() => toggle(pakads[i])} className="block w-full">
                    <Line notes={pakads[i].notes} trackId={pakads[i].id} aspect={3.2} width={2.6} color={tone.line} base={tone.line} glow={tone.line === "gulal"} axis={r.swaras} />
                  </button>
                  <div className="mt-6"><Magnetic href={`/ragas/${r.key}`} variant={tone.btn} cursor="Open">Everything about {r.name} →</Magnetic></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
