"use client";

// Site-wide state: the exported data (loaded once) and the one player everything shares.

import { useEffect } from "react";
import { create } from "zustand";
import { getEngine, peekEngine } from "./audio";
import type { Masters, Note, Piece, Raga, RagaData } from "./music";
import type { Profiles } from "./verify";

export type Exhibit = { key: string; title: string; notes: Note[]; raga: string; reward_then: number | null; reward_now: number; notation: string; source: string };
export type Journey = Record<string, Record<string, [number, number][]> & { sa?: Record<string, [number, number][]> }>;
export type Data = { ragas: Raga[]; pieces: Piece[]; masters: Masters; profiles: Profiles; exhibits: Exhibit[]; journey: Journey };

/** Anything the player can play: a piece, a phrase, or something you wrote. */
export type Track = { id: string; title: string; sub: string; raga: string; notes: Note[]; notation?: string; reward?: number };

type State = {
  data: Data | null;
  track: Track | null;
  playing: boolean;
  open: boolean; // full-screen player
  tempo: number;
  drone: boolean;
  queue: Track[];
  set: (p: Partial<State>) => void;
};

export const useSite = create<State>((set) => ({ data: null, track: null, playing: false, open: false, tempo: 76, drone: false, queue: [], set: (p) => set(p) }));

let loading: Promise<void> | null = null;
export function useData() {
  const data = useSite((s) => s.data);
  useEffect(() => {
    if (data || loading) return;
    loading = Promise.all(["ragas", "pieces", "masters", "profiles", "exhibits", "journey"].map((n) => fetch(`/data/${n}.json`).then((r) => r.json()))).then(
      (all) => {
        const [ragas, pieces, masters, profiles, exhibits, journey] = all as [RagaData, Piece[], Masters, Profiles, Exhibit[], Journey];
        useSite.getState().set({ data: { ragas: ragas.ragas, pieces, masters, profiles, exhibits, journey } });
      },
    );
  }, [data]);
  return data;
}

export const ragaOf = (key: string) => useSite.getState().data?.ragas.find((r) => r.key === key) ?? null;

export function pieceTrack(p: Piece, label?: string): Track {
  const r = ragaOf(p.raga);
  const n = Number(p.id.split("-").pop()) + 1;
  return { id: p.id, title: `${r?.name ?? p.raga} no. ${n}`, sub: label ?? `${r?.time.split(" (")[0] ?? ""} · composed from the word “${r?.name}”`, raga: p.raga, notes: p.notes, notation: p.notation, reward: p.reward };
}

/** Play a track through the shared engine (with a soft tanpura under it). */
export async function play(track: Track, opts: { open?: boolean } = {}) {
  const eng = getEngine();
  await eng.resume();
  const raga = ragaOf(track.raga);
  if (raga) eng.retune(raga);
  if (!eng.droneOn) {
    if (raga) eng.tune(raga);
    eng.startDrone(1.2);
  }
  const s = useSite.getState();
  eng.onEnd = (pb) => {
    if (pb.tag !== track.id) return;
    useSite.getState().set({ playing: false });
    if (!useSite.getState().drone) eng.stopDrone(2);
  };
  eng.play(track.notes, s.tempo, track.id);
  s.set({ track, playing: true, open: opts.open ?? s.open });
}

export function stop() {
  const eng = peekEngine();
  eng?.stopPiece();
  if (eng && !useSite.getState().drone) eng.stopDrone(1.5);
  useSite.getState().set({ playing: false });
}

export function toggle(track: Track, opts: { open?: boolean } = {}) {
  const s = useSite.getState();
  if (s.playing && s.track?.id === track.id) stop();
  else play(track, opts);
}

export async function setDrone(on: boolean) {
  const eng = getEngine();
  await eng.resume();
  const raga = ragaOf(useSite.getState().track?.raga ?? "bhupali");
  if (on) {
    if (raga) eng.tune(raga);
    eng.startDrone(2);
  } else if (!useSite.getState().playing) eng.stopDrone(1.5);
  useSite.getState().set({ drone: on });
}

/** A soft click for buttons and taps (only once audio is running). */
export function tick(kind: "tap" | "soft" = "tap") {
  peekEngine()?.tick(kind);
}
