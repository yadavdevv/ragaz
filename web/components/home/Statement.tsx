"use client";

import { ScrollWords } from "@/components/Text";
import type { Data } from "@/lib/site";

export function Statement({ data }: { data: Data }) {
  const lines = data.pieces.filter((p) => p.model === "v2").slice(0, 6).map((p) => p.notation);
  return (
    <section className="relative bg-paper text-ink">
      <div className="mx-auto max-w-[1400px] px-6 pb-28 pt-32 sm:px-10 sm:pt-44">
        <div className="text-[12px] uppercase tracking-[0.24em] text-ink/50">What this is</div>
        <ScrollWords className="mt-8 max-w-[22ch] font-display text-[clamp(40px,6.2vw,96px)] leading-[1.02]" dim={0.12}>
          {"A small language model that writes *ragas, eight bars at a time, from nothing but the raga's name. It learned by being *scored by a program that knows the rules, then by listening to *real singers."}
        </ScrollWords>
        <div className="mt-16 grid gap-10 text-[17px] leading-[1.6] text-ink/70 sm:grid-cols-3">
          <p><span className="text-ink">A raga</span> is a set of notes with a grammar: which notes are allowed, which ones to dwell on, and the phrase that makes it recognisable.</p>
          <p><span className="text-ink">The model</span> writes in sargam notation (Sa Re Ga Pa…), four beats a bar. Your browser turns that text into sound.</p>
          <p><span className="text-ink">Every piece</span> on this site was written by it. Nothing here is hand-picked to sound better than it is.</p>
        </div>
      </div>
      {/* notation streaming past: real output, the raw material */}
      <div className="overflow-hidden border-y border-sand bg-ink py-6 text-paper">
        <div className="marquee flex w-max gap-16 whitespace-nowrap font-mono text-[clamp(22px,3vw,40px)] tracking-[0.2em]">
          {[...lines, ...lines].map((l, i) => <span key={i} className={i % 2 ? "text-saffron" : "text-paper/80"}>{l}</span>)}
        </div>
      </div>
    </section>
  );
}
