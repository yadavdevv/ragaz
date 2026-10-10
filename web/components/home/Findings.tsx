"use client";

import { useEffect, useRef, useState } from "react";
import { Line } from "@/components/Line";
import { CountUp, Reveal } from "@/components/Text";
import { type Data, type Track, toggle, useSite } from "@/lib/site";

function Card({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal className="flex h-full flex-col rounded-[28px] border border-sand bg-paper p-8 transition-transform duration-500 hover:-translate-y-1">
      <div className="font-mono text-[13px] text-ink/45">{n}</div>
      <h3 className="mt-3 font-display text-[40px] leading-[0.95] text-ink">{title}</h3>
      <div className="mt-6 flex flex-1 flex-col">{children}</div>
    </Reveal>
  );
}

/** Scores flip from what the old reward paid to what the final reward pays. */
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
      <span className={`font-display text-[64px] leading-none transition-all duration-700 ${flipped ? "text-ink/30 line-through decoration-2" : "text-ink"}`}>{from.toFixed(2)}</span>
      <span className={`font-display text-[64px] leading-none text-ember transition-all duration-700 ${flipped ? "opacity-100" : "translate-x-4 opacity-0"}`}>{to.toFixed(2)}</span>
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
    <svg ref={ref} viewBox="0 0 400 170" className="w-full">
      <line x1="0" x2="400" y1="150" y2="150" stroke="#1A1410" strokeOpacity=".15" />
      <line x1="200" x2="200" y1="10" y2="150" stroke="#1A1410" strokeOpacity=".15" strokeDasharray="3 5" />
      <path d={pa} fill="none" stroke="#1A1410" strokeOpacity=".5" strokeWidth="2.5" pathLength={1} strokeDasharray="1 1" strokeDashoffset={seen ? 0 : 1} style={{ transition: "stroke-dashoffset 1.6s ease-out" }} />
      <path d={pb} fill="none" stroke="#D9622B" strokeWidth="3" pathLength={1} strokeDasharray="1 1" strokeDashoffset={seen ? 0 : 1} style={{ transition: "stroke-dashoffset 1.6s ease-out 1.2s" }} />
      <text x="0" y="168" fontSize="12" fill="#1A1410" opacity=".55">score alone · 100 steps</text>
      <text x="210" y="168" fontSize="12" fill="#D9622B">shown examples · 69 steps</text>
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
    <section className="bg-paper py-32 text-ink">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <Reveal>
          <div className="text-[12px] uppercase tracking-[0.24em] text-ink/50">What we found</div>
          <h2 className="mt-4 max-w-[16ch] font-display text-[clamp(48px,7vw,112px)] leading-[0.92]">Three things a score <span className="italic">can't</span> do.</h2>
        </Reveal>
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          <Card n="01" title="It can be cheated.">
            <p className="text-[17px] leading-[1.6] text-ink/65">Early on, the model learned to write one figure over and over for 32 bars. Every note was allowed, so the score paid well. Hear it:</p>
            <button data-cursor={playingLoop ? "Stop" : "Hear the cheat"} onClick={() => toggle(loopTrack)} className="my-6 block w-full rounded-2xl bg-ink p-4 text-paper">
              <Line notes={loop.notes} trackId="hack-loop" aspect={4} width={1.4} color="saffron" base="ivory" glow={false} />
            </button>
            <div className="mt-auto text-[13px] uppercase tracking-[0.18em] text-ink/45">score it got → score under the fixed rules</div>
            <Flip from={loop.reward_then ?? 0} to={loop.reward_now} />
          </Card>
          <Card n="02" title="It can't teach a fact.">
            <p className="text-[17px] leading-[1.6] text-ink/65">Asked for Malkauns by name, the model never stumbled on its notes, so every attempt scored zero and there was nothing to reward. A few examples fixed it.</p>
            <div className="mt-auto pt-8"><FactChart data={data} /></div>
          </Card>
          <Card n="03" title="Rules aren't music.">
            <p className="text-[17px] leading-[1.6] text-ink/65">Real singers keep coming home to Sa, the tonic. Trained on our rules alone, the model hardly did. Trained against recordings, it learned to.</p>
            <div className="mt-auto grid grid-cols-3 gap-3 pt-8">
              {[["rules only", v1, "text-ink/35"], ["real singers", real, "text-ink"], ["final model", v2, "text-ember"]].map(([l, v, c]) => (
                <div key={l as string}>
                  <div className={`font-display text-[52px] leading-none ${c}`}><CountUp to={v as number} suffix="%" /></div>
                  <div className="mt-1 text-[13px] text-ink/55">{l} · time on Sa</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
