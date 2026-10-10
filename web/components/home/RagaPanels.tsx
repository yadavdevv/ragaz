"use client";

// Three ragas as full-screen panels that slide past horizontally while you scroll.
// Tap the notes: allowed ones sing, forbidden ones refuse.

import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import { getEngine } from "@/lib/audio";
import { Line } from "@/components/Line";
import { Magnetic } from "@/components/Magnetic";
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
  { bg: "bg-paper", fg: "text-ink", sub: "text-ink/55", line: "ink" as const, tile: "border-ink/15", on: "bg-ink text-paper border-ink", btn: "ink" as const },
  { bg: "bg-night", fg: "text-ivory", sub: "text-mute", line: "saffron" as const, tile: "border-smoke", on: "bg-saffron text-night border-saffron", btn: "line" as const },
  { bg: "bg-saffron", fg: "text-night", sub: "text-night/60", line: "ink" as const, tile: "border-night/20", on: "bg-night text-saffron border-night", btn: "dark" as const },
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
            <span className="text-[16px] font-medium">{NAMES[s]}</span>
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
            <div key={r.key} className={`relative flex min-h-[100svh] w-full flex-col justify-between gap-10 px-6 pb-28 pt-24 sm:px-12 lg:h-[100svh] lg:w-screen ${tone.bg} ${tone.fg}`}>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className={`text-[12px] uppercase tracking-[0.24em] ${tone.sub}`}>Raga {i + 1} of 3 · {r.time.split(" (")[0]}</div>
                  <h2 className="mt-3 font-display text-[clamp(72px,12vw,210px)] leading-[0.82]">{r.name}</h2>
                  <div className={`mt-3 font-deva text-[clamp(26px,3vw,40px)] ${tone.sub}`}>{r.devanagari}</div>
                </div>
                <p className={`hidden max-w-[30ch] pt-6 text-[19px] leading-[1.55] lg:block ${tone.sub}`}>{BLURB[r.key]}</p>
              </div>
              <div className="grid items-end gap-10 lg:grid-cols-[1fr_1.1fr]">
                <div>
                  <div className={`mb-3 text-[13px] uppercase tracking-[0.2em] ${tone.sub}`}>Tap the notes · {r.notes.length} of 12 allowed</div>
                  <NoteTiles raga={r} tone={tone} />
                  <p className={`mt-4 text-[16px] lg:hidden ${tone.sub}`}>{BLURB[r.key]}</p>
                </div>
                <div>
                  <div className={`mb-3 flex items-center justify-between text-[13px] uppercase tracking-[0.2em] ${tone.sub}`}>
                    <span>Its signature phrase</span>
                    <button data-cursor="Play" onClick={() => toggle(pakads[i])} className="normal-case tracking-normal underline-offset-4 hover:underline">{active ? "Stop" : "▶ Play it"}</button>
                  </div>
                  <button data-cursor="Play" onClick={() => toggle(pakads[i])} className="block w-full">
                    <Line notes={pakads[i].notes} trackId={pakads[i].id} aspect={3.2} width={2.6} color={tone.line} base={tone.line} glow={tone.line === "saffron"} axis={r.swaras} />
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
