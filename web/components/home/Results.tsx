"use client";

import { Folio, Hashiya, Rubric } from "@/components/Ornament";
import { CountUp, Reveal } from "@/components/Text";
import type { Data } from "@/lib/site";

export function Results({ data }: { data: Data }) {
  const v2 = data.pieces.filter((p) => p.model === "v2");
  const score = v2.reduce((a, p) => a + p.reward, 0) / v2.length;
  const good = (v2.filter((p) => p.reward > 0.8).length / v2.length) * 100;
  const clean = (v2.filter((p) => p.scores.allowed === 1).length / v2.length) * 100;
  const recs = Object.values(data.masters.ragas).reduce((a, r) => a + r.recordings, 0);
  const stats = [
    { v: score, d: 2, s: "", l: "average score, out of 1, over 48 pieces written from a raga's name" },
    { v: good, d: 0, s: "%", l: "of its pieces score above 0.8" },
    { v: clean, d: 0, s: "%", l: "use only notes the raga allows" },
    { v: recs, d: 0, s: "", l: "concert recordings it was checked against" },
  ];
  return (
    <section id="results" className="relative py-28">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <Reveal>
          <div className="flex items-center gap-4"><Folio n={10} /><Rubric>Results</Rubric></div>
          <h2 className="mt-6 font-display text-[clamp(46px,6.4vw,104px)] leading-[0.95] text-kajal">How good is it?</h2>
        </Reveal>
        <Hashiya className="mt-14">
          <div className="leaf-card grid sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={s.l} className={`p-8 ${i ? "border-t border-rule sm:border-t-0 sm:border-l" : ""}`}>
                <div className="font-display text-[clamp(60px,6.4vw,96px)] leading-none text-sindoor"><CountUp to={s.v} decimals={s.d} suffix={s.s} /></div>
                <div className="mt-4 text-[17px] leading-[1.5] text-sepia">{s.l}</div>
              </div>
            ))}
          </div>
        </Hashiya>
        <div className="mt-20 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <Reveal><h3 className="font-display text-[44px] leading-none text-kajal">What it can't do yet</h3></Reveal>
          <div className="divide-y divide-rule border-y border-rule">
            {[["Ornaments", "Glides and shakes between notes (meend, gamak) can't be written in its notation."], ["Alap", "The slow, unmetered opening of a real performance."], ["A real voice", "You hear a synthesised voice over a tanpura, not a singer."], ["A musician's verdict", "It's measured against recordings, not yet judged by an expert's ear."]].map(([t, d]) => (
              <Reveal key={t} className="grid gap-1 py-5 text-[18px] sm:grid-cols-[12rem_1fr] sm:gap-6"><span className="font-display text-[22px] text-kajal">{t}</span><span className="text-sepia">{d}</span></Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
