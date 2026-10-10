"use client";

import { Line } from "@/components/Line";
import { type Track, toggle, useSite } from "@/lib/site";

/** A composition as a leaf: its melody drawn in ink, lit in vermilion while it plays. */
export function PieceCard({ track, queue }: { track: Track; queue?: Track[]; tone?: string; big?: boolean }) {
  const active = useSite((s) => s.track?.id === track.id && s.playing);
  return (
    <button
      data-cursor={active ? "Pause" : "Play"}
      onClick={() => {
        if (queue) useSite.getState().set({ queue });
        toggle(track);
      }}
      className={`leaf-card group relative flex w-full flex-col p-6 text-left shadow-[0_18px_40px_-28px_rgba(19,26,43,.5)] transition-all duration-500 ease-out hover:-translate-y-1`}
    >
      <span className={`pointer-events-none absolute inset-[6px] border transition-colors duration-500 ${active ? "border-sindoor" : "border-rule group-hover:border-sindoor/60"}`} />
      <span className="pointer-events-none absolute inset-[9px] border border-sona/30" />
      <div className="relative px-2 pt-2 text-kajal">
        <Line notes={track.notes} trackId={track.id} aspect={2.8} width={2} color="ink" base="ink" glow={false} />
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-4 px-2 pb-1">
        <div>
          <div className="font-display text-[26px] leading-none text-kajal">{track.title}</div>
          <div className="mt-2 font-sans text-[13.5px] text-sepia">{track.sub}</div>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-sans transition-all duration-500 ${active ? "bg-sindoor text-paper" : "border border-kajal/20 text-kajal group-hover:bg-sindoor group-hover:text-paper"}`}>
          {active ? "❚❚" : <span className="ml-0.5">▶</span>}
        </span>
      </div>
    </button>
  );
}
