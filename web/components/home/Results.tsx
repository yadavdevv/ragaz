"use client";

import { CountUp, Reveal } from "@/components/Text";
import type { Data } from "@/lib/site";

export function Results({ data }: { data: Data }) {
  const v2 = data.pieces.filter((p) => p.model === "v2");
  const score = v2.reduce((a, p) => a + p.reward, 0) / v2.length;
  const good = (v2.filter((p) => p.reward > 0.8).length / v2.length) * 100;
  const clean = (v2.filter((p) => p.scores.allowed === 1).length / v2.length) * 100;
  const recs = Object.values(data.masters.ragas).reduce((a, r) => a + r.recordings, 0);
  const stats = [
    { v: score, d: 2, s: "", l: "average score, out of 1, over 48 pieces it wrote from a raga's name" },
    { v: good, d: 0, s: "%", l: "of its pieces score above 0.8" },
    { v: clean, d: 0, s: "%", l: "use only notes the raga allows" },
    { v: recs, d: 0, s: "", l: "concert recordings it was checked against" },
  ];
  return (
    <section id="results" className="relative overflow-hidden bg-night py-32">
      <div className="pointer-events-none absolute -right-40 top-20 h-[600px] w-[600px] rounded-full bg-saffron/10 blur-[120px]" />
      <div className="relative mx-auto max-w-[1400px] px-6 sm:px-10">
        <Reveal>
          <div className="text-[12px] uppercase tracking-[0.24em] text-mute">Results</div>
          <h2 className="mt-4 font-display text-[clamp(48px,7vw,112px)] leading-[0.92]">How good is it?</h2>
        </Reveal>
        <div className="mt-16 grid gap-px overflow-hidden rounded-[28px] border border-smoke bg-smoke sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="bg-night p-8">
              <div className="font-display text-[clamp(64px,7vw,104px)] leading-none text-saffron"><CountUp to={s.v} decimals={s.d} suffix={s.s} /></div>
              <div className="mt-4 text-[16px] leading-[1.5] text-mute">{s.l}</div>
            </div>
          ))}
        </div>
        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <Reveal><h3 className="font-display text-[44px] leading-none">What it can't do yet</h3></Reveal>
          <div className="divide-y divide-smoke border-y border-smoke">
            {[["Ornaments", "Glides and shakes between notes (meend, gamak) can't be written in its notation."], ["Alap", "The slow, unmetered opening of a real performance."], ["A real voice", "You're hearing a synthesised flute over a tanpura."], ["A musician's verdict", "It's measured against recordings, not yet judged by an expert's ear."]].map(([t, d]) => (
              <Reveal key={t} className="grid grid-cols-[12rem_1fr] gap-6 py-5 text-[17px]"><span className="text-ivory">{t}</span><span className="text-mute">{d}</span></Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
