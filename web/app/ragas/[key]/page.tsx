"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Footer } from "@/components/Footer";
import { Line } from "@/components/Line";
import { PieceCard } from "@/components/PieceCard";
import { Reveal, RiseChars } from "@/components/Text";
import { getEngine } from "@/lib/audio";
import { SWARAS } from "@/lib/music";
import { type Track, pieceTrack, toggle, useData, useSite } from "@/lib/site";
import { parse } from "@/lib/verify";

const NAMES: Record<string, string> = { S: "Sa", r: "Re", R: "Re", g: "Ga", G: "Ga", m: "Ma", M: "Ma", P: "Pa", d: "Dha", D: "Dha", n: "Ni", N: "Ni" };
const ABOUT: Record<string, { mood: string; text: string[] }> = {
  bhupali: { mood: "Calm, devotional, open", text: ["Bhupali uses only five notes. Without Ma and Ni there are no half-step tensions, so it sounds bright and settled.", "Ga is its most important note and Dha the second. Phrases often fall back to Sa through Re: Ga Re Sa."] },
  yaman: { mood: "Romantic, serene", text: ["Yaman uses all seven notes, with Ma raised (tivra). That sharp Ma gives it its yearning colour.", "Ga and Ni carry the weight. Phrases often begin from the lower Ni: Ni Re Ga."] },
  malkauns: { mood: "Meditative, grave", text: ["Malkauns has five notes and none of them are Re or Pa. Ga, Dha and Ni are flat (komal).", "Because there's no Pa, the tanpura's first string is tuned to Ma instead. Ma is its most important note."] },
};

export default function RagaPage() {
  const { key } = useParams<{ key: string }>();
  const data = useData();
  const playing = useSite((s) => (s.playing ? s.track?.id : null));
  const [lit, setLit] = useState<number | null>(null);
  const raga = data?.ragas.find((r) => r.key === key);
  const pakad: Track | null = useMemo(() => (raga ? { id: `pakad-${raga.key}`, title: `${raga.name} · signature phrase`, sub: "the pakad", raga: raga.key, notes: parse(raga.pakad).notes } : null), [raga]);
  if (!data || !raga || !pakad) return null;
  const m = data.masters.ragas[raga.key];
  const pieces = data.pieces.filter((p) => p.raga === raga.key && p.model === "v2").sort((a, b) => b.reward - a.reward).slice(0, 3).map((p) => pieceTrack(p));
  const order = ["bhupali", "yaman", "malkauns"];
  const next = data.ragas.find((r) => r.key === order[(order.indexOf(raga.key) + 1) % 3])!;
  const tap = async (pc: number) => {
    const eng = getEngine();
    await eng.resume();
    eng.tune(raga);
    const ok = raga.notes.includes(pc);
    eng.note(SWARAS[pc], 0, ok ? 0.8 : 0.35, ok ? "note" : "wrong");
    setLit(pc);
    window.setTimeout(() => setLit(null), 400);
  };

  return (
    <main className="bg-night">
      <section className="relative overflow-hidden bg-paper px-6 pb-20 pt-36 text-ink sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-wrap items-center gap-3 text-[14px]">
            {order.map((k) => <Link key={k} href={`/ragas/${k}`} className={`rounded-full border px-4 py-1.5 ${k === raga.key ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"}`}>{data.ragas.find((r) => r.key === k)!.name}</Link>)}
          </div>
          <h1 className="mt-10 font-display text-[clamp(96px,19vw,330px)] leading-[0.78]"><RiseChars text={raga.name} step={45} /></h1>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div className="font-deva text-[clamp(32px,4vw,56px)] text-ink/60">{raga.devanagari}</div>
            <div className="grid grid-cols-3 gap-10 text-[15px]">
              <div><div className="text-ink/50">sung</div><div className="mt-1 text-[20px]">{raga.time.split(" (")[0]}</div></div>
              <div><div className="text-ink/50">mood</div><div className="mt-1 text-[20px]">{ABOUT[raga.key].mood}</div></div>
              <div><div className="text-ink/50">family (thaat)</div><div className="mt-1 text-[20px]">{raga.thaat}</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-28 sm:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-2">
          <Reveal>
            <div className="text-[12px] uppercase tracking-[0.24em] text-mute">Its notes · tap to hear</div>
            <div className="mt-6 grid grid-cols-6 gap-2">
              {Array.from({ length: 12 }, (_, pc) => {
                const ok = raga.notes.includes(pc), s = SWARAS[pc];
                return (
                  <button key={pc} data-cursor={ok ? "Sing" : "Not allowed"} onClick={() => tap(pc)}
                    className={`flex h-24 flex-col items-center justify-end rounded-2xl border pb-3 transition-all duration-300 ${ok ? "border-saffron bg-saffron text-night" : "border-smoke text-mute opacity-50"} ${lit === pc ? (ok ? "-translate-y-2 scale-105" : "translate-x-1") : ""}`}>
                    <span className="text-[18px] font-medium">{NAMES[s]}</span>
                    <span className="text-[11px] opacity-70">{"rgdn".includes(s) ? "komal" : s === "M" ? "tivra" : s === raga.vadi ? "most important" : s === raga.samvadi ? "second" : " "}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-10 space-y-4 text-[18px] leading-[1.65] text-mute">{ABOUT[raga.key].text.map((t) => <p key={t}>{t}</p>)}</div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex items-baseline justify-between text-[12px] uppercase tracking-[0.24em] text-mute">
              <span>Its signature phrase (pakad)</span>
              <button data-cursor="Play" onClick={() => toggle(pakad)} className="normal-case tracking-normal text-ivory hover:text-saffron">{playing === pakad.id ? "Stop" : "▶ Play"}</button>
            </div>
            <button data-cursor="Play" onClick={() => toggle(pakad)} className="mt-6 block w-full text-ivory">
              <Line notes={pakad.notes} trackId={pakad.id} aspect={2.6} width={3} axis={raga.swaras} base="ivory" />
            </button>
            <div className="mt-3 font-mono text-[15px] tracking-wider text-mute">{raga.pakad}</div>
          </Reveal>
        </div>
      </section>

      <section className="bg-coal px-6 py-28 sm:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <div className="text-[12px] uppercase tracking-[0.24em] text-mute">How real singers use it</div>
            <h2 className="mt-4 font-display text-[clamp(44px,5vw,80px)] leading-[0.95]">Where the time goes</h2>
            <p className="mt-6 max-w-[42ch] text-[18px] leading-[1.6] text-mute">Share of time spent on each note, measured from {m.recordings} concert recordings, next to the model's {data.pieces.filter((p) => p.raga === raga.key && p.model === "v2").length} pieces.</p>
          </Reveal>
          <div className="space-y-4">
            {raga.notes.map((pc, i) => {
              const real = m.pc[pc], model = m.models.v2.pc[pc];
              return (
                <Reveal key={pc} delay={i * 0.06} className="grid grid-cols-[3.5rem_1fr_7rem] items-center gap-4">
                  <span className="text-[18px]">{NAMES[SWARAS[pc]]}</span>
                  <div className="relative h-9">
                    <div className="absolute inset-y-0 left-0 rounded-lg border border-ivory/40 bg-ivory/5" style={{ width: `${real * 220}%` }} />
                    <div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-saffron" style={{ width: `${model * 220}%` }} />
                  </div>
                  <span className="text-right tabular-nums text-mute">{Math.round(real * 100)}% · <span className="text-saffron">{Math.round(model * 100)}%</span></span>
                </Reveal>
              );
            })}
            <div className="pt-2 text-[14px] text-mute">outline: real singers · saffron: ragaz</div>
          </div>
        </div>
      </section>

      <section className="px-6 py-28 sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-[12px] uppercase tracking-[0.24em] text-mute">The model's best {raga.name}</div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">{pieces.map((t) => <PieceCard key={t.id} track={t} queue={pieces} />)}</div>
        </div>
      </section>

      <Link href={`/ragas/${next.key}`} data-cursor="Next" className="group block bg-saffron px-6 py-24 text-night sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-[12px] uppercase tracking-[0.24em] text-night/60">Next raga</div>
          <div className="mt-2 font-display text-[clamp(72px,14vw,240px)] leading-[0.85] transition-transform duration-700 ease-out group-hover:translate-x-6">{next.name} →</div>
        </div>
      </Link>
      <Footer />
    </main>
  );
}
