"use client";

import katex from "katex";
import { useMemo } from "react";
import { Footer } from "@/components/Footer";
import { RiseChars } from "@/components/Text";
import { useData } from "@/lib/site";

const SECTIONS = [
  { id: "notation", t: "Notation" },
  { id: "reward", t: "The reward" },
  { id: "training", t: "Training" },
  { id: "data", t: "Data" },
  { id: "audio", t: "Sound" },
];

export default function Docs() {
  const data = useData();
  const eq = useMemo(() => katex.renderToString(String.raw`\begin{aligned}R=\;&\text{format}\cdot\text{allowed}^2\cdot\text{beats}^2\cdot\text{variety}\cdot\text{length}\\&\cdot\big(0.2\,\text{tala}+0.35\,\text{profile}+0.1\,\text{motion}+0.35\,\text{phrases}\big)\end{aligned}`, { displayMode: true, throwOnError: false }), []);
  const ex = data?.pieces.find((p) => p.model === "v2")?.notation ?? "S R G P | G R D P | …";
  const runs = data ? Object.values(data.journey).map((j) => (j as unknown as { run: string }).run) : [];
  return (
    <main className="bg-paper text-ink">
      <section className="px-6 pb-16 pt-36 sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <div className="text-[12px] uppercase tracking-[0.24em] text-ink/50">Reference</div>
          <h1 className="mt-4 font-display text-[clamp(72px,12vw,200px)] leading-[0.85]"><RiseChars text="Docs." /></h1>
        </div>
      </section>
      <section className="px-6 pb-32 sm:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-[220px_1fr]">
          <nav className="hidden space-y-3 text-[16px] lg:sticky lg:top-28 lg:block lg:self-start">
            {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="block text-ink/60 hover:text-ink">{s.t}</a>)}
          </nav>
          <div className="max-w-[760px] space-y-24 text-[18px] leading-[1.7] text-ink/75">
            <article id="notation">
              <h2 className="font-display text-[56px] leading-none text-ink">Notation</h2>
              <p className="mt-6">The model writes plain-text sargam. Each token is one beat; <code className="rounded bg-sand px-1.5 text-ink">|</code> separates bars. Uppercase letters are natural (shuddh) notes and lowercase are flat (komal), except Ma: <code className="rounded bg-sand px-1.5 text-ink">m</code> is natural and <code className="rounded bg-sand px-1.5 text-ink">M</code> is sharp (tivra). A dot before a note means the lower octave, an apostrophe after it the upper. <code className="rounded bg-sand px-1.5 text-ink">-</code> holds the previous note for another beat; two notes in one token split the beat.</p>
              <pre className="mt-6 overflow-x-auto rounded-2xl bg-ink p-6 font-mono text-[15px] tracking-wider text-paper">{ex}</pre>
            </article>
            <article id="reward">
              <h2 className="font-display text-[56px] leading-none text-ink">The reward</h2>
              <p className="mt-6">One function scores every piece, between 0 and 1. The first five terms are hard rules and they multiply, so a single broken rule sinks the whole score. The model found a way to cheat every rule that was merely added. The last four are style, measured against real recordings.</p>
              <div className="mt-6 overflow-x-auto rounded-2xl border border-sand bg-paper p-6 text-ink" dangerouslySetInnerHTML={{ __html: eq }} />
              <ul className="mt-6 space-y-2 text-[16px]">
                {[["format", "share of tokens that are valid notation (squared)"], ["allowed", "share of notes that belong to the raga"], ["beats", "share of bars with exactly four beats"], ["variety", "penalises repeated bars, long runs of one note, too many holds"], ["length", "eight bars, two cycles of teentaal"], ["tala", "whole cycles, and an ending on Sa or a resting note"], ["profile", "time on each note vs real singers (calibrated Jensen–Shannon distance)"], ["motion", "sizes of melodic steps vs real singers"], ["phrases", "4-note figures mined from real concerts of the raga"]].map(([k, d]) => (
                  <li key={k} className="grid grid-cols-[7rem_1fr] gap-4 border-t border-sand pt-2"><code className="text-ink">{k}</code><span>{d}</span></li>
                ))}
              </ul>
            </article>
            <article id="training">
              <h2 className="font-display text-[56px] leading-none text-ink">Training</h2>
              <p className="mt-6">Base model: Qwen3-0.6B, adapted with LoRA, trained on a MacBook with MLX. Reinforcement learning uses GRPO: eight attempts per prompt, each attempt's advantage is its reward minus the group's mean, divided by the group's spread. Because reinforcement learning couldn't teach the notes of Malkauns, a supervised step came first: fine-tuning on good pieces written when the rules were in the prompt.</p>
              <ul className="mt-6 space-y-1 font-mono text-[14px] text-ink/70">{runs.map((r) => <li key={r}>{r}</li>)}</ul>
            </article>
            <article id="data">
              <h2 className="font-display text-[56px] leading-none text-ink">Data</h2>
              <p className="mt-6">Real-singer references come from {data ? Object.values(data.masters.ragas).reduce((a, r) => a + r.recordings, 0) : 30} concert recordings in the CompMusic Indian Art Music Raga Recognition Dataset (features), Gulati et al., Zenodo 10.5281/zenodo.7278506, CC BY 4.0. Pitch tracks were turned into notes; some recordings built the style measures and the rest were held out to check them. Raga rules follow standard Bhatkhande descriptions and have not yet been reviewed by a musician.</p>
            </article>
            <article id="audio">
              <h2 className="font-display text-[56px] leading-none text-ink">Sound</h2>
              <p className="mt-6">Nothing here is a recording. Your browser reads the notation and plays it with a small synthesiser: a flute-like voice with breath and vibrato, tuned in just intonation over a four-string tanpura drone. Tempo is adjustable in the full-screen player.</p>
            </article>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
