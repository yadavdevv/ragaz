"use client";

import { useMemo, useState } from "react";
import { Magnetic } from "@/components/Magnetic";
import { ArchFrame, FloralBand, Rubric } from "@/components/Ornament";
import { Ridgeline } from "@/components/Ridgeline";
import { RiseChars } from "@/components/Text";
import { type Data, type Track, pieceTrack, play, useSite } from "@/lib/site";

export function Hero({ data }: { data: Data }) {
  const [hover, setHover] = useState<Track | null>(null);
  const tracks = useMemo(() => {
    const by = (k: string, m: string) => data.pieces.filter((p) => p.raga === k && p.model === m);
    const lists = ["v2", "v1"].flatMap((m) => ["bhupali", "yaman", "malkauns"].map((k) => by(k, m)));
    const out = [];
    for (let i = 0; out.length < 30; i++) for (const l of lists) if (l[i] && out.length < 30) out.push(pieceTrack(l[i]));
    return out;
  }, [data]);
  const best = useMemo(() => pieceTrack([...data.pieces].filter((p) => p.model === "v2" && p.raga === "yaman").sort((a, b) => b.reward - a.reward)[0]), [data]);

  return (
    <section className="relative overflow-hidden pt-20">
      <div className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-[1500px] items-center gap-10 px-6 pb-10 sm:px-10 lg:grid-cols-[1fr_1.05fr]">
        <div className="order-2 lg:order-1">
          <Rubric>A language model that composes Hindustani ragas</Rubric>
          <h1 className="mt-6 font-display text-[clamp(56px,8.4vw,150px)] leading-[0.9] tracking-[-0.01em] text-kajal">
            <RiseChars text="Ragas, written" delay={300} />
            <br />
            <span className="italic text-sindoor"><RiseChars text="by a machine." delay={700} /></span>
          </h1>
          <p className="mt-8 max-w-[38ch] text-[20px] leading-[1.55] text-sepia">
            It was given only a raga's name, scored by a program that knows the rules, then measured against real singers. Every line in the window is a piece it wrote.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Magnetic variant="solid" size="lg" cursor="Play" onClick={() => { useSite.getState().set({ queue: tracks }); play(best, { open: true }); }}>▶ Play a raga</Magnetic>
            <Magnetic variant="line" size="lg" href="/listen" cursor="Open">Browse 144 pieces</Magnetic>
          </div>
        </div>

        <div className="relative order-1 lg:order-2">
          <ArchFrame id="hero-arch" className="mx-auto h-[min(52svh,520px)] w-full max-w-[640px] drop-shadow-[0_30px_40px_rgba(19,26,43,.25)] lg:h-[min(78svh,760px)]">
            <div className="night-sky relative h-full w-full">
              <div className="absolute inset-x-0 bottom-0 top-[18%]"><Ridgeline tracks={tracks} onHover={setHover} /></div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#131A2B] to-transparent" />
              {/* the moon, as in the night scenes of the paintings */}
              <svg viewBox="-20 -20 40 40" className="pointer-events-none absolute right-[22%] top-[16%] h-10 w-10" aria-hidden>
                <path d="M 6 -14 A 15 15 0 1 0 6 14 A 11.5 11.5 0 1 1 6 -14 Z" fill="#F1E6CF" opacity=".9" />
              </svg>
              <div className={`pointer-events-none absolute inset-x-0 bottom-6 text-center font-sans transition-all duration-500 ${hover ? "opacity-100" : "translate-y-2 opacity-0"}`}>
                <div className="text-[11px] uppercase tracking-[0.22em] text-paper/60">each ridge is a piece it wrote</div>
                <div className="mt-1 font-display text-[24px] text-gulal">{hover?.title}</div>
              </div>
            </div>
          </ArchFrame>
          <div className="mt-3 text-center font-sans text-[13px] text-sepia">touch the ridges · click one to hear it</div>
        </div>
      </div>
      <FloralBand />
    </section>
  );
}
