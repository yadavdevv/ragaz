"use client";

import { useMemo, useState } from "react";
import { Line } from "@/components/Line";
import { Magnetic } from "@/components/Magnetic";
import { FloralBand, Folio, Rubric } from "@/components/Ornament";
import { Reveal } from "@/components/Text";
import { VoiceCurve } from "@/components/VoiceCurve";
import { type Data, pieceTrack, singVoice, stop, tick, toggle, useSite } from "@/lib/site";

export function TheVoice({ data }: { data: Data }) {
  const [rk, setRk] = useState("yaman");
  const voice = data.voices.find((v) => v.raga === rk)!;
  const raga = data.ragas.find((r) => r.key === rk)!;
  const piece = useMemo(() => pieceTrack([...data.pieces].filter((p) => p.model === "v2" && p.raga === rk).sort((a, b) => b.reward - a.reward)[0]), [data, rk]);
  const singing = useSite((s) => s.curveTag === `voice-${rk}`);
  const modelOn = useSite((s) => s.playing && s.track?.id === piece.id);

  return (
    <section className="relative bg-paper2/70">
      <FloralBand />
      <div className="mx-auto max-w-[1400px] px-6 py-28 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <Reveal>
            <div className="flex items-center gap-4"><Folio n={2} /><Rubric>The voice</Rubric></div>
            <h2 className="mt-6 font-display text-[clamp(46px,6.4vw,104px)] leading-[0.95] text-kajal">A raga lives<br /><span className="italic text-sindoor">between the notes.</span></h2>
          </Reveal>
          <div className="flex flex-wrap gap-2 font-sans">
            {data.ragas.map((r) => (
              <button key={r.key} onClick={() => { tick("soft"); stop(); setRk(r.key); }} className={`rounded-full border px-5 py-2.5 text-[15px] transition-all ${r.key === rk ? "border-kajal bg-kajal text-paper" : "border-kajal/20 hover:border-sindoor"}`}>
                {r.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_21rem]">
          <div className="space-y-12">
            <div className="leaf-card relative p-6 text-kajal shadow-[0_20px_40px_-30px_rgba(19,26,43,.5)]">
              <span className="pointer-events-none absolute inset-[6px] border border-rule" />
              <div className="relative mb-4 flex flex-wrap items-baseline justify-between gap-4">
                <div className="text-[17px]"><span className="font-display text-[22px] text-kajal">A singer</span> <span className="text-sepia">· ten seconds of a concert {raga.name}</span></div>
                <Magnetic cursor={singing ? "Stop" : "Listen"} onClick={() => (singing ? stop() : singVoice(voice))}>{singing ? "❚❚ Stop" : "▶ Hear the singer's line"}</Magnetic>
              </div>
              <div className="relative"><VoiceCurve key={rk} voice={voice} axis={raga.swaras} /></div>
            </div>
            <div className="leaf-card relative p-6 text-kajal shadow-[0_20px_40px_-30px_rgba(19,26,43,.5)]">
              <span className="pointer-events-none absolute inset-[6px] border border-rule" />
              <div className="relative mb-4 flex flex-wrap items-baseline justify-between gap-4">
                <div className="text-[17px]"><span className="font-display text-[22px] text-gulal">The model</span> <span className="text-sepia">· its best {raga.name}, as written</span></div>
                <Magnetic cursor={modelOn ? "Stop" : "Listen"} onClick={() => toggle(piece)}>{modelOn ? "❚❚ Stop" : "▶ Hear it sung"}</Magnetic>
              </div>
              <div className="relative"><Line key={piece.id} notes={piece.notes} trackId={piece.id} aspect={3.4} width={2.6} axis={raga.swaras} color="gulal" base="ink" glow={false} /></div>
            </div>
          </div>
          <Reveal className="space-y-5 text-[18px] leading-[1.65] text-sepia lg:pt-6">
            <p><span className="text-kajal">The indigo line is a real voice</span>, traced from the pitch of a concert recording. It never sits still: it slides into notes (meend), shakes on them (gamak), and lingers longer than any notation admits.</p>
            <p><span className="text-gulal">The red line is the model</span>: only the notes, held steady, four to a bar. Your browser sings both with the same voice, so you can hear what lives between them.</p>
            <p className="font-sans text-[13px] leading-[1.6]">Singer's line: “{voice.title}”, resynthesised from its pitch track, not the original audio. {voice.source}.</p>
          </Reveal>
        </div>
      </div>
      <FloralBand />
    </section>
  );
}
