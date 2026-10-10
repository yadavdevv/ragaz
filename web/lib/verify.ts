// TypeScript port of src/ragaz/notation.py + verify.py (style="v2") + realprofile.py scoring.
// The same reward that trained the model, running in the browser so anyone can be scored by it.
// Parity with Python is checked by scripts/parity.ts against every exported piece.

import { SWARAS, type Note, type Raga } from "./music";

export type Profile = { pc: number[]; intervals: number[]; phrases: Record<string, number>; calibration: { profile: number[]; motion: number[]; phrases: number[] } };
export type Profiles = Record<string, Profile>;
export type Composition = { notes: Note[]; bars: string[][]; invalid: string[]; beats: number };
export type Report = { scores: Record<string, number>; reward: number; violations: string[]; gate: number; shaped: number };

export const WEIGHTS_V2 = { tala: 0.2, profile: 0.35, motion: 0.1, phrases: 0.35 } as const;
const BEATS_PER_BAR = 4, BARS_PER_CYCLE = 4, TARGET_BARS = 8, REPEAT_ALLOWANCE = 0.75;
const PAKAD_MIN_SIM = 0.6, PAKAD_EXACT_SIM = 0.85, PAKAD_MAX_REPEATS = 2, BIG_LEAP = 7, MAX_OCTAVE = 1;
const NGRAM = 4, MAX_INTERVAL = 12;

const NOTE = "(\\.*)([SrRgGmMPdDnN])('*)";
const BEAT_RE = new RegExp(`^(?:${NOTE})+$`);
const NOTE_RE = new RegExp(NOTE, "g");

const semis = (n: Note) => SWARAS.indexOf(n.s) + 12 * n.o;

export function parse(text: string): Composition {
  const notes: Note[] = [], bars: string[][] = [], invalid: string[] = [];
  let beats = 0;
  for (const line of text.split(/\r?\n/)) {
    for (const segment of line.split("|")) {
      const tokens = segment.split(/\s+/).filter(Boolean);
      if (!tokens.length) continue;
      const barIndex = bars.length;
      const bar: string[] = [];
      for (const token of tokens) {
        if (token === "-") {
          if (notes.length) {
            notes[notes.length - 1].d += 1;
            bar.push(token);
          } else invalid.push(token);
        } else if (BEAT_RE.test(token)) {
          const parts = [...token.matchAll(NOTE_RE)];
          const start = beats + bar.length;
          const step = 1 / parts.length;
          parts.forEach(([, dots, s, ticks], i) => notes.push({ s, o: ticks.length - dots.length, t: start + i * step, d: step, bar: barIndex, ok: true }));
          bar.push(token);
        } else invalid.push(token);
      }
      if (bar.length) {
        bars.push(bar);
        beats += bar.length;
      }
    }
  }
  return { notes, bars, invalid, beats };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const band = (x: number, lo: number, hi: number) => (x < lo ? x / lo : x > hi ? Math.max(0, 1 - (x - hi) / hi) : 1);
const NAME: Record<string, string> = {};

function editDistance(a: string[], b: string[]) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  a.forEach((x, i) => {
    const cur = [i + 1];
    b.forEach((y, j) => cur.push(Math.min(prev[j + 1] + 1, cur[j] + 1, prev[j] + (x !== y ? 1 : 0))));
    prev = cur;
  });
  return prev[prev.length - 1];
}

function phraseMatches(sw: string[], phrase: string[]) {
  const n = phrase.length;
  if (sw.length < n) return sw.length ? [1 - editDistance(sw, phrase) / n] : [];
  const out: number[] = [];
  for (let i = 0; i <= sw.length - n; i++) out.push(1 - editDistance(sw.slice(i, i + n), phrase) / n);
  return out;
}

// ---------------------------------------------------------------- v2 style (realprofile.py)

function pcDistribution(notes: Note[]) {
  const d = new Array(12).fill(0);
  for (const n of notes) d[SWARAS.indexOf(n.s)] += n.d;
  const s = d.reduce((a, b) => a + b, 0);
  return s ? d.map((x) => x / s) : d;
}

function intervalDistribution(notes: Note[]) {
  const d = new Array(2 * MAX_INTERVAL + 1).fill(0);
  for (let i = 1; i < notes.length; i++) {
    const a = semis(notes[i - 1]), b = semis(notes[i]);
    if (a !== b) d[Math.max(-MAX_INTERVAL, Math.min(MAX_INTERVAL, b - a)) + MAX_INTERVAL] += 1;
  }
  const s = d.reduce((a, b) => a + b, 0);
  return s ? d.map((x) => x / s) : d;
}

export function jsd(p: number[], q: number[]) {
  const m = p.map((x, i) => (x + q[i]) / 2);
  const kl = (a: number[]) => a.reduce((s, x, i) => (x > 0 ? s + x * Math.log2(x / m[i]) : s), 0);
  return 0.5 * kl(p) + 0.5 * kl(q);
}

function bisectLeft(a: number[], x: number) {
  let lo = 0, hi = a.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (a[mid] < x) lo = mid + 1; else hi = mid; }
  return lo;
}
function bisectRight(a: number[], x: number) {
  let lo = 0, hi = a.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (x < a[mid]) hi = mid; else lo = mid + 1; }
  return lo;
}

/** Typicality vs real excerpts: the median real excerpt scores 1.0. */
function calibrated(value: number, real: number[], higherIsBetter: boolean) {
  const share = higherIsBetter ? bisectRight(real, value) / real.length : (real.length - bisectLeft(real, value)) / real.length;
  return Math.min(1, 2 * share);
}

function phraseRaw(notes: Note[], phrases: Record<string, number>) {
  const found = new Set<string>();
  for (let i = 0; i <= notes.length - NGRAM; i++) found.add(notes.slice(i, i + NGRAM).map((n) => n.s).join(" "));
  let s = 0;
  for (const [g, w] of Object.entries(phrases)) if (found.has(g)) s += w;
  return s;
}

export function styleScores(notes: Note[], prof: Profile) {
  return {
    profile: calibrated(jsd(pcDistribution(notes), prof.pc), prof.calibration.profile, false),
    motion: calibrated(jsd(intervalDistribution(notes), prof.intervals), prof.calibration.motion, false),
    phrases: calibrated(phraseRaw(notes, prof.phrases), prof.calibration.phrases, true),
  };
}

/** Distance of a time-share profile from the masters' (1 − JSD), for free playing without bars. */
export const profileScore = (share: number[], prof: Profile) => calibrated(jsd(share, prof.pc), prof.calibration.profile, false);

// ---------------------------------------------------------------- verify (style="v2")

export function verify(text: string | Composition, raga: Raga, prof: Profile): Report {
  NAME[raga.key] = raga.name;
  const comp = typeof text === "string" ? parse(text) : text;
  const v: string[] = [];
  const notesSet = new Set(raga.swaras);

  // format
  if (!comp.notes.length) {
    v.push("no notes found");
    const zero = Object.fromEntries(["format", "allowed", "beats", "tala", "emphasis", "melody", "pakad", "variety", "length", "profile", "motion", "phrases"].map((k) => [k, 0]));
    return { scores: zero, reward: 0, violations: v, gate: 0, shaped: 0 };
  }
  for (const t of comp.invalid.slice(0, 5)) v.push(`invalid token '${t}'`);
  const tokenCount = comp.beats + comp.invalid.length;
  const format = (comp.beats / tokenCount) ** 2;

  // allowed
  const wrong = comp.notes.filter((n) => !notesSet.has(n.s));
  for (const n of wrong.slice(0, 5)) v.push(`${n.s} is not in ${raga.name} (bar ${n.bar + 1})`);
  const allowed = 1 - wrong.length / comp.notes.length;

  // beats
  const barLengths = comp.bars.map((b) => b.length);
  const bad = barLengths.map((n, i) => [n, i]).filter(([n]) => n !== BEATS_PER_BAR);
  for (const [n, i] of bad.slice(0, 3)) v.push(`bar ${i + 1} has ${n} beats, expected ${BEATS_PER_BAR}`);
  const beats = 1 - bad.length / barLengths.length;

  // tala
  const cycleOk = barLengths.length >= BARS_PER_CYCLE && barLengths.length % BARS_PER_CYCLE === 0 ? 1 : 0;
  if (!cycleOk) v.push(`${barLengths.length} bars is not a whole number of Teentaal cycles`);
  const last = comp.notes[comp.notes.length - 1].s;
  const endingOk = last === "S" || raga.nyas.includes(last) ? 1 : 0;
  if (!endingOk) v.push(`ends on ${last}, not on Sa or a resting note`);
  const tala = 0.6 * cycleOk + 0.4 * endingOk;

  // emphasis (reported, not in the v2 reward)
  const dur = new Map<string, number>();
  for (const n of comp.notes) dur.set(n.s, (dur.get(n.s) ?? 0) + n.d);
  const total = [...dur.values()].reduce((a, b) => a + b, 0);
  const ranking = [...dur.entries()].map((e, i) => [...e, i] as const).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(([s]) => s);
  const rank = ranking.slice(0, 2).includes(raga.vadi) ? 1 : ranking.slice(0, 3).includes(raga.vadi) ? 0.5 : 0;
  if (rank < 1) v.push(`vadi ${raga.vadi} is not among the most prominent notes`);
  const emphasis = (band((dur.get(raga.vadi) ?? 0) / total, 0.15, 0.35) + band((dur.get(raga.samvadi) ?? 0) / total, 0.08, 0.3) + rank) / 3;

  // melody (reported)
  const intervals = comp.notes.slice(1).map((n, i) => Math.abs(semis(n) - semis(comp.notes[i])));
  let melody = 0;
  if (intervals.length) {
    const big = intervals.filter((i) => i > BIG_LEAP).length / intervals.length;
    if (big > 0) v.push(`${pct(big)} of moves are leaps wider than a fifth`);
    const out = comp.notes.filter((n) => Math.abs(n.o) > MAX_OCTAVE).length / comp.notes.length;
    if (out > 0) v.push(`${pct(out)} of notes are beyond the lower or upper octave`);
    melody = Math.max(0, 1 - 2.5 * big - 2 * out);
  }

  // pakad (reported)
  const sw = comp.notes.map((n) => n.s);
  const phrases = raga.pakad.split("|").filter((p) => p.trim()).map((p) => parse(p).notes.map((n) => n.s));
  const best: number[] = [];
  let spam = false;
  for (const ph of phrases) {
    const sims = phraseMatches(sw, ph);
    const top = sims.length ? Math.max(...sims) : 0;
    best.push(Math.max(0, (top - PAKAD_MIN_SIM) / (1 - PAKAD_MIN_SIM)));
    let count = 0, i = 0;
    while (i < sims.length) {
      if (sims[i] >= PAKAD_EXACT_SIM) { count++; i += ph.length; } else i++;
    }
    spam ||= count > PAKAD_MAX_REPEATS;
  }
  best.sort((a, b) => b - a);
  let pakad = 0.7 * best[0] + 0.3 * (best.length > 1 ? best[1] : best[0]);
  if (spam) { v.push(`signature phrase repeated more than ${PAKAD_MAX_REPEATS} times`); pakad *= 0.5; }
  if (best[0] === 0) v.push("no signature phrase (pakad) of the raga");

  // variety
  const used = new Set(comp.notes.map((n) => n.s).filter((s) => notesSet.has(s)));
  const coverage = Math.min(1, used.size / Math.max(1, raga.swaras.length - 1));
  const keys = comp.bars.map((b) => b.join("\u0000"));
  const unique = new Set(keys).size / keys.length;
  if (unique < 1) v.push(`${keys.length - new Set(keys).size} repeated bar(s)`);
  let longest = 1, run = 1;
  for (let i = 1; i < comp.notes.length; i++) {
    run = semis(comp.notes[i]) === semis(comp.notes[i - 1]) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const runs = longest <= 3 ? 1 : Math.max(0, 1 - (longest - 3) / 4);
  if (longest > 3) v.push(`same note repeated ${longest} times in a row`);
  const holds = comp.bars.reduce((a, b) => a + b.filter((t) => t === "-").length, 0) / comp.beats;
  const holdScore = holds <= 0.35 ? 1 : Math.max(0, 1 - (holds - 0.35) / 0.35);
  if (holds > 0.35) v.push(`${pct(holds)} of beats are holds`);
  const variety = coverage * Math.min(1, unique / REPEAT_ALLOWANCE) * runs * holdScore;

  // length
  const nb = comp.bars.length;
  let length = 1;
  if (nb !== TARGET_BARS) {
    v.push(`${nb} bars, asked for ${TARGET_BARS}`);
    length = nb < TARGET_BARS ? nb / TARGET_BARS : TARGET_BARS / nb;
  }

  const style = styleScores(comp.notes, prof);
  const scores: Record<string, number> = { format, allowed, beats, tala, emphasis, melody, pakad, variety, length, ...style };
  const gate = format * allowed ** 2 * beats ** 2 * variety * length;
  const shaped = (Object.keys(WEIGHTS_V2) as (keyof typeof WEIGHTS_V2)[]).reduce((s, k) => s + WEIGHTS_V2[k] * scores[k], 0);
  return { scores, reward: gate * shaped, violations: v, gate, shaped };
}

/** Notes → notation text (one token per beat), the inverse of parse for whole-beat notes. */
export function toNotation(slots: (Note | "-" | null)[]) {
  const tok = (s: Note | "-" | null) => (s === null ? "" : s === "-" ? "-" : ".".repeat(Math.max(0, -s.o)) + s.s + "'".repeat(Math.max(0, s.o)));
  const bars: string[] = [];
  for (let i = 0; i < slots.length; i += 4) {
    const bar = slots.slice(i, i + 4).map(tok).filter(Boolean);
    if (bar.length) bars.push(bar.join(" "));
  }
  return bars.join(" | ");
}
