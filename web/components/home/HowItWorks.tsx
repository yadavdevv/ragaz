"use client";

// The training loop, scrubbed by scroll: prompt → model → notation → score → update → again.

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useMemo, useRef, useState } from "react";
import { linePoints, pathFrom, pieceEnd, pitchRange } from "@/lib/line";
import type { Data } from "@/lib/site";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { t: "Ask", d: "The model gets one line: the name of a raga. No notes, no rules." },
  { t: "Write", d: "A 0.6-billion-parameter language model writes a melody, one token at a time." },
  { t: "Notation", d: "Out comes sargam: eight bars, four beats each. Your browser can play it." },
  { t: "Score", d: "A program checks it: notes in the raga, rhythm intact, no loops, and how close it sounds to real singers." },
  { t: "Learn", d: "It writes eight attempts per prompt. The ones that beat the group's average become more likely. Then again, thousands of times." },
];

export function HowItWorks({ data }: { data: Data }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const piece = useMemo(() => [...data.pieces].filter((x) => x.model === "v2" && x.raga === "bhupali").sort((a, b) => b.reward - a.reward)[1], [data]);
  const group = useMemo(() => data.pieces.filter((x) => x.model === "v2" && x.raga === "bhupali").slice(0, 8).map((x) => x.reward), [data]);

  useEffect(() => {
    const st = ScrollTrigger.create({ trigger: wrap.current, start: "top top", end: "+=360%", pin: true, scrub: true, onUpdate: (s) => setP(s.progress) });
    return () => st.kill();
  }, []);

  const step = Math.min(4, Math.floor(p * 5));
  const local = Math.min(1, (p * 5) % 1 || (p >= 1 ? 1 : 0)); // progress within the current step
  const prompt = "Compose a raga: Bhupali";
  const W = 560, H = 170;
  const [lo, hi] = pitchRange(piece.notes, 1);
  const end = pieceEnd(piece.notes);
  const pts = linePoints(piece.notes, (t) => (t / end) * W, (s) => 10 + (1 - (s - lo) / (hi - lo)) * (H - 20));
  const d = pathFrom(pts);
  const mean = group.reduce((a, b) => a + b, 0) / group.length;
  const tokens = piece.notation.split(" ");
  const ring = [{ x: 90, y: 90 }, { x: 450, y: 70 }, { x: 500, y: 330 }, { x: 300, y: 450 }, { x: 70, y: 330 }];
  const loopPath = `M ${ring[0].x} ${ring[0].y} C 250 20, 380 20, ${ring[1].x} ${ring[1].y} S 600 230, ${ring[2].x} ${ring[2].y} S 400 470, ${ring[3].x} ${ring[3].y} S 40 420, ${ring[4].x} ${ring[4].y} S 40 150, ${ring[0].x} ${ring[0].y}`;
  const pathRef = useRef<SVGPathElement>(null);
  const [tok, setTok] = useState({ x: ring[0].x, y: ring[0].y });
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const L = el.getTotalLength();
    const pt = el.getPointAtLength(L * Math.min(0.999, p));
    setTok({ x: pt.x, y: pt.y });
  }, [p]);

  return (
    <section id="how" ref={wrap} className="relative h-[100svh] overflow-hidden bg-night">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_70%_50%,rgba(240,163,58,0.08),transparent)]" />
      <div className="relative mx-auto grid h-full max-w-[1400px] items-center gap-10 px-6 pt-20 sm:px-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="text-[12px] uppercase tracking-[0.24em] text-mute">How it learned</div>
          <h2 className="mt-4 font-display text-[clamp(44px,6vw,92px)] leading-[0.92]">Write. Get scored.<br /><span className="italic text-saffron">Do it again.</span></h2>
          <ol className="mt-10 space-y-1">
            {STEPS.map((s, i) => (
              <li key={s.t} className={`grid grid-cols-[3rem_1fr] items-baseline border-t border-smoke py-4 transition-all duration-500 ${i === step ? "opacity-100" : "opacity-35"}`}>
                <span className={`font-mono text-[13px] ${i === step ? "text-saffron" : "text-mute"}`}>0{i + 1}</span>
                <div>
                  <div className="font-display text-[30px] leading-none">{s.t}</div>
                  <div className={`overflow-hidden text-[16px] leading-[1.55] text-mute transition-all duration-700 ease-out ${i === step ? "mt-2 max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative hidden aspect-[6/5] w-full lg:block">
          <svg viewBox="0 0 600 500" className="absolute inset-0 h-full w-full">
            <path ref={pathRef} d={loopPath} fill="none" stroke="#2A231C" strokeWidth="1.5" strokeDasharray="4 8" />
            <path d={loopPath} fill="none" stroke="#F0A33A" strokeWidth="2" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - p} strokeOpacity="0.7" />
            {ring.map((r, i) => (
              <g key={i}>
                <circle cx={r.x} cy={r.y} r={i <= step ? 9 : 6} fill={i <= step ? "#F0A33A" : "#2A231C"} style={{ transition: "all .5s" }} />
                <text x={r.x} y={r.y - 20} textAnchor="middle" fontSize="14" fill={i === step ? "#F4EDE1" : "#9C9182"}>{STEPS[i].t}</text>
              </g>
            ))}
            <circle cx={tok.x} cy={tok.y} r="26" fill="#F0A33A" fillOpacity="0.15" />
            <circle cx={tok.x} cy={tok.y} r="7" fill="#F4EDE1" />
          </svg>

          {/* the stage for the current step */}
          <div className="absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-smoke bg-coal/90 p-6 backdrop-blur">
            {step === 0 && (
              <div>
                <div className="text-[12px] uppercase tracking-[0.2em] text-mute">prompt</div>
                <div className="mt-3 font-mono text-[22px] text-ivory">{prompt.slice(0, Math.ceil(local * prompt.length * 1.3))}<span className="animate-pulse text-saffron">▍</span></div>
              </div>
            )}
            {step === 1 && (
              <div>
                <div className="text-[12px] uppercase tracking-[0.2em] text-mute">0.6B parameters, thinking</div>
                <div className="mt-4 grid grid-cols-[repeat(16,1fr)] gap-1.5">
                  {Array.from({ length: 96 }, (_, i) => {
                    const v = 0.5 + 0.5 * Math.sin(i * 1.7 + p * 90 + (i % 7));
                    return <span key={i} className="aspect-square rounded-full" style={{ background: `rgba(240,163,58,${0.08 + v * v * 0.8})` }} />;
                  })}
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <div className="text-[12px] uppercase tracking-[0.2em] text-mute">notation, as written</div>
                <div className="mt-3 min-h-[3.5em] font-mono text-[18px] leading-relaxed tracking-wider text-ivory">{tokens.slice(0, Math.ceil(local * tokens.length)).join(" ")}</div>
                <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
                  <clipPath id="how-clip"><rect x="0" y="0" width={local * W} height={H} /></clipPath>
                  <path d={d} fill="none" stroke="#F0A33A" strokeWidth="2.5" clipPath="url(#how-clip)" />
                </svg>
              </div>
            )}
            {step === 3 && (
              <div>
                <div className="text-[12px] uppercase tracking-[0.2em] text-mute">the score</div>
                <div className="mt-2 flex items-end justify-between">
                  <div className="font-display text-[88px] leading-none text-saffron tabular-nums">{(piece.reward * Math.min(1, local * 1.4)).toFixed(2)}</div>
                  <div className="space-y-1.5 pb-2 text-[15px]">
                    {["Every note in Bhupali", "Four beats in every bar", "No loops", "Sounds like real singers"].map((c, i) => (
                      <div key={c} className={`transition-all duration-500 ${local > i * 0.2 ? "opacity-100" : "translate-x-3 opacity-0"}`}><span className="text-saffron">✓</span> {c}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {step === 4 && (
              <div>
                <div className="text-[12px] uppercase tracking-[0.2em] text-mute">eight attempts, judged against their average</div>
                <div className="mt-4 flex h-36 items-end gap-2">
                  {group.map((r, i) => {
                    const up = r > mean;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-2">
                        <span className={`text-[12px] tabular-nums ${up ? "text-saffron" : "text-mute"}`}>{up ? "↑" : "↓"}</span>
                        <div className="w-full rounded-t-md transition-all duration-700" style={{ height: `${(r * 100 * Math.min(1, local * 2)).toFixed(0)}px`, background: up ? "#F0A33A" : "#2A231C" }} />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 text-[14px] text-mute">Above the line: more likely next time. Below: less. That's the whole learning signal.</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-smoke"><div className="h-full bg-saffron" style={{ width: `${p * 100}%` }} /></div>
    </section>
  );
}
