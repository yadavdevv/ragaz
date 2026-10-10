"use client";

import { useMemo, useState } from "react";
import { Magnetic } from "@/components/Magnetic";
import { Ridgeline } from "@/components/Ridgeline";
import { RiseChars } from "@/components/Text";
import { type Data, type Track, pieceTrack, play, useSite } from "@/lib/site";

export function Hero({ data }: { data: Data }) {
  const [hover, setHover] = useState<Track | null>(null);
  const tracks = useMemo(() => {
    // Interleave the ragas so neighbouring ridges differ; the final model's pieces first.
    const by = (k: string, m: string) => data.pieces.filter((p) => p.raga === k && p.model === m);
    const lists = ["v2", "v1"].flatMap((m) => ["bhupali", "yaman", "malkauns"].map((k) => by(k, m)));
    const out = [];
    for (let i = 0; out.length < 34; i++) for (const l of lists) if (l[i] && out.length < 34) out.push(pieceTrack(l[i]));
    return out;
  }, [data]);
  const best = useMemo(() => pieceTrack([...data.pieces].filter((p) => p.model === "v2" && p.raga === "yaman").sort((a, b) => b.reward - a.reward)[0]), [data]);

  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-night">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,rgba(240,163,58,0.10),transparent_70%)]" />
      <Ridgeline tracks={tracks} onHover={setHover} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-night via-night/80 to-transparent" />

      <div className={`pointer-events-none absolute right-6 top-24 text-right transition-all duration-500 sm:right-10 ${hover ? "opacity-100" : "translate-y-2 opacity-0"}`}>
        <div className="text-[12px] uppercase tracking-[0.2em] text-mute">each ridge is a piece it wrote</div>
        <div className="mt-1 font-display text-[28px] text-saffron">{hover?.title}</div>
        <div className="text-[13px] text-mute">click to hear it</div>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-6 pb-10 sm:px-10 sm:pb-14">
        <div className="text-[12px] uppercase tracking-[0.24em] text-mute">A language model that composes Hindustani ragas</div>
        <h1 className="mt-4 max-w-[14ch] font-display text-[clamp(56px,10vw,170px)] leading-[0.88] tracking-[-0.01em] text-ivory">
          <RiseChars text="Ragas, written" delay={300} />
          <br />
          <span className="italic text-saffron"><RiseChars text="by a machine." delay={700} /></span>
        </h1>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Magnetic variant="solid" size="lg" cursor="Play" onClick={() => { useSite.getState().set({ queue: tracks }); play(best, { open: true }); }}>▶ Play a raga</Magnetic>
          <Magnetic variant="line" size="lg" href="/listen" cursor="Open">Browse 144 pieces</Magnetic>
          <span className="hidden text-[14px] text-mute sm:inline">or touch the ridges above: every line is a real composition</span>
        </div>
      </div>
    </section>
  );
}
