// UI v5 mockups: a function-first site whose visual identity is the melody line.
// Every line on this page is a real piece from public/data (server-rendered, local only).

import { readFileSync } from "node:fs";
import path from "node:path";
import { Inter, Instrument_Serif, Noto_Serif_Devanagari } from "next/font/google";
import type { ReactNode } from "react";
import type { Masters, Note, Piece, RagaData } from "@/lib/music";
import { parse } from "@/lib/verify";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"] });
const deva = Noto_Serif_Devanagari({ subsets: ["devanagari"], weight: ["400", "500"] });
const F = { serif: serif.style.fontFamily, sans: inter.style.fontFamily, deva: deva.style.fontFamily };
const K = { bg: "#070605", surface: "#100E0C", raised: "#171411", line: "#26211C", dim: "#8F877C", ink: "#EEE7DA", saffron: "#E7A23D" };

const load = <T,>(n: string): T => JSON.parse(readFileSync(path.join(process.cwd(), "public/data", `${n}.json`), "utf8"));
const SWARAS = "SrRgGmMPdDnN";
const NAME: Record<string, string> = { S: "Sa", r: "Re", R: "Re", g: "Ga", G: "Ga", m: "Ma", M: "Ma", P: "Pa", d: "Dha", D: "Dha", n: "Ni", N: "Ni" };
const semis = (n: Pick<Note, "s" | "o">) => SWARAS.indexOf(n.s) + 12 * n.o;

// ---------------------------------------------------------------- the melody line

/** A piece as a flowing pitch line: a smooth spline through each note's held span
 *  (long notes keep a visible plateau, short ones become a curve through their pitch). */
function contourPath(notes: Note[], x: (t: number) => number, y: (s: number) => number) {
  // One point per beat-length note; held notes (≥ 2 beats) keep a plateau.
  const pts: [number, number][] = [];
  for (const n of notes) {
    const s = semis(n);
    if (n.d >= 2) pts.push([x(n.t + 0.4), y(s)], [x(n.t + n.d - 0.4), y(s)]);
    else pts.push([x(n.t + n.d / 2), y(s)]);
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  const k = 1 / 6; // Catmull-Rom → Bézier
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    if (p1[1] === p2[1]) {
      d += ` L ${p2[0]} ${p2[1]}`;
      continue;
    }
    const t1y = p0[1] === p1[1] ? 0 : (p2[1] - p0[1]) * k; // leave a plateau flat
    const t2y = p2[1] === p3[1] ? 0 : (p3[1] - p1[1]) * k;
    d += ` C ${p1[0] + (p2[0] - p0[0]) * k} ${p1[1] + t1y}, ${p2[0] - (p3[0] - p1[0]) * k} ${p2[1] - t2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function Contour({ notes, w, h, color = K.saffron, glow = true, head, axis, pad = 0, range, width = 2.2, fade = false, id }: {
  notes: Note[]; w: number; h: number; color?: string; glow?: boolean; head?: number; axis?: string[]; pad?: number; range?: [number, number]; width?: number; fade?: boolean; id: string;
}) {
  const ss = notes.map(semis);
  const [lo, hi] = range ?? [Math.min(...ss) - 1, Math.max(...ss) + 1];
  const end = notes[notes.length - 1].t + notes[notes.length - 1].d;
  const L = axis ? 44 : pad;
  const x = (t: number) => L + (t / end) * (w - L - pad);
  const y = (s: number) => pad + (1 - (s - lo) / (hi - lo)) * (h - 2 * pad);
  const d = contourPath(notes, x, y);
  const cur = head !== undefined ? notes.find((n) => n.t <= head && head < n.t + n.d) : undefined;
  const ticks: number[] = [];
  if (axis) for (let s = lo; s <= hi; s++) if (axis.includes(SWARAS[((s % 12) + 12) % 12]) && (!ticks.length || s - ticks[ticks.length - 1] >= 2)) ticks.push(s);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" preserveAspectRatio="none" style={{ height: "auto" }}>
      <defs>
        <filter id={`g-${id}`} x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
        <linearGradient id={`f-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity={fade ? 0.15 : 1} />
          <stop offset="0.25" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      {ticks.map((s) => (
        <g key={s}>
          <line x1={L} x2={w - pad} y1={y(s)} y2={y(s)} stroke={K.line} strokeDasharray={s % 12 === 0 ? "" : "2 7"} />
          <text x={L - 12} y={y(s) + 4} textAnchor="end" fontSize="12" fill={K.dim} style={{ fontFamily: F.sans }}>{NAME[SWARAS[((s % 12) + 12) % 12]]}{s >= 12 ? "′" : s < 0 ? "," : ""}</text>
        </g>
      ))}
      {glow && head === undefined && <path d={d} fill="none" stroke={color} strokeWidth={width * 5} strokeOpacity="0.18" filter={`url(#g-${id})`} />}
      <path d={d} fill="none" stroke={head !== undefined ? "rgba(238,231,218,.22)" : `url(#f-${id})`} strokeWidth={head !== undefined ? width * 0.7 : width} strokeLinecap="round" strokeLinejoin="round" />
      {head !== undefined && (
        <>
          <clipPath id={`c-${id}`}><rect x="0" y="0" width={x(head)} height={h} /></clipPath>
          {glow && <path d={d} fill="none" stroke={color} strokeWidth={width * 5} strokeOpacity="0.22" filter={`url(#g-${id})`} clipPath={`url(#c-${id})`} />}
          <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" clipPath={`url(#c-${id})`} />
          {cur && <circle cx={x(head)} cy={y(semis(cur))} r={6} fill={color} />}
          {cur && <circle cx={x(head)} cy={y(semis(cur))} r={16} fill={color} fillOpacity="0.15" />}
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------- frame chrome

function Frame({ url, children, label, note }: { url: string; children: ReactNode; label: string; note: ReactNode }) {
  return (
    <section className="mt-20">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="text-[13px] tracking-[0.2em] text-[#8F877C]">{label}</span>
      </div>
      <div className="overflow-hidden rounded-[16px] border" style={{ borderColor: K.line, background: K.bg, boxShadow: "0 40px 100px -40px rgba(0,0,0,.8)" }}>
        <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: K.line, background: "#0C0A09" }}>
          {[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: K.line }} />)}
          <span className="ml-3 text-[12px]" style={{ color: K.dim }}>{url}</span>
        </div>
        {children}
      </div>
      <p className="mt-4 max-w-[52rem] text-[16px] leading-[1.6] text-[#8F877C]">{note}</p>
    </section>
  );
}

function Nav({ active }: { active: string }) {
  return (
    <div className="flex items-center justify-between px-10 py-6" style={{ fontFamily: F.sans }}>
      <span className="text-[26px] leading-none" style={{ fontFamily: F.serif, color: K.ink }}>ragaz</span>
      <div className="flex gap-7 text-[15px]">
        {["Listen", "Ragas", "Compose", "How it works", "Results", "Docs"].map((l) => (
          <span key={l} style={{ color: l === active ? K.ink : K.dim, borderBottom: l === active ? `1px solid ${K.saffron}` : "1px solid transparent", paddingBottom: 4 }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

const Btn = ({ children, primary }: { children: ReactNode; primary?: boolean }) => (
  <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-medium" style={{ background: primary ? K.saffron : "transparent", color: primary ? K.bg : K.ink, border: `1px solid ${primary ? K.saffron : K.line}`, fontFamily: F.sans }}>{children}</span>
);
const Eyebrow = ({ children }: { children: ReactNode }) => <div className="text-[12px] tracking-[0.18em]" style={{ color: K.dim, fontFamily: F.sans }}>{children}</div>;

// ---------------------------------------------------------------- page

export default function Board() {
  const ragas = load<RagaData>("ragas").ragas;
  const pieces = load<Piece[]>("pieces");
  const masters = load<Masters>("masters");
  const exhibits = load<{ key: string; notes: Note[]; reward_then: number; reward_now: number; raga: string }[]>("exhibits");
  const journey = load<Record<string, Record<string, [number, number][]> & { sa?: Record<string, [number, number][]> }>>("journey");
  const by = (raga: string, model = "v2") => pieces.filter((p) => p.raga === raga && p.model === model).sort((a, b) => b.reward - a.reward);
  const hero = by("bhupali")[0];
  const raga = (k: string) => ragas.find((r) => r.key === k)!;
  const bhu = raga("bhupali");
  const pakad = parse(bhu.pakad).notes;
  const loop = exhibits.find((e) => e.key === "loop")!;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const stat = (m: string) => {
    const ps = pieces.filter((p) => p.model === m);
    return { reward: mean(ps.map((p) => p.reward)), clean: ps.filter((p) => p.scores.allowed === 1).length / ps.length };
  };
  const saReal = mean(Object.values(masters.ragas).map((r) => r.pc[0]));
  const saModel = (m: string) => mean(Object.values(masters.ragas).map((r) => r.models[m].pc[0]));
  const compose = by("yaman")[2];

  return (
    <main className="min-h-screen px-6 py-14 sm:px-10" style={{ background: "#0B0A09", color: K.ink, fontFamily: F.sans }}>
      <div className="mx-auto max-w-[1280px]">
        <Eyebrow>ragaz · UI v5 · FUNCTION FIRST</Eyebrow>
        <h1 className="mt-3 text-[60px] leading-none" style={{ fontFamily: F.serif }}>A website, not a game</h1>
        <p className="mt-4 max-w-3xl text-[18px] leading-[1.65]" style={{ color: K.dim }}>
          Seven pages, each with one job. The visual identity is the <span style={{ color: K.ink }}>melody line</span>: every piece drawn as its pitch contour, the way musicologists plot real singing. Every line below is a real piece from the data. Saffron is the model; ivory is a reference. Plan: ideas/ragaz/ui-plan-v5.md
        </p>

        {/* ---------------- HOME */}
        <Frame url="localhost:3123" label="01 · HOME" note="The hero is a real Bhupali piece by the model, drawn as its melody line and playing: the playhead lights the line as each note sounds. Four plain facts, then the way in to each page.">
          <Nav active="" />
          <div className="px-10 pb-4 pt-6">
            <Eyebrow>A LANGUAGE MODEL THAT COMPOSES HINDUSTANI RAGAS</Eyebrow>
            <h2 className="mt-4 max-w-[900px] text-[76px] leading-[0.98]" style={{ fontFamily: F.serif }}>Ragas, written by a machine that learned from a score.</h2>
          </div>
          <div className="px-6">
            <Contour id="hero" notes={hero.notes} w={1240} h={300} head={13.5} axis={bhu.swaras} pad={24} />
          </div>
          <div className="flex items-center justify-between px-10 pb-10 pt-2">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: K.saffron, color: K.bg }}>❚❚</span>
              <div>
                <div className="text-[16px]">Bhupali · early night</div>
                <div className="text-[14px]" style={{ color: K.dim }}>composed by ragaz from the word “Bhupali” · 8 bars of teentaal</div>
              </div>
            </div>
            <div className="flex gap-3"><Btn primary>Listen to more</Btn><Btn>How it works</Btn></div>
          </div>
          <div className="grid grid-cols-4 border-t" style={{ borderColor: K.line }}>
            {[["3", "ragas it can compose"], ["0.6B", "parameters, trained on a laptop"], [`${Math.round(stat("v2").clean * 100)}%`, "of its pieces use only the raga's notes"], ["30", "concert recordings it was checked against"]].map(([v, l], i) => (
              <div key={l} className="px-10 py-7" style={{ borderLeft: i ? `1px solid ${K.line}` : "none" }}>
                <div className="text-[44px] leading-none" style={{ fontFamily: F.serif }}>{v}</div>
                <div className="mt-2 text-[15px]" style={{ color: K.dim }}>{l}</div>
              </div>
            ))}
          </div>
        </Frame>

        {/* ---------------- LISTEN */}
        <Frame url="localhost:3123/listen" label="02 · LISTEN" note="The library. Each card is a composition with its melody line, so you can see a piece's shape before you hear it. Filter by raga; the player bar stays at the bottom with tempo, Sa pitch and download.">
          <Nav active="Listen" />
          <div className="flex items-end justify-between px-10 pb-6">
            <div>
              <h2 className="text-[52px] leading-none" style={{ fontFamily: F.serif }}>Listen</h2>
              <p className="mt-2 text-[17px]" style={{ color: K.dim }}>144 compositions, each written from the raga's name alone.</p>
            </div>
            <div className="flex gap-2 text-[14px]">
              {["All", "Bhupali", "Yaman", "Malkauns"].map((c, i) => <span key={c} className="rounded-full px-4 py-1.5" style={{ border: `1px solid ${i === 0 ? K.ink : K.line}`, color: i === 0 ? K.ink : K.dim }}>{c}</span>)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 px-10 pb-8">
            {(["bhupali", "yaman", "malkauns"] as const).flatMap((k) => by(k).slice(0, 2).map((p, i) => ({ p, k, i }))).map(({ p, k, i }, n) => (
              <div key={p.id} className="rounded-2xl p-5" style={{ background: K.surface, border: `1px solid ${n === 2 ? K.saffron : K.line}` }}>
                <Contour id={`l-${p.id}`} notes={p.notes} w={360} h={110} head={n === 2 ? 20 : undefined} glow={n === 2} width={1.8} />
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-[17px]">{raga(k).name} <span style={{ color: K.dim }}>no. {Number(p.id.split("-").pop()) + 1}</span></span>
                  <span className="text-[13px] tabular-nums" style={{ color: K.dim }}>{p.beats} beats</span>
                </div>
                <div className="mt-1 text-[14px]" style={{ color: K.dim }}>{raga(k).time.split(" (")[0]}{i === 0 ? " · highest rated" : ""}</div>
              </div>
            ))}
          </div>
          <div className="mx-10 mb-8 flex items-center gap-5 rounded-2xl px-5 py-3" style={{ background: K.raised, border: `1px solid ${K.line}` }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: K.saffron, color: K.bg }}>❚❚</span>
            <div className="w-[160px] text-[15px]">Yaman no. {Number(by("yaman")[0].id.split("-").pop()) + 1}<div className="text-[13px]" style={{ color: K.dim }}>0:16 / 0:27</div></div>
            <div className="flex-1"><Contour id="bar" notes={by("yaman")[0].notes} w={600} h={40} head={20} glow={false} width={1.5} /></div>
            <span className="text-[14px]" style={{ color: K.dim }}>Tempo 72</span>
            <span className="text-[14px]" style={{ color: K.dim }}>Sa C4</span>
            <span className="text-[14px]" style={{ color: K.ink }}>Download ↓</span>
          </div>
        </Frame>

        {/* ---------------- RAGAS */}
        <Frame url="localhost:3123/ragas/bhupali" label="03 · RAGAS" note="A reference page per raga: which notes it allows, when it's sung, the phrase that identifies it (as a line you can play), and how real singers spread their time across the notes. Devanagari appears once, for the raga's own name.">
          <Nav active="Ragas" />
          <div className="grid grid-cols-[1fr_1.15fr] gap-12 px-10 pb-12 pt-4">
            <div>
              <div className="flex items-baseline gap-4">
                <h2 className="text-[64px] leading-none" style={{ fontFamily: F.serif }}>Bhupali</h2>
                <span className="text-[30px]" style={{ fontFamily: F.deva, color: K.dim }}>भूपाली</span>
              </div>
              <p className="mt-3 text-[17px] leading-[1.6]" style={{ color: K.dim }}>Sung in the early night. Calm and devotional. Five notes, no Ma and no Ni, so it never sounds tense.</p>
              <div className="mt-8"><Eyebrow>NOTES IT ALLOWS</Eyebrow></div>
              <div className="mt-3 flex gap-1.5">
                {Array.from({ length: 12 }, (_, pc) => {
                  const on = bhu.notes.includes(pc);
                  return (
                    <div key={pc} className="flex h-16 flex-1 flex-col items-center justify-end gap-1 rounded-lg pb-2 text-[13px]" style={{ background: on ? "rgba(231,162,61,.12)" : "transparent", border: `1px solid ${on ? K.saffron : K.line}`, color: on ? K.ink : K.dim }}>
                      {NAME[SWARAS[pc]]}
                      <span className="text-[10px] leading-none" style={{ color: K.dim, opacity: "rgdnM".includes(SWARAS[pc]) ? 1 : 0 }}>{SWARAS[pc] === "M" ? "tivra" : "komal"}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 grid grid-cols-2 gap-6 text-[15px]">
                <div><Eyebrow>MOST IMPORTANT NOTE</Eyebrow><div className="mt-1 text-[22px]">Ga</div></div>
                <div><Eyebrow>SECOND</Eyebrow><div className="mt-1 text-[22px]">Dha</div></div>
              </div>
            </div>
            <div>
              <Eyebrow>ITS SIGNATURE PHRASE (PAKAD)</Eyebrow>
              <div className="mt-3 rounded-2xl p-5" style={{ background: K.surface, border: `1px solid ${K.line}` }}>
                <Contour id="pakad" notes={pakad} w={560} h={150} color={K.ink} axis={bhu.swaras} pad={14} width={2} />
                <div className="mt-2 flex items-center justify-between text-[14px]" style={{ color: K.dim }}><span>Ga Re Sa Dha, Sa Re Ga · Pa Ga Dha Pa Ga Re Sa</span><span style={{ color: K.ink }}>▶ Play</span></div>
              </div>
              <div className="mt-8"><Eyebrow>WHERE REAL SINGERS SPEND THEIR TIME · {masters.ragas.bhupali.recordings} RECORDINGS</Eyebrow></div>
              <div className="mt-3 space-y-2.5">
                {bhu.notes.map((pc) => {
                  const real = masters.ragas.bhupali.pc[pc], model = masters.ragas.bhupali.models.v2.pc[pc];
                  return (
                    <div key={pc} className="grid grid-cols-[48px_1fr_88px] items-center gap-3 text-[14px]">
                      <span>{NAME[SWARAS[pc]]}</span>
                      <div className="relative h-5">
                        <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${real * 220}%`, background: "rgba(238,231,218,.16)", border: `1px solid ${K.ink}` }} />
                        <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded" style={{ width: `${model * 220}%`, background: K.saffron }} />
                      </div>
                      <span className="text-right tabular-nums" style={{ color: K.dim }}>{Math.round(real * 100)}% · <span style={{ color: K.saffron }}>{Math.round(model * 100)}%</span></span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-[13px]" style={{ color: K.dim }}>outline = real singers · saffron = ragaz</div>
            </div>
          </div>
        </Frame>

        {/* ---------------- COMPOSE */}
        <Frame url="localhost:3123/compose" label="04 · COMPOSE" note="The tool. Choose a raga and generate; the piece appears as a line and as notation you can edit. The score is one number and three plain checks; the full equation is one click away, not on the surface. Export as notation or audio.">
          <Nav active="Compose" />
          <div className="grid grid-cols-[300px_1fr] gap-8 px-10 pb-10 pt-2">
            <div className="space-y-6 rounded-2xl p-6" style={{ background: K.surface, border: `1px solid ${K.line}` }}>
              {[["Raga", "Yaman"], ["Tempo", "72 bpm"], ["Sa", "C4 · 262 Hz"], ["Length", "8 bars · teentaal"]].map(([k, v]) => (
                <div key={k}><Eyebrow>{k.toUpperCase()}</Eyebrow><div className="mt-1.5 flex items-center justify-between rounded-lg px-3 py-2 text-[15px]" style={{ border: `1px solid ${K.line}` }}>{v}<span style={{ color: K.dim }}>▾</span></div></div>
              ))}
              <div className="pt-2"><Btn primary>Generate ↻</Btn></div>
              <div className="text-[13px] leading-relaxed" style={{ color: K.dim }}>Runs the model on this machine. About 3 seconds.</div>
            </div>
            <div>
              <div className="rounded-2xl p-6" style={{ background: K.surface, border: `1px solid ${K.line}` }}>
                <Contour id="compose" notes={compose.notes} w={860} h={220} axis={raga("yaman").swaras} pad={16} head={9} />
                <div className="mt-4 grid grid-cols-8 gap-1.5 text-center text-[15px]">
                  {compose.notation.split("|").map((bar, i) => (
                    <div key={i} className="rounded-lg py-2 tracking-[0.25em]" style={{ border: `1px solid ${i === 2 ? K.saffron : K.line}`, color: i < 2 ? K.ink : K.dim }}>{bar.trim()}</div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[180px_1fr_auto] items-center gap-6 rounded-2xl p-6" style={{ background: K.surface, border: `1px solid ${K.line}` }}>
                <div><Eyebrow>SCORE</Eyebrow><div className="text-[56px] leading-none" style={{ fontFamily: F.serif }}>{compose.reward.toFixed(2)}</div></div>
                <div className="space-y-1.5 text-[15px]">
                  <div>✓ Every note belongs to Yaman</div>
                  <div>✓ Eight bars, four beats each</div>
                  <div>{compose.scores.profile >= 0.8 ? "✓" : "~"} Note balance typical of real singers</div>
                </div>
                <div className="flex flex-col items-end gap-2 text-[14px]"><span style={{ color: K.ink }}>Show the equation ▸</span><span style={{ color: K.dim }}>Copy notation · WAV ↓</span></div>
              </div>
            </div>
          </div>
        </Frame>

        {/* ---------------- HOW IT WORKS */}
        <Frame url="localhost:3123/how-it-works" label="05 · HOW IT WORKS" note="The method as one diagram, then three findings, each with exactly one visual: the cheat as its (absurdly repetitive) melody line, the missing fact as a line that stays at zero, and the textbook gap as one number against another.">
          <Nav active="How it works" />
          <div className="px-10 pt-2">
            <h2 className="text-[52px] leading-none" style={{ fontFamily: F.serif }}>How it learned</h2>
            <p className="mt-3 max-w-[760px] text-[17px] leading-[1.6]" style={{ color: K.dim }}>Nobody showed it how to compose at first. It wrote, a program scored what it wrote, and it was nudged toward whatever scored higher. Thousands of times.</p>
          </div>
          <div className="mx-10 mt-8 flex items-center justify-between rounded-2xl px-8 py-8" style={{ background: K.surface, border: `1px solid ${K.line}` }}>
            {[["Prompt", "“Compose Bhupali”"], ["Model", "0.6B language model"], ["Notation", "S R G P | G R D P …"], ["Score", "rules + real concerts"], ["Update", "more of what scored well"]].map(([t, s], i, arr) => (
              <div key={t} className="flex items-center">
                <div className="w-[170px]">
                  <div className="text-[13px]" style={{ color: K.saffron }}>0{i + 1}</div>
                  <div className="text-[24px] leading-tight" style={{ fontFamily: F.serif }}>{t}</div>
                  <div className="mt-1 text-[14px]" style={{ color: K.dim }}>{s}</div>
                </div>
                {i < arr.length - 1 && <span className="mx-3 text-[22px]" style={{ color: K.line }}>→</span>}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 px-10 pb-10 pt-4">
            <div className="rounded-2xl p-6" style={{ background: K.surface, border: `1px solid ${K.line}` }}>
              <Eyebrow>FINDING 1</Eyebrow>
              <div className="mt-2 text-[26px] leading-tight" style={{ fontFamily: F.serif }}>It cheated the score</div>
              <div className="my-4"><Contour id="loop" notes={loop.notes} w={340} h={90} width={1.4} glow={false} /></div>
              <p className="text-[15px] leading-[1.55]" style={{ color: K.dim }}>Thirty-two bars of nearly one figure. Every note was allowed, so it scored <span style={{ color: K.ink }}>{loop.reward_then.toFixed(2)}</span>. We had to make the rules multiply.</p>
            </div>
            <div className="rounded-2xl p-6" style={{ background: K.surface, border: `1px solid ${K.line}` }}>
              <Eyebrow>FINDING 2</Eyebrow>
              <div className="mt-2 text-[26px] leading-tight" style={{ fontFamily: F.serif }}>A score can't teach a fact</div>
              <svg viewBox="0 0 340 90" className="my-4 w-full">
                <line x1="0" x2="340" y1="84" y2="84" stroke={K.line} />
                <path d={journey.tracka["eval/bare/raga/malkauns"].map(([s, v], i) => `${i ? "L" : "M"} ${(s / 100) * 160} ${84 - v * 76}`).join(" ")} fill="none" stroke={K.dim} strokeWidth="2" />
                <path d={journey.sft["eval/bare/raga/malkauns"].map(([s, v], i) => `${i ? "L" : "M"} ${180 + (s / 69) * 160} ${84 - v * 76}`).join(" ")} fill="none" stroke={K.saffron} strokeWidth="2.2" />
                <text x="0" y="12" fontSize="12" fill={K.dim}>scoring alone</text>
                <text x="180" y="12" fontSize="12" fill={K.saffron}>with examples</text>
              </svg>
              <p className="text-[15px] leading-[1.55]" style={{ color: K.dim }}>Asked for Malkauns by name, it never found its notes, so it scored zero for 100 steps. A few examples fixed it in 30.</p>
            </div>
            <div className="rounded-2xl p-6" style={{ background: K.surface, border: `1px solid ${K.line}` }}>
              <Eyebrow>FINDING 3</Eyebrow>
              <div className="mt-2 text-[26px] leading-tight" style={{ fontFamily: F.serif }}>Rules aren't music</div>
              <div className="my-4 flex items-end gap-8">
                <div><div className="text-[52px] leading-none" style={{ fontFamily: F.serif, color: K.dim }}>{Math.round(saModel("v1") * 100)}%</div><div className="text-[13px]" style={{ color: K.dim }}>rule-trained</div></div>
                <div><div className="text-[52px] leading-none" style={{ fontFamily: F.serif }}>{Math.round(saReal * 100)}%</div><div className="text-[13px]" style={{ color: K.dim }}>real singers</div></div>
              </div>
              <p className="text-[15px] leading-[1.55]" style={{ color: K.dim }}>Time spent resting on Sa. Trained on our rules, it hardly came home. Trained against real concerts, it reached <span style={{ color: K.ink }}>{Math.round(saModel("v2") * 100)}%</span>.</p>
            </div>
          </div>
        </Frame>

        {/* ---------------- RESULTS */}
        <Frame url="localhost:3123/results" label="06 · RESULTS" note="How good is it, plainly: a few measures with the real-singer reference beside each, then what it can't do. No dashboards.">
          <Nav active="Results" />
          <div className="grid grid-cols-[1.1fr_1fr] gap-12 px-10 pb-12 pt-2">
            <div>
              <h2 className="text-[52px] leading-none" style={{ fontFamily: F.serif }}>Results</h2>
              <p className="mt-3 text-[17px] leading-[1.6]" style={{ color: K.dim }}>48 pieces per model, written from the raga's name alone, measured the same way.</p>
              <table className="mt-8 w-full text-[16px]">
                <thead><tr className="text-left text-[13px]" style={{ color: K.dim }}><th className="pb-3 font-normal">measure</th><th className="pb-3 text-right font-normal">before RL</th><th className="pb-3 text-right font-normal">rules only</th><th className="pb-3 text-right font-normal" style={{ color: K.saffron }}>final</th><th className="pb-3 text-right font-normal">real singers</th></tr></thead>
                <tbody className="tabular-nums">
                  {[
                    ["score (0–1)", ...["sft", "v1", "v2"].map((m) => stat(m).reward.toFixed(2)), "—"],
                    ["rated above 0.8", ...["sft", "v1", "v2"].map((m) => `${Math.round(pieces.filter((p) => p.model === m && p.reward > 0.8).length / pieces.filter((p) => p.model === m).length * 100)}%`), "—"],
                    ["time on Sa", ...["sft", "v1", "v2"].map((m) => `${Math.round(saModel(m) * 100)}%`), `${Math.round(saReal * 100)}%`],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t" style={{ borderColor: K.line }}>
                      {row.map((c, i) => <td key={i} className={`py-3 ${i ? "text-right" : ""}`} style={{ color: i === 3 ? K.saffron : i === 0 ? K.ink : K.dim }}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <Eyebrow>WHAT IT CAN'T DO YET</Eyebrow>
              <ul className="mt-4 space-y-4 text-[16px] leading-[1.55]">
                {[["Ornaments", "glides and oscillations between notes (meend, gamak) can't be written in its notation."], ["Alap", "the slow, unmetered opening of a performance."], ["A real voice", "you're hearing a synthesised flute."], ["A musician's review", "the reference is measurements of real singers, not an expert's ear."]].map(([t, d]) => (
                  <li key={t} className="border-t pt-4" style={{ borderColor: K.line }}><span>{t}</span> <span style={{ color: K.dim }}>· {d}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </Frame>

        {/* ---------------- DOCS */}
        <Frame url="localhost:3123/docs" label="07 · DOCS" note="Reference for people who want depth: the notation format, the full reward equation, the data and the runs. Plain, searchable, linkable.">
          <Nav active="Docs" />
          <div className="grid grid-cols-[220px_1fr] gap-10 px-10 pb-12 pt-2 text-[15px]">
            <div className="space-y-2" style={{ color: K.dim }}>
              {["Notation", "The reward", "Data", "Training runs", "Audio engine"].map((s, i) => <div key={s} style={{ color: i === 0 ? K.ink : K.dim }}>{s}</div>)}
            </div>
            <div>
              <h2 className="text-[40px] leading-none" style={{ fontFamily: F.serif }}>Notation</h2>
              <p className="mt-3 max-w-[640px] leading-[1.65]" style={{ color: K.dim }}>Each token is one beat; bars are separated by <code style={{ color: K.ink }}>|</code>. Uppercase is the natural note, lowercase is flat (komal), and <code style={{ color: K.ink }}>M</code> is sharp Ma. A dot before a note is the lower octave, an apostrophe after is the upper. <code style={{ color: K.ink }}>-</code> holds the note.</p>
              <div className="mt-5 rounded-xl p-5 text-[15px]" style={{ background: K.surface, border: `1px solid ${K.line}`, fontFamily: "ui-monospace, monospace", color: K.ink }}>
                {hero.notation}
              </div>
            </div>
          </div>
        </Frame>

        <section className="mb-10 mt-20 rounded-[16px] border p-8" style={{ borderColor: K.line }}>
          <div className="text-[34px] leading-tight" style={{ fontFamily: F.serif }}>What I need from you</div>
          <p className="mt-2 max-w-3xl text-[17px] leading-[1.6]" style={{ color: K.dim }}>Is this the right direction (pages, information, the melody-line identity)? Anything to add or cut per page? With your OK I'll build it page by page, starting with the melody-line component and Home.</p>
        </section>
      </div>
    </main>
  );
}
