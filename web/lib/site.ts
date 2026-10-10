"use client";

// Site-wide state: the exported data (loaded once) and the one player everything shares.

import { useEffect } from "react";
import { create } from "zustand";
import { type Timbre, getEngine, peekEngine } from "./audio";
import type { Masters, Note, Piece, Raga, RagaData } from "./music";
import type { Profiles } from "./verify";

export type Exhibit = { key: string; title: string; notes: Note[]; raga: string; reward_then: number | null; reward_now: number; notation: string; source: string };
export type Journey = Record<string, Record<string, [number, number][]> & { sa?: Record<string, [number, number][]> }>;
export type Voice = { raga: string; recording: string; title: string; start: number; hop: number; cents: (number | null)[]; source: string };
export type Data = { ragas: Raga[]; pieces: Piece[]; masters: Masters; profiles: Profiles; exhibits: Exhibit[]; journey: Journey; voices: Voice[] };

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
  timbre: Timbre;
  curveTag: string | null; // a real singer's curve being sung
  set: (p: Partial<State>) => void;
};

export const useSite = create<State>((set) => ({ data: null, track: null, playing: false, open: false, tempo: 76, drone: false, queue: [], timbre: "voice", curveTag: null, set: (p) => set(p) }));

let loading: Promise<void> | null = null;
export function useData() {
  const data = useSite((s) => s.data);
  useEffect(() => {
    if (data || loading) return;
    loading = Promise.all(["ragas", "pieces", "masters", "profiles", "exhibits", "journey", "voices"].map((n) => fetch(`/data/${n}.json`).then((r) => r.json()))).then(
      (all) => {
        const [ragas, pieces, masters, profiles, exhibits, journey, voices] = all as [RagaData, Piece[], Masters, Profiles, Exhibit[], Journey, Voice[]];
        useSite.getState().set({ data: { ragas: ragas.ragas, pieces, masters, profiles, exhibits, journey, voices } });
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
  eng.timbre = s.timbre;
  eng.play(track.notes, s.tempo, track.id);
  s.set({ track, playing: true, curveTag: null, open: opts.open ?? s.open });
}

export function stop() {
  const eng = peekEngine();
  eng?.stopPiece();
  if (eng && !useSite.getState().drone) eng.stopDrone(1.5);
  useSite.getState().set({ playing: false, curveTag: null });
}

/** Sing a real singer's pitch curve (resynthesised) over the tanpura. */
export async function singVoice(v: Voice) {
  const eng = getEngine();
  await eng.resume();
  const raga = ragaOf(v.raga);
  if (raga) eng.retune(raga);
  if (!eng.droneOn) {
    if (raga) eng.tune(raga);
    eng.startDrone(1);
  }
  const tag = `voice-${v.raga}`;
  eng.onEnd = (pb) => {
    if (pb.tag !== tag) return;
    useSite.getState().set({ curveTag: null, playing: false });
    if (!useSite.getState().drone) eng.stopDrone(2);
  };
  eng.singCurve(v.cents, v.hop, tag);
  useSite.getState().set({ curveTag: tag, playing: false });
}

export function setTimbre(t: Timbre) {
  useSite.getState().set({ timbre: t });
  const eng = peekEngine();
  if (eng) eng.timbre = t;
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
