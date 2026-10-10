"use client";

import { useEffect, useRef, useState } from "react";
import { Line } from "@/components/Line";
import { FloralBand, Folio, Rubric } from "@/components/Ornament";
import { CountUp, Reveal } from "@/components/Text";
import { type Data, type Track, toggle, useSite } from "@/lib/site";

function Card({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal className="leaf-card relative flex h-full flex-col p-9 shadow-[0_24px_50px_-34px_rgba(19,26,43,.55)] transition-transform duration-500 hover:-translate-y-1">
      <span className="pointer-events-none absolute inset-[7px] border border-sindoor/50" />
      <span className="pointer-events-none absolute inset-[11px] border border-sona/40" />
      <div className="relative font-display text-[22px] text-sindoor">{n}</div>
      <h3 className="relative mt-2 font-display text-[38px] leading-[1] text-kajal">{title}</h3>
      <div className="relative mt-6 flex flex-1 flex-col">{children}</div>
    </Reveal>
  );
}

/** The score it got, struck through, and what the fixed rules give it. */
function Flip({ from, to }: { from: number; to: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && window.setTimeout(() => setFlipped(true), 900), { threshold: 0.6 });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="flex items-baseline gap-4">
      <span className={`font-display text-[60px] leading-none transition-all duration-700 ${flipped ? "text-kajal/30 line-through decoration-2" : "text-kajal"}`}>{from.toFixed(2)}</span>
      <span className={`font-display text-[60px] leading-none text-sindoor transition-all duration-700 ${flipped ? "opacity-100" : "translate-x-4 opacity-0"}`}>{to.toFixed(2)}</span>
    </div>
  );
}

function FactChart({ data }: { data: Data }) {
  const ref = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setSeen(true), { threshold: 0.5 });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  const a = data.journey.tracka["eval/bare/raga/malkauns"], b = data.journey.sft["eval/bare/raga/malkauns"];
  const pa = a.map(([s, v], i) => `${i ? "L" : "M"} ${(s / 100) * 190} ${150 - v * 130}`).join(" ");
  const pb = b.map(([s, v], i) => `${i ? "L" : "M"} ${210 + (s / 69) * 190} ${150 - v * 130}`).join(" ");
  return (
    <svg ref={ref} viewBox="0 0 400 175" className="w-full font-sans">
      <line x1="0" x2="400" y1="150" y2="150" stroke="#CDB690" />
      <line x1="200" x2="200" y1="10" y2="150" stroke="#CDB690" strokeDasharray="3 5" />
      <path d={pa} fill="none" stroke="#4A5166" strokeWidth="2.5" pathLength={1} strokeDasharray="1 1" strokeDashoffset={seen ? 0 : 1} style={{ transition: "stroke-dashoffset 1.6s ease-out" }} />
      <path d={pb} fill="none" stroke="#B23A22" strokeWidth="3" pathLength={1} strokeDasharray="1 1" strokeDashoffset={seen ? 0 : 1} style={{ transition: "stroke-dashoffset 1.6s ease-out 1.2s" }} />
      <text x="0" y="170" fontSize="12" fill="#4A5166">score alone · 100 steps</text>
      <text x="210" y="170" fontSize="12" fill="#B23A22">shown examples · 69 steps</text>
    </svg>
  );
}

export function Findings({ data }: { data: Data }) {
  const loop = data.exhibits.find((e) => e.key === "loop")!;
  const loopTrack: Track = { id: "hack-loop", title: "The 32-bar loop", sub: "a real reward hack, from training run 1", raga: loop.raga, notes: loop.notes, notation: loop.notation, reward: loop.reward_then ?? undefined };
  const playingLoop = useSite((s) => s.playing && s.track?.id === "hack-loop");
  const m = data.masters.ragas;
  const avg = (f: (r: (typeof m)[string]) => number) => Object.values(m).reduce((a, r) => a + f(r), 0) / 3;
  const real = avg((r) => r.pc[0]) * 100, v1 = avg((r) => r.models.v1.pc[0]) * 100, v2 = avg((r) => r.models.v2.pc[0]) * 100;

  return (
    <section className="relative bg-paper2/70">
      <FloralBand />
      <div className="mx-auto max-w-[1400px] px-6 py-28 sm:px-10">
        <Reveal>
          <div className="flex items-center gap-4"><Folio n={7} /><Rubric>What we found</Rubric></div>
          <h2 className="mt-6 max-w-[16ch] font-display text-[clamp(46px,6.4vw,104px)] leading-[0.95] text-kajal">Three things a score <span className="italic text-sindoor">can't</span> do.</h2>
        </Reveal>
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          <Card n="१" title="It can be cheated.">
            <p className="text-[18px] leading-[1.6] text-sepia">Early on, the model learned to write one figure over and over for 32 bars. Every note was allowed, so the score paid well. Hear it:</p>
            <button data-cursor={playingLoop ? "Stop" : "Hear the cheat"} onClick={() => toggle(loopTrack)} className="my-6 block w-full border border-rule bg-paper/70 p-4 text-kajal">
              <Line notes={loop.notes} trackId="hack-loop" aspect={4} width={1.4} color="ink" base="ink" glow={false} />
            </button>
            <div className="mt-auto font-sans text-[12px] uppercase tracking-[0.18em] text-sepia">score it got → under the fixed rules</div>
            <Flip from={loop.reward_then ?? 0} to={loop.reward_now} />
          </Card>
          <Card n="२" title="It can't teach a fact.">
            <p className="text-[18px] leading-[1.6] text-sepia">Asked for Malkauns by name, the model never stumbled on its notes, so every attempt scored zero and there was nothing to reward. A few examples fixed it.</p>
            <div className="mt-auto pt-8"><FactChart data={data} /></div>
          </Card>
          <Card n="३" title="Rules aren't music.">
            <p className="text-[18px] leading-[1.6] text-sepia">Real singers keep coming home to Sa, the tonic. Trained on our rules alone, the model hardly did. Trained against recordings, it learned to.</p>
            <div className="mt-auto grid grid-cols-3 gap-3 pt-8">
              {[["rules only", v1, "text-kajal/35"], ["real singers", real, "text-kajal"], ["final model", v2, "text-sindoor"]].map(([l, v, c]) => (
                <div key={l as string}>
                  <div className={`font-display text-[50px] leading-none ${c}`}><CountUp to={v as number} suffix="%" /></div>
                  <div className="mt-1 font-sans text-[12.5px] text-sepia">{l} · time on Sa</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <FloralBand />
    </section>
  );
}
