"use client";

import { useEffect, useState } from "react";
import { peekEngine } from "./audio";
import type { Note } from "./music";

/** Current position in beats of the playing piece, read from the audio clock.
 *  Re-renders only when the half-beat changes. null = not playing this piece. */
export function usePlayhead(notes: Note[] | null) {
  const [beat, setBeat] = useState<number | null>(null);
  useEffect(() => {
    let raf = 0, last = NaN;
    const tick = () => {
      const eng = peekEngine();
      const pb = eng?.playback;
      let b: number | null = null;
      if (eng && pb && notes && pb.notes === notes && eng.now < pb.end + 0.3) b = Math.max(-1, (eng.now - pb.t0) / pb.beat);
      const q = b === null ? NaN : Math.floor(b * 2) / 2;
      if (!(q === last || (Number.isNaN(q) && Number.isNaN(last)))) {
        last = q;
        setBeat(b === null ? null : q);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [notes]);
  return beat;
}
