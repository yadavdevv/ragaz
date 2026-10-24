"use client";

import katex from "katex";
import { useMemo } from "react";
import { Footer } from "@/components/Footer";
import { FloralBand, Rubric } from "@/components/Ornament";
import { RiseChars } from "@/components/Text";
import { PAINTINGS } from "@/lib/art";
import { useData } from "@/lib/site";

const SECTIONS = [
  { id: "notation", t: "Notation" },
  { id: "reward", t: "The reward" },
  { id: "training", t: "Training" },
  { id: "data", t: "Data" },
  { id: "audio", t: "Sound" },
  { id: "images", t: "Images" },
];

export default function Docs() {
  const data = useData();
  const eq = useMemo(() => katex.renderToString(String.raw`\begin{aligned}R=\;&\text{format}\cdot\text{allowed}^2\cdot\text{beats}^2\cdot\text{variety}\cdot\text{length}\\&\cdot\big(0.2\,\text{tala}+0.35\,\text{profile}+0.1\,\text{motion}+0.35\,\text{phrases}\big)\end{aligned}`, { displayMode: true, throwOnError: false }), []);
  const ex = data?.pieces.find((p) => p.model === "v2")?.notation ?? "S R G P | G R D P | …";
  const runs = data ? Object.values(data.journey).map((j) => (j as unknown as { run: string }).run) : [];
  return (
    <main className="wasli text-kajal">
      <section className="px-6 pb-16 pt-40 sm:px-10">
        <div className="mx-auto max-w-[1400px]">
          <Rubric>Reference</Rubric>
          <h1 className="mt-4 font-display text-[clamp(72px,12vw,200px)] leading-[0.85]"><RiseChars text="Docs." /></h1>
        </div>
      </section>
      <FloralBand />
      <section className="px-6 pb-32 pt-14 sm:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-16 lg:grid-cols-[220px_1fr]">
          <nav className="hidden space-y-3 text-[16px] lg:sticky lg:top-28 lg:block lg:self-start">
            {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`} className="block text-kajal/60 hover:text-kajal">{s.t}</a>)}
          </nav>
          <div className="max-w-[760px] space-y-24 text-[18px] leading-[1.7] text-kajal/75">
            <article id="notation">
              <h2 className="font-display text-[56px] leading-none text-kajal">Notation</h2>
              <p className="mt-6">The model writes plain-text sargam. Each token is one beat; <code className="rounded bg-paper2 px-1.5 text-kajal">|</code> separates bars. Uppercase letters are natural (shuddh) notes and lowercase are flat (komal), except Ma: <code className="rounded bg-paper2 px-1.5 text-kajal">m</code> is natural and <code className="rounded bg-paper2 px-1.5 text-kajal">M</code> is sharp (tivra). A dot before a note means the lower octave, an apostrophe after it the upper. <code className="rounded bg-paper2 px-1.5 text-kajal">-</code> holds the previous note for another beat; two notes in one token split the beat.</p>
              <pre className="mt-6 whitespace-pre-wrap break-words rounded-2xl bg-kajal p-6 font-mono text-[15px] leading-[1.9] tracking-wider text-paper">{ex.split(" | ").reduce((acc: string[], bar, i) => { (i % 4 ? acc[acc.length - 1] += "  |  " + bar : acc.push(bar)); return acc; }, []).join("\n")}</pre>
            </article>
            <article id="reward">
              <h2 className="font-display text-[56px] leading-none text-kajal">The reward</h2>
              <p className="mt-6">One function scores every piece, between 0 and 1. The first five terms are hard rules and they multiply, so a single broken rule sinks the whole score. The model found a way to cheat every rule that was merely added. The last four are style, measured against real recordings.</p>
              <div className="no-scrollbar relative mt-6 overflow-x-auto rounded-2xl border border-rule bg-paper p-4 text-kajal sm:p-6 [&_.katex]:text-[0.72em] sm:[&_.katex]:text-[1.08em]" dangerouslySetInnerHTML={{ __html: eq }} />
              <ul className="mt-6 space-y-2 text-[16px]">
                {[["format", "share of tokens that are valid notation (squared)"], ["allowed", "share of notes that belong to the raga"], ["beats", "share of bars with exactly four beats"], ["variety", "penalises repeated bars, long runs of one note, too many holds"], ["length", "eight bars, two cycles of teentaal"], ["tala", "whole cycles, and an ending on Sa or a resting note"], ["profile", "time on each note vs real singers (calibrated Jensen–Shannon distance)"], ["motion", "sizes of melodic steps vs real singers"], ["phrases", "4-note figures mined from real concerts of the raga"]].map(([k, d]) => (
                  <li key={k} className="grid grid-cols-[7rem_1fr] gap-4 border-t border-rule pt-2"><code className="text-kajal">{k}</code><span>{d}</span></li>
                ))}
              </ul>
            </article>
            <article id="training">
              <h2 className="font-display text-[56px] leading-none text-kajal">Training</h2>
              <p className="mt-6">Base model: Qwen3-0.6B, adapted with LoRA, trained on a MacBook with MLX. Reinforcement learning uses GRPO: eight attempts per prompt, each attempt's advantage is its reward minus the group's mean, divided by the group's spread. Because reinforcement learning couldn't teach the notes of Malkauns, a supervised step came first: fine-tuning on good pieces written when the rules were in the prompt.</p>
              <ul className="mt-6 space-y-1 font-mono text-[14px] text-kajal/70">{runs.map((r) => <li key={r}>{r}</li>)}</ul>
            </article>
            <article id="data">
              <h2 className="font-display text-[56px] leading-none text-kajal">Data</h2>
              <p className="mt-6">Real-singer references come from {data ? Object.values(data.masters.ragas).reduce((a, r) => a + r.recordings, 0) : 30} concert recordings in the CompMusic Indian Art Music Raga Recognition Dataset (features), Gulati et al., Zenodo 10.5281/zenodo.7278506, CC BY 4.0. Pitch tracks were turned into notes; some recordings built the style measures and the rest were held out to check them. Raga rules follow standard Bhatkhande descriptions and have not yet been reviewed by a musician.</p>
            </article>
            <article id="audio">
              <h2 className="font-display text-[56px] leading-none text-kajal">Sound</h2>
              <p className="mt-6">Nothing here is a recording. Your browser reads the notation and sings it with a small synthesiser: a voice shaped by the formants of an open “aa” (aakar), sliding between notes, tuned in just intonation over a four-string tanpura drone. A flute is available in the full-screen player. The real singers' lines are resynthesised from pitch tracks of concert recordings with the same voice; no recorded audio is used.</p>
            </article>
            <article id="images">
              <h2 className="font-display text-[56px] leading-none text-kajal">Images</h2>
              <p className="mt-6">Ragamala (“garland of ragas”) paintings depict each raga as a scene of its mood and hour. Those used here:</p>
              <ul className="mt-6 space-y-3 text-[16px]">
                {Object.values(PAINTINGS).map((p) => (
                  <li key={p.src} className="border-t border-kajal/15 pt-3"><span className="italic text-kajal">{p.title}</span>, {p.place}, {p.date}. {p.museum}, {p.credit}. {p.licence}. <a href={p.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">Source ↗</a></li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
