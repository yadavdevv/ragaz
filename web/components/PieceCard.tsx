"use client";

import { Line } from "@/components/Line";
import { type Track, toggle, useSite } from "@/lib/site";

export function PieceCard({ track, queue, tone = "night", big = false }: { track: Track; queue?: Track[]; tone?: "night" | "paper"; big?: boolean }) {
  const active = useSite((s) => s.track?.id === track.id && s.playing);
  const dark = tone === "night";
  return (
    <button
      data-cursor={active ? "Pause" : "Play"}
      onClick={() => {
        if (queue) useSite.getState().set({ queue });
        toggle(track);
      }}
      className={`group relative flex w-full flex-col overflow-hidden rounded-[22px] border p-6 text-left transition-all duration-500 ease-out hover:-translate-y-1 ${
        dark ? `bg-coal ${active ? "border-saffron" : "border-smoke hover:border-saffron/60"}` : `bg-paper ${active ? "border-ink" : "border-sand hover:border-ink/40"}`
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100 ${dark ? "bg-[radial-gradient(80%_60%_at_50%_30%,rgba(240,163,58,0.12),transparent)]" : "bg-[radial-gradient(80%_60%_at_50%_30%,rgba(240,163,58,0.18),transparent)]"}`} />
      <div className={dark ? "text-ivory" : "text-ink"}>
        <Line notes={track.notes} trackId={track.id} aspect={big ? 2.4 : 2.8} width={2} color={dark ? "saffron" : "ink"} base={dark ? "ivory" : "ink"} glow={dark} />
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-4">
        <div>
          <div className={`font-display text-[28px] leading-none ${dark ? "text-ivory" : "text-ink"}`}>{track.title}</div>
          <div className={`mt-2 text-[14px] ${dark ? "text-mute" : "text-ink/55"}`}>{track.sub}</div>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${active ? "bg-saffron text-night" : dark ? "border border-smoke text-ivory group-hover:border-saffron group-hover:bg-saffron group-hover:text-night" : "border border-ink/20 text-ink group-hover:bg-ink group-hover:text-paper"}`}>
          {active ? "❚❚" : <span className="ml-0.5">▶</span>}
        </span>
      </div>
    </button>
  );
}
